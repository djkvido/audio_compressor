importScripts('./lib/lame.min.js');
importScripts('./lufs-meter.js?v=15');

// Main Thread Listener
self.onmessage = async function (e) {
    const data = e.data;

    if (data.type === 'process') {
        try {
            await processAudio(data.audioChannels, data.sampleRate, data.length, data.settings);
        } catch (err) {
            self.postMessage({ type: 'error', error: err.message });
        }
    } else if (data.type === 'analyze') {
        try {
            const analysis = analyzeAudio(data.audioChannels, data.sampleRate, data.length);
            self.postMessage({ type: 'analysisComplete', analysis: analysis });
        } catch (err) {
            self.postMessage({ type: 'error', error: err.message });
        }
    }
};

// --- Audio Analysis (LUFS + True Peak podle BS.1770-4) ---
//
// FIX (v14): Přepnuto z prostého RMS na K-weighted LUFS.
//   RMS: všechny frekvence stejně → bass-heavy tracky měří falešně hlasitě
//   LUFS: high-shelf +4 dB @ 1.6 kHz + high-pass @ 38 Hz → odpovídá vjemu ucha
//
//   Stejná normalizace napříč žánry = při mixed-genre setu (ballroom/latino/
//   showdance) mají všechny tracky stejnou VNÍMANOU hlasitost, ne jen RMS.
//
// Pole `rmsDb` zachováno v návratové struktuře kvůli kompatibilitě s UI,
// ale teď obsahuje integrated LUFS hodnotu (které by se v novém UI mělo
// říkat "Loudness (LUFS)").
function analyzeAudio(channels, sampleRate, length) {
    const channelData = channels[0];
    const problems = [];

    // True peak (4× oversampling, BS.1770-4)
    const truePeakDb = measureTruePeak(channels, length);

    // LUFS měření (integrated + short-term pro problem detection a LRA)
    const loud = measureLoudness(channels, sampleRate, length, { shortTermWindowMs: 3000 });
    const integratedLufs = loud.integrated;
    const loudnessRange = loud.loudnessRange;

    // Sample peak (zpětná kompatibilita – UI může ukazovat oba)
    let samplePeak = 0;
    for (let ch = 0; ch < channels.length; ch++) {
        const data = channels[ch];
        for (let i = 0; i < length; i++) {
            const abs = Math.abs(data[i]);
            if (abs > samplePeak) samplePeak = abs;
        }
    }
    const peakDb = samplePeak > 0 ? 20 * Math.log10(samplePeak) : -Infinity;

    // Problémové regiony: procházíme short-term LUFS (3s okno)
    // "loud": region > -6 LUFS (hlasité) — nebo peak > -1 dBFS (clipping)
    // "quiet": region < -30 LUFS (tiché)
    const shortTerm = loud.shortTerm;
    const stHop = loud.shortTermHopSize;
    const stWin = loud.shortTermWindowSize;
    let minLufs = null;

    if (shortTerm && shortTerm.length > 0) {
        for (let w = 0; w < shortTerm.length; w++) {
            const lufs = shortTerm[w];
            if (!isFinite(lufs)) continue;

            // Min short-term LUFS pro dynamic range
            if (lufs > -80 && (minLufs === null || lufs < minLufs)) {
                minLufs = lufs;
            }

            const timeStart = (w * stHop) / sampleRate;
            const timeEnd = (w * stHop + stWin) / sampleRate;

            if (lufs < -30) {
                problems.push({
                    type: 'quiet',
                    start: timeStart,
                    end: timeEnd,
                    messageKey: 'tooQuiet',
                    severity: lufs
                });
            }
        }
    }

    // Clipping detekce podle sample peaku na krátkých oknech (0.5s) – rychlejší
    // než plný true peak scan per okno, a clipping je sample-accurate phenomenon.
    const clipWin = Math.floor(sampleRate * 0.5);
    for (let start = 0; start < length; start += clipWin) {
        const end = Math.min(start + clipWin, length);
        let winPeak = 0;
        for (let i = start; i < end; i++) {
            const abs = Math.abs(channelData[i]);
            if (abs > winPeak) winPeak = abs;
        }
        const winPeakDb = winPeak > 0 ? 20 * Math.log10(winPeak) : -Infinity;
        if (winPeakDb > -1) {
            problems.push({
                type: 'loud',
                start: start / sampleRate,
                end: end / sampleRate,
                messageKey: 'clipping',
                severity: winPeakDb
            });
        }
    }

    // Seřadit problémy chronologicky před merge
    problems.sort((a, b) => a.start - b.start);

    // Spojíme sousední problémy stejného typu
    const mergedProblems = [];
    for (const p of problems) {
        const last = mergedProblems[mergedProblems.length - 1];
        if (last && last.type === p.type && p.start - last.end < 1) {
            last.end = p.end;
        } else {
            mergedProblems.push({ ...p });
        }
    }

    // --- Global warnings (celý track, ne per-region) ---
    // Tyhle se netýkají konkrétního času ve skladbě, jsou informativní
    // pro celý soubor. Přidávají se na začátek seznamu problémů.

    // (1) Over-compressed detekce přes Loudness Range (LRA)
    // LRA < 3 LU = master prošel hard limiterem / brick-wall clipperem.
    // Dynamika je už zničená, další normalizace ji nevrátí.
    // Jen informujeme klienta – nic nemažeme.
    if (isFinite(loudnessRange) && loudnessRange > 0 && loudnessRange < 3) {
        mergedProblems.unshift({
            type: 'info',
            start: 0,
            end: length / sampleRate,
            messageKey: 'warnOverCompressed',
            severity: loudnessRange,
            global: true
        });
    }

    // (2) Mono / phase-issue detekce přes stereo korelaci
    // Pearson correlation mezi L a R kanálem:
    //   r ≈ +1.0  → téměř identické kanály (mono content v stereo souboru)
    //   r ≈  0   → plně dekorelované (širá stereo scéna, typické pro mix)
    //   r < 0    → fázové problémy (mono kompatibilita je zničená)
    if (channels.length >= 2) {
        const L = channels[0], R = channels[1];
        const stride = Math.max(1, Math.floor(length / 200000)); // max ~200k vzorků
        let sumLR = 0, sumLL = 0, sumRR = 0;
        for (let i = 0; i < length; i += stride) {
            const l = L[i], r = R[i];
            sumLR += l * r;
            sumLL += l * l;
            sumRR += r * r;
        }
        const denom = Math.sqrt(sumLL * sumRR);
        const correlation = denom > 1e-12 ? sumLR / denom : 1.0;

        if (correlation > 0.98) {
            // Kanály prakticky identické → efektivně mono
            mergedProblems.unshift({
                type: 'info',
                start: 0,
                end: length / sampleRate,
                messageKey: 'warnEffectivelyMono',
                severity: correlation,
                global: true
            });
        } else if (correlation < -0.3) {
            // Silné protifáze → mono kompatibilita zničená (reproduktory vs. sluchátka)
            mergedProblems.unshift({
                type: 'warn',
                start: 0,
                end: length / sampleRate,
                messageKey: 'warnPhaseIssue',
                severity: correlation,
                global: true
            });
        }
    }

    const resolvedMinLufs = minLufs !== null ? minLufs : integratedLufs;

    return {
        // Pole "rmsDb" teď reálně drží integrated LUFS (zpětně kompatibilní název)
        rmsDb: integratedLufs,
        peakDb,                                  // Sample peak (legacy)
        truePeakDb,                              // Skutečný peak po 4× oversamplingu
        lufs: integratedLufs,                    // Nové pole: integrated LUFS
        loudnessRange,                           // LRA (dynamický rozsah v LU)
        minRmsDb: resolvedMinLufs,               // Min short-term LUFS (legacy name)
        dynamicRange: peakDb - resolvedMinLufs,  // Peak-to-quiet
        problems: mergedProblems
    };
}

