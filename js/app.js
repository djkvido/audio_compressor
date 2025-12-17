// ============ Audio Studio - Tady to celé začíná ============

// !!! PWA CLEANUP: Force unregister old Service Workers !!!
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
        for (let registration of registrations) {
            console.log('Cleaning up old Service Worker:', registration);
            registration.unregister();
        }
    });
}

import { $, formatTime, formatFileSize, showProcessing, hideProcessing, switchTab } from './ui.js';
import { drawWaveform, displayProblems, updateWaveformPlayhead, clearWaveformPlayhead } from './waveform.js';
import { processAudio, showResults } from './audio-processor.js';
import { initLanguage, setLanguage, t } from './translations.js';

// ============ State Management ============
// Tady držíme všechna data, aby se nám to nerozpadlo pod rukama
const state = {
    originalFile: null,
    originalAudioData: null,
    processedAudioData: null,
    processedBlob: null,
    audioContext: null,
    // Fronta pro batch processing (když tam toho uživatel nahází víc)
    batchQueue: [],
    exportFormat: 'mp3'
};

// Reference na audio elementy (HTMLAudioElement) pro přehrávání
// Držíme si je bokem, abychom je mohli pauznout/smazat když je potřeba
let audioElements = {
    original: null,
    processed: null
};
let playbackIntervals = {
    original: null,
    processed: null
};

// ============ DOM Elementy ============
// Inicializujeme až v init(), aby to nespadlo na null (Chrome fix)
let uploadZone, uploadHint, fileInput, fileInfo;
let analysisCard, settingsCard, resultCard;
let batchListCard, batchProcessActions;

// ============ Startujeme ============
function init() {
    try {
        console.log("App initializing...");

        // DOM Init
        uploadZone = $('uploadZone');
        uploadHint = $('uploadHint');
        fileInput = $('fileInput');
        fileInfo = $('fileInfo');
        analysisCard = $('analysisCard');
        settingsCard = $('settingsCard');
        resultCard = $('resultCard');
        batchListCard = $('batchListCard');
        batchProcessActions = $('batchProcessActions');

        initLanguage();
    } catch (e) {
        console.error("DOM/Language init failed:", e);
    }

    try {
        setupEventListeners();
        console.log("Event listeners setup complete.");
    } catch (e) {
        alert("Critical Error: UI Setup Failed. " + e.message);
        console.error("UI Setup failed:", e);
    }

    // Initialize Audio Context lazily or safely
    try {
        if (!window.AudioContext && !window.webkitAudioContext) {
            console.warn("Web Audio API not supported");
        }
    } catch (e) {
        console.error("Audio support check failed:", e);
    }
}

