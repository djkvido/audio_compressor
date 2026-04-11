// ============ Audio Safety / Validation Helpers ============
//
// Centrální validace vstupních souborů a audio bufferů.
// Brání pádům UI, out-of-memory, i destrukci zvuku extrémními hodnotami.
//
// Všechny limity jsou schválně liberální (30 min, 500 MB, 8 kanálů),
// ale dostatečně přísné, aby uživatel nepadl do černé díry.

import { t } from './translations.js';
import { formatFileSize, formatTime } from './ui.js';

// --- Horní limity ---
// Max velikost souboru: 500 MB (WAV ~47 min @ 44.1 kHz stereo PCM)
export const MAX_FILE_SIZE       = 500 * 1024 * 1024;

// Max délka audia: 30 min. Nad tím AGC pole (~317 M samplů × 4 B = 1.27 GB) bourá worker.
export const MAX_DURATION_SEC    = 30 * 60;

// Minimální délka: 0.2 s. Kratší soubory nejsou smysluplné k RMS/loudness analýze.
export const MIN_DURATION_SEC    = 0.2;

// Sample rate: rozumné rozmezí pro běžné audio (8–192 kHz).
// Pod 8 kHz je telefonní Nyquist, nad 192 kHz hlavně DSD/studiové formáty → out of scope.
export const MIN_SAMPLE_RATE     = 8000;
export const MAX_SAMPLE_RATE     = 192000;

// Počet kanálů: 1 (mono) až 8 (7.1 surround). Nad to jdou jen profi produkční soubory.
export const MIN_CHANNELS        = 1;
export const MAX_CHANNELS        = 8;

// Ticho detekce: pod -60 dBFS peak už není nic ke zpracování
// (vše by se přeložilo na zesílení šumu/quantization noise).
export const SILENCE_PEAK_DBFS   = -60;

// Klipový práh: nad -0.1 dBFS už je signál zničený (flat top) a AGC to nevyřeší.
export const CLIP_PEAK_DBFS      = -0.1;

// --- Výsledky validace ---
// { ok: true } nebo { ok: false, message: string }

/**
 * Validuje File objekt předtím, než ho začneme dekódovat.
 * Volá se synchronně, nepotřebuje AudioContext.
 */
export function validateAudioFile(file) {
    // Typ a extenze
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|m4a|ogg|flac|aac)$/i)) {
        return { ok: false, message: `${t('errorInvalidFormat')}: ${file.name}` };
    }

    // Velikost
    if (file.size === 0) {
        return { ok: false, message: `${t('errFileEmpty')}: ${file.name}` };
    }
    if (file.size > MAX_FILE_SIZE) {
        return {
            ok: false,
            message: `${t('errFileTooLarge').replace('{max}', formatFileSize(MAX_FILE_SIZE)).replace('{size}', formatFileSize(file.size))}: ${file.name}`
        };
    }

    return { ok: true };
}

/**
 * Validuje dekódovaný AudioBuffer. Volá se po decodeAudioData().
 * Kontroluje všechna zvuková omezení (délka, kanály, sample rate, ticho, klipy).
 *
 * Vrací:
 *   { ok: true, warnings: [...] } – validní, případně s varováními (clipped input)
 *   { ok: false, message: "..." } – neprojde, uživatel dostane alert a soubor se zahodí
 */
export function validateAudioBuffer(audioBuffer) {
    if (!audioBuffer) {
        return { ok: false, message: t('errDecodeFailed') };
    }

    // Počet kanálů
    const ch = audioBuffer.numberOfChannels;
    if (ch < MIN_CHANNELS || ch > MAX_CHANNELS) {
        return {
            ok: false,
            message: t('errChannelCount').replace('{n}', ch).replace('{max}', MAX_CHANNELS)
        };
    }

    // Sample rate
    const sr = audioBuffer.sampleRate;
    if (!sr || sr < MIN_SAMPLE_RATE || sr > MAX_SAMPLE_RATE) {
        return {
            ok: false,
            message: t('errSampleRate').replace('{sr}', sr).replace('{min}', MIN_SAMPLE_RATE).replace('{max}', MAX_SAMPLE_RATE)
        };
    }

    // Délka
    const dur = audioBuffer.duration;
    if (!isFinite(dur) || dur <= 0) {
        return { ok: false, message: t('errDurationZero') };
    }
    if (dur < MIN_DURATION_SEC) {
        return {
            ok: false,
            message: t('errAudioTooShort').replace('{min}', MIN_DURATION_SEC.toFixed(1))
        };
    }
    if (dur > MAX_DURATION_SEC) {
        return {
            ok: false,
            message: t('errAudioTooLong')
                .replace('{max}', formatTime(MAX_DURATION_SEC))
                .replace('{actual}', formatTime(dur))
        };
    }

    // Peak scan přes první kanál (rychlé – nejen pro detekci ticha, ale i klipů)
    // Používáme decimaci: stačí sampleovat každý 8. vzorek pro detekci.
    const data = audioBuffer.getChannelData(0);
    let peak = 0;
    const stride = Math.max(1, Math.floor(data.length / 200000)); // Max ~200k kontrol
    for (let i = 0; i < data.length; i += stride) {
        const v = Math.abs(data[i]);
        if (isFinite(v) && v > peak) peak = v;
    }

    const peakDb = peak > 0 ? 20 * Math.log10(peak) : -Infinity;

    // Ticho: úplně tichý soubor nelze smysluplně zpracovat
    if (peakDb < SILENCE_PEAK_DBFS) {
        return {
            ok: false,
            message: t('errAudioSilent').replace('{peak}', peakDb === -Infinity ? '-∞' : peakDb.toFixed(1))
        };
    }

    // Varování: file už je zaklipovaný (peak > -0.1 dBFS = -0.1 dBFS je tolerantní práh)
    const warnings = [];
    if (peakDb > CLIP_PEAK_DBFS) {
        warnings.push(t('warnAudioClipped').replace('{peak}', peakDb.toFixed(2)));
    }

    return { ok: true, warnings, peakDb };
}