async function processAudio(channels, sampleRate, length, settings) {
    const reportProgress = (percent, text) => {
        self.postMessage({ type: 'progress', value: percent, text: text });
    };

    reportProgress(5, 'processingPrepare');

    // 0. High-Pass Filter (20Hz) – odstraní DC offset a sub-bass rumble před analýzou
    reportProgress(10, 'processingHPF');
    applyHighPassFilter(channels, length, sampleRate);

    // 1. Smart Leveler
    if (settings.enableNormalize) {
        reportProgress(20, 'processingAGC');
        applySmartLeveler(channels, length, sampleRate, settings);
    }

    // 2. True Peak Limiter se soft clippingem
    reportProgress(60, 'processingLimiter');
    applyTruePeakLimiter(channels, length, sampleRate, settings.ceiling);

    // 3. Fady
    if (settings.enableFadeIn && settings.fadeInTime > 0) {
        reportProgress(70, 'processingFadeIn');
        applyFadeIn(channels, length, sampleRate, settings.fadeInTime);
    }
    if (settings.enableFadeOut && settings.fadeOutTime > 0) {
        reportProgress(75, 'processingFadeOut');
        applyFadeOut(channels, length, sampleRate, settings.fadeOutTime);
    }

    // 4. Analýza výsledku + MP3 enkódování
    reportProgress(80, 'processingEncode');
    const processedAnalysis = analyzeAudio(channels, sampleRate, length);

    const finalBlob = await encodeMP3(channels, length, sampleRate, (p) => {
        reportProgress(80 + p * 18, 'processingEncode');
    });

    // FIX: Transferable objects – přeneseme buffery bez kopírování (nula-copy pro velké soubory)
    const transferList = channels.map(ch => ch.buffer);
    self.postMessage({
        type: 'complete',
        blob: finalBlob,
        processedChannels: channels,
        analysis: processedAnalysis
    }, transferList);
}