function setupEventListeners() {
    // Drag & Drop zóna - aby to fungovalo tak intuitivně jak všichni čekají
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', e => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });
    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });
    uploadZone.addEventListener('drop', e => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            handleFiles(e.dataTransfer.files);
        }
    });

    // Globální Drag & Drop - pojistka, kdyby to uživatel pustil vedle zóny
    document.addEventListener('dragover', e => {
        e.preventDefault();
    });
    document.addEventListener('drop', e => {
        e.preventDefault();
        if (e.target !== uploadZone && !uploadZone.contains(e.target)) {
            if (e.dataTransfer.files.length) {
                handleFiles(e.dataTransfer.files);
            }
        }
    });

    // Obsluha klávesnice (mezerník = play/pause, šipky = posun)
    document.addEventListener('keydown', e => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (e.code === 'Space') {
            e.preventDefault();
            // Přehrát aktivní podle A/B přepínače (pokud existuje)
            // Fix: Respektujeme aktuální stav A/B i po pauze
            if (audioElements[currentAB]) {
                togglePlayback(currentAB);
            } else if (audioElements.original) {
                // Fallback, kdyby náhodou
                togglePlayback('original');
            }
        } else if (e.code === 'ArrowLeft') {
            e.preventDefault();
            seekRelative(-5);
        } else if (e.code === 'ArrowRight') {
            e.preventDefault();
            seekRelative(5);
        }
    });

    fileInput?.addEventListener('change', e => {
        if (e.target.files.length) {
            handleFiles(e.target.files);
        }
    });

    // Odstranit soubor
    $('removeFile')?.addEventListener('click', resetApp);
    $('clearBatch')?.addEventListener('click', resetApp);

    // Spuštění zpracování jednoho souboru (Single mode)
    $('processBtn')?.addEventListener('click', () => {
        showWarningModal(() => {
            processAudio(state, (settings) => {
                const duration = showResults(state, settings);
                const timeEl = $('timeProcessed');
                if (timeEl) timeEl.textContent = `0:00 / ${formatTime(duration)}`;
            });
        });
    });

    // Tlačítko Zpracovat (Batch)
    $('processBatchBtn')?.addEventListener('click', () => {
        showWarningModal(() => {
            processBatchQueue();
        });
    });

    // Tlačítko Stáhnout Batch (ZIP)
    $('downloadBatchBtn')?.addEventListener('click', () => {
        if (!state.batchZipBlob) return;

        const url = URL.createObjectURL(state.batchZipBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = "audio_studio_batch.zip";
        link.click();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });

    // Přehrávač - Ovládání pro Originál
    $('playOriginal')?.addEventListener('click', () => togglePlayback('original'));
    $('progressOriginal')?.addEventListener('click', e => seekAudio(e, 'original'));

    // Přehrávač - Ovládání pro Výsledek (Upravené)
    $('playProcessed')?.addEventListener('click', () => togglePlayback('processed'));
    $('progressProcessed')?.addEventListener('click', e => seekAudio(e, 'processed'));

    // Kliknutí přímo do grafu vlny (Canvasu) pro rychlý posun
    document.addEventListener('click', e => {
        const canvas = e.target;
        if (canvas?.classList?.contains('waveform-canvas')) {
            const canvasId = canvas.id;

            if (canvasId === 'originalWaveform' || canvasId === 'compareOriginalWaveform') {
                seekOnWaveform(e, 'original');
            } else if (canvasId === 'processedWaveform' || canvasId === 'compareProcessedWaveform') {
                seekOnWaveform(e, 'processed');
            }
        }
    });

    // Přepínání záložek (Tabs logic)
    document.querySelectorAll('.tab:not([data-settings-tab])').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab, redrawWaveformsForTab));
    });

    // Výběr presetu
    const presetSelect = $('agcPreset');
    if (presetSelect) {
        presetSelect.addEventListener('change', handlePresetChange);
        handlePresetChange(); // Init
    }

    // Formát exportu
    $('exportFormat')?.addEventListener('change', (e) => {
        state.exportFormat = e.target.value;
        const btnTextKey = state.exportFormat === 'wav' ? 'downloadBtnWav' : 'downloadBtnMp3';
        const btnSpan = $('downloadBtn')?.querySelector('span');
        if (btnSpan) {
            btnSpan.setAttribute('data-i18n', btnTextKey);
            btnSpan.textContent = t(btnTextKey);
        }
    });

    // Tlačítka Zpět a Stáhnout
    $('backBtn')?.addEventListener('click', () => {
        if (audioElements.processed) {
            audioElements.processed.pause();
            audioElements.processed = null;
        }
        clearInterval(playbackIntervals.processed);
        state.processedBlob = null; // Vyčistit pro nové zpracování

        resultCard?.classList.add('hidden');
        settingsCard?.classList.remove('hidden');
        analysisCard?.classList.remove('hidden');

        const singleActions = document.getElementById('singleProcessActions');
        if (singleActions) singleActions.classList.remove('hidden');
    });
    $('downloadBtn')?.addEventListener('click', downloadProcessed);

    // A/B Toggle
    const abToggle = $('abToggle');
    if (abToggle) {
        abToggle.addEventListener('click', handleABToggle);
    }

    // Toggle Advanced Settings (Robusní verze pro Chrome)
    const toggleAdvancedBtn = $('toggleAdvancedSettings');
    const advancedContent = $('advancedSettingsContent');

    if (toggleAdvancedBtn && advancedContent) {
        toggleAdvancedBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent accidental form submissions or weird behavior
            try {
                const isHidden = advancedContent.classList.contains('hidden');
                if (isHidden) {
                    // Check if modal exists
                    if (typeof showWarningModal === 'function') {
                        showWarningModal(() => {
                            advancedContent.classList.remove('hidden');
                            toggleAdvancedBtn.classList.add('active');
                        }, 'advancedWarningTitle', 'advancedWarningBody');
                    } else {
                        // Fallback if modal missing
                        advancedContent.classList.remove('hidden');
                        toggleAdvancedBtn.classList.add('active');
                    }
                } else {
                    advancedContent.classList.add('hidden');
                    toggleAdvancedBtn.classList.remove('active');
                }
            } catch (err) {
                console.error("Settings toggle failed:", err);
                alert("Settings Error: " + err.message);
            }
        });
    } else {
        console.warn("Settings elements not found in DOM");
    }

    // Přepínač jazyků (rozbalovací menu)
    const langBtn = $('langBtn');
    const langMenu = $('langMenu');



    if (langBtn && langMenu) {
        langBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const expanded = langBtn.getAttribute('aria-expanded') === 'true';
            langBtn.setAttribute('aria-expanded', !expanded);
            langMenu.classList.toggle('hidden');
        });

        document.addEventListener('click', (e) => {
            if (!langBtn.contains(e.target) && !langMenu.contains(e.target)) {
                langBtn.setAttribute('aria-expanded', 'false');
                langMenu.classList.add('hidden');
            }
        });

        window.changeLanguage = (lang) => {
            setLanguage(lang);
            updateLanguageUI(lang);
            langBtn.setAttribute('aria-expanded', 'false');
            langMenu.classList.add('hidden');
        };

        const currentLang = localStorage.getItem('audioStudioLang') || 'en';
        updateLanguageUI(currentLang);
    }
}

