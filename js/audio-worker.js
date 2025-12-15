// Taháme sem LAMEjs encoder, protože browser neumí MP3 nativně exportovat
importScripts('https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js');

// Tady posloucháme, co po nás chce hlavní vlákno (Main Thread)
self.onmessage = async function (e) {
    const data = e.data;

    if (data.type === 'process') {
        // Jdeme makat na zvuku (efekty, normalizace, export)
        try {
            await processAudio(data.audioChannels, data.sampleRate, data.length, data.settings);
        } catch (err) {
            self.postMessage({ type: 'error', error: err.message });
        }
    } else if (data.type === 'analyze') {
        // Jenom analýza - pro vykreslení vln a hledání chyb (clipping atd.)
        try {
            const analysis = analyzeAudio(data.audioChannels, data.sampleRate, data.length);
            self.postMessage({ type: 'analysisComplete', analysis: analysis });
        } catch (err) {
            self.postMessage({ type: 'error', error: err.message });
        }
    }
};

// --- Heavy lifting: Analýza audia (běží to tady, aby se nesekalo GUI) ---
function analyzeAudio(channels, sampleRate, length) {
    const channelData = channels[0]; // Pro analýzu stačí jeden kanál (mono)

    let sumSquares = 0;
    let peak = 0;
    const problems = [];

    // Okno 0.5s - v tomhle intervalu hledáme průšvihy
    const windowSize = Math.floor(sampleRate * 0.5);
    let windowSum = 0;
    let windowPeak = 0;
    let windowStart = 0;
    let minRmsDb = 0;

    // Procházíme samply
    for (let i = 0; i < length; i++) {
        const sample = Math.abs(channelData[i]);
        sumSquares += sample * sample;
        if (sample > peak) peak = sample;

        // Analýza okna
        windowSum += sample * sample;
        if (sample > windowPeak) windowPeak = sample;

        // Konec okna - vyhodnotíme
        if ((i + 1) % windowSize === 0 || i === length - 1) {
            const windowRms = Math.sqrt(windowSum / windowSize);
            const windowRmsDb = 20 * Math.log10(windowRms + 0.0001);
            const windowPeakDb = 20 * Math.log10(windowPeak + 0.0001);

            // Hledáme noise floor (nejtišší místo), ať víme, kde je dno
            if (minRmsDb === 0 || windowRmsDb < minRmsDb) {
                if (windowRmsDb > -80) {
                    minRmsDb = windowRmsDb;
                }
            }

            const timeStart = windowStart / sampleRate;
            const timeEnd = (i + 1) / sampleRate;

            // Detekce problémů
            if (windowPeakDb > -1) {
                problems.push({
                    type: 'loud',
                    start: timeStart,
                    end: timeEnd,
                    messageKey: 'clipping',
                    severity: windowPeakDb
                });
            } else if (windowRmsDb < -25) {
                problems.push({
                    type: 'quiet',
                    start: timeStart,
                    end: timeEnd,
                    messageKey: 'tooQuiet',
                    severity: windowRmsDb
                });
            }

            // Reset pro další okno
            windowSum = 0;
            windowPeak = 0;
            windowStart = i + 1;
        }
    }

    // Celkové statistiky
    const rms = Math.sqrt(sumSquares / length);
    const rmsDb = 20 * Math.log10(rms + 0.0001);
    const peakDb = 20 * Math.log10(peak + 0.0001);

    // Spojíme problémy, co jsou hned vedle sebe, ať z toho není guláš
    const mergedProblems = [];
    for (const p of problems) {
        const last = mergedProblems[mergedProblems.length - 1];
        if (last && last.type === p.type && p.start - last.end < 1) {
            last.end = p.end;
        } else {
            mergedProblems.push({ ...p });
        }
    }

    return {
        rmsDb,
        peakDb,
        minRmsDb,
        dynamicRange: peakDb - minRmsDb,
        problems: mergedProblems
    };
}

// --- Tady se děje ta magie úpravy zvuku ---
async function processAudio(channels, sampleRate, length, settings) {
    // Pomocná funkce pro hlášení postupu
    const reportProgress = (percent, text) => {
        self.postMessage({ type: 'progress', value: percent, text: text });
    };

    await reportProgress(5, 'Příprava...');

    // 1. Smart Leveler - srovná hlasitost, ale opatrně (Protect the Drop!)
    if (settings.enableNormalize) {
        await reportProgress(20, 'Analyzuji dynamiku...');
        applySmartLeveler(channels, length, sampleRate, settings);
    }

    // (EQ letěl pryč, bylo to zbytečně složité)

    // 2. Limiter - aby to nešlo do červených a nechrčelo to
    await reportProgress(60, 'Omezuji špičky...');
    applyTruePeakLimiter(channels, length, sampleRate, settings.ceiling);

    // 3. Fady na začátek a konec, ať to neusekne uši
    if (settings.enableFadeIn && settings.fadeInTime > 0) {
        await reportProgress(70, 'Aplikuji Fade In...');
        applyFadeIn(channels, length, sampleRate, settings.fadeInTime);
    }
    if (settings.enableFadeOut && settings.fadeOutTime > 0) {
        await reportProgress(75, 'Aplikuji Fade Out...');
        applyFadeOut(channels, length, sampleRate, settings.fadeOutTime);
    }

    // 4. Finální render do souboru
    await reportProgress(80, settings.exportFormat === 'wav' ? "Exportuji WAV..." : "Enkóduji MP3...");

    // Ještě jednou to projedeme analýzou, ať vidíme výsledek v grafech (před enkódováním)
    const processedAnalysis = analyzeAudio(channels, sampleRate, length);

    let finalBlob;
    if (settings.exportFormat === 'wav') {
        finalBlob = encodeWAV(channels, length, sampleRate);
    } else {
        finalBlob = await encodeMP3(channels, length, sampleRate, (p) => {
            reportProgress(80 + p * 18, 'Enkóduji MP3...');
        });
    }

    self.postMessage({
        type: 'complete',
        blob: finalBlob,
        processedChannels: channels,
        analysis: processedAnalysis
    });
}