/**
 * Clampuje uživatelská AGC nastavení do bezpečných mezí.
 * I kdyby uživatel obešel HTML `min`/`max` přes DevTools, tohle to zarazí.
 *
 * FIX (v14): Pole `targetRms` je teď interpretováno jako TARGET LUFS
 * (K-weighted). Rozsah -30 až -6 LUFS pokrývá všechny streaming standardy:
 *   -24 LUFS = ATSC A/85 (US broadcast)
 *   -23 LUFS = EBU R128 (EU broadcast)
 *   -16 LUFS = Apple Music / Apple Podcasts
 *   -14 LUFS = Spotify / YouTube / Tidal / Amazon (default)
 *   -11 LUFS = Spotify "loud" preset
 *
 * Vrací nový objekt settings se zaručeně platnými hodnotami.
 */
export function clampAgcSettings(settings) {
    const clamp = (v, min, max, fallback) => {
        const n = parseFloat(v);
        if (!isFinite(n)) return fallback;
        return Math.max(min, Math.min(max, n));
    };

    return {
        ...settings,
        // Cíl LUFS: -30 až -6 (pokryje broadcast po Spotify loud, víc = distorze)
        targetRms:      clamp(settings.targetRms,      -30,  -6,  -14),
        // Max boost: 0 až 30 dB. Nad 30 dB začíná zvednutý šum ničit zvuk.
        maxBoost:       clamp(settings.maxBoost,         0,  30,  18),
        // Max atenuace: 0 až 24 dB. Nad to je to už hard compression, ne leveler.
        maxAttenuation: clamp(settings.maxAttenuation,   0,  24,   6),
        // Okno: 100 až 5000 ms (krátké okno = rychlá reakce; dlouhé = podle Auphonic)
        windowSize:     clamp(settings.windowSize,     100, 5000, 1000),
        // Ceiling: -6 až -0.1 dBTP. -1 dBTP = EBU R128 / Auphonic / streaming default.
        ceiling:        clamp(settings.ceiling,         -6, -0.1, -1),
        // Fade: 0 až 60 s
        fadeInTime:     clamp(settings.fadeInTime,       0,  60,   0),
        fadeOutTime:    clamp(settings.fadeOutTime,      0,  60,   0)
    };
}

/**
 * Pro Hall Edit: kontrola, zda je tempo (originalDur / targetDur) v bezpečném rozmezí.
 * Mimo to kvalita time-stretchingu dramaticky klesá.
 *
 * @param originalDuration Délka originálu v sekundách
 * @param targetDuration Cílová délka v sekundách
 */
export function validateStretchRatio(originalDuration, targetDuration) {
    if (!isFinite(targetDuration) || targetDuration <= 0) {
        return { ok: false, message: t('errDurationZero') };
    }
    if (targetDuration < MIN_DURATION_SEC) {
        return { ok: false, message: t('errAudioTooShort').replace('{min}', MIN_DURATION_SEC.toFixed(1)) };
    }

    const tempo = originalDuration / targetDuration;

    // SoundTouch i fallback overlap-add začínají tvořit artefakty mimo 0.5x–2x.
    // Nad 2x nebo pod 0.5x je výsledek prakticky nepoužitelný.
    if (tempo < 0.5 || tempo > 2.0) {
        return {
            ok: false,
            message: t('errSpeedRange').replace('{tempo}', tempo.toFixed(2))
        };
    }

    return { ok: true, tempo };
}