function updateLanguageUI(lang) {
    const langNames = {
        'cs': 'Čeština',
        'en': 'English',
        'de': 'Deutsch',
        'pl': 'Polski'
    };

    const flagUrls = {
        'cs': 'https://flagcdn.com/24x18/cz.png',
        'en': 'https://flagcdn.com/24x18/gb.png',
        'de': 'https://flagcdn.com/24x18/de.png',
        'pl': 'https://flagcdn.com/24x18/pl.png'
    };

    const label = document.getElementById('currentLangLabel');
    const flag = document.getElementById('currentFlag');

    if (label) label.textContent = langNames[lang];
    if (flag) {
        flag.src = flagUrls[lang];
        flag.alt = lang.toUpperCase();
    }
}

// ============ Presety pro AGC ============
// Přednastavené hodnoty pro lenochy, co nechtějí ladit každé číslo
const AGC_PRESETS = {
    light: {
        targetRms: -16,
        maxBoost: 12,
        windowSize: 1500
    },
    standard: {
        targetRms: -14,
        maxBoost: 18,
        windowSize: 1000
    },
    heavy: {
        targetRms: -12,
        maxBoost: 24,
        windowSize: 600
    },
    custom: {
        // Custom bere hodnoty z inputů
    }
};

function handlePresetChange() {
    const presetSelect = $('agcPreset');
    const preset = presetSelect.value;

    if (preset !== 'custom') {
        const presetValues = AGC_PRESETS[preset];
        if (presetValues.targetRms !== undefined) {
            $('targetRms').value = presetValues.targetRms;
            $('maxBoost').value = presetValues.maxBoost;
            $('windowSize').value = presetValues.windowSize;
        }
    }
}

// A/B Testování - aby si uživatel mohl rychle porovnat změnu (při přehrávání)
let currentAB = 'original'; // Výchozí stav (shoduje se s HTML)

