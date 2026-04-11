# Audio Compressor — Kvido Production

Webová aplikace pro úpravu, normalizaci a analýzu audia. Funguje **kompletně offline** — stáhni si repo, spusť a můžeš jet.

## Rychlý start

1. Stáhni projekt (zelené tlačítko **Code → Download ZIP** na GitHubu) a rozbal ho kamkoliv.
2. Spusť spouštěč podle svého systému:
   - **macOS / Linux** → dvojklik na **`start.command`**
   - **Windows** → dvojklik na **`start.bat`**
3. Spouštěč:
   - zkontroluje, jestli máš Python 3 (pokud ne, nabídne stažení instalátoru),
   - ověří, že jsou všechny soubory na místě,
   - spustí lokální server na `http://localhost:8081`,
   - automaticky otevře aplikaci v prohlížeči.

Pro ukončení stačí zavřít okno terminálu nebo stisknout `Ctrl+C`.

> macOS tip: pokud spouštěč nejde otevřít kvůli Gatekeeperu, klikni na něj pravým tlačítkem → **Otevřít** → **Otevřít** ještě jednou.

## Co aplikace umí

### 1. Audio Kompresor
Nástroj pro normalizaci a úpravu hlasitosti.
- **Analýza:** detekce RMS, Peak a dynamického rozsahu.
- **Zpracování:** normalizace a limiter.
- **Batch Processing:** hromadné zpracování více souborů najednou.

### 2. Time-Stretch (Hall Edit)
Změna tempa nahrávek bez posunu výšky.
- **Technologie:** `SoundTouchJS` (WSOLA/SOLA algoritmus) — zachovává pitch.
- **A/B porovnání:** přepínání mezi originálem a výsledkem skočí na **hudebně ekvivalentní** pozici.
- **Využití:** zrychlení/zpomalení hal, cvičení, remixů.

## Offline režim

Všechny závislosti jsou přibalené ve složkách repa:
- `js/lib/` — SoundTouchJS, LAME encoder, JSZip
- `assets/fonts/` — webfonty
- `assets/flags/` — vlajky pro přepínač jazyků

Aplikace po stažení nic nestahuje z internetu — je vhodná pro použití v hale, studiu nebo kdekoliv bez připojení.

## Technologie
- **Frontend:** Vanilla JavaScript (ES modules), HTML5, CSS3
- **Audio:** Web Audio API, Web Workers
- **Server:** Python `http.server` (součástí Pythonu, nic dalšího instalovat nemusíš)

## Poznámky
- Data nikdy neopouštějí tvůj počítač — vše se zpracovává v prohlížeči.
- Projekt je ve fázi aktivního vývoje, chyby hlas prosím do Issues.