// ================= EFEKTY - JÁDRO PUDLA =================

// Smart Leveler (2-fázové AGC) - tohle je ten chytrý algoritmus co "chrání dropy"
function applySmartLeveler(channels, length, sampleRate, settings) {
    const numChannels = channels.length;
    const targetRms = Math.pow(10, settings.targetRms / 20);
    const maxBoost = Math.pow(10, settings.maxBoost / 20);

    // Nastavení okna analýzy
    const windowSeconds = 0.4;
    const windowSize = Math.max(1024, Math.floor(sampleRate * windowSeconds));
    const hopSize = Math.max(512, Math.floor(windowSize / 2));

    const numWindows = Math.ceil(length / hopSize);
    const rawGains = new Float32Array(numWindows);

    // Gate - co je pod tímhle, to ignorujeme (šum)
    const silenceThreshDb = -50;
    const silenceThresh = Math.pow(10, silenceThreshDb / 20);

    // 1. PRŮCHOD: Proletíme to a spočítáme RMS pro každé okno
    for (let w = 0; w < numWindows; w++) {
        const startSample = w * hopSize;
        const endSample = Math.min(startSample + windowSize, length);

        let sumSquares = 0;
        let count = 0;

        const step = 4;
        for (let i = startSample; i < endSample; i += step) {
            let maxAbs = 0;
            for (let ch = 0; ch < numChannels; ch++) {
                const val = channels[ch][i];
                const abs = Math.abs(isFinite(val) ? val : 0);
                if (abs > maxAbs) maxAbs = abs;
            }
            sumSquares += maxAbs * maxAbs;
            count++;
        }

        const rms = count > 0 ? Math.sqrt(sumSquares / count) : 0;

        let targetGain = 1.0;

        if (rms < silenceThresh || rms === 0) {
            targetGain = 1.0;
        } else {
            targetGain = targetRms / rms;
            targetGain = Math.min(targetGain, maxBoost);

            // "Protect the Drop" - Pokud je pasáž hlasitější než cíl, NESNIŽUJEME drasticky hlasitost.
            // Ponecháme ji tak, jak je (nebo jen jemně korigujeme), a necháme Limiter ošetřit špičky.
            // Tím zachováme energii bass-heavy skladeb.
            if (targetGain < 1.0) {
                targetGain = 1.0;
            }

            if (!isFinite(targetGain) || targetGain < 0.0001) targetGain = 1.0;
        }

        rawGains[w] = targetGain;
    }

    // 2. PRŮCHOD: Vyhladíme ty skoky v hlasitosti (Attack/Release)
    const smoothedGains = new Float32Array(numWindows);
    const dt = hopSize / sampleRate;
    const attackMs = 2000;
    const releaseMs = 100;

    const attackCoeff = 1 - Math.exp(-dt / (attackMs / 1000));
    const releaseCoeff = 1 - Math.exp(-dt / (releaseMs / 1000));

    let currentGain = 1.0;
    if (rawGains.length > 0) currentGain = rawGains[0];

    for (let w = 0; w < numWindows; w++) {
        let target = rawGains[w];
        if (!isFinite(target)) target = 1.0;

        if (target < currentGain) {
            currentGain += (target - currentGain) * releaseCoeff;
        } else {
            currentGain += (target - currentGain) * attackCoeff;
        }

        smoothedGains[w] = currentGain;
    }

    // 3. APLIKACE: Přepíšeme data v bufferu upravenou hlasitostí
    for (let i = 0; i < length; i++) {
        const pos = i / hopSize;
        const idx = Math.floor(pos);
        const t = pos - idx;

        const g1 = smoothedGains[idx] || 1.0;
        const g2 = (idx + 1 < numWindows) ? smoothedGains[idx + 1] : g1;

        let gain = g1 + (g2 - g1) * t;
        if (!isFinite(gain)) gain = 1.0;

        for (let ch = 0; ch < numChannels; ch++) {
            let val = channels[ch][i] * gain;

            if (val > 1.0) val = 1.0;
            if (val < -1.0) val = -1.0;
            if (!isFinite(val)) val = 0;

            channels[ch][i] = val;
        }
    }
}


