// ============ Audio Processing Module (Kecám s Workerem) ============
import { $, showProcessing, hideProcessing, formatFileSize } from './ui.js';
import { drawWaveform } from './waveform.js';
import { t } from './translations.js';
import { clampAgcSettings } from './audio-validation.js';

// Vytáhneme data z formuláře a clampneme na bezpečné meze.
// clampAgcSettings() brání ničení zvuku extrémními hodnotami (např. -60 dB ceiling, 40 dB boost),
// a to i kdyby uživatel obešel HTML min/max atributy přes DevTools.
function getSettings() {
    const enableNormalize = $('enableNormalize').checked;
    const enableFadeIn = $('enableFadeIn').checked;
    const enableFadeOut = $('enableFadeOut').checked;

    const fadeInTime = parseFloat($('fadeInTime').value) || 0;
    const fadeOutTime = parseFloat($('fadeOutTime').value) || 0;

    const targetRmsInput = $('targetRms');
    const maxBoostInput = $('maxBoost');
    const maxAttenuationInput = $('maxAttenuation');
    const windowSizeInput = $('windowSize');
    const ceilingInput = $('limiterCeiling');

    const raw = {
        enableNormalize,
        enableFadeIn,
        enableFadeOut,
        fadeInTime,
        fadeOutTime,
        // AGC
        targetRms: targetRmsInput ? parseFloat(targetRmsInput.value) : -14,
        maxBoost: maxBoostInput ? parseFloat(maxBoostInput.value) : 18,
        maxAttenuation: maxAttenuationInput ? parseFloat(maxAttenuationInput.value) : 6,
        windowSize: windowSizeInput ? parseFloat(windowSizeInput.value) : 1000,
        // Limiter
        ceiling: ceilingInput ? parseFloat(ceilingInput.value) : -1
    };

    return clampAgcSettings(raw);
}

// Posíláme audio na zpracování do Web Workeru na pozadí.
//
// FIX: Chyby se nyní propagují (re-throw) místo tiché konzumace.
//      Dříve catch blok zavolal alert() a vrátil undefined → onComplete se nikdy nevolal
//      → v batch módu Promise visela navždy a fronta se zasekla.
export async function processAudio(state, onComplete) {
    showProcessing(t('processingTitle'), t('processingPrepare'));

    try {
        const audioBuffer = state.originalAudioData;
        const sampleRate = audioBuffer.sampleRate;
        const numChannels = audioBuffer.numberOfChannels;
        const length = audioBuffer.length;

        const settings = getSettings();

        // Zkopírujeme kanály do nových bufferů, aby se přenesly jako Transferable objects
        // (worker data modifikuje in-place – bez kopie bychom znehodnotili originální AudioBuffer)
        const audioChannels = [];
        const transferList = [];
        for (let i = 0; i < numChannels; i++) {
            const copy = new Float32Array(audioBuffer.getChannelData(i));
            audioChannels.push(copy);
            transferList.push(copy.buffer);
        }

        // Worker s verzí pro cache busting (fixní verze místo Date.now() = stabilnější)
        const worker = new Worker('js/audio-worker.js?v=14');

        const updateProgress = (percent, textOrKey) => {
            const fill = $('progressFill');
            const percentText = $('progressPercent');
            const subText = $('processingSub');
            if (fill) fill.style.width = `${percent}%`;
            if (percentText) percentText.textContent = `${Math.round(percent)}%`;
            // Worker posílá i18n klíče – přeložíme; pokud klíč neexistuje, zobrazíme raw string
            if (subText && textOrKey) subText.textContent = t(textOrKey) !== textOrKey ? t(textOrKey) : textOrKey;
        };

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
            worker.onerror = (err) => reject(err);
        });

        // Posíláme data jako Transferable objects (nulová kopie pro velké soubory)
        worker.postMessage({
            type: 'process',
            audioChannels,
            sampleRate,
            length,
            settings
        }, transferList);

        const result = await workerPromise;
        worker.terminate();

        state.processedBlob = result.blob;
        state.processedAnalysis = result.analysis;

        // Sestavíme AudioBuffer z vrácených kanálů (přišly jako Transferable → žádná další kopie)
        let processedBuffer;
        if (result.processedChannels) {
            processedBuffer = state.audioContext.createBuffer(numChannels, length, sampleRate);
            for (let i = 0; i < numChannels; i++) {
                processedBuffer.getChannelData(i).set(result.processedChannels[i]);
            }
        } else {
            // Fallback: dekódujeme blob (pomalejší, nemělo by nastat)
            const arrayBuffer = await result.blob.arrayBuffer();
            processedBuffer = await state.audioContext.decodeAudioData(arrayBuffer);
        }

        state.processedAudioData = processedBuffer;
        updateProgress(100, t('processingDone'));

        onComplete({
            normalized: settings.enableNormalize,
            fadeIn: settings.enableFadeIn && settings.fadeInTime > 0,
            fadeOut: settings.enableFadeOut && settings.fadeOutTime > 0,
            fadeInTime: settings.fadeInTime,
            fadeOutTime: settings.fadeOutTime,
            targetRms: settings.targetRms,
            maxBoost: settings.maxBoost,
            ceiling: settings.ceiling,
            format: state.exportFormat || 'mp3'
        });

        hideProcessing();

    } catch (err) {
        hideProcessing();
        // FIX: Re-throw – volající (single mode nebo batch) si chybu ošetří sám
        throw err;
    }
}

