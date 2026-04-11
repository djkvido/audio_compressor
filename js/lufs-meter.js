// ============ LUFS Meter (ITU-R BS.1770-4) ============
//
// Měříme "integrated loudness" v LUFS podle broadcast standardu BS.1770-4.
// Používá se v audio-worker.js jako náhrada za prostý RMS.
//
// Proč LUFS místo RMS:
//   Různé žánry (vídeňský valčík se smyčci vs EDM se sub-basem vs jazz)
//   mají úplně jiné frekvenční spektrum. RMS počítá všechny frekvence stejně,
//   takže bass-heavy track naměří "stejně hlasitě" jako mid-heavy valčík,
//   ale ucho je vnímá úplně jinak. LUFS aplikuje K-weighting (high-shelf
//   +4 dB kolem 1.6 kHz + high-pass ~38 Hz) přesně tak, jak lidské ucho
//   vnímá hlasitost → po LUFS normalizaci mají různé žánry SUBJEKTIVNĚ
//   STEJNOU hlasitost. Přesně to, co na taneční soutěži chceme.
//
// Soubor je načítaný přes importScripts() (classic worker scope, ne ES module).
// Všechny funkce jsou top-level a viditelné z audio-worker.js.

// ========== K-weighting biquady (BS.1770-4) ==========
//
// Dva sériové biquady: Stage 1 = high-shelf +4 dB @ 1681 Hz (pre-filter)
//                      Stage 2 = high-pass ~38 Hz (RLB weighting)
//
// Koeficienty přepočítáváme pro aktuální sample rate bilineární transformací.

function designKStage1(sampleRate) {
    // High-shelf, G=+4 dB @ 1681.97 Hz, Q≈0.7071
    const f0 = 1681.9744509555319;
    const G  = 3.999843853973347;
    const Q  = 0.7071752369554196;
    const K  = Math.tan(Math.PI * f0 / sampleRate);
    const Vh = Math.pow(10, G / 20);
    const Vb = Math.pow(Vh, 0.4996667741545416);
    const a0 = 1 + K / Q + K * K;
    return {
        b0: (Vh + Vb * K / Q + K * K) / a0,
        b1: 2 * (K * K - Vh) / a0,
        b2: (Vh - Vb * K / Q + K * K) / a0,
        a1: 2 * (K * K - 1) / a0,
        a2: (1 - K / Q + K * K) / a0
    };
}

function designKStage2(sampleRate) {
    // High-pass @ 38.13 Hz, Q≈0.5003 (odfiltruje sub-bass rumble,
    // který ucho neslyší ale přidává energii do RMS)
    const f0 = 38.13547087613982;
    const Q  = 0.5003270373238773;
    const K  = Math.tan(Math.PI * f0 / sampleRate);
    const a0 = 1 + K / Q + K * K;
    return {
        b0:  1 / a0,
        b1: -2 / a0,
        b2:  1 / a0,
        a1:  2 * (K * K - 1) / a0,
        a2:  (1 - K / Q + K * K) / a0
    };
}

