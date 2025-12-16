// ============ Time-Stretch Studio - Hall Edit ============
// Uses SoundTouchJS - professional C++ SoundTouch library port

// Import translations
import { t, setLanguage, initLanguage, currentLanguage } from './translations.js';

// === State ===
const state = {
    originalFile: null,
    originalAudioData: null,
    originalAudioUrl: null,
    resultAudioData: null,
    resultAudioUrl: null,
    resultBlob: null,
    audioContext: null,
    soundTouch: null,
    warningShown: false
};

// Audio elements
const audioElements = {
    original: null,
    result: null
};

// Playback intervals for UI updates
const playbackIntervals = {
    original: null,
    result: null
};

// Waveform cache for playhead updates
const waveformCache = new Map();

// Current A/B state
let currentAB = 'original';

// === DOM Elements ===
let uploadZone, fileInput, fileInfo, originalCard, settingsCard, resultCard;

// === Init ===
document.addEventListener('DOMContentLoaded', init);

async function init() {
    // Get DOM elements
    uploadZone = document.getElementById('uploadZone');
    fileInput = document.getElementById('fileInput');
    fileInfo = document.getElementById('fileInfo');
    originalCard = document.getElementById('originalCard');
    settingsCard = document.getElementById('settingsCard');
    resultCard = document.getElementById('resultCard');

    // Initialize translations
    initLanguage();
    updateUITranslations();
    setupLanguageDropdown();

    // Load SoundTouch library dynamically
    try {
        const module = await import('https://cdn.jsdelivr.net/npm/soundtouchjs@0.1.30/dist/soundtouch.js');
        state.soundTouch = module;
    } catch (err) {
        console.warn('SoundTouch failed to load, using fallback algorithm:', err);
    }

    // Setup event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Upload
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) handleFile(e.target.files[0]);
    });

    // Remove file
    document.getElementById('removeFile').addEventListener('click', resetApp);

    // Playback buttons
    document.getElementById('playOriginal').addEventListener('click', () => togglePlayback('original'));
    document.getElementById('playResult')?.addEventListener('click', () => togglePlayback('result'));

    // Progress bar seek
    document.getElementById('progressOriginal').addEventListener('click', (e) => seekOnProgressBar(e, 'original'));
    document.getElementById('progressResult')?.addEventListener('click', (e) => seekOnProgressBar(e, 'result'));

    // Waveform click = seek (handle clicks on canvas or container)
    document.addEventListener('click', (e) => {
        let canvas = e.target;

        // If clicked on container, find canvas inside
        if (e.target.classList.contains('waveform-container') || e.target.classList.contains('compare-waveform')) {
            canvas = e.target.querySelector('.waveform-canvas');
        }

        if (canvas && canvas.classList.contains('waveform-canvas')) {
            const canvasId = canvas.id;
            // Re-calculate click position relative to canvas
            const rect = canvas.getBoundingClientRect();
            const fakeEvent = { target: canvas, clientX: e.clientX, clientY: e.clientY };

            if (canvasId === 'originalWaveform' || canvasId === 'compareOriginalWaveform') {
                seekOnWaveform(fakeEvent, 'original');
            } else if (canvasId === 'resultWaveform' || canvasId === 'compareResultWaveform') {
                seekOnWaveform(fakeEvent, 'result');
            }
        }
    });

    // Compare view play buttons
    document.getElementById('playCompareOriginal')?.addEventListener('click', () => togglePlayback('original'));
    document.getElementById('playCompareResult')?.addEventListener('click', () => togglePlayback('result'));

    // A/B Toggle
    document.getElementById('abToggle')?.addEventListener('click', handleABToggle);

    // Settings - Speed slider
    const speedSlider = document.getElementById('speedSlider');
    speedSlider.addEventListener('input', () => {
        const speed = parseInt(speedSlider.value);
        document.getElementById('speedValue').textContent = `${speed}%`;
        updateTargetDurationFromSpeed(speed);
    });

    // Settings - Target time inputs
    document.getElementById('targetMin').addEventListener('input', updateSpeedFromTargetDuration);
    document.getElementById('targetSec').addEventListener('input', updateSpeedFromTargetDuration);

    // Process button
    document.getElementById('processBtn').addEventListener('click', processAudio);

    // Back button
    document.getElementById('backBtn').addEventListener('click', () => {
        resultCard.classList.add('hidden');
        settingsCard.classList.remove('hidden');
        stopPlayback('result');
    });

    // Download button
    document.getElementById('downloadBtn').addEventListener('click', downloadResult);

    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return;
        if (e.code === 'Space') {
            e.preventDefault();
            togglePlayback(currentAB === 'original' ? 'original' : 'result');
        }
    });
}