function updateABVisuals(type) {
    const aLabel = document.querySelector('.ab-a');
    const bLabel = document.querySelector('.ab-b');

    // Safety check
    if (!aLabel || !bLabel) return;

    if (type === 'original') {
        aLabel.classList.add('active');
        bLabel.classList.remove('active');
    } else {
        aLabel.classList.remove('active');
        bLabel.classList.add('active');
    }
    currentAB = type;
}

function handleABToggle() {
    const originalPlaying = audioElements.original && !audioElements.original.paused;
    const processedPlaying = audioElements.processed && !audioElements.processed.paused;

    // Logika přepnutí:
    // 1. Pokud hraje A -> přepni na B
    // 2. Pokud hraje B -> přepni na A
    // 3. Pokud nehraje nic -> přepni stav (visual) na ten druhý, než je teď

    if (originalPlaying) {
        // Hraje originál -> přepnout na upravené
        // Chrome fix: Ensure we pass current time safely
        const time = audioElements.original ? audioElements.original.currentTime : 0;
        switchToAudio('processed', time);
    } else if (processedPlaying) {
        // Hraje upravené -> přepnout na originál
        const time = audioElements.processed ? audioElements.processed.currentTime : 0;
        switchToAudio('original', time);
    } else {
        // Nic nehraje - jen přepneme "přepínač"
        // Toggle logic: if 'original', switch to 'processed', else 'original'
        const newType = currentAB === 'original' ? 'processed' : 'original';
        updateABVisuals(newType);

        // Pokud existuje audio pro nový typ a jsme 'paused', nastavíme mu čas toho druhého
        // (aby při play začal tam kde jsme skončili)
        const oldType = newType === 'original' ? 'processed' : 'original';
        if (audioElements[oldType] && audioElements[newType]) {
            audioElements[newType].currentTime = audioElements[oldType].currentTime;
        }
    }
}

// Pomocná funkce pro A/B přepnutí za běhu
function switchToAudio(targetType, currentTime) {
    const sourceType = targetType === 'original' ? 'processed' : 'original';

    // 1. Stopnout současné
    if (audioElements[sourceType]) {
        audioElements[sourceType].pause();
        updatePlayIcon(sourceType, false);
        clearInterval(playbackIntervals[sourceType]);
        clearAllWaveformPlayheads(sourceType);
    }

    // 2. Spustit cílové
    if (!audioElements[targetType]) {
        if (targetType === 'original' && state.originalFile) {
            audioElements[targetType] = new Audio(URL.createObjectURL(state.originalFile));
        } else if (targetType === 'processed' && state.processedBlob) {
            audioElements[targetType] = new Audio(URL.createObjectURL(state.processedBlob));
        } else {
            return; // Není co přehrát
        }

        // Setup event listenerů (jen jednou)
        audioElements[targetType].addEventListener('ended', () => {
            updatePlayIcon(targetType, false);
            clearInterval(playbackIntervals[targetType]);
            updateProgress(targetType, 0);
            clearAllWaveformPlayheads(targetType);
        });
    }

    const audio = audioElements[targetType];

    // Chrome Fix: Ensure metadata is loaded before seeking
    const playSafe = () => {
        audio.currentTime = currentTime;
        audio.play().then(() => {
            updatePlayIcon(targetType, true);

            // Interval pro update UI
            if (playbackIntervals[targetType]) clearInterval(playbackIntervals[targetType]);
            playbackIntervals[targetType] = setInterval(() => {
                if (!audio.paused) {
                    const ratio = audio.currentTime / audio.duration;
                    updateProgress(targetType, ratio);
                    updateTimeDisplay(targetType, audio.currentTime, audio.duration);
                    updateAllWaveformPlayheads(targetType, ratio);
                }
            }, 50);

            // Aktualizace vizuálu tlačítka
            updateABVisuals(targetType);

        }).catch(err => {
            console.error("Playback failed:", err);
            // Auto-resume audio context if suspended (Chrome policy)
            if (state.audioContext && state.audioContext.state === 'suspended') {
                state.audioContext.resume().then(() => playSafe());
            }
        });
    };

    if (audio.readyState >= 1) { // 1 = HAVE_METADATA
        playSafe();
    } else {
        audio.addEventListener('loadedmetadata', playSafe, { once: true });
    }
}

