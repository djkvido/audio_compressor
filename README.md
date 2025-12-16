# Audio Studio 🎵

Profesionální webová aplikace pro úpravu a analýzu audia. Spojuje dva výkonné nástroje v jednom moderním rozhraní.

## 🌟 Funkce

### 1. Audio Kompresor 📊
Hlavní nástroj pro normalizaci a čištění nahrávek.
- **Analýza:** Detekce RMS, Peak a dynamického rozsahu.
- **Chytré zpracování:** Automatická normalizace hlasitosti (LUFS/RMS) a limiter proti clippingu.
- **Batch Processing:** Hromadné zpracování více souborů najednou (ZIP export).
- **Vizuální kontrola:** Detailní waveform s vyznačením problémových míst.

### 2. Time-Stretch (Hall Edit) ⏩
Nástroj pro změnu rychlosti hudby bez deformace hlasu (pitch-shifting).
- **Technologie:** Využívá knihovnu **SoundTouchJS** pro vysoce kvalitní zpracování v reálném čase.
- **Využití:** Ideální pro zrychlení/zpomalení podkladů pro vystoupení.
- **A/B Porovnání:** Okamžitý poslech originálu vs. upravené verze.

## 🛠️ Technologie
- **Frontend:** Vanilla JavaScript, HTML5, CSS3 (Modern Glassmorphism Design).
- **Audio Core:** Web Audio API.
- **Knihovny:**
  - `SoundTouchJS` (Time-Stretch algoritmus).
  - `LameJS` (MP3 encoding).
  - `JSZip` (Batch processing).

## 📝 Nedávné změny (Log)
- **Odstranění PWA:** Zrušena PWA funkcionalita (Service Workers, manifest) ve prospěch čisté webové aplikace.
- **Nový Branding:** Sjednocení designu ("Audio Kompresor" & "Time-Stretch"), odstranění marketingových textů.
- **Cross-Promotion:** Implementace chytrých prolinků mezi nástroji.
- **UX Vylepšení:** Odstranění potvrzovacích oken při opuštění stránky a fix UI prvků.

## 🚀 Použití
Aplikace běží kompletně ve vašem prohlížeči (Client-Side). Neodesílá žádná data na server.
- **Online:** Stačí otevřít webovou stránku (např. na GitHub Pages).
- **Prohlížeč:** Doporučujeme nejnovější Chrome, Edge nebo Firefox pro nejlepší kompatibilitu s Web Audio API.

Žádná instalace není potřeba. Stačí otevřít a používat.