// ========== Hlavní měřicí funkce ==========
//
// Jeden průchod přes kanály → K-weighted sum-of-squares per 100ms hop.
// Z toho odvodíme:
//   - integrated LUFS s BS.1770 gatingem (absolutní -70 LUFS, relativní -10 LU)
//   - short-term LUFS (konfigurovatelné okno, typicky 3 s)
//   - loudness range (LRA) jako 10.–95. percentil short-term hodnot
//
// Výhoda této architektury: stačí jeden průchod pro všechna tři měření,
// a memory je O(numHops) místo O(length) (tj. ~150 KB pro 30min místo 300 MB).
//
// @param channels Array<Float32Array> vstupních kanálů
// @param sampleRate  Vzorkovací frekvence
// @param length      Délka v samplech
// @param options     { shortTermWindowMs=3000 }
// @returns { integrated, shortTerm, shortTermHopSize, shortTermWindowSize,
//            loudnessRange, hopSumSq, hopMs, hopSize }
function measureLoudness(channels, sampleRate, length, options) {
    options = options || {};
    const shortTermWindowMs = isFinite(options.shortTermWindowMs) ? options.shortTermWindowMs : 3000;

    const result = {
        integrated: -Infinity,
        shortTerm: new Float32Array(0),
        shortTermHopSize: 0,
        shortTermWindowSize: 0,
        loudnessRange: 0,
        hopSumSq: null,
        hopMs: 100,
        hopSize: 0
    };

    if (length <= 0 || !channels || channels.length === 0) return result;

    const numChannels = channels.length;
    const hopSize = Math.max(1, Math.floor(0.1 * sampleRate));   // 100 ms
    const blockHops = 4;                                          // 400 ms block
    const blockSize = blockHops * hopSize;

    result.hopSize = hopSize;

    if (length < blockSize) return result; // Kratší než 400 ms → nejde měřit

    const numHops = Math.floor(length / hopSize);
    if (numHops < blockHops) return result;

    const stage1 = designKStage1(sampleRate);
    const stage2 = designKStage2(sampleRate);

    // Per-hop sum of squares (summed across channels, channel weight = 1.0 for L/R)
    const hopSumSq = new Float64Array(numHops);

    // Jeden průchod: filtrace + akumulace per hop
    for (let ch = 0; ch < numChannels; ch++) {
        const data = channels[ch];
        let s1x1 = 0, s1x2 = 0, s1y1 = 0, s1y2 = 0;
        let s2x1 = 0, s2x2 = 0, s2y1 = 0, s2y2 = 0;

        const b0_1 = stage1.b0, b1_1 = stage1.b1, b2_1 = stage1.b2, a1_1 = stage1.a1, a2_1 = stage1.a2;
        const b0_2 = stage2.b0, b1_2 = stage2.b1, b2_2 = stage2.b2, a1_2 = stage2.a1, a2_2 = stage2.a2;

        for (let h = 0; h < numHops; h++) {
            const start = h * hopSize;
            const end = start + hopSize;
            let sum = 0;
            for (let i = start; i < end; i++) {
                const x0 = data[i];
                // Stage 1 biquad
                const y1 = b0_1 * x0 + b1_1 * s1x1 + b2_1 * s1x2 - a1_1 * s1y1 - a2_1 * s1y2;
                s1x2 = s1x1; s1x1 = x0;
                s1y2 = s1y1; s1y1 = y1;
                // Stage 2 biquad
                const y2 = b0_2 * y1 + b1_2 * s2x1 + b2_2 * s2x2 - a1_2 * s2y1 - a2_2 * s2y2;
                s2x2 = s2x1; s2x1 = y1;
                s2y2 = s2y1; s2y1 = y2;

                sum += y2 * y2;
            }
            hopSumSq[h] += sum;
        }
    }

    // ----- Integrated LUFS (BS.1770 gating) -----
    const numBlocks = numHops - blockHops + 1;
    const blockMs = new Float64Array(numBlocks);
    const blockLufs = new Float64Array(numBlocks);

    // Rolling 400ms window (4 hops)
    let rollSum = 0;
    for (let i = 0; i < blockHops; i++) rollSum += hopSumSq[i];
    for (let b = 0; b < numBlocks; b++) {
        const ms = rollSum / blockSize;
        blockMs[b] = ms;
        blockLufs[b] = ms > 0 ? -0.691 + 10 * Math.log10(ms) : -Infinity;
        if (b + blockHops < numHops) {
            rollSum += hopSumSq[b + blockHops] - hopSumSq[b];
        }
    }

    // Absolute gate (-70 LUFS)
    const absThresh = -70;
    let sumMs = 0, count = 0;
    for (let b = 0; b < numBlocks; b++) {
        if (blockLufs[b] > absThresh) {
            sumMs += blockMs[b];
            count++;
        }
    }
    let integrated = -Infinity;
    if (count > 0) {
        integrated = -0.691 + 10 * Math.log10(sumMs / count);
        // Relative gate (-10 LU pod integrated)
        const relThresh = integrated - 10;
        sumMs = 0; count = 0;
        for (let b = 0; b < numBlocks; b++) {
            if (blockLufs[b] > absThresh && blockLufs[b] > relThresh) {
                sumMs += blockMs[b];
                count++;
            }
        }
        if (count > 0) {
            integrated = -0.691 + 10 * Math.log10(sumMs / count);
        }
    }
    result.integrated = integrated;

    // ----- Short-term LUFS (konfigurovatelné okno) -----
    // Kolik hopů tvoří short-term okno
    const stHops = Math.max(1, Math.round(shortTermWindowMs / 100));
    const stWindowSize = stHops * hopSize;

    if (numHops >= stHops) {
        const numSt = numHops - stHops + 1;
        const shortTerm = new Float32Array(numSt);
        let stRoll = 0;
        for (let i = 0; i < stHops; i++) stRoll += hopSumSq[i];
        for (let w = 0; w < numSt; w++) {
            const ms = stRoll / stWindowSize;
            shortTerm[w] = ms > 0 ? -0.691 + 10 * Math.log10(ms) : -Infinity;
            if (w + stHops < numHops) {
                stRoll += hopSumSq[w + stHops] - hopSumSq[w];
            }
        }
        result.shortTerm = shortTerm;
        result.shortTermHopSize = hopSize;
        result.shortTermWindowSize = stWindowSize;

        // Loudness Range (LRA) = 95. - 10. percentil gated short-term
        // Používáme absolute gate -70 a relative gate -20 (BS.1770-4 LRA spec)
        const gated = [];
        let sumMsLra = 0, countLra = 0;
        for (let w = 0; w < numSt; w++) {
            if (shortTerm[w] > -70) {
                sumMsLra += Math.pow(10, (shortTerm[w] + 0.691) / 10);
                countLra++;
            }
        }
        if (countLra > 0) {
            const firstLra = -0.691 + 10 * Math.log10(sumMsLra / countLra);
            const relLraThresh = firstLra - 20;
            for (let w = 0; w < numSt; w++) {
                if (shortTerm[w] > -70 && shortTerm[w] > relLraThresh) {
                    gated.push(shortTerm[w]);
                }
            }
            if (gated.length > 1) {
                gated.sort((a, b) => a - b);
                const p10 = gated[Math.floor(gated.length * 0.10)];
                const p95 = gated[Math.min(gated.length - 1, Math.floor(gated.length * 0.95))];
                result.loudnessRange = p95 - p10;
            }
        }
    }

    result.hopSumSq = hopSumSq;
    return result;
}