function redrawWaveformsForTab(tabName) {
    if (!state.processedAudioData) return;

    // Prozatím jen vykreslení
    if (tabName === 'processed') {
        drawWaveform('processedWaveform', state.processedAudioData, []);
    } else if (tabName === 'compare') {
        // Zde by měly být problémy z originálu, pokud je máme
        drawWaveform('compareOriginalWaveform', state.originalAudioData, state.originalAnalysis ? state.originalAnalysis.problems : []);
        drawWaveform('compareProcessedWaveform', state.processedAudioData, []);
    }
}

// Hlavní router pro zpracování souborů (rozhoduje zda Single nebo Batch)
function handleFiles(files) {
    if (files.length === 0) return;

    if (state.batchQueue.length > 0 || files.length > 1) {
        handleBatchFiles(files);
    } else {
        handleSingleFile(files[0]);
    }
}

async function handleSingleFile(file) {
    if (!validateFile(file)) return;

    state.originalFile = file;

    $('fileName').textContent = file.name;
    $('fileMetadata').textContent = `${formatFileSize(file.size)}`;

    uploadZone.classList.add('hidden');
    uploadHint.classList.add('hidden');
    fileInfo.classList.remove('hidden');

    const promoCard = document.querySelector('.feature-promo-card');
    if (promoCard) promoCard.classList.add('hidden');

    if (batchListCard) batchListCard.classList.add('hidden');
    if (batchProcessActions) batchProcessActions.classList.add('hidden');

    const singleActions = document.getElementById('singleProcessActions');
    if (singleActions) singleActions.classList.remove('hidden');

    await analyzeOriginal(file);
}

function handleBatchFiles(files) {
    const newFiles = Array.from(files).filter(validateFile);
    state.batchQueue = [...state.batchQueue, ...newFiles];

    renderBatchList();

    uploadZone.classList.add('hidden');
    uploadHint.classList.add('hidden');

    const promoCard = document.querySelector('.feature-promo-card');
    if (promoCard) promoCard.classList.add('hidden');

    settingsCard.classList.remove('hidden');

    if (batchListCard) batchListCard.classList.remove('hidden');

    const singleActions = document.getElementById('singleProcessActions');
    if (singleActions) singleActions.classList.add('hidden');

    if (batchProcessActions) batchProcessActions.classList.remove('hidden');
}

function renderBatchList() {
    const batchList = $('batchList');
    batchList.innerHTML = '';

    state.batchQueue.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'batch-item';
        item.id = `batchItem-${index}`;
        item.innerHTML = `
            <span class="batch-item-name">${file.name}</span>
            <span class="batch-status pending">Čeká</span>
        `;
        batchList.appendChild(item);
    });
}