// ================= EFFECTS =================

// High-Pass Filter (Biquad – 20 Hz, Q=0.707 Butterworth)
function applyHighPassFilter(channels, length, sampleRate) {
    const numChannels = channels.length;
    const frequency = 20;
    const Q = 0.707;

    const omega = 2 * Math.PI * frequency / sampleRate;
    const alpha = Math.sin(omega) / (2 * Q);
    const cosOmega = Math.cos(omega);

    const a0 = 1 + alpha;
    const b0_n = (1 + cosOmega) / (2 * a0);
    const b1_n = -(1 + cosOmega) / a0;
    const b2_n = (1 + cosOmega) / (2 * a0);
    const a1_n = (-2 * cosOmega) / a0;
    const a2_n = (1 - alpha) / a0;

    for (let ch = 0; ch < numChannels; ch++) {
        const data = channels[ch];
        let x1 = 0, x2 = 0, y1 = 0, y2 = 0;

        for (let i = 0; i < length; i++) {
            const x0 = data[i];
            const y0 = b0_n * x0 + b1_n * x1 + b2_n * x2 - a1_n * y1 - a2_n * y2;
            data[i] = y0;
            x2 = x1; x1 = x0;
            y2 = y1; y1 = y0;
        }
    }
}

// Smart Leveler (LUFS-based, BS.1770-4 K-weighted)
//
// FIX (v14): Úplně přepsáno z RMS na LUFS.
//   Místo dělení aktuálního RMS cíleným RMS počítáme K-weighted loudness
//   per krátké okno (short-term LUFS) a spočítáme gain delta v LU.
//
// Výhody oproti RMS:
//   1. Bass-heavy tracky (EDM) a mid-heavy (valčík) vyjdou po normalizaci
//      SUBJEKTIVNĚ stejně hlasitě (RMS je dělá různě hlasité)
//   2. Kompatibilní se Spotify/Apple/YouTube/EBU R128 standardem
//   3. Ignoruje sub-bass rumble (high-pass @ 38 Hz) a DC
//
// Filozofie "Protect the Drop" zachována: maxBoost zvedá tiché sekce,
// maxAttenuation drží hlasité pod kontrolou, ale bez destrukce dynamiky.
//
// Parametr settings.targetRms je teď interpretovaný jako TARGET LUFS
// (zpětně kompatibilní pole, -14 LUFS default = Spotify/YouTube).
function applySmartLeveler(channels, length, sampleRate, settings) {
    const numChannels = channels.length;
    const targetLufs = settings.targetRms;                 // (pole se jmenuje historicky "targetRms")
    const maxBoostDb = isFinite(settings.maxBoost) ? settings.maxBoost : 18;
    const maxAttenuationDb = isFinite(settings.maxAttenuation) ? settings.maxAttenuation : 6;

    // Okno uživatele: default 1000 ms, clamp 100–5000 ms
    const windowMs = isFinite(settings.windowSize) ? settings.windowSize : 1000;
    const windowMsClamped = Math.max(100, Math.min(5000, windowMs));

    // Změříme short-term LUFS (per uživatelské okno) + získáme integrated
    const loud = measureLoudness(channels, sampleRate, length, {
        shortTermWindowMs: windowMsClamped
    });
    const shortTerm = loud.shortTerm;
    const integratedLufs = loud.integrated;
    const hopSize = loud.shortTermHopSize;

    // Pokud jsme nedostali žádnou short-term hodnotu (track kratší než 400 ms
    // nebo samé ticho), padneme zpět na jednoduchý single-gain leveler.
    if (!shortTerm || shortTerm.length === 0 || !isFinite(integratedLufs)) {
        const deltaDb = isFinite(integratedLufs) ? (targetLufs - integratedLufs) : 0;
        const clampedDb = Math.max(-maxAttenuationDb, Math.min(maxBoostDb, deltaDb));
        const gain = Math.pow(10, clampedDb / 20);
        for (let ch = 0; ch < numChannels; ch++) {
            const data = channels[ch];
            for (let i = 0; i < length; i++) {
                let v = data[i] * gain;
                if (v > 1.0) v = 1.0; else if (v < -1.0) v = -1.0;
                data[i] = isFinite(v) ? v : 0;
            }
        }
        return;
    }

    // Per-window raw gain v lineární doméně
    const numWindows = shortTerm.length;
    const rawGains = new Float32Array(numWindows);
    const silenceFloorLufs = -70; // BS.1770 absolute gate – pod tím je šum

    for (let w = 0; w < numWindows; w++) {
        const lufs = shortTerm[w];
        let gainDb = 0;

        if (isFinite(lufs) && lufs > silenceFloorLufs) {
            gainDb = targetLufs - lufs;
            // Clamp do [-maxAttenuation, +maxBoost]
            if (gainDb > maxBoostDb) gainDb = maxBoostDb;
            else if (gainDb < -maxAttenuationDb) gainDb = -maxAttenuationDb;
        }

        let gain = Math.pow(10, gainDb / 20);
        if (!isFinite(gain) || gain < 1e-4) gain = 1.0;
        rawGains[w] = gain;
    }

    // 2. PRŮCHOD: Exponenciální vyhlazení (Attack/Release)
    // Attack = pomalý nárůst gainU (2000 ms) → zabraňuje pumping při zvedání
    // Release = rychlý pokles (100 ms) → rychle reaguje na přebuzené sekce
    const smoothedGains = new Float32Array(numWindows);
    const dt = hopSize / sampleRate;
    const attackCoeff = 1 - Math.exp(-dt / 2.0);    // 2000 ms
    const releaseCoeff = 1 - Math.exp(-dt / 0.1);   // 100 ms

    let currentGain = rawGains[0];
    for (let w = 0; w < numWindows; w++) {
        let target = rawGains[w];
        if (!isFinite(target)) target = 1.0;
        const coeff = target > currentGain ? attackCoeff : releaseCoeff;
        currentGain += (target - currentGain) * coeff;
        smoothedGains[w] = currentGain;
    }

    // 3. APLIKACE: lineární interpolace mezi okny pro hladký průběh
    // short-term hop je 100 ms (= hopSize samplů), aplikujeme gain na
    // původní (nefiltrované) kanály – K-weighting byl jen pro MĚŘENÍ.
    for (let i = 0; i < length; i++) {
        const pos = i / hopSize;
        let idx = Math.floor(pos);
        if (idx >= numWindows) idx = numWindows - 1;
        const frac = pos - idx;

        const g1 = smoothedGains[idx];
        const g2 = idx + 1 < numWindows ? smoothedGains[idx + 1] : g1;
        let gain = g1 + (g2 - g1) * frac;
        if (!isFinite(gain)) gain = 1.0;

        for (let ch = 0; ch < numChannels; ch++) {
            let val = channels[ch][i] * gain;
            if (val > 1.0) val = 1.0;
            else if (val < -1.0) val = -1.0;
            if (!isFinite(val)) val = 0;
            channels[ch][i] = val;
        }
    }
}

