// ============ Vykreslovací engine (Canvas) ============
import { $, formatTime } from './ui.js';
import { t } from './translations.js';

// Cache pro překreslení - abychom nemuseli furt dekódovat buffer při každém posunu hlavy
const waveformCache = new Map();

// Hlavní "kreslič" vln. Bere AudioBuffer a flákne ho na Canvas.
export function drawWaveform(canvasId, audioBuffer, problems = [], playheadRatio = -1) {
    const canvas = $(canvasId);
    if (!canvas) return;

    // Pokud je canvas schovaný (např. jiný tab), tak na to kašlem, nemá rozměry
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const ctx = canvas.getContext('2d');

    // Retina fix - aby to nebylo rozmazaný na Macu/mobilech
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Vyčistíme plátno před kreslením
    ctx.clearRect(0, 0, width, height);

    // Metadata audia (pro vizuál stačí mono, jinak je to bordel)
    const numChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;

    // Optimalizace: Kolik samplů narveme do jednoho pixelu?
    // Nečteme každý sample, to by browser umřel. Čteme min/max z bloku.
    const samplesPerPixel = Math.ceil(length / width);

    // Předpočítáme si, kde jsou problémy, ať víme jakou barvou kreslit
    const problemMap = new Map();
    for (const p of problems) {
        const startPx = Math.floor((p.start / audioBuffer.duration) * width);
        const endPx = Math.ceil((p.end / audioBuffer.duration) * width);
        for (let px = startPx; px <= endPx; px++) {
            problemMap.set(px, p.type);
        }
    }

    const centerY = height / 2;
    const amplitude = height / 2 - 4;

    ctx.beginPath();

    // A jedem sloupec po sloupci (pixel po pixelu)
    for (let x = 0; x < width; x++) {
        const startSample = Math.floor(x * samplesPerPixel);
        const endSample = Math.min(startSample + samplesPerPixel, length);

        // Najít min a max v tomto bloku
        let min = 0;
        let max = 0;

        // Optimalizace: Pokud je blok obří, vezmeme jen vzorek
        // Ale pro přesnost raději projdeme vše (s AudioBuffer to je rychlé)
        // Pokud by to i tak sekalo, dá se přidat stride += 10

        const channelData = audioBuffer.getChannelData(0); // Bereme jen levý kanál pro rychlost

        for (let i = startSample; i < endSample; i += 1) {
            const val = channelData[i];
            if (val < min) min = val;
            if (val > max) max = val;
        }

        // Barvičky podle toho, jestli je to OK, nebo je tam problém (clipping/ticho)
        const problemType = problemMap.get(x);
        if (problemType === 'loud') {
            ctx.fillStyle = '#ff3366'; // Červená (clipping)
        } else if (problemType === 'quiet') {
            ctx.fillStyle = '#4a6fa5'; // Modrá (ticho)
        } else {
            ctx.fillStyle = '#00d4aa'; // Zelená (ok)
        }

        const yMin = centerY - (max * amplitude);
        const yMax = centerY - (min * amplitude);
        const barHeight = Math.max(2, yMax - yMin);

        ctx.fillRect(x, yMin, 1, barHeight);
    }

    // Středová osa (pro orientaci)
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Playhead (taková ta běhající čára, co ukazuje kde hrajeme)
    if (playheadRatio >= 0 && playheadRatio <= 1.01) {
        const playheadX = playheadRatio * width;

        // Bílá čára
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, height);
        ctx.stroke();

        // Záře
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.6)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, height);
        ctx.stroke();

        ctx.lineWidth = 1;
    }

    // Uložíme si data, ať je nemusíme tahat znova při updateWaveformPlayhead
    waveformCache.set(canvasId, { audioBuffer, problems });
}

// Jen posune čáru. Rychlovka, nepřekresluje celou vlnu pracně (používá cache).
export function updateWaveformPlayhead(canvasId, ratio) {
    const cached = waveformCache.get(canvasId);
    if (cached) {
        drawWaveform(canvasId, cached.audioBuffer, cached.problems, ratio);
    }
}

// Smaže čáru (např. při stopce)
export function clearWaveformPlayhead(canvasId) {
    const cached = waveformCache.get(canvasId);
    if (cached) {
        drawWaveform(canvasId, cached.audioBuffer, cached.problems, -1);
    }
}

// Vypíše seznam nalezených problémů pod graf
export function displayProblems(problems, duration, seekToTimeCallback) {
    const container = $('problemsList');

    if (!container) return;

    if (problems.length === 0) {
        container.innerHTML = `
            <div class="problem" style="background: var(--accent-dim);">
                <div class="problem-icon" style="background: var(--accent);">✓</div>
                <div>Skvělé! Žádné problémy.</div>
            </div>
        `;
        return;
    }

    // Ukazujeme max 5, zbytek schováme, ať to není spam
    const shown = problems.slice(0, 5);

    container.innerHTML = `
        <div class="analysis-title" style="margin-top: 1rem;">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="stroke: var(--warning);">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            Nalezené problémy (${problems.length})
        </div>
        ${shown.map(p => `
            <div class="problem">
                <div class="problem-icon ${p.type}">${p.type === 'loud' ? '📢' : '🔇'}</div>
                <div>
                    <strong>${p.messageKey === 'clipping' ? 'Přeřvání (Clipping)' : 'Příliš tiché'}</strong> 
                    v čase 
                    <span class="problem-time" data-time="${p.start}" data-type="original">${formatTime(p.start)}</span>
                    – 
                    <span class="problem-time" data-time="${p.end}" data-type="original">${formatTime(p.end)}</span>
                </div>
            </div>
        `).join('')}
        ${problems.length > 5 ? `<p style="color: var(--text-dim); font-size: 0.85rem;">... a ${problems.length - 5} dalších</p>` : ''}
    `;

    // Kliknutím na čas se audio posune (seek)
    container.querySelectorAll('.problem-time').forEach(el => {
        el.addEventListener('click', () => {
            const time = parseFloat(el.dataset.time);
            const type = el.dataset.type;
            seekToTimeCallback(time, type);
        });
    });
}