// Batch Processor - tohle chroustá celou frontu souborů naraz
async function processBatchQueue() {
    if (state.batchQueue.length === 0) return;

    const zip = new JSZip();
    const folder = zip.folder("processed_audio");

    $('processBatchBtn').disabled = true;
    $('processBatchBtn').textContent = t('processingTitle');

    for (let i = 0; i < state.batchQueue.length; i++) {
        const file = state.batchQueue[i];
        const itemStatus = $(`batchItem-${i}`).querySelector('.batch-status');

        itemStatus.className = 'batch-status processing';
        itemStatus.textContent = t('processingTitle');
        itemStatus.scrollIntoView({ behavior: 'smooth', block: 'center' });

        try {
            if (!state.audioContext) state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await state.audioContext.decodeAudioData(arrayBuffer);

            state.originalAudioData = audioBuffer;
            state.originalFile = file;

            await new Promise((resolve, reject) => {
                processAudio(state, (settings) => {
                    resolve();
                }).catch(reject);
            });

            const extension = state.exportFormat || 'mp3';
            const fileName = file.name.replace(/\.[^.]+$/, '') + `_upraveno.${extension}`;
            folder.file(fileName, state.processedBlob);

            itemStatus.className = 'batch-status done';
            itemStatus.textContent = t('processingDone') + ' ✅';

        } catch (err) {
            console.error(err);
            itemStatus.className = 'batch-status error';
            itemStatus.textContent = 'Chyba ❌';
            itemStatus.style.color = 'var(--danger)';
        }
    }

    $('processBatchBtn').textContent = t('processingZip');
    try {
        state.batchZipBlob = await zip.generateAsync({ type: "blob" });

        $('processBatchBtn').classList.add('hidden');
        $('downloadBatchBtn').classList.remove('hidden');
        $('batchStatusMsg').classList.remove('hidden');
        $('settingsCard').classList.add('hidden');

        $('processBatchBtn').textContent = t('processAll');
        $('processBatchBtn').disabled = false;

    } catch (err) {
        alert("Chyba při tvorbě ZIP: " + err.message);
        $('processBatchBtn').disabled = false;
    }
}

function validateFile(file) {
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|m4a|ogg|flac|aac)$/i)) {
        alert(t('errorInvalidFormat') + `: ${file.name}`);
        return false;
    }
    return true;
}

// Analýza originálu (hodíme to na Workera, ať se neseká UI)
async function analyzeOriginal(file) {
    showProcessing(t('analyzingAudio'), t('calculatingLoudness'));

    try {
        if (!state.audioContext) {
            state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await state.audioContext.decodeAudioData(arrayBuffer);
        state.originalAudioData = audioBuffer;

        // Spuštění analýzy ve workeru
        const worker = new Worker('js/audio-worker.js');

        // Data pro worker
        const audioChannels = [];
        for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
            audioChannels.push(audioBuffer.getChannelData(i));
        }

        worker.postMessage({
            type: 'analyze',
            audioChannels: audioChannels,
            sampleRate: audioBuffer.sampleRate,
            length: audioBuffer.length
        });

        const analysis = await new Promise((resolve, reject) => {
            worker.onmessage = (e) => {
                if (e.data.type === 'analysisComplete') {
                    resolve(e.data.analysis);
                } else if (e.data.type === 'error') {
                    reject(new Error(e.data.error));
                }
            };
            worker.onerror = (err) => reject(err);
        });

        worker.terminate();

        state.originalAnalysis = analysis;

        // Uložení výsledků do UI
        $('durationValue').textContent = formatTime(audioBuffer.duration);
        $('rmsValue').textContent = `${analysis.rmsDb.toFixed(1)} dB`;
        $('rmsValue').className = 'value ' + (analysis.rmsDb < -30 ? 'warning' : (analysis.rmsDb > -6 ? 'danger' : 'success'));

        $('peakValue').textContent = `${analysis.peakDb.toFixed(1)} dB`;
        $('peakValue').className = 'value ' + (analysis.peakDb > -1 ? 'danger' : 'success');

        $('dynamicRange').textContent = `${analysis.dynamicRange.toFixed(1)} dB`;
        $('dynamicRange').className = 'value ' + (analysis.dynamicRange > 20 ? 'warning' : 'success');

        showProcessingCards();

        await new Promise(r => setTimeout(r, 50));
        drawWaveform('originalWaveform', audioBuffer, analysis.problems);

        displayProblems(analysis.problems, audioBuffer.duration, seekToTime);

        $('timeOriginal').textContent = `0:00 / ${formatTime(audioBuffer.duration)}`;

        hideProcessing();

    } catch (err) {
        hideProcessing();
        alert(t('errorAnalysis') + ': ' + err.message);
        console.error(err);
    }
}

function showProcessingCards() {
    analysisCard.classList.remove('hidden');
    settingsCard.classList.remove('hidden');
    if (batchListCard) batchListCard.classList.add('hidden');
    if (batchProcessActions) batchProcessActions.classList.add('hidden');
}