// === File Handling ===
async function handleFile(file) {
    if (!file.type.startsWith('audio/')) {
        alert('Prosím nahraj audio soubor (MP3, WAV, M4A, OGG, FLAC)');
        return;
    }

    state.originalFile = file;

    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileMetadata').textContent = formatFileSize(file.size);
    fileInfo.classList.remove('hidden');
    uploadZone.classList.add('hidden');

    showProcessing('Načítám audio...', 'Dekóduji soubor');

    try {
        state.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        const arrayBuffer = await file.arrayBuffer();
        state.originalAudioData = await state.audioContext.decodeAudioData(arrayBuffer);

        state.originalAudioUrl = URL.createObjectURL(file);

        originalCard.classList.remove('hidden');
        settingsCard.classList.remove('hidden');

        const duration = state.originalAudioData.duration;
        document.getElementById('originalDuration').textContent = formatTime(duration);
        document.getElementById('sampleRate').textContent = `${state.originalAudioData.sampleRate} Hz`;
        document.getElementById('timeOriginal').textContent = `0:00 / ${formatTime(duration)}`;

        const mins = Math.floor(duration / 60);
        const secs = Math.floor(duration % 60);
        document.getElementById('targetMin').value = mins;
        document.getElementById('targetSec').value = secs;

        // Draw waveform with correct argument order
        drawWaveform('originalWaveform', state.originalAudioData);

        hideProcessing();

    } catch (err) {
        hideProcessing();
        alert(t('errLoadAudio') + err.message);
        console.error(err);
        resetApp();
    }
}

