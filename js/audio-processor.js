// ============ Audio Processing Module (Kecám s Workerem) ============
import { $, showProcessing, hideProcessing, formatFileSize } from './ui.js';
import { drawWaveform } from './waveform.js';
import { t } from './translations.js';

// Vytaháme data z formuláře, ať víme, co s tím audiem vlastně dělat
function getSettings() {
    const enableNormalize = $('enableNormalize').checked;
    const enableFadeIn = $('enableFadeIn').checked;
    const enableFadeOut = $('enableFadeOut').checked;
    // EQ letěl do koše. User chtěl jen "One Click" magic.

    // Hodnoty pro fade
    const fadeInInput = $('fadeInTime').value;
    const fadeOutInput = $('fadeOutTime').value;
    const fadeInTime = fadeInInput === '' ? 0 : parseFloat(fadeInInput);
    const fadeOutTime = fadeOutInput === '' ? 0 : parseFloat(fadeOutInput);

    // AGC (Auto Gain Control) Config
    const targetRmsInput = $('targetRms');
    const maxBoostInput = $('maxBoost');
    const windowSizeInput = $('windowSize');
    const ceilingInput = $('limiterCeiling');

    return {
        enableNormalize,
        enableFadeIn,
        enableFadeOut,
        fadeInTime,
        fadeOutTime,
        // AGC
        targetRms: targetRmsInput ? parseFloat(targetRmsInput.value) : -14,
        maxBoost: maxBoostInput ? parseFloat(maxBoostInput.value) : 20,
        windowSize: windowSizeInput ? parseFloat(windowSizeInput.value) : 500,
        // Limiter
        ceiling: ceilingInput ? parseFloat(ceilingInput.value) : -1
    };
}

// Tady to posíláme dělníkovi (Workerovi) na pozadí, ať to spočítá
export async function processAudio(state, onComplete) {
    showProcessing(t('processingTitle'), t('processingPrepare'));

    try {
        const audioBuffer = state.originalAudioData;
        const sampleRate = audioBuffer.sampleRate;
        const numChannels = audioBuffer.numberOfChannels;
        const length = audioBuffer.length;

        const settings = getSettings();

        // Připravíme kanály do pole, Worker neumí pracovat přímo s AudioBufferem
        const audioChannels = [];
        for (let i = 0; i < numChannels; i++) {
            audioChannels.push(audioBuffer.getChannelData(i));
        }

        // Nahodíme Workera (s tím časovým razítkem ?v=..., aby se to necachovalo!)
        const worker = new Worker(`js/audio-worker.js?v=${Date.now()}`);

        // UI Progress Bar updater - aby uživatel viděl, že se něco děje
        const updateProgress = (percent, text) => {
            const fill = $('progressFill');
            const percentText = $('progressPercent');
            const subText = $('processingSub');
            if (fill) fill.style.width = `${percent}%`;
            if (percentText) percentText.textContent = `${Math.round(percent)}%`;
            if (subText && text) subText.textContent = text;
        };

        // Zabalíme komunikaci s workerem do Promise, ať můžeme použít async/await
        const workerPromise = new Promise((resolve, reject) => {
            worker.onmessage = (e) => {
                const msg = e.data;
                if (msg.type === 'progress') {
                    updateProgress(msg.value, msg.text);
                } else if (msg.type === 'complete') {
                    resolve(msg);
                } else if (msg.type === 'error') {
                    reject(new Error(msg.error));
                }
            };

            worker.onerror = (err) => {
                reject(err);
            };
        });

        // A jedem! Posíláme data.
        worker.postMessage({
            type: 'process',
            audioChannels: audioChannels,
            sampleRate: sampleRate,
            length: length,
            settings: settings
        });

        // Čekáme, až se dělník ozve, že má hotovo
        const result = await workerPromise;
        worker.terminate();

        // Máme výsledek! Uložíme si Blob a analýzu.
        state.processedBlob = result.blob;
        state.exportFormat = settings.exportFormat;
        state.processedAnalysis = result.analysis; // Analýza z workeru

        // Teď musíme z těch raw dat (PCM) udělat zase AudioBuffer, aby to šlo přehrát v prohlížeči
        let processedBuffer;
        if (result.processedChannels) {
            processedBuffer = state.audioContext.createBuffer(numChannels, length, sampleRate);
            for (let i = 0; i < numChannels; i++) {
                processedBuffer.getChannelData(i).set(result.processedChannels[i]);
            }
        } else {
            // Fallback: kdyby worker neposlal kanály, dekódujeme blob (pomalejší)
            const arrayBuffer = await result.blob.arrayBuffer();
            processedBuffer = await state.audioContext.decodeAudioData(arrayBuffer);
        }

        state.processedAudioData = processedBuffer;

        updateProgress(100, t('processingDone'));

        // Hotovo. Řekneme hlavní appce, jak to dopadlo a co jsme nastavili.
        onComplete({
            normalized: settings.enableNormalize,
            fadeIn: settings.enableFadeIn && settings.fadeInTime > 0,
            fadeOut: settings.enableFadeOut && settings.fadeOutTime > 0,
            fadeInTime: settings.fadeInTime,
            fadeOutTime: settings.fadeOutTime,
            targetRms: settings.targetRms,
            maxBoost: settings.maxBoost,
            ceiling: settings.ceiling,
            format: settings.exportFormat
        });

        hideProcessing();

    } catch (err) {
        hideProcessing();
        alert(`${t('errorProcessing')}: ${err.message}`);
        console.error(err);
    }
}