// ============ Helpery pro přehrávač ============

function togglePlayback(type) {
    const other = type === 'original' ? 'processed' : 'original';

    if (audioElements[other] && !audioElements[other].paused) {
        audioElements[other].pause();
        updatePlayIcon(other, false);
        clearInterval(playbackIntervals[other]);
        clearAllWaveformPlayheads(other);
    }

    if (!audioElements[type]) {
        if (type === 'original') {
            audioElements[type] = new Audio(URL.createObjectURL(state.originalFile));
        } else {
            audioElements[type] = new Audio(URL.createObjectURL(state.processedBlob));
        }

        audioElements[type].addEventListener('ended', () => {
            updatePlayIcon(type, false);
            clearInterval(playbackIntervals[type]);
            updateProgress(type, 0);
            clearAllWaveformPlayheads(type);
        });
    }

    const audio = audioElements[type];

    if (audio.paused) {
        // Pokud startujeme přehrávání, chceme aby se A/B button aktualizoval podle toho, co hraje
        updateABVisuals(type);

        audio.play().then(() => {
            updatePlayIcon(type, true);
            playbackIntervals[type] = setInterval(() => {
                const ratio = audio.currentTime / audio.duration;
                updateProgress(type, ratio);
                updateTimeDisplay(type, audio.currentTime, audio.duration);
                updateAllWaveformPlayheads(type, ratio);
            }, 50);
        }).catch(e => console.error("Play error:", e));

    } else {
        audio.pause();
        updatePlayIcon(type, false);
        clearInterval(playbackIntervals[type]);
    }
}

// Expose to global scope for onclick handlers in HTML
window.togglePlayback = togglePlayback;

function updateAllWaveformPlayheads(type, ratio) {
    if (type === 'original') {
        updateWaveformPlayhead('originalWaveform', ratio);
        updateWaveformPlayhead('compareOriginalWaveform', ratio);
    } else {
        updateWaveformPlayhead('processedWaveform', ratio);
        updateWaveformPlayhead('compareProcessedWaveform', ratio);
    }
}

function clearAllWaveformPlayheads(type) {
    if (type === 'original') {
        clearWaveformPlayhead('originalWaveform');
        clearWaveformPlayhead('compareOriginalWaveform');
    } else {
        clearWaveformPlayhead('processedWaveform');
        clearWaveformPlayhead('compareProcessedWaveform');
    }
}

function updatePlayIcon(type, isPlaying) {
    const icons = [];

    if (type === 'original') {
        const mainIcon = $('playIconOriginal');
        if (mainIcon) icons.push(mainIcon);
        const compIcon = $('playIconOriginalComp');
        if (compIcon) icons.push(compIcon);
    } else {
        const processedIcon = $('playIconProcessed');
        if (processedIcon) icons.push(processedIcon);
        const compIcon = $('playIconProcessedComp');
        if (compIcon) icons.push(compIcon);
    }

    const svgPause = '<rect x="6" y="4" width="4" height="16" fill="currentColor"/><rect x="14" y="4" width="4" height="16" fill="currentColor"/>';
    const svgPlay = '<path fill-rule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clip-rule="evenodd" />';

    icons.forEach(icon => {
        icon.innerHTML = isPlaying ? svgPause : svgPlay;
    });
}

function updateProgress(type, ratio) {
    const fillId = type === 'original' ? 'progressFillOriginal' : 'progressFillProcessed';
    $(fillId).style.width = `${ratio * 100}%`;
}

function updateTimeDisplay(type, current, total) {
    const displayId = type === 'original' ? 'timeOriginal' : 'timeProcessed';
    $(displayId).textContent = `${formatTime(current)} / ${formatTime(total)}`;
}

function seekAudio(e, type) {
    const progressBar = type === 'original' ? $('progressOriginal') : $('progressProcessed');
    const rect = progressBar.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;

    if (audioElements[type]) {
        audioElements[type].currentTime = ratio * audioElements[type].duration;
        updateProgress(type, ratio);
        updateAllWaveformPlayheads(type, ratio);
    }
}