// Zobrazení výsledků v UI
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

    const originalAnalysis = state.originalAnalysis || { peakDb: 0, rmsDb: 0, problems: [] };
    const processedAnalysis = state.processedAnalysis || { peakDb: 0, rmsDb: 0, problems: [] };

    // Double rAF – jistota, že canvas má rozměry před kreslením
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            drawWaveform('processedWaveform', state.processedAudioData, []);
            drawWaveform('compareOriginalWaveform', state.originalAudioData, originalAnalysis.problems);
            drawWaveform('compareProcessedWaveform', state.processedAudioData, []);
        });
    });

    // FIX (v14): hodnoty v poli rmsDb jsou teď integrated LUFS,
    // peakDb je sample peak, truePeakDb je ITU BS.1770 true peak (4× oversampled)
    const origLufs = isFinite(originalAnalysis.rmsDb) ? originalAnalysis.rmsDb : -70;
    const procLufs = isFinite(processedAnalysis.rmsDb) ? processedAnalysis.rmsDb : -70;
    const origPeak = isFinite(originalAnalysis.truePeakDb) ? originalAnalysis.truePeakDb : originalAnalysis.peakDb;
    const procPeak = isFinite(processedAnalysis.truePeakDb) ? processedAnalysis.truePeakDb : processedAnalysis.peakDb;
    const peakUnit = isFinite(originalAnalysis.truePeakDb) ? 'dBTP' : 'dBFS';

    $('originalStats').innerHTML = `${t('peak')}: <b>${origPeak.toFixed(1)} ${peakUnit}</b> <br> ${t('loudness')}: <b>${origLufs.toFixed(1)} LUFS</b>`;
    $('processedStats').innerHTML = `${t('peak')}: <b>${procPeak.toFixed(1)} ${peakUnit}</b> <br> ${t('loudness')}: <b>${procLufs.toFixed(1)} LUFS</b>`;

    let changesHTML = '';

    if (normalized) {
        const lufsDiff = procLufs - origLufs;
        const lufsDiffStr = lufsDiff >= 0 ? `+${lufsDiff.toFixed(1)}` : lufsDiff.toFixed(1);
        changesHTML += `
            <div class="analysis-item">
                <span class="label">${t('changeNormalized')}</span>
                <span class="value success">${t('target')}: ${targetRms} LUFS</span>
            </div>
            <div class="analysis-item">
                <span class="label">${t('changeLimiter')}</span>
                <span class="value success">${ceiling} dBTP</span>
            </div>
            <div class="analysis-item">
                <span class="label">${t('changeLoudnessDelta')}</span>
                <span class="value ${lufsDiff > 0 ? 'success' : ''}">${lufsDiffStr} LU</span>
            </div>
        `;
    }

    changesHTML += `
        <div class="analysis-item">
            <span class="label">${t('peak')}</span>
            <span class="value ${procPeak > -0.5 ? 'warning' : 'success'}">${origPeak.toFixed(1)} → ${procPeak.toFixed(1)} ${peakUnit}</span>
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

    changesHTML += `
        <div class="analysis-item">
            <span class="label">${t('formatLabel')}</span>
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

    // Auto-switch na záložku "Upravené"
    const processedTabBtn = document.querySelector('button[data-tab="processed"]');
    if (processedTabBtn) processedTabBtn.click();

    return state.processedAudioData.duration;
}