// === Time-Stretch Processing ===
async function processAudio() {
    if (!state.originalAudioData) return;

    // Show warning modal on first process
    if (!state.warningShown) {
        const proceed = await showWarningModal();
        if (!proceed) return;
    }

    const targetMin = parseInt(document.getElementById('targetMin').value) || 0;
    const targetSec = parseInt(document.getElementById('targetSec').value) || 0;
    const targetDuration = targetMin * 60 + targetSec;

    if (isNaN(targetMin) || isNaN(targetSec)) {
        alert(t('errInvalidTime'));
        return;
    }

    if (targetDuration <= 0) {
        alert(t('errDurationZero'));
        return;
    }

    const originalDuration = state.originalAudioData.duration;
    const tempo = originalDuration / targetDuration;

    if (tempo < 0.5 || tempo > 2.0) {
        alert(t('errSpeedRange'));
        return;
    }

    showProcessing(t('tsApplyingTimeStretch'), 'SoundTouch Engine');
    updateProgress(5);

    try {
        const sampleRate = state.originalAudioData.sampleRate;
        const numChannels = state.originalAudioData.numberOfChannels;

        const left = state.originalAudioData.getChannelData(0);
        const right = numChannels > 1 ? state.originalAudioData.getChannelData(1) : left;

        updateProgress(10);
        await sleep(10);

        let stretchedData;

        if (state.soundTouch) {
            stretchedData = await soundTouchStretch(left, right, tempo, sampleRate, (progress) => {
                updateProgress(10 + progress * 60);
            });
        } else {
            stretchedData = await fallbackStretch(left, right, tempo, sampleRate, (progress) => {
                updateProgress(10 + progress * 60);
            });
        }

        updateProgress(70);
        await sleep(10);

        const outputLength = stretchedData.left.length;
        const resultBuffer = state.audioContext.createBuffer(numChannels, outputLength, sampleRate);

        resultBuffer.copyToChannel(stretchedData.left, 0);
        if (numChannels > 1) {
            resultBuffer.copyToChannel(stretchedData.right, 1);
        }

        state.resultAudioData = resultBuffer;

        // Encode to MP3
        updateProgress(75);
        document.getElementById('processingSub').textContent = t('tsEncodingMp3');
        await sleep(10);

        const channels = numChannels > 1
            ? [stretchedData.left, stretchedData.right]
            : [stretchedData.left];

        state.resultBlob = await encodeMP3(channels, outputLength, sampleRate, (p) => {
            updateProgress(75 + p * 23);
        });

        if (state.resultAudioUrl) URL.revokeObjectURL(state.resultAudioUrl);
        state.resultAudioUrl = URL.createObjectURL(state.resultBlob);

        // Update UI
        document.getElementById('resultDuration').textContent = formatTime(resultBuffer.duration);
        document.getElementById('resultSpeed').textContent = `${Math.round(tempo * 100)}%`;
        document.getElementById('timeResult').textContent = `0:00 / ${formatTime(resultBuffer.duration)}`;

        settingsCard.classList.add('hidden');
        originalCard.classList.add('hidden'); // Hide original card, enable comparison mode
        resultCard.classList.remove('hidden');

        // Draw waveforms after a short delay to ensure canvas is visible
        await sleep(100);
        drawWaveform('resultWaveform', resultBuffer);
        drawWaveform('compareOriginalWaveform', state.originalAudioData);
        drawWaveform('compareResultWaveform', resultBuffer);

        hideProcessing();

    } catch (err) {
        hideProcessing();
        alert('Chyba při zpracování: ' + err.message);
        console.error(err);
    }
}

// === Waveform Drawing with Playhead Support ===
function drawWaveform(canvasId, audioBuffer, playheadRatio = -1) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, width, height);

    // Get audio data
    const data = audioBuffer.getChannelData(0);
    const samplesPerPixel = Math.ceil(data.length / width);

    // Draw waveform
    const centerY = height / 2;
    const amplitude = height / 2 - 4;

    // Gradient
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#00d4ff');
    gradient.addColorStop(0.5, '#8b5cf6');
    gradient.addColorStop(1, '#00d4ff');

    ctx.fillStyle = gradient;

    for (let x = 0; x < width; x++) {
        const startSample = Math.floor(x * samplesPerPixel);
        const endSample = Math.min(startSample + samplesPerPixel, data.length);

        let min = 0, max = 0;
        for (let i = startSample; i < endSample; i++) {
            const val = data[i];
            if (val < min) min = val;
            if (val > max) max = val;
        }

        const yMin = centerY - (max * amplitude);
        const yMax = centerY - (min * amplitude);
        const barHeight = Math.max(2, yMax - yMin);

        ctx.fillRect(x, yMin, 1, barHeight);
    }

    // Center line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Playhead
    if (playheadRatio >= 0 && playheadRatio <= 1.01) {
        const playheadX = playheadRatio * width;

        // White line
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, height);
        ctx.stroke();

        // Glow
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.6)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, height);
        ctx.stroke();

        ctx.lineWidth = 1;
    }

    // Cache for playhead updates
    waveformCache.set(canvasId, audioBuffer);
}

function updateWaveformPlayhead(canvasId, ratio) {
    const audioBuffer = waveformCache.get(canvasId);
    if (audioBuffer) {
        drawWaveform(canvasId, audioBuffer, ratio);
    }
}

function clearWaveformPlayhead(canvasId) {
    const audioBuffer = waveformCache.get(canvasId);
    if (audioBuffer) {
        drawWaveform(canvasId, audioBuffer, -1);
    }
}

