// ============ Pomocné funkce pro UI ============

// Rychlá zkratka pro document.getElementById, ať se neupíšeme k smrti
export const $ = id => document.getElementById(id);

// Hodíme sekundy do lidského tvaru MM:SS
export function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Uděláme z bajtů něco čitelného (KB, MB)
export function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Zobrazí ten otravný overlay, když se něco děje
export function showProcessing(text, sub) {
    $('processingText').textContent = text;
    $('processingSub').textContent = sub;
    updateProcessingProgress(0); // Pro jistotu reset, ať tam nestraší stará hodnota
    $('processingOverlay').classList.add('active');
}

// Schová overlay, když máme hotovo
export function hideProcessing() {
    $('processingOverlay').classList.remove('active');
    updateProcessingProgress(0); // Uklidíme po sobě
}

// Posuneme progress bar o kus dál
export function updateProcessingProgress(percent, text = null) {
    const fill = $('progressFill');
    const percentText = $('progressPercent');

    if (fill) fill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    if (percentText) percentText.textContent = `${Math.round(percent)}%`;
    if (text) $('processingSub').textContent = text;
}

// Logic pro přepínání záložek v UI
export function switchTab(tabName, onTabSwitch = null) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');

    $('processedTab').classList.toggle('hidden', tabName !== 'processed');
    $('compareTab').classList.toggle('hidden', tabName !== 'compare');

    // Zavoláme callback až se UI překreslí (důležité pro canvasy!)
    if (onTabSwitch) {
        requestAnimationFrame(() => onTabSwitch(tabName));
    }
}
