// ============ Vykreslovací engine (Canvas) ============
import { $, formatTime } from './ui.js';
import { t } from './translations.js';

// Barvy waveformu – definované zde jako konstanty, ať se shodují s CSS legendou.
const COLOR_OK    = '#00d4aa';
const COLOR_LOUD  = '#ff3366';
const COLOR_QUIET = '#8b5cf6';

// Výška prostoru pro časovou osu v CSS pixelech
const TIME_AXIS_HEIGHT = 16;

// Cache pro vyrenderované vlny.
// Klíč = canvasId, hodnota = { audioBuffer, problems, offscreen, canvasWidth, canvasHeight, dpr }
//
// VÝKON: Celý waveform (peak envelope + RMS + časová osa) se renderuje do OffscreenCanvas
// jen při změně dat nebo rozměrů. Playhead se pak kreslí jako overlay — pouze clearRect + drawImage + 2 čáry.
// Tím klesají CPU nároky z "iterace přes všechny samply" na "kopírování pixelů z GPU",
// což je pro 50ms interval (20×/s) klíčové.
const waveformCache = new Map();

// OffscreenCanvas fallback pro starší prohlížeče (Safari < 16.4, Firefox < 105)
function createOffscreen(width, height) {
    if (typeof OffscreenCanvas !== 'undefined') {
        return new OffscreenCanvas(width, height);
    }
    // Fallback: regulární canvas mimo DOM
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    return c;
}

// Vybere vhodný interval pro časovou osu (cíl: ~5–8 markerů)
function pickTimeInterval(duration) {
    const candidates = [5, 10, 15, 30, 60, 120, 300, 600];
    for (const iv of candidates) {
        if (duration / iv <= 8) return iv;
    }
    return Math.ceil(duration / 6);
}

// Sestaví waveform do OffscreenCanvas a uloží do cache.
// Renderuje:
//   1. Dvouvrstvý waveform: průhledná peak obálka + plný RMS bar (jako Logic Pro / Audacity)
//   2. Časová osa v patě canvasu s tick marky a časovými popisky
function buildWaveformCache(canvasId, audioBuffer, problems, width, height, dpr) {
    const physW = Math.round(width * dpr);
    const physH = Math.round(height * dpr);

    const offscreen = createOffscreen(physW, physH);
    const ctx = offscreen.getContext('2d');

    // Pracujeme v CSS px souřadnicích (scale na DPR)
    ctx.scale(dpr, dpr);

    const length = audioBuffer.length;
    const duration = audioBuffer.duration;
    const samplesPerPixel = Math.ceil(length / width);

    // Renderovací oblast waveformu (bez časové osy v patě)
    const waveH = height - TIME_AXIS_HEIGHT;
    const centerY = waveH / 2;
    const amplitude = waveH / 2 - 4;

    // FIX výkon: getChannelData(0) jednou před smyčkou
    const channelData = audioBuffer.getChannelData(0);

    // Mapa problémů: pixel → typ (O(1) lookup)
    const problemMap = new Map();
    for (const p of problems) {
        const startPx = Math.floor((p.start / duration) * width);
        const endPx   = Math.ceil((p.end   / duration) * width);
        for (let px = startPx; px <= endPx; px++) {
            problemMap.set(px, p.type);
        }
    }

    // --- Dvouvrstvý waveform ---
    for (let x = 0; x < width; x++) {
        const startSample = Math.floor(x * samplesPerPixel);
        const endSample   = Math.min(startSample + samplesPerPixel, length);

        let min = 0, max = 0, sumSq = 0;
        const count = endSample - startSample;

        for (let i = startSample; i < endSample; i++) {
            const v = channelData[i];
            if (v < min) min = v;
            if (v > max) max = v;
            sumSq += v * v;
        }

        const rms = count > 0 ? Math.sqrt(sumSq / count) : 0;

        const problemType = problemMap.get(x);
        const color = problemType === 'loud'  ? COLOR_LOUD
                    : problemType === 'quiet' ? COLOR_QUIET
                    : COLOR_OK;

        ctx.fillStyle = color;

        // Vrstva 1: peak obálka (průhledná, 28% opacity) – ukazuje transient špičky
        const yPeakTop    = centerY - max * amplitude;
        const yPeakBottom = centerY - min * amplitude;
        ctx.globalAlpha = 0.28;
        ctx.fillRect(x, yPeakTop, 1, Math.max(1, yPeakBottom - yPeakTop));

        // Vrstva 2: RMS bar (plný, 100% opacity) – ukazuje vnímanou energii
        const rmsHalf = rms * amplitude;
        ctx.globalAlpha = 1.0;
        ctx.fillRect(x, centerY - rmsHalf, 1, Math.max(2, rmsHalf * 2));
    }

    ctx.globalAlpha = 1.0;

    // --- Středová osa ---
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // --- Časová osa ---
    if (duration > 0) {
        const axisY = waveH; // Top of time axis area
        const interval = pickTimeInterval(duration);

        ctx.font = '9px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // Oddělovač
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, axisY);
        ctx.lineTo(width, axisY);
        ctx.stroke();

        for (let ts = 0; ts <= duration; ts += interval) {
            const x = (ts / duration) * width;

            // Tick čára
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, axisY);
            ctx.lineTo(x, axisY + 4);
            ctx.stroke();

            // Popisek (přeskočíme úplný konec, pokud je moc blízko předchozímu)
            const mins = Math.floor(ts / 60);
            const secs = Math.floor(ts % 60);
            const label = `${mins}:${secs.toString().padStart(2, '0')}`;

            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.fillText(label, Math.min(x, width - 15), axisY + 5);
        }
    }

    waveformCache.set(canvasId, {
        audioBuffer,
        problems,
        problemsEmpty: problems.length === 0,  // Pro rychlé srovnání prázdnosti
        offscreen,
        canvasWidth: width,
        canvasHeight: height,
        dpr
    });
}