// === Playback Controls ===
function togglePlayback(type) {
    const other = type === 'original' ? 'result' : 'original';

    // Stop other
    if (audioElements[other] && !audioElements[other].paused) {
        audioElements[other].pause();
        updatePlayIcon(other, false);
        clearInterval(playbackIntervals[other]);
        clearAllWaveformPlayheads(other);
    }

    // Create audio element if needed
    if (!audioElements[type]) {
        const url = type === 'original' ? state.originalAudioUrl : state.resultAudioUrl;
        if (!url) return;

        audioElements[type] = new Audio(url);
        audioElements[type].addEventListener('ended', () => {
            updatePlayIcon(type, false);
            clearInterval(playbackIntervals[type]);
            updateProgressBar(type, 0);
            clearAllWaveformPlayheads(type);
        });
    }

    const audio = audioElements[type];

    if (audio.paused) {
        currentAB = type;
        updateABVisuals(type);

        audio.play().then(() => {
            updatePlayIcon(type, true);
            playbackIntervals[type] = setInterval(() => {
                const ratio = audio.currentTime / audio.duration;
                updateProgressBar(type, ratio);
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

function stopPlayback(type) {
    if (audioElements[type]) {
        audioElements[type].pause();
        audioElements[type].currentTime = 0;
        updatePlayIcon(type, false);
        clearInterval(playbackIntervals[type]);
        clearAllWaveformPlayheads(type);
    }
}

function updateAllWaveformPlayheads(type, ratio) {
    if (type === 'original') {
        updateWaveformPlayhead('originalWaveform', ratio);
        updateWaveformPlayhead('compareOriginalWaveform', ratio);
    } else {
        updateWaveformPlayhead('resultWaveform', ratio);
        updateWaveformPlayhead('compareResultWaveform', ratio);
    }
}

function clearAllWaveformPlayheads(type) {
    if (type === 'original') {
        clearWaveformPlayhead('originalWaveform');
        clearWaveformPlayhead('compareOriginalWaveform');
    } else {
        clearWaveformPlayhead('resultWaveform');
        clearWaveformPlayhead('compareResultWaveform');
    }
}

// === Seek Functions ===
function seekOnWaveform(e, type) {
    const canvas = e.target;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    // Create audio element if needed
    if (!audioElements[type]) {
        const url = type === 'original' ? state.originalAudioUrl : state.resultAudioUrl;
        if (!url) return;
        audioElements[type] = new Audio(url);
        audioElements[type].addEventListener('ended', () => {
            updatePlayIcon(type, false);
            clearInterval(playbackIntervals[type]);
            updateProgressBar(type, 0);
            clearAllWaveformPlayheads(type);
        });
    }

    const audio = audioElements[type];
    const wasPlaying = !audio.paused;

    // Wait for metadata if needed
    const doSeek = () => {
        // Guard against non-finite duration (metadata not loaded)
        if (!isFinite(audio.duration)) return;

        audio.currentTime = ratio * audio.duration;
        updateProgressBar(type, ratio);
        updateAllWaveformPlayheads(type, ratio);
    };

    if (audio.readyState >= 1) {
        doSeek();
        // If wasn't playing, start playback
        if (!wasPlaying) {
            togglePlayback(type);
        }
    } else {
        audio.addEventListener('loadedmetadata', () => {
            doSeek();
            togglePlayback(type);
        }, { once: true });
    }
}

function seekOnProgressBar(e, type) {
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    if (audioElements[type]) {
        audioElements[type].currentTime = ratio * audioElements[type].duration;
        updateProgressBar(type, ratio);
        updateAllWaveformPlayheads(type, ratio);
    }
}

// === A/B Toggle ===
function handleABToggle() {
    const originalPlaying = audioElements.original && !audioElements.original.paused;
    const resultPlaying = audioElements.result && !audioElements.result.paused;

    if (originalPlaying) {
        const time = audioElements.original.currentTime;
        switchToAudio('result', time);
    } else if (resultPlaying) {
        const time = audioElements.result.currentTime;
        switchToAudio('original', time);
    } else {
        const newType = currentAB === 'original' ? 'result' : 'original';
        updateABVisuals(newType);
        currentAB = newType;
    }
}

function switchToAudio(targetType, currentTime) {
    const sourceType = targetType === 'original' ? 'result' : 'original';

    // Stop source
    if (audioElements[sourceType]) {
        audioElements[sourceType].pause();
        updatePlayIcon(sourceType, false);
        clearInterval(playbackIntervals[sourceType]);
        clearAllWaveformPlayheads(sourceType);
    }

    // Create target audio if needed
    if (!audioElements[targetType]) {
        const url = targetType === 'original' ? state.originalAudioUrl : state.resultAudioUrl;
        if (!url) return;
        audioElements[targetType] = new Audio(url);
        audioElements[targetType].addEventListener('ended', () => {
            updatePlayIcon(targetType, false);
            clearInterval(playbackIntervals[targetType]);
            updateProgressBar(targetType, 0);
            clearAllWaveformPlayheads(targetType);
        });
    }

    const audio = audioElements[targetType];

    const playSafe = () => {
        audio.currentTime = currentTime;
        audio.play().then(() => {
            updatePlayIcon(targetType, true);
            clearInterval(playbackIntervals[targetType]);
            playbackIntervals[targetType] = setInterval(() => {
                const ratio = audio.currentTime / audio.duration;
                updateProgressBar(targetType, ratio);
                updateTimeDisplay(targetType, audio.currentTime, audio.duration);
                updateAllWaveformPlayheads(targetType, ratio);
            }, 50);
            updateABVisuals(targetType);
            currentAB = targetType;
        }).catch(e => console.error("Play error:", e));
    };

    if (audio.readyState >= 1) {
        playSafe();
    } else {
        audio.addEventListener('loadedmetadata', playSafe, { once: true });
    }
}

function updateABVisuals(type) {
    const aLabel = document.querySelector('.ab-a');
    const bLabel = document.querySelector('.ab-b');

    if (!aLabel || !bLabel) return;

    if (type === 'original') {
        aLabel.classList.add('active');
        bLabel.classList.remove('active');
    } else {
        aLabel.classList.remove('active');
        bLabel.classList.add('active');
    }
}

// === UI Updates ===
function updatePlayIcon(type, isPlaying) {
    const svgPause = '<rect x="6" y="4" width="4" height="16" fill="currentColor"/><rect x="14" y="4" width="4" height="16" fill="currentColor"/>';
    const svgPlay = '<path fill-rule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clip-rule="evenodd" fill="currentColor"/>';

    // Update main icon
    const mainIconId = type === 'original' ? 'playIconOriginal' : 'playIconResult';
    const mainIcon = document.getElementById(mainIconId);
    if (mainIcon) mainIcon.innerHTML = isPlaying ? svgPause : svgPlay;

    // Update compare icon
    const compareIconId = type === 'original' ? 'playIconCompareOriginal' : 'playIconCompareResult';
    const compareIcon = document.getElementById(compareIconId);
    if (compareIcon) compareIcon.innerHTML = isPlaying ? svgPause : svgPlay;
}

function updateProgressBar(type, ratio) {
    const fillId = type === 'original' ? 'progressFillOriginal' : 'progressFillResult';
    const fill = document.getElementById(fillId);
    if (fill) fill.style.width = `${ratio * 100}%`;
}

function updateTimeDisplay(type, current, total) {
    const displayId = type === 'original' ? 'timeOriginal' : 'timeResult';
    const display = document.getElementById(displayId);
    if (display) display.textContent = `${formatTime(current)} / ${formatTime(total)}`;
}

function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab[data-tab="${tabName}"]`)?.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    document.getElementById(`${tabName}Tab`)?.classList.remove('hidden');

    // Redraw waveforms for current tab
    if (tabName === 'compare' && state.resultAudioData) {
        setTimeout(() => {
            drawWaveform('compareOriginalWaveform', state.originalAudioData);
            drawWaveform('compareResultWaveform', state.resultAudioData);
        }, 50);
    }
}

// === SoundTouch Time-Stretch ===
async function soundTouchStretch(leftChannel, rightChannel, tempo, sampleRate, onProgress) {
    const { SoundTouch, SimpleFilter } = state.soundTouch;

    const inputLength = leftChannel.length;
    const outputLength = Math.round(inputLength / tempo);

    const st = new SoundTouch();
    st.tempo = tempo;
    st.pitch = 1.0;

    const source = {
        position: 0,
        extract: function (target, numFrames) {
            const available = Math.min(numFrames, leftChannel.length - this.position);
            for (let i = 0; i < available; i++) {
                target[i * 2] = leftChannel[this.position + i];
                target[i * 2 + 1] = rightChannel[this.position + i];
            }
            this.position += available;
            return available;
        }
    };

    const filter = new SimpleFilter(source, st);

    const outputLeft = new Float32Array(outputLength + 10000);
    const outputRight = new Float32Array(outputLength + 10000);

    const chunkSize = 4096;
    const buffer = new Float32Array(chunkSize * 2);
    let outputPos = 0;
    let lastProgress = 0;

    while (true) {
        const framesRead = filter.extract(buffer, chunkSize);
        if (framesRead === 0) break;

        for (let i = 0; i < framesRead; i++) {
            if (outputPos + i < outputLeft.length) {
                outputLeft[outputPos + i] = buffer[i * 2];
                outputRight[outputPos + i] = buffer[i * 2 + 1];
            }
        }

        outputPos += framesRead;

        const progress = Math.min(outputPos / outputLength, 1);
        if (progress - lastProgress > 0.05) {
            lastProgress = progress;
            if (onProgress) onProgress(progress);
            await sleep(0);
        }
    }

    return {
        left: outputLeft.slice(0, outputPos),
        right: outputRight.slice(0, outputPos)
    };
}

// === Fallback Stretch ===
async function fallbackStretch(leftChannel, rightChannel, tempo, sampleRate, onProgress) {
    const inputLength = leftChannel.length;
    const outputLength = Math.round(inputLength / tempo);

    const fftSize = 4096;
    const hopAnalysis = fftSize / 4;
    const hopSynthesis = Math.round(hopAnalysis / tempo);

    const window = new Float32Array(fftSize);
    for (let i = 0; i < fftSize; i++) {
        window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (fftSize - 1)));
    }

    const outputLeft = new Float32Array(outputLength);
    const outputRight = new Float32Array(outputLength);
    const overlapAdd = new Float32Array(outputLength);

    let inputPos = 0;
    let outputPos = 0;
    let frameCount = 0;

    while (outputPos < outputLength - fftSize && inputPos < inputLength - fftSize) {
        for (let i = 0; i < fftSize; i++) {
            const inputIdx = inputPos + i;
            const outputIdx = outputPos + i;

            if (inputIdx < inputLength && outputIdx < outputLength) {
                outputLeft[outputIdx] += leftChannel[inputIdx] * window[i];
                outputRight[outputIdx] += rightChannel[inputIdx] * window[i];
                overlapAdd[outputIdx] += window[i];
            }
        }

        inputPos += hopAnalysis;
        outputPos += hopSynthesis;
        frameCount++;

        if (frameCount % 50 === 0) {
            const progress = inputPos / inputLength;
            if (onProgress) onProgress(Math.min(progress, 1));
            await sleep(0);
        }
    }

    for (let i = 0; i < outputLength; i++) {
        if (overlapAdd[i] > 0.01) {
            outputLeft[i] /= overlapAdd[i];
            outputRight[i] /= overlapAdd[i];
        }
    }

    return { left: outputLeft, right: outputRight };
}

// === MP3 Encoding ===
async function encodeMP3(channels, length, sampleRate, onProgress) {
    const numChannels = channels.length;
    const kbps = 320;
    const left = channels[0];
    const right = numChannels > 1 ? channels[1] : left;

    const leftPCM = new Int16Array(length);
    const rightPCM = new Int16Array(length);

    for (let i = 0; i < length; i++) {
        const dither = (Math.random() - 0.5 + Math.random() - 0.5) / 32768;
        leftPCM[i] = Math.max(-32768, Math.min(32767, Math.round(left[i] * 32767 + dither)));
        rightPCM[i] = Math.max(-32768, Math.min(32767, Math.round(right[i] * 32767 + dither)));
    }

    const mp3encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, kbps);
    const mp3Data = [];
    const chunkSize = 1152;
    let processed = 0;
    const totalChunks = Math.ceil(length / chunkSize);

    for (let i = 0; i < length; i += chunkSize) {
        const lChunk = leftPCM.subarray(i, i + chunkSize);
        const rChunk = rightPCM.subarray(i, i + chunkSize);

        const mp3buf = (numChannels === 1)
            ? mp3encoder.encodeBuffer(lChunk)
            : mp3encoder.encodeBuffer(lChunk, rChunk);

        if (mp3buf.length > 0) mp3Data.push(mp3buf);

        processed++;
        if (processed % 100 === 0) {
            if (onProgress) onProgress(processed / totalChunks);
            await sleep(0);
        }
    }

    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) mp3Data.push(mp3buf);

    return new Blob(mp3Data, { type: 'audio/mpeg' });
}

// === Settings Sync ===
function updateTargetDurationFromSpeed(speed) {
    if (!state.originalAudioData) return;

    const originalDuration = state.originalAudioData.duration;
    const targetDuration = originalDuration / (speed / 100);

    const mins = Math.floor(targetDuration / 60);
    const secs = Math.floor(targetDuration % 60);

    document.getElementById('targetMin').value = mins;
    document.getElementById('targetSec').value = secs;
    document.getElementById('speedInfo').innerHTML = `<span data-i18n="tsNewDuration">${t('tsNewDuration')}</span>: ${formatTime(targetDuration)}`;
}

function updateSpeedFromTargetDuration() {
    if (!state.originalAudioData) return;

    const targetMin = parseInt(document.getElementById('targetMin').value) || 0;
    const targetSec = parseInt(document.getElementById('targetSec').value) || 0;
    const targetDuration = targetMin * 60 + targetSec;

    if (targetDuration > 0) {
        const originalDuration = state.originalAudioData.duration;
        const speed = Math.round((originalDuration / targetDuration) * 100);
        const clampedSpeed = Math.max(50, Math.min(200, speed));

        document.getElementById('speedSlider').value = clampedSpeed;
        document.getElementById('speedValue').textContent = `${clampedSpeed}%`;
        document.getElementById('speedInfo').innerHTML = `<span data-i18n="tsSpeedChange">${t('tsSpeedChange')}</span>: ${clampedSpeed}%`;
    }
}

// === Download ===
function downloadResult() {
    if (!state.resultBlob) return;

    const originalName = state.originalFile.name.replace(/\.[^/.]+$/, '');
    const speed = Math.round(document.getElementById('speedSlider').value);
    const filename = `${originalName}_stretched_${speed}pct.mp3`;
    const blob = state.resultBlob;

    if (window.navigator && window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveOrOpenBlob(blob, filename);
    } else {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style = 'display: none';
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }
}

// === Reset ===
function resetApp() {
    stopPlayback('original');
    stopPlayback('result');

    if (state.originalAudioUrl) URL.revokeObjectURL(state.originalAudioUrl);
    if (state.resultAudioUrl) URL.revokeObjectURL(state.resultAudioUrl);

    if (state.audioContext) {
        state.audioContext.close();
    }

    state.originalFile = null;
    state.originalAudioData = null;
    state.originalAudioUrl = null;
    state.resultAudioData = null;
    state.resultAudioUrl = null;
    state.resultBlob = null;
    state.audioContext = null;

    audioElements.original = null;
    audioElements.result = null;

    waveformCache.clear();

    fileInfo.classList.add('hidden');
    originalCard.classList.add('hidden');
    settingsCard.classList.add('hidden');
    resultCard.classList.add('hidden');
    uploadZone.classList.remove('hidden');

    fileInput.value = '';
    document.getElementById('speedSlider').value = 100;
    document.getElementById('speedValue').textContent = '100%';
}

// === UI Helpers ===
function showProcessing(title, subtitle) {
    document.getElementById('processingText').textContent = title;
    document.getElementById('processingSub').textContent = subtitle;
    document.getElementById('progressFill').style.width = '0%';
    document.getElementById('progressPercent').textContent = '0%';
    document.getElementById('processingOverlay').classList.add('active');
}

function hideProcessing() {
    document.getElementById('processingOverlay').classList.remove('active');
}

function updateProgress(percent) {
    document.getElementById('progressFill').style.width = `${percent}%`;
    document.getElementById('progressPercent').textContent = `${Math.round(percent)}%`;
}

function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) seconds = 0;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// === i18n Functions ===
function updateUITranslations() {
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translation = t(key);
        if (translation && translation !== key) {
            el.textContent = translation;
        }
    });

    // Update language button label
    const langLabels = {
        cs: 'Čeština',
        en: 'English',
        de: 'Deutsch',
        pl: 'Polski'
    };
    const flagUrls = {
        cs: 'https://flagcdn.com/24x18/cz.png',
        en: 'https://flagcdn.com/24x18/gb.png',
        de: 'https://flagcdn.com/24x18/de.png',
        pl: 'https://flagcdn.com/24x18/pl.png'
    };

    const currentLangLabel = document.getElementById('currentLangLabel');
    const currentFlag = document.getElementById('currentFlag');

    if (currentLangLabel && langLabels[currentLanguage]) {
        currentLangLabel.textContent = langLabels[currentLanguage];
    }
    if (currentFlag && flagUrls[currentLanguage]) {
        currentFlag.src = flagUrls[currentLanguage];
    }
}

function setupLanguageDropdown() {
    const langBtn = document.getElementById('langBtn');
    const langMenu = document.getElementById('langMenu');

    if (!langBtn || !langMenu) return;

    langBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        langMenu.classList.toggle('hidden');
        langBtn.setAttribute('aria-expanded', !langMenu.classList.contains('hidden'));
    });

    // Language items
    langMenu.querySelectorAll('.lang-item').forEach(item => {
        item.addEventListener('click', () => {
            const lang = item.getAttribute('data-value');
            setLanguage(lang);
            updateUITranslations();
            langMenu.classList.add('hidden');
            langBtn.setAttribute('aria-expanded', 'false');
        });
    });

    // Close on outside click
    document.addEventListener('click', () => {
        langMenu.classList.add('hidden');
        langBtn.setAttribute('aria-expanded', 'false');
    });
}

// === Warning Modal ===
function showWarningModal() {
    return new Promise((resolve) => {
        const modal = document.getElementById('warningModal');
        const confirmBtn = document.getElementById('modalConfirm');
        const cancelBtn = document.getElementById('modalCancel');

        if (!modal) {
            resolve(true);
            return;
        }

        modal.classList.add('active');

        const cleanup = () => {
            modal.classList.remove('active');
            confirmBtn.removeEventListener('click', onConfirm);
            cancelBtn.removeEventListener('click', onCancel);
        };

        const onConfirm = () => {
            cleanup();
            state.warningShown = true;
            resolve(true);
        };

        const onCancel = () => {
            cleanup();
            resolve(false);
        };

        confirmBtn.addEventListener('click', onConfirm);
        cancelBtn.addEventListener('click', onCancel);
    });
}

// Make changeLanguage available globally for onclick handlers
window.changeLanguage = function (lang) {
    setLanguage(lang);
    updateUITranslations();
    const langMenu = document.getElementById('langMenu');
    if (langMenu) langMenu.classList.add('hidden');
};