function seekOnWaveform(e, type) {
    const canvas = e.target;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    if (!audioElements[type]) {
        if (type === 'original' && state.originalFile) {
            audioElements[type] = new Audio(URL.createObjectURL(state.originalFile));
        } else if (type === 'processed' && state.processedBlob) {
            audioElements[type] = new Audio(URL.createObjectURL(state.processedBlob));
        } else {
            return;
        }
    }

    audioElements[type].currentTime = ratio * audioElements[type].duration;
    updateProgress(type, ratio);
    updateAllWaveformPlayheads(type, ratio);

    if (audioElements[type].paused) {
        togglePlayback(type);
    }
}

function seekToTime(time, type) {
    if (!audioElements[type]) {
        if (type === 'original' && state.originalFile) {
            audioElements[type] = new Audio(URL.createObjectURL(state.originalFile));
        } else if (type === 'processed' && state.processedBlob) {
            audioElements[type] = new Audio(URL.createObjectURL(state.processedBlob));
        } else {
            return;
        }
    }

    audioElements[type].currentTime = time;
    const ratio = time / audioElements[type].duration;
    updateProgress(type, ratio);
    updateAllWaveformPlayheads(type, ratio);
}

function resetApp() {
    if (audioElements.original) {
        audioElements.original.pause();
        audioElements.original = null;
    }
    if (audioElements.processed) {
        audioElements.processed.pause();
        audioElements.processed = null;
    }

    state.originalFile = null;
    state.originalAudioData = null;
    state.processedAudioData = null;
    state.processedBlob = null;
    state.batchQueue = [];
    state.batchZipBlob = null;

    fileInput.value = '';

    // UI Reset
    uploadZone.classList.remove('hidden');
    uploadHint.classList.remove('hidden');
    fileInfo.classList.add('hidden');

    const promoCard = document.querySelector('.feature-promo-card');
    if (promoCard) promoCard.classList.remove('hidden');

    analysisCard.classList.add('hidden');
    settingsCard.classList.add('hidden');
    resultCard.classList.add('hidden');

    if (batchListCard) batchListCard.classList.add('hidden');
    if (batchProcessActions) batchProcessActions.classList.add('hidden');

    $('fileName').textContent = '';
    $('fileMetadata').textContent = '';
}

function downloadProcessed() {
    if (!state.processedBlob) return;
    const url = URL.createObjectURL(state.processedBlob);
    const link = document.createElement('a');

    const extension = state.exportFormat || 'mp3';
    // Zachovat původní název + přidat _upraveno
    const originalName = state.originalFile ? state.originalFile.name : 'audio';
    const dotIndex = originalName.lastIndexOf('.');
    const baseName = dotIndex !== -1 ? originalName.substring(0, dotIndex) : originalName;

    link.href = url;
    link.download = `${baseName}_upraveno.${extension}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export { init };
// A konečně to celé nahodíme, až je DOM připravený
document.addEventListener('DOMContentLoaded', init);

// Pojistka proti nechtěnému zavření odstraněna na žádost uživatele
// window.addEventListener('beforeunload', ...);

// Univerzální potvrzovací/varovné okno (aby to nevypadalo hnusně jako systémový alert)
function showWarningModal(confirmCallback, titleKey = 'warningTitle', bodyKey = 'warningBody') {
    const modal = $('warningModal');
    const confirmBtn = $('modalConfirm');
    const cancelBtn = $('modalCancel');

    $('modalTitleText').textContent = t(titleKey);
    $('modalBodyText').textContent = t(bodyKey);

    const closeModal = () => {
        modal.classList.remove('active');
        // Cleanup listeners to avoid memory leaks or double triggers
        confirmBtn.onclick = null;
        cancelBtn.onclick = null;
    };

    confirmBtn.onclick = () => {
        closeModal();
        confirmCallback();
    };

    cancelBtn.onclick = () => {
        closeModal();
    };

    modal.classList.add('active');
}