// Hlavní kreslící funkce.
// Při první volání nebo změně dat/rozměrů sestaví cache (OffscreenCanvas),
// pak nakreslí cached obraz + playhead overlay.
export function drawWaveform(canvasId, audioBuffer, problems = [], playheadRatio = -1) {
    const canvas = $(canvasId);
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const width  = Math.round(rect.width);
    const height = Math.round(rect.height);
    const physW  = Math.round(width * dpr);
    const physH  = Math.round(height * dpr);

    // Resize canvasu jen při skutečné změně (resetování vždy při každém volání bylo chybné)
    if (canvas.width !== physW || canvas.height !== physH) {
        canvas.width  = physW;
        canvas.height = physH;
    }

    const ctx = canvas.getContext('2d');
    const cached = waveformCache.get(canvasId);

    // FIX (kritický bug): Srovnání prázdných polí [] !== [] je vždy true (různé objekty).
    // Dříve to způsobovalo rebuild OffscreenCanvas při každém pohybu playheadu
    // pro "zpracovaný" waveform (volaný jako drawWaveform(id, buf, [])).
    // Oprava: prázdná pole se považují za ekvivalentní bez ohledu na identitu objektu.
    const newProblemsEmpty = problems.length === 0;
    const needsRebuild = !cached
        || cached.audioBuffer  !== audioBuffer
        || cached.canvasWidth  !== width
        || cached.canvasHeight !== height
        || cached.dpr          !== dpr
        || (cached.problems !== problems
            && !(cached.problemsEmpty && newProblemsEmpty));  // ← KLÍČOVÁ OPRAVA

    if (needsRebuild) {
        buildWaveformCache(canvasId, audioBuffer, problems, width, height, dpr);
    }

    // Nakreslíme cached obraz (drawImage = hardware-accelerated, nulová CPU práce)
    ctx.clearRect(0, 0, physW, physH);
    ctx.drawImage(waveformCache.get(canvasId).offscreen, 0, 0);

    // Playhead overlay – v fyzických pixelech (žádná scale transformace)
    if (playheadRatio >= 0 && playheadRatio <= 1.01) {
        const playheadX = Math.round(playheadRatio * width * dpr);

        // Bílá čára
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 * dpr;
        ctx.beginPath();
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, physH);
        ctx.stroke();

        // Glow
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.55)';
        ctx.lineWidth = 5 * dpr;
        ctx.beginPath();
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, physH);
        ctx.stroke();

        ctx.lineWidth = 1;
    }
}