// True Peak Limiter - nekompromisně srazí všechno, co leze přes strop
function applyTruePeakLimiter(channels, length, sampleRate, ceilingDb) {
    const numChannels = channels.length;
    const ceiling = Math.pow(10, ceilingDb / 20);
    const lookAhead = Math.floor(sampleRate * 0.005); // 5ms
    const attackCoeff = Math.exp(-1.0 / (sampleRate * 0.0005));
    const releaseCoeff = Math.exp(-1.0 / (sampleRate * 0.050));

    const requiredGain = new Float32Array(length).fill(1.0);

    // 1. Kde nám to utíká přes čáru?
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

    // 2. Aplikujeme Gain Reduction (plynule, ne skokově)
    let currentGain = 1.0;
    for (let i = 0; i < length; i++) {
        const targetGain = requiredGain[i];
        if (targetGain < currentGain) {
            currentGain = attackCoeff * currentGain + (1 - attackCoeff) * targetGain;
        } else {
            currentGain = releaseCoeff * currentGain + (1 - releaseCoeff) * targetGain;
        }

        for (let ch = 0; ch < numChannels; ch++) {
            let val = channels[ch][i] * currentGain;
            if (val > ceiling) val = ceiling;
            if (val < -ceiling) val = -ceiling;
            channels[ch][i] = val;
        }
    }
}

// Postupný nástup hlasitosti
function applyFadeIn(channels, length, sampleRate, fadeInTime) {
    const numChannels = channels.length;
    const fadeInSamples = Math.floor(fadeInTime * sampleRate);
    const loopLen = Math.min(fadeInSamples, length);

    for (let ch = 0; ch < numChannels; ch++) {
        const data = channels[ch];
        for (let i = 0; i < loopLen; i++) {
            const t = i / fadeInSamples;
            const gain = Math.sin(t * Math.PI / 2);
            data[i] *= gain;
        }
    }
}

// Postupné ztišení na konci
function applyFadeOut(channels, length, sampleRate, fadeOutTime) {
    const numChannels = channels.length;
    const fadeOutSamples = Math.floor(fadeOutTime * sampleRate);
    const fadeOutStart = Math.max(0, length - fadeOutSamples);

    for (let ch = 0; ch < numChannels; ch++) {
        const data = channels[ch];
        for (let i = fadeOutStart; i < length; i++) {
            const t = (length - i) / fadeOutSamples;
            const gain = Math.sin(t * Math.PI / 2);
            data[i] *= gain;
        }
    }
}

// Klasický WAV header - nudná administrativa
function encodeWAV(channels, length, sampleRate) {
    const numChannels = channels.length;
    const left = channels[0];
    const right = numChannels > 1 ? channels[1] : left;

    const buffer = new ArrayBuffer(44 + length * numChannels * 2);
    const view = new DataView(buffer);

    const writeString = (view, offset, string) => {
        for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + length * numChannels * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, length * numChannels * 2, true);

    let offset = 44;
    for (let i = 0; i < length; i++) {
        for (let ch = 0; ch < numChannels; ch++) {
            let sample = ch === 0 ? left[i] : right[i];
            sample = Math.max(-1, Math.min(1, sample));
            sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            view.setInt16(offset, sample, true);
            offset += 2;
        }
    }
    return new Blob([view], { type: 'audio/wav' });
}

// Export do MP3
async function encodeMP3(channels, length, sampleRate, onProgress) {
    const numChannels = channels.length;
    const kbps = 320;
    const left = channels[0];
    const right = numChannels > 1 ? channels[1] : left;

    const leftPCM = new Int16Array(length);
    const rightPCM = new Int16Array(length);

    // Převod float (-1.0 až 1.0) na int16 pro LAME enkodér
    for (let i = 0; i < length; i++) {
        const dither = (Math.random() - 0.5 + Math.random() - 0.5) / 32768; // Trocha šumu (Dither) schová digitální hnus
        leftPCM[i] = Math.max(-32768, Math.min(32767, Math.round(left[i] * 32767 + dither)));
        rightPCM[i] = Math.max(-32768, Math.min(32767, Math.round(right[i] * 32767 + dither)));
    }

    const mp3encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, kbps);
    const mp3Data = [];
    const chunkSize = 1152;
    const totalChunks = Math.ceil(length / chunkSize);
    let processed = 0;

    for (let i = 0; i < length; i += chunkSize) {
        const lChunk = leftPCM.subarray(i, i + chunkSize);
        const rChunk = rightPCM.subarray(i, i + chunkSize);

        let mp3buf = (numChannels === 1) ? mp3encoder.encodeBuffer(lChunk) : mp3encoder.encodeBuffer(lChunk, rChunk);
        if (mp3buf.length > 0) mp3Data.push(mp3buf);

        processed++;
        if (processed % 50 === 0 && onProgress) {
            onProgress(processed / totalChunks);
            await new Promise(r => setTimeout(r, 0));
        }
    }

    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) mp3Data.push(mp3buf);

    return new Blob(mp3Data, { type: 'audio/mpeg' });
}