// True Peak Limiter se soft clippingem (6 dB soft knee)
//
// FIX: Konstanty kneeDb/threshold/headroom byly přepočítávány uvnitř sample smyčky
//      (jednou za každý sample = miliony zbytečných Math.pow volání pro dlouhé soubory).
//      Přesunuty ven jako předpočítané hodnoty.
function applyTruePeakLimiter(channels, length, sampleRate, ceilingDb) {
    const numChannels = channels.length;
    const ceiling = Math.pow(10, ceilingDb / 20);
    const lookAhead = Math.floor(sampleRate * 0.005); // 5 ms
    const attackCoeff = Math.exp(-1.0 / (sampleRate * 0.0005));  // 0.5 ms
    const releaseCoeff = Math.exp(-1.0 / (sampleRate * 0.050));  // 50 ms

    // FIX: předpočítané konstanty pro soft knee (byly v inner loop!)
    const kneeDb = ceilingDb - 6.0;
    const threshold = Math.pow(10, kneeDb / 20);
    const headroom = ceiling - threshold;  // rozsah pro tanh saturaci

    const requiredGain = new Float32Array(length).fill(1.0);

    // 1. Průchod: kde nám to přelézá přes strop? Nastavíme requiredGain s look-ahead oknem.
    for (let i = 0; i < length; i++) {
        let maxAbs = 0;
        for (let ch = 0; ch < numChannels; ch++) {
            const abs = Math.abs(channels[ch][i]);
            if (abs > maxAbs) maxAbs = abs;
        }

        if (maxAbs > ceiling) {
            const neededGain = ceiling / maxAbs;
            const startIdx = Math.max(0, i - lookAhead);
            for (let j = startIdx; j <= i; j++) {
                if (neededGain < requiredGain[j]) {
                    requiredGain[j] = neededGain;
                }
            }
        }
    }

    // 2. Aplikace gain reduction + soft clipper
    let currentGain = 1.0;
    for (let i = 0; i < length; i++) {
        const targetGain = requiredGain[i];
        // Attack = rychlý pokles (0.5 ms), Release = pomalý návrat (50 ms)
        currentGain = targetGain < currentGain
            ? attackCoeff * currentGain + (1 - attackCoeff) * targetGain
            : releaseCoeff * currentGain + (1 - releaseCoeff) * targetGain;

        for (let ch = 0; ch < numChannels; ch++) {
            let val = channels[ch][i] * currentGain;

            // Soft knee: tanh saturace 6 dB pod stropem
            if (val > threshold) {
                val = threshold + headroom * Math.tanh((val - threshold) / headroom);
            } else if (val < -threshold) {
                val = -(threshold + headroom * Math.tanh((-val - threshold) / headroom));
            }

            // Absolutní pojistka
            if (val > ceiling) val = ceiling;
            else if (val < -ceiling) val = -ceiling;

            channels[ch][i] = val;
        }
    }
}