// ========== True Peak měření (4× oversampling) ==========
//
// Samplový peak podhodnocuje skutečný analog peak po DAC rekonstrukci
// o 0.5–1.5 dB (inter-sample peaks). BS.1770-4 vyžaduje minimálně 4×
// oversampling pro true peak detekci.
//
// Implementace: 32-tap polyphase lowpass FIR (Hann-windowed sinc), rozdělený
// do 4 podfiltrů po 8 tapech. Počet tapů 8 = mocnina 2 → můžeme indexovat
// bitmaskou místo modulem.

const TP_UPSAMPLE = 4;
const TP_TAPS = 32;
const TP_PHASE_LEN = TP_TAPS / TP_UPSAMPLE; // = 8
const TP_MASK = TP_PHASE_LEN - 1;

// Precompute polyphase filter (Hann-windowed sinc, cutoff = Nyquist/upsample)
const TP_PHASES = (function buildPolyphase() {
    const taps = TP_TAPS;
    const cutoff = 0.5 / TP_UPSAMPLE; // cycles/sample v upsampled rate = 0.125
    const h = new Float64Array(taps);
    const mid = (taps - 1) / 2;

    for (let n = 0; n < taps; n++) {
        const x = n - mid;
        // Sinc s cutoff omegaC = 2*pi*cutoff
        const sinc = x === 0 ? 2 * cutoff : Math.sin(2 * Math.PI * cutoff * x) / (Math.PI * x);
        // Hann window
        const win = 0.5 * (1 - Math.cos(2 * Math.PI * n / (taps - 1)));
        h[n] = sinc * win;
    }

    // Normalize na DC gain = TP_UPSAMPLE (kompenzace zero-stuffingu)
    let dc = 0;
    for (let n = 0; n < taps; n++) dc += h[n];
    const scale = TP_UPSAMPLE / dc;
    for (let n = 0; n < taps; n++) h[n] *= scale;

    // Rozdělit do TP_UPSAMPLE fází (phase k = každý TP_UPSAMPLE-tý tap počínaje k)
    const phases = [];
    for (let k = 0; k < TP_UPSAMPLE; k++) {
        const phase = new Float32Array(TP_PHASE_LEN);
        for (let j = 0; j < TP_PHASE_LEN; j++) {
            phase[j] = h[k + j * TP_UPSAMPLE];
        }
        phases.push(phase);
    }
    return phases;
})();