// Posune playhead čáru bez přepočítávání waveformu.
export function updateWaveformPlayhead(canvasId, ratio) {
    const cached = waveformCache.get(canvasId);
    if (cached) {
        drawWaveform(canvasId, cached.audioBuffer, cached.problems, ratio);
    }
}

// Smaže playhead čáru.
export function clearWaveformPlayhead(canvasId) {
    const cached = waveformCache.get(canvasId);
    if (cached) {
        drawWaveform(canvasId, cached.audioBuffer, cached.problems, -1);
    }
}

// Ikony a štítky pro jednotlivé typy problémů / informací
// loud = clipping (červená), quiet = tichý úsek (fialová),
// warn = globální warning se závažným dopadem (žlutá),
// info = globální informace bez akce (modrá)
const PROBLEM_ICONS = {
    loud:  '📢',
    quiet: '🔇',
    warn:  '⚠️',
    info:  'ℹ️'
};

// Zobrazí seznam nalezených problémů pod grafem.
//
// Dvě kategorie:
//   1. Globální (p.global === true) – týkají se celého souboru (over-compressed,
//      mono content, fázové problémy). Nemají klikatelný čas, jen informují.
//   2. Regionální – konkrétní úseky (clipping, tiché pasáže), klikatelné pro seek.
export function displayProblems(problems, duration, seekToTimeCallback) {
    const container = $('problemsList');
    if (!container) return;

    if (problems.length === 0) {
        container.innerHTML = `
            <div class="problem" style="background: var(--accent-dim);">
                <div class="problem-icon" style="background: var(--accent);">✓</div>
                <div data-i18n="noProblems">${t('noProblems')}</div>
            </div>
        `;
        return;
    }

    // Rozdělíme na globální (info/warn bez časového úseku) a regionální
    const globals = problems.filter(p => p.global);
    const regional = problems.filter(p => !p.global);

    const regionalShown = regional.slice(0, 5);
    const regionalExtra = regional.length - regionalShown.length;

    // Formátovač textu pro globální warning – doplní LRA / korelaci z severity
    const formatGlobalMessage = (p) => {
        let msg = t(p.messageKey);
        if (p.messageKey === 'warnOverCompressed') {
            msg = msg.replace('{lra}', p.severity.toFixed(1));
        } else if (p.messageKey === 'warnEffectivelyMono' || p.messageKey === 'warnPhaseIssue') {
            msg = msg.replace('{corr}', p.severity.toFixed(2));
        }
        return msg;
    };

    const globalsHtml = globals.map(p => `
        <div class="problem">
            <div class="problem-icon ${p.type}">${PROBLEM_ICONS[p.type] || 'ℹ️'}</div>
            <div>${formatGlobalMessage(p)}</div>
        </div>
    `).join('');

    const regionalHtml = regionalShown.map(p => `
        <div class="problem">
            <div class="problem-icon ${p.type}">${PROBLEM_ICONS[p.type] || '⚠️'}</div>
            <div>
                <strong data-i18n="${p.messageKey}">${t(p.messageKey)}</strong>
                <span class="problem-time" data-time="${p.start}" data-type="original">${formatTime(p.start)}</span>
                –
                <span class="problem-time" data-time="${p.end}" data-type="original">${formatTime(p.end)}</span>
            </div>
        </div>
    `).join('');

    container.innerHTML = `
        <div class="analysis-title" style="margin-top: 1rem;">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="stroke: var(--warning);">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <span data-i18n="problemsFound">${t('problemsFound')}</span> (${problems.length})
        </div>
        ${globalsHtml}
        ${regionalHtml}
        ${regionalExtra > 0 ? `<p style="color: var(--text-dim); font-size: 0.85rem;" data-i18n="andXMore" data-x="${regionalExtra}">${t('andXMore').replace('{x}', regionalExtra)}</p>` : ''}
    `;

    container.querySelectorAll('.problem-time').forEach(el => {
        el.addEventListener('click', () => {
            seekToTimeCallback(parseFloat(el.dataset.time), el.dataset.type);
        });
    });
}
