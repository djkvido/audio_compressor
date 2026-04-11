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
import { validateAudioFile, validateAudioBuffer } from './audio-validation.js';

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

// Sdílená hlasitost pro oba přehrávače (0–1)
let currentVolume = 1.0;

// Drag stav pro scrubbing po waveformu
let waveformDrag = { active: false, type: null, canvas: null };
// FIX (memory leak): Ukládáme Object URL ke každému audio elementu, abychom je mohli
// revokovat při nahrazení nebo resetApp. Dříve se URL vytvářely donekonečna bez revoce.
let audioUrls = {
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

    // Obsluha klávesnice (mezerník = play/pause, šipky = seek ±5 s)
    document.addEventListener('keydown', e => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (e.code === 'Space') {
            e.preventDefault();
            if (audioElements[currentAB]) {
                togglePlayback(currentAB);
            } else if (audioElements.original) {
                togglePlayback('original');
            }
        }

        if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
            e.preventDefault();
            const type = audioElements[currentAB] ? currentAB : (audioElements.original ? 'original' : null);
            if (!type) return;
            const audio = audioElements[type];
            if (!audio || !audio.duration) return;
            const delta = e.code === 'ArrowLeft' ? -5 : 5;
            const newTime = Math.max(0, Math.min(audio.duration, audio.currentTime + delta));
            audio.currentTime = newTime;
            const ratio = newTime / audio.duration;
            updateProgress(type, ratio);
            updateAllWaveformPlayheads(type, ratio);
            updateTimeDisplay(type, newTime, audio.duration);
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
    // FIX: processAudio nyní re-throwuje chyby → musíme je zachytit zde
    $('processBtn')?.addEventListener('click', () => {
        showWarningModal(() => {
            processAudio(state, (settings) => {
                const duration = showResults(state, settings);
                const timeEl = $('timeProcessed');
                if (timeEl) timeEl.textContent = `0:00 / ${formatTime(duration)}`;
            }).catch(err => {
                alert(`${t('errorProcessing')}: ${err.message}`);
                console.error('Processing error:', err);
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

    // Drag-to-seek na waveformu (pointer events → funguje i na dotykových zařízeních)
    document.addEventListener('pointerdown', e => {
        const canvas = e.target;
        if (!canvas?.classList?.contains('waveform-canvas')) return;
        const type = waveformTypeFromId(canvas.id);
        if (!type) return;
        waveformDrag = { active: true, type, canvas };
        canvas.setPointerCapture(e.pointerId);
        doWaveformSeek(e, type, canvas, /* startPlay= */ true);
    });

    document.addEventListener('pointermove', e => {
        if (!waveformDrag.active) return;
        doWaveformSeek(e, waveformDrag.type, waveformDrag.canvas, /* startPlay= */ false);
    });

    document.addEventListener('pointerup', () => {
        waveformDrag = { active: false, type: null, canvas: null };
    });

    // BUG FIX (click propagation): pointerdown na canvas spustí přehrávání přes doWaveformSeek.
    // Vzápětí se z canvasu šíří 'click' event nahoru a zasáhne onclick="togglePlayback()" na
    // parent divu v compare záložce → hned zase zapauzuje. Stopneme propagaci na canvasu.
    document.querySelectorAll('.waveform-canvas').forEach(canvas => {
        canvas.addEventListener('click', e => e.stopPropagation());
    });

    // Hlasitost – jeden listener pro všechny slidery (sdílíme currentVolume)
    document.addEventListener('input', e => {
        if (!e.target.classList.contains('volume-slider')) return;
        currentVolume = parseFloat(e.target.value);
        document.querySelectorAll('.volume-slider').forEach(s => { s.value = currentVolume; });
        if (audioElements.original) audioElements.original.volume = currentVolume;
        if (audioElements.processed) audioElements.processed.volume = currentVolume;
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
        playbackIntervals.processed = null;
        // FIX: Revokujeme URL ihned, ne lazy při příštím getOrCreateAudio
        if (audioUrls.processed) { URL.revokeObjectURL(audioUrls.processed); audioUrls.processed = null; }
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
        'cs': 'assets/flags/cz.png',
        'en': 'assets/flags/gb.png',
        'de': 'assets/flags/de.png',
        'pl': 'assets/flags/pl.png'
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
// FIX (v14): Hodnoty jsou teď v LUFS (K-weighted), ne RMS (dBFS).
//   -16 LUFS = Apple Music / Apple Podcasts standard
//   -14 LUFS = Spotify / YouTube / Tidal / Amazon Music standard (default)
//   -12 LUFS = Spotify "loud" preset, nad -11 už se dostaneme do zkreslení
//
// Pole `targetRms` zachováno jako identifikátor kvůli HTML input ID.
const AGC_PRESETS = {
    light: {
        targetRms: -16,          // -16 LUFS – jemné (Apple Music target)
        maxBoost: 12,
        maxAttenuation: 3,       // max 3 dB snížení – velmi jemné
        windowSize: 1500
    },
    standard: {
        targetRms: -14,          // -14 LUFS – streaming default (Spotify/YouTube)
        maxBoost: 18,
        maxAttenuation: 6,       // max 6 dB snížení – vyvážené
        windowSize: 1000
    },
    heavy: {
        targetRms: -12,          // -12 LUFS – hlasité, vhodné pro tanec v sále
        maxBoost: 24,
        maxAttenuation: 12,      // max 12 dB snížení – agresivní
        windowSize: 600
    },
    custom: {}
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
            // FIX: nastavíme i maxAttenuation, pokud input existuje
            const maxAttEl = $('maxAttenuation');
            if (maxAttEl) maxAttEl.value = presetValues.maxAttenuation;
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

    // 2. Spustit cílové (getOrCreateAudio zaregistruje i 'ended' listener)
    if (!audioElements[targetType]) {
        if (!getOrCreateAudio(targetType)) return;
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
            <span class="batch-status pending">${t('batchWaiting')}</span>
        `;
        batchList.appendChild(item);
    });
}

// Batch Processor - tohle chroustá celou frontu souborů naraz
async function processBatchQueue() {
    if (state.batchQueue.length === 0) return;

    const zip = new JSZip();
    const folder = zip.folder("processed_audio");
    // Sledujeme použitá jména, ať nedojde k tichému přepisu při duplicitních vstupech.
    const usedNames = new Set();

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
            const audioBuffer = await state.audioContext.decodeAudioData(arrayBuffer)
                .catch(() => { throw new Error(t('errDecodeFailed')); });

            // Validace bufferu – v batch módu nepřerušujeme celou frontu,
            // jen soubor označíme jako chybný a pokračujeme dalším.
            const check = validateAudioBuffer(audioBuffer);
            if (!check.ok) {
                throw new Error(check.message);
            }

            state.originalAudioData = audioBuffer;
            state.originalFile = file;

            // FIX (batch Promise hang): processAudio nyní re-throwuje chyby místo konzumace.
            // Dříve: catch v processAudio() zavolal alert() a vrátil undefined → onComplete se
            // nikdy nevolal → resolve() se nikdy nezavolal → Promise visela navždy → celá fronta se zasekla.
            await new Promise((resolve, reject) => {
                processAudio(state, () => resolve()).catch(reject);
            });

            const extension = state.exportFormat || 'mp3';
            const baseName = file.name.replace(/\.[^.]+$/, '');
            // Pokud uživatel nahraje dva soubory se stejným jménem (z různých složek),
            // přidáme pořadový suffix, ať nedojde k tichému přepisu v ZIPu.
            let fileName = `${baseName}_upraveno.${extension}`;
            let counter = 2;
            while (usedNames.has(fileName)) {
                fileName = `${baseName}_upraveno_${counter}.${extension}`;
                counter++;
            }
            usedNames.add(fileName);
            folder.file(fileName, state.processedBlob);

            itemStatus.className = 'batch-status done';
            itemStatus.textContent = t('processingDone') + ' ✅';

        } catch (err) {
            console.error(err);
            itemStatus.className = 'batch-status error';
            itemStatus.textContent = t('batchError') + ' ❌';
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
        alert(`${t('errorZip')}: ${err.message}`);
        $('processBatchBtn').disabled = false;
    }
}

function validateFile(file) {
    // Deleguji na sdílený validator (kontroluje typ, velikost, prázdnost).
    // Validace AudioBufferu (délka, kanály, sample rate, ticho) je až po decodeAudioData().
    const result = validateAudioFile(file);
    if (!result.ok) {
        alert(result.message);
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
        const audioBuffer = await state.audioContext.decodeAudioData(arrayBuffer)
            .catch(() => { throw new Error(t('errDecodeFailed')); });

        // Validace dekódovaného bufferu: kanály, sample rate, délka, ticho.
        // Pokud neprojde, uživatel dostane jasnou chybovou hlášku a reset.
        const check = validateAudioBuffer(audioBuffer);
        if (!check.ok) {
            hideProcessing();
            alert(check.message);
            resetApp();
            return;
        }
        // Varování (soubor už zaklipovaný) – necháme pokračovat, jen informujeme.
        if (check.warnings && check.warnings.length > 0) {
            const proceed = confirm(check.warnings.join('\n\n') + '\n\n' + t('warnContinueAnyway'));
            if (!proceed) {
                hideProcessing();
                resetApp();
                return;
            }
        }

        state.originalAudioData = audioBuffer;

        // Spuštění analýzy ve workeru
        // FIX (v14): Posíláme VŠECHNY kanály – worker teď počítá stereo korelaci
        // (detekce mono/fázových problémů) a loudness range. Bez druhého kanálu
        // bychom to nedetekovali.
        const worker = new Worker('js/audio-worker.js?v=14');
        const analyzeChannels = [];
        for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
            analyzeChannels.push(audioBuffer.getChannelData(i));
        }

        worker.postMessage({
            type: 'analyze',
            audioChannels: analyzeChannels,
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
        // FIX (v14): rmsDb teď obsahuje integrated LUFS, peakDb drží sample peak.
        // Pro true peak (inter-sample) je nové pole analysis.truePeakDb.
        $('durationValue').textContent = formatTime(audioBuffer.duration);

        const lufsVal = isFinite(analysis.rmsDb) ? analysis.rmsDb : -70;
        $('rmsValue').textContent = `${lufsVal.toFixed(1)} LUFS`;
        // Barevné prahy pro streaming/broadcast normy:
        //   < -30 LUFS = velmi tiché (warning)
        //   -30 až -8 = OK (success)
        //   > -8 LUFS = hlasitější než Spotify loud preset (-11), hraniční
        $('rmsValue').className = 'value ' + (lufsVal < -30 ? 'warning' : (lufsVal > -8 ? 'danger' : 'success'));

        // Peak: preferujeme true peak pokud je k dispozici, fallback na sample peak
        const displayPeak = isFinite(analysis.truePeakDb) ? analysis.truePeakDb : analysis.peakDb;
        const peakLabel = isFinite(analysis.truePeakDb) ? 'dBTP' : 'dBFS';
        $('peakValue').textContent = `${displayPeak.toFixed(1)} ${peakLabel}`;
        $('peakValue').className = 'value ' + (displayPeak > -1 ? 'danger' : 'success');

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

// FIX (memory leak + missing 'ended' listener): Centrální továrna na audio elementy.
// Dříve se URL.createObjectURL volalo na 4 místech bez evidence → neuvolněné Blob URLs.
// Navíc seekOnWaveform/seekToTime nevěšely 'ended' listener → po skončení přehrávání
// se ikona play neobnovila a playhead se nezresetoval.
function getOrCreateAudio(type) {
    if (audioElements[type]) return audioElements[type];

    let url;
    if (type === 'original' && state.originalFile) {
        url = URL.createObjectURL(state.originalFile);
    } else if (type === 'processed' && state.processedBlob) {
        url = URL.createObjectURL(state.processedBlob);
    } else {
        return null;
    }

    // Revokujeme starou URL před vytvořením nové (pojistka)
    if (audioUrls[type]) URL.revokeObjectURL(audioUrls[type]);
    audioUrls[type] = url;

    const audio = new Audio(url);
    audio.volume = currentVolume;
    audioElements[type] = audio;

    audio.addEventListener('ended', () => {
        updatePlayIcon(type, false);
        clearInterval(playbackIntervals[type]);
        updateProgress(type, 0);
        clearAllWaveformPlayheads(type);
    });

    return audio;
}

function togglePlayback(type) {
    const other = type === 'original' ? 'processed' : 'original';

    if (audioElements[other] && !audioElements[other].paused) {
        audioElements[other].pause();
        updatePlayIcon(other, false);
        clearInterval(playbackIntervals[other]);
        clearAllWaveformPlayheads(other);
    }

    if (!audioElements[type]) {
        if (!getOrCreateAudio(type)) return; // Není co přehrát
    }

    const audio = audioElements[type];

    if (audio.paused) {
        // Pokud startujeme přehrávání, chceme aby se A/B button aktualizoval podle toho, co hraje
        updateABVisuals(type);

        audio.play().then(() => {
            updatePlayIcon(type, true);
            // FIX (interval leak): clearInterval před novým setInterval.
            // Bez toho by rychlé kliknutí způsobilo souběh více intervalů (~50ms smyčky),
            // z nichž všechny aktualizují UI a žádný z nich nejde stopnout.
            if (playbackIntervals[type]) clearInterval(playbackIntervals[type]);
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
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    if (audioElements[type]) {
        audioElements[type].currentTime = ratio * audioElements[type].duration;
        updateProgress(type, ratio);
        updateAllWaveformPlayheads(type, ratio);
    }
}

// Vrátí typ ('original'/'processed') podle ID canvasu, nebo null.
function waveformTypeFromId(id) {
    if (id === 'originalWaveform' || id === 'compareOriginalWaveform') return 'original';
    if (id === 'processedWaveform' || id === 'compareProcessedWaveform') return 'processed';
    return null;
}

// Seek na waveformu – sdílená logika pro kliknutí i drag.
// startPlay=true spustí přehrávání, pokud audio stojí.
function doWaveformSeek(e, type, canvas, startPlay) {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    if (!audioElements[type]) {
        if (!getOrCreateAudio(type)) return;
    }

    const audio = audioElements[type];
    if (!audio.duration) return;

    audio.currentTime = ratio * audio.duration;
    updateProgress(type, ratio);
    updateAllWaveformPlayheads(type, ratio);
    updateTimeDisplay(type, audio.currentTime, audio.duration);

    if (startPlay && audio.paused) {
        togglePlayback(type);
    }
}

function seekOnWaveform(e, type) {
    doWaveformSeek(e, type, e.target, /* startPlay= */ true);
}

function seekToTime(time, type) {
    if (!audioElements[type]) {
        if (!getOrCreateAudio(type)) return;
    }

    const audio = audioElements[type];
    audio.currentTime = time;
    const ratio = time / audio.duration;
    updateProgress(type, ratio);
    updateAllWaveformPlayheads(type, ratio);
    updateTimeDisplay(type, time, audio.duration);

    // Kliknutí na čas problému automaticky spustí přehrávání
    if (audio.paused) {
        togglePlayback(type);
    }
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

    // FIX (memory leak): Revokujeme Object URLs při resetu, ať se Blob GC může uvolnit
    if (audioUrls.original) { URL.revokeObjectURL(audioUrls.original); audioUrls.original = null; }
    if (audioUrls.processed) { URL.revokeObjectURL(audioUrls.processed); audioUrls.processed = null; }

    clearInterval(playbackIntervals.original);
    clearInterval(playbackIntervals.processed);
    playbackIntervals.original = null;
    playbackIntervals.processed = null;

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