// Tady se staráme o to, aby uživatel viděl výsledek (grafy, čísla, tlačítka)
export function showResults(state, settings) {
    const { normalized, fadeIn, fadeOut, fadeInTime, fadeOutTime, targetRms, maxBoost, ceiling, format } = settings;

    const analysisCard = $('analysisCard');
    const settingsCard = $('settingsCard');
    const resultCard = $('resultCard');
    const singleProcessActions = document.getElementById('singleProcessActions');

    analysisCard.classList.add('hidden');
    settingsCard.classList.add('hidden');
    if (singleProcessActions) singleProcessActions.classList.add('hidden');
    resultCard.classList.remove('hidden');

    // Použijeme už hotovou analýzu, žádné zdržování počítáním v hlavním vlákně
    const originalAnalysis = state.originalAnalysis || { peakDb: 0, rmsDb: 0, problems: [] };
    const processedAnalysis = state.processedAnalysis || { peakDb: 0, rmsDb: 0, problems: [] };

    // Dvojitý rAF trik - jistota, že je DOM překreslený a canvas má velikost, než začneme kreslit
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            drawWaveform('processedWaveform', state.processedAudioData, []);
            drawWaveform('compareOriginalWaveform', state.originalAudioData, originalAnalysis.problems);
            drawWaveform('compareProcessedWaveform', state.processedAudioData, []);
        });
    });

    $('originalStats').innerHTML = `${t('peak')}: <b>${originalAnalysis.peakDb.toFixed(1)} dB</b> <br> ${t('rms')}: <b>${originalAnalysis.rmsDb.toFixed(1)} dB</b>`;
    $('processedStats').innerHTML = `${t('peak')}: <b>${processedAnalysis.peakDb.toFixed(1)} dB</b> <br> ${t('rms')}: <b>${processedAnalysis.rmsDb.toFixed(1)} dB</b>`;

    let changesHTML = '';

    if (normalized) {
        const rmsDiff = processedAnalysis.rmsDb - originalAnalysis.rmsDb;
        const rmsDiffStr = rmsDiff >= 0 ? `+${rmsDiff.toFixed(1)}` : rmsDiff.toFixed(1);
        changesHTML += `
            <div class="analysis-item">
                <span class="label">${t('changeNormalized')}</span>
                <span class="value success">${t('target')}: ${targetRms} dB RMS</span>
            </div>
            <div class="analysis-item">
                <span class="label">${t('changeLimiter')}</span>
                <span class="value success">${ceiling} dB</span>
            </div>
            <div class="analysis-item">
                <span class="label">${t('changeRmsChange')}</span>
                <span class="value ${rmsDiff > 0 ? 'success' : ''}">${rmsDiffStr} dB</span>
            </div>
        `;
    }

    changesHTML += `
        <div class="analysis-item">
            <span class="label">${t('peak')}</span>
            <span class="value ${processedAnalysis.peakDb > -0.5 ? 'warning' : 'success'}">${originalAnalysis.peakDb.toFixed(1)} → ${processedAnalysis.peakDb.toFixed(1)} dB</span>
        </div>
    `;

    if (fadeIn) {
        changesHTML += `
            <div class="analysis-item">
                <span class="label">${t('changeFadeIn')}</span>
                <span class="value success">${fadeInTime}s</span>
            </div>
        `;
    }
    if (fadeOut) {
        changesHTML += `
            <div class="analysis-item">
                <span class="label">${t('changeFadeOut')}</span>
                <span class="value success">${fadeOutTime}s</span>
            </div>
        `;
    }

    // Format info
    changesHTML += `
        <div class="analysis-item">
            <span class="label">Formát</span>
            <span class="value success">${format ? format.toUpperCase() : 'MP3'}</span>
        </div>
    `;

    const originalSize = state.originalFile.size;
    const processedSize = state.processedBlob.size;
    changesHTML += `
        <div class="analysis-item">
            <span class="label">${t('size')}</span>
            <span class="value">${formatFileSize(originalSize)} → ${formatFileSize(processedSize)}</span>
        </div>
    `;

    $('changesDescription').innerHTML = changesHTML;

    // Auto-switch na záložku "Upravené". Uživatel to tak chtěl a řeší to i glitch s vykreslením.
    const processedTabBtn = document.querySelector('button[data-tab="processed"]');
    if (processedTabBtn) {
        processedTabBtn.click();
    }

    return state.processedAudioData.duration;
}