// Fade In (sinus křivka – přirozený nástup)
function applyFadeIn(channels, length, sampleRate, fadeInTime) {
    const numChannels = channels.length;
    const fadeInSamples = Math.floor(fadeInTime * sampleRate);
    const loopLen = Math.min(fadeInSamples, length);
    const piHalf = Math.PI / 2;

    for (let ch = 0; ch < numChannels; ch++) {
        const data = channels[ch];
        for (let i = 0; i < loopLen; i++) {
            data[i] *= Math.sin((i / fadeInSamples) * piHalf);
        }
    }
}

// Fade Out (sinus křivka – přirozené doznění)
function applyFadeOut(channels, length, sampleRate, fadeOutTime) {
    const numChannels = channels.length;
    const fadeOutSamples = Math.floor(fadeOutTime * sampleRate);
    const fadeOutStart = Math.max(0, length - fadeOutSamples);
    const piHalf = Math.PI / 2;

    for (let ch = 0; ch < numChannels; ch++) {
        const data = channels[ch];
        for (let i = fadeOutStart; i < length; i++) {
            data[i] *= Math.sin(((length - i) / fadeOutSamples) * piHalf);
        }
    }
}

// MP3 Enkodér (LAME, 320 kbps)
async function encodeMP3(channels, length, sampleRate, onProgress) {
    const numChannels = channels.length;
    const kbps = 320;
    const left = channels[0];
    const right = numChannels > 1 ? channels[1] : left;

    const leftPCM = new Int16Array(length);
    const rightPCM = new Int16Array(length);

    // Převod float32 → int16 s dithering (triangular noise pro maskování kvantizačního zkreslení)
    // FIX: dělitel 32767.5 místo 32768 – symetrický rozsah pro TPDF dither
    for (let i = 0; i < length; i++) {
        const dither = (Math.random() - 0.5 + Math.random() - 0.5) / 32767.5;
        leftPCM[i] = Math.max(-32768, Math.min(32767, Math.round(left[i] * 32767 + dither)));
        rightPCM[i] = Math.max(-32768, Math.min(32767, Math.round(right[i] * 32767 + dither)));
    }

    const mp3encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, kbps);
    const mp3Data = [];
    const chunkSize = 1152; // LAME standard frame size
    const totalChunks = Math.ceil(length / chunkSize);
    let processed = 0;

    for (let i = 0; i < length; i += chunkSize) {
        const lChunk = leftPCM.subarray(i, i + chunkSize);
        const rChunk = rightPCM.subarray(i, i + chunkSize);
        const mp3buf = numChannels === 1
            ? mp3encoder.encodeBuffer(lChunk)
            : mp3encoder.encodeBuffer(lChunk, rChunk);
        if (mp3buf.length > 0) mp3Data.push(mp3buf);

        processed++;
        if (processed % 50 === 0 && onProgress) {
            onProgress(processed / totalChunks);
            await new Promise(r => setTimeout(r, 0)); // Yield pro progress reportování
        }
    }

    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) mp3Data.push(mp3buf);

    return new Blob(mp3Data, { type: 'audio/mpeg' });
}