// Oversampling jen v regionech kde sample peak dosahuje aspoň -6 dB pod max.
// Drasticky snižuje CPU pro dlouhé tracky (většina samplů je quiet → skip).
function measureTruePeak(channels, length) {
    if (length <= 0 || !channels || channels.length === 0) return -Infinity;
    const numCh = channels.length;

    // Pass 1: sample peak (lower bound)
    let samplePeak = 0;
    for (let ch = 0; ch < numCh; ch++) {
        const data = channels[ch];
        for (let i = 0; i < length; i++) {
            const abs = Math.abs(data[i]);
            if (abs > samplePeak) samplePeak = abs;
        }
    }
    if (samplePeak === 0) return -Infinity;

    // Pass 2: oversample jen tam, kde se sample peak přiblíží max (do 3 dB)
    // To stačí — inter-sample peaky nejsou nikdy o víc než ~1.5 dB nad sample peakem.
    const threshold = samplePeak * Math.pow(10, -3 / 20); // ~0.708 × peak
    let truePeak = samplePeak;

    for (let ch = 0; ch < numCh; ch++) {
        const data = channels[ch];

        // Najít souvislé regiony kde |sample| > threshold (s ±TP_PHASE_LEN margin)
        const regions = [];
        let inRegion = false;
        let regionStart = 0;
        let regionEnd = 0;
        const margin = TP_PHASE_LEN;

        for (let i = 0; i < length; i++) {
            const hot = Math.abs(data[i]) > threshold;
            if (hot) {
                if (!inRegion) {
                    regionStart = Math.max(0, i - margin);
                    inRegion = true;
                }
                regionEnd = Math.min(length, i + margin + 1);
            } else if (inRegion && i > regionEnd) {
                regions.push([regionStart, regionEnd]);
                inRegion = false;
            }
        }
        if (inRegion) regions.push([regionStart, regionEnd]);

        // Oversample v každém regionu, najít max
        const hist = new Float32Array(TP_PHASE_LEN);
        for (const [start, end] of regions) {
            hist.fill(0);
            let pos = 0;
            for (let i = start; i < end; i++) {
                hist[pos] = data[i];
                // Každý vstupní sample produkuje TP_UPSAMPLE výstupních
                for (let k = 0; k < TP_UPSAMPLE; k++) {
                    const phase = TP_PHASES[k];
                    let acc = 0;
                    for (let j = 0; j < TP_PHASE_LEN; j++) {
                        acc += phase[j] * hist[(pos - j) & TP_MASK];
                    }
                    const abs = Math.abs(acc);
                    if (abs > truePeak) truePeak = abs;
                }
                pos = (pos + 1) & TP_MASK;
            }
        }
    }

    return truePeak > 0 ? 20 * Math.log10(truePeak) : -Infinity;
}

// ========== Pomocník: linearizace LUFS → linear gain delta ==========
// Pro leveler: target - measured [LU] → lineární gain factor.
function lufsDeltaToGain(targetLufs, currentLufs) {
    if (!isFinite(currentLufs) || !isFinite(targetLufs)) return 1.0;
    const deltaDb = targetLufs - currentLufs;
    return Math.pow(10, deltaDb / 20);
}
