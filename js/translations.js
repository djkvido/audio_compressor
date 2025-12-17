// ============ Translations / i18n ============
// Supported languages: Czech (cs), English (en), German (de), Polish (pl)

const translations = {
    cs: {
        // Upload
        uploadTitle: "Přetáhněte audio soubor",
        uploadOr: "nebo",
        uploadBrowse: "vyberte soubor",
        uploadFormats: "Podporované formáty: MP3, WAV, FLAC, OGG, M4A",
        uploadHint: "Je možné nahrát více souborů najednou pomocí přetažení nebo výběrem přes Ctrl (Cmd na Macu). Doporučujeme ale upravovat písničky jednotlivě z důvodu kontroly.",

        // Promo Hall Edit
        promoTitle: "Zrychlení záznamu pro halové vystoupení",
        promoBtn: "Otevřít",

        // Promo Back (Main)
        promoBackTitle: "Profesionální analýza a normalizace audia",
        promoBackBtn: "Otevřít",

        // App Titles
        appTitleMain: "Audio Kompresor",
        appTitleHall: "Time-Stretch",

        // Analysis
        analysisTitle: "Analýza",

        peakLabel: "Peak:",
        rmsLabel: "RMS:",
        peak: "Peak",
        rms: "RMS",

        // Settings
        settingsTitle: "Nastavení",
        volumeNormalization: "Vyrovnání hlasitosti",
        presetLabel: "Preset:",
        presetLight: "Jemné doladění",
        presetStandard: "Standardní",
        presetHeavy: "Agresivní",
        presetCustom: "Vlastní nastavení",
        targetRms: "Cíl RMS (dB)",
        maxBoost: "Max boost (dB)",
        windowSize: "Okno (ms)",
        target: "Cíl",
        enable: "Povolit",
        duration: "Délka",

        limiter: "Limiter",
        limiterCeiling: "Ceiling (dB)",

        fadeIn: "Fade In",
        fadeOut: "Fade Out",
        seconds: "s",
        size: "Velikost",

        processBtn: "Zpracovat audio",

        // Results
        resultTitle: "✅ Výsledek zpracování",
        processedBadge: "UPRAVENO",
        tabProcessed: "Upravené",
        tabCompare: "Porovnání před/po",

        whatChanged: "Co se změnilo",
        changeNormalized: "Hlasitost vyrovnána na",
        changeFadeIn: "Fade in",
        changeFadeOut: "Fade out",
        changeLimiter: "Limiter ceiling",
        changeRmsChange: "RMS změna",

        abHint: "Klikni pro přepnutí Originál ↔ Upraveno",

        backBtn: "Upravit nastavení",
        downloadBtn: "Stáhnout", // Fallback
        downloadBtnMp3: "Stáhnout MP3",
        downloadBtnWav: "Stáhnout WAV",

        // Analysis status
        analyzingAudio: "Analyzuji audio...",
        calculatingLoudness: "Počítám hlasitost a hledám problémy...",

        // Compare
        original: "Originál",
        processed: "Upraveno",

        // Processing overlay
        processingTitle: "Zpracovávám audio...",
        processingPrepare: "Připravuji audio...",
        processingCopy: "Kopíruji kanály...",
        processingAGC: "Aplikuji vyrovnání hlasitosti...",
        processingLimiter: "Limitace peaků...",
        processingFadeIn: "Aplikuji fade in...",
        processingFadeOut: "Aplikuji fade out...",
        processingEncode: "Kóduji MP3...",
        processingZip: "Balím ZIP...",
        processingDone: "Hotovo!",

        // Footer
        footerText: "Zpracování probíhá v prohlížeči, soubory se nikam neodesílají",

        errorAnalysis: "Nepodařilo se analyzovat soubor",
        errorProcessing: "Chyba při zpracování",

        // Warnings
        clipping: "Přebuzení/clipping",
        tooQuiet: "Velmi tiché",
        noProblems: "Skvělé! Nebyly nalezeny žádné zásadní problémy s hlasitostí.",
        problemsFound: "Nalezené problémy",
        andXMore: "... a {x} dalších",

        // Batch
        batchTitle: "📦 Hromadné zpracování",
        clear: "Vyčistit",
        batchFinished: "Dokončeno! ✅",
        downloadZip: "Stáhnout ZIP",
        processAll: "Zpracovat vše",

        // Warning Modal
        warningTitle: "Důležité upozornění",
        warningBody: "Tento nástroj slouží jako pomocník pro optimalizaci audia. Automatické úpravy nemusí být vždy perfektní. Vždy proveďte finální kontrolu poslechem, abyste se ujistili, že výsledek odpovídá vašim představám a je optimalizován správně.",
        warningConfirm: "Rozumím, pokračovat",
        warningCancel: "Zrušit",
        tsWarningBody: "Time-Stretch mění rychlost audia bez změny tóniny. Výsledek vždy zkontrolujte poslechem. Extrémní změny rychlosti (pod 70% nebo nad 130%) mohou způsobit artefakty.",

        // Time-Stretch specific
        tsOriginalAudio: "📊 Původní Audio ",
        tsInfo: "Informace",
        tsOriginalDuration: "Původní délka",
        tsSampleRate: "Sample Rate",
        tsSettingsTitle: "⚡ Nastavení Time-Stretch",
        tsTargetDuration: "Cílová délka",
        tsOrSpeed: "Nebo zadej rychlost",
        tsSpeedHint: "50% = dvojnásobná délka, 200% = poloviční délka",
        tsProcessBtn: "Zpracovat Audio",
        tsResultTitle: "✅ Výsledek",
        tsTabResult: "Výsledek",
        tsTabCompare: "Porovnání A/B",
        tsNewDuration: "Nová délka",
        tsSpeedChange: "Změna rychlosti",
        tsEditSettings: "Upravit nastavení",
        tsDownloadMp3: "Stáhnout MP3",
        tsProcessing: "Zpracovávám...",
        tsApplyingTimeStretch: "Aplikuji time-stretch",
        tsRemoveFile: "Odebrat soubor",
        tsPlayOriginal: "Přehrát/zastavit originál",
        tsPlayResult: "Přehrát/zastavit upravené",
        tsSwitchView: "Přepnout mezi originál a upravenou verzí",
        tsClickToPlay: "Klikni pro přehrávání",

        // JS Alerts
        errLoadAudio: "Chyba při načítání audia: ",
        errInvalidTime: "Zadejte platný čas",
        errDurationZero: "Cílová délka musí být větší než 0",
        errSpeedRange: "Změna rychlosti musí být mezi 50% a 200%",
        errBrowserDownload: "Prohlížeč nepodporuje stahování souborů.",

        tsEncodingMp3: "Enkóduji MP3...",

        // Advanced Warning Modal
        advancedWarningTitle: "Pokročilé nastavení",
        advancedWarningBody: "Tyto funkce jsou určeny pouze pro zkušené uživatele. Změna výchozích hodnot může vést ke zhoršení kvality zvuku. Opravdu chcete pokračovat?",

        // Simplified UI
        settingsHint: "Aplikace automaticky použije nejlepší nastavení pro vaše audio.",
        advancedSettings: "Pokročilé nastavení",
        advancedWarning: "Pouze pro zkušené uživatele. Změna hodnot může zhoršit výsledek."
    },

    en: {
        // Upload
        uploadTitle: "Drop audio file here",
        uploadOr: "or",
        uploadBrowse: "browse files",
        uploadFormats: "Supported formats: MP3, WAV, FLAC, OGG, M4A",
        uploadHint: "You can upload multiple files by dragging or selecting via Ctrl (Cmd on Mac). However, we recommend processing songs individually for better quality control.",

        promoTitle: "Speed up recordings for hall performances",
        promoBtn: "Open",

        // Promo Back (Main)
        promoBackTitle: "Professional Audio Analysis & Normalization",
        promoBackBtn: "Open",

        // App Titles
        appTitleMain: "Audio Compressor",
        appTitleHall: "Time-Stretch",

        // Analysis
        analysisTitle: "Analysis",

        peakLabel: "Peak:",
        rmsLabel: "RMS:",
        peak: "Peak",
        rms: "RMS",

        // Settings
        settingsTitle: "Settings",
        volumeNormalization: "Volume Normalization",
        presetLabel: "Preset:",
        presetLight: "Light",
        presetStandard: "Standard",
        presetHeavy: "Aggressive",
        presetCustom: "Custom",
        targetRms: "Target RMS (dB)",
        maxBoost: "Max boost (dB)",
        windowSize: "Window (ms)",
        target: "Target",
        enable: "Enable",
        duration: "Duration",

        limiter: "Limiter",
        limiterCeiling: "Ceiling (dB)",

        fadeIn: "Fade In",
        fadeOut: "Fade Out",
        seconds: "s",
        size: "Size",

        processBtn: "Process audio",

        // Results
        resultTitle: "✅ Processing Result",
        processedBadge: "PROCESSED",
        tabProcessed: "Processed",
        tabCompare: "Before/After",

        whatChanged: "What changed",
        changeNormalized: "Volume normalized to",
        changeFadeIn: "Fade in",
        changeFadeOut: "Fade out",
        changeLimiter: "Limiter ceiling",
        changeRmsChange: "RMS change",

        abHint: "Click to switch Original ↔ Processed",

        backBtn: "Edit settings",
        downloadBtn: "Download MP3",
        downloadBtnMp3: "Download MP3",
        downloadBtnWav: "Download WAV",

        // Compare
        original: "Original",
        processed: "Processed",

        // Processing overlay
        processingTitle: "Processing audio...",
        processingPrepare: "Preparing audio...",
        processingCopy: "Copying channels...",
        processingAGC: "Applying volume normalization...",
        processingLimiter: "Limiting peaks...",
        processingFadeIn: "Applying fade in...",
        processingFadeOut: "Applying fade out...",
        processingEncode: "Encoding MP3...",
        processingZip: "Creating ZIP...",
        processingDone: "Done!",

        // Footer
        footerText: "Processing happens in your browser, files are never uploaded",

        errorAnalysis: "Failed to analyze file",
        errorProcessing: "Processing error",

        // Warnings
        clipping: "Clipping/Distortion",
        tooQuiet: "Too quiet",
        noProblems: "Great! No major volume issues found.",
        problemsFound: "Issues found",
        andXMore: "... and {x} more",

        // Analysis status
        analyzingAudio: "Analyzing audio...",
        calculatingLoudness: "Calculating loudness and detecting issues...",
        errorInvalidFormat: "Please upload an audio file (MP3, WAV, M4A, OGG, FLAC)",

        // Batch
        batchTitle: "📦 Batch Processing",
        clear: "Clear",
        batchFinished: "Finished! ✅",
        downloadZip: "Download ZIP",
        processAll: "Process All",

        // Warning Modal
        warningTitle: "Important Notice",
        warningBody: "This tool is designed to assist with audio optimization. Automatic adjustments may not always be perfect. Always perform a final listening check to ensure the result meets your expectations and is optimized correctly.",
        warningConfirm: "I understand, proceed",
        warningCancel: "Cancel",
        tsWarningBody: "Time-Stretch changes audio speed without altering pitch. Always check the result by listening. Extreme speed changes (below 70% or above 130%) may cause artifacts.",

        // Time-Stretch specific
        tsOriginalAudio: "📊 Original Audio",
        tsInfo: "Information",
        tsOriginalDuration: "Original duration",
        tsSampleRate: "Sample Rate",
        tsSettingsTitle: "⚡ Time-Stretch Settings",
        tsTargetDuration: "Target duration",
        tsOrSpeed: "Or set speed",
        tsSpeedHint: "50% = double length, 200% = half length",
        tsProcessBtn: "Process Audio",
        tsResultTitle: "✅ Result",
        tsTabResult: "Result",
        tsTabCompare: "A/B Comparison",
        tsNewDuration: "New duration",
        tsSpeedChange: "Speed change",
        tsEditSettings: "Edit settings",
        tsDownloadMp3: "Download MP3",
        tsProcessing: "Processing...",
        tsApplyingTimeStretch: "Applying time-stretch",
        tsRemoveFile: "Remove file",
        tsPlayOriginal: "Play/Pause original",
        tsPlayResult: "Play/Pause result",
        tsSwitchView: "Switch between original and processed",
        tsClickToPlay: "Click to play",

        // JS Alerts
        errLoadAudio: "Error loading audio: ",
        errInvalidTime: "Please enter valid time",
        errDurationZero: "Target duration must be greater than 0",
        errSpeedRange: "Speed change must be between 50% and 200%",
        errBrowserDownload: "Browser does not support file downloading.",

        tsEncodingMp3: "Encoding MP3...",

        // Advanced Warning Modal
        advancedWarningTitle: "Advanced Settings",
        advancedWarningBody: "These features are intended for advanced users only. Changing default values may degrade audio quality. Do you really want to proceed?",

        // Simplified UI
        settingsHint: "The app automatically applies the best settings for your audio.",
        advancedSettings: "Advanced Settings",
        advancedWarning: "For advanced users only. Changing values may degrade results."
    },

    de: {
        // Upload
        uploadTitle: "Audiodatei hierher ziehen",
        uploadOr: "oder",
        uploadBrowse: "Datei auswählen",
        uploadFormats: "Unterstützte Formate: MP3, WAV, FLAC, OGG, M4A",

        promoTitle: "Aufnahmen für Hallenauftritte beschleunigen",
        promoBtn: "Öffnen",

        // Promo Back (Main)
        promoBackTitle: "Professionelle Audio-Analyse & Normalisierung",
        promoBackBtn: "Öffnen",

        // App Titles
        appTitleMain: "Audio Kompressor",
        appTitleHall: "Time-Stretch",

        // Analysis
        analysisTitle: "Analyse",

        peakLabel: "Peak:",
        rmsLabel: "RMS:",
        peak: "Peak",
        rms: "RMS",

        // Settings
        settingsTitle: "Einstellungen",
        volumeNormalization: "Lautstärke-Normalisierung",
        presetLabel: "Voreinstellung:",
        presetLight: "Leicht",
        presetStandard: "Standard",
        presetHeavy: "Aggressiv",
        presetCustom: "Benutzerdefiniert",
        targetRms: "Ziel-RMS (dB)",
        maxBoost: "Max Boost (dB)",
        windowSize: "Fenster (ms)",
        target: "Ziel",
        enable: "Aktivieren",
        duration: "Dauer",

        limiter: "Limiter",
        limiterCeiling: "Ceiling (dB)",

        fadeIn: "Fade In",
        fadeOut: "Fade Out",
        seconds: "s",
        size: "Größe",

        processBtn: "Audio verarbeiten",

        // Results
        resultTitle: "✅ Verarbeitungsergebnis",
        processedBadge: "VERARBEITET",
        tabProcessed: "Verarbeitet",
        tabCompare: "Vorher/Nachher",

        whatChanged: "Was geändert wurde",
        changeNormalized: "Lautstärke normalisiert auf",
        changeFadeIn: "Fade in",
        changeFadeOut: "Fade out",
        changeLimiter: "Limiter Ceiling",
        changeRmsChange: "RMS Änderung",

        abHint: "Klicken zum Umschalten Original ↔ Verarbeitet",

        backBtn: "Einstellungen ändern",
        downloadBtn: "MP3 herunterladen",
        downloadBtnMp3: "MP3 herunterladen",
        downloadBtnWav: "WAV herunterladen",

        // Compare
        original: "Original",
        processed: "Verarbeitet",

        // Processing overlay
        processingTitle: "Audio wird verarbeitet...",
        processingPrepare: "Audio vorbereiten...",
        processingCopy: "Kanäle kopieren...",
        processingAGC: "Lautstärke-Normalisierung anwenden...",
        processingLimiter: "Peaks begrenzen...",
        processingFadeIn: "Fade in anwenden...",
        processingFadeOut: "Fade out anwenden...",
        processingEncode: "MP3 kodieren...",
        processingZip: "Erstelle ZIP...",
        processingDone: "Fertig!",

        // Footer
        footerText: "Die Verarbeitung erfolgt im Browser, Dateien werden nicht hochgeladen",

        errorAnalysis: "Datei konnte nicht analysiert werden",
        errorProcessing: "Verarbeitungsfehler",

        // Warnings
        clipping: "Übersteuerung/Clipping",
        tooQuiet: "Zu leise",
        noProblems: "Großartig! Keine größeren Lautstärkeprobleme gefunden.",
        problemsFound: "Gefundene Probleme",
        andXMore: "... und {x} weitere",

        // Analysis status
        analyzingAudio: "Audio analysieren...",
        calculatingLoudness: "Lautstärke berechnen und Probleme suchen...",
        errorInvalidFormat: "Bitte laden Sie eine Audiodatei hoch (MP3, WAV, M4A, OGG, FLAC)",

        // Batch
        batchTitle: "📦 Stapelverarbeitung",
        clear: "Leeren",
        batchFinished: "Fertig! ✅",
        downloadZip: "ZIP herunterladen",
        processAll: "Alle verarbeiten",
        uploadHint: "Sie können mehrere Dateien durch Ziehen oder Auswahl mit Strg (Cmd auf Mac) hochladen. Wir empfehlen jedoch, Songs einzeln zu bearbeiten, um die Qualität besser kontrollieren zu können.",

        // Warning Modal
        warningTitle: "Wichtiger Hinweis",
        warningBody: "Dieses Tool dient als Hilfsmittel zur Audio-Optimierung. Automatische Anpassungen sind möglicherweise nicht immer perfekt. Führen Sie immer eine abschließende Hörprobe durch, um sicherzustellen, dass das Ergebnis Ihren Erwartungen entspricht und korrekt optimiert ist.",
        warningConfirm: "Ich verstehe, fortfahren",
        warningCancel: "Stornieren",
        tsWarningBody: "Time-Stretch ändert die Audiogeschwindigkeit ohne Tonhöhenänderung. Überprüfen Sie das Ergebnis immer durch Anhören. Extreme Geschwindigkeitsänderungen (unter 70% oder über 130%) können Artefakte verursachen.",

        // Time-Stretch specific
        tsOriginalAudio: "📊 Original Audio",
        tsInfo: "Information",
        tsOriginalDuration: "Originallänge",
        tsSampleRate: "Abtastrate",
        tsSettingsTitle: "⚡ Time-Stretch Einstellungen",
        tsTargetDuration: "Zieldauer",
        tsOrSpeed: "Oder Geschwindigkeit einstellen",
        tsSpeedHint: "50% = doppelte Länge, 200% = halbe Länge",
        tsProcessBtn: "Audio verarbeiten",
        tsResultTitle: "✅ Ergebnis",
        tsTabResult: "Ergebnis",
        tsTabCompare: "A/B Vergleich",
        tsNewDuration: "Neue Dauer",
        tsSpeedChange: "Geschwindigkeitsänderung",
        tsEditSettings: "Einstellungen bearbeiten",
        tsDownloadMp3: "MP3 herunterladen",
        tsProcessing: "Verarbeitung...",
        tsApplyingTimeStretch: "Time-Stretch anwenden",
        tsRemoveFile: "Datei entfernen",
        tsPlayOriginal: "Original abspielen/pausieren",
        tsPlayResult: "Ergebnis abspielen/pausieren",
        tsSwitchView: "Zwischen Original und Ergebnis umschalten",
        tsClickToPlay: "Zum Abspielen klicken",

        // JS Alerts
        errLoadAudio: "Fehler beim Laden von Audio: ",
        errInvalidTime: "Bitte geben Sie eine gültige Zeit ein",
        errDurationZero: "Zieldauer muss größer als 0 sein",
        errSpeedRange: "Geschwindigkeitsänderung muss zwischen 50% und 200% liegen",
        errBrowserDownload: "Der Browser unterstützt das Herunterladen von Dateien nicht.",

        tsEncodingMp3: "MP3 wird kodiert...",

        // Advanced Warning Modal
        advancedWarningTitle: "Erweiterte Einstellungen",
        advancedWarningBody: "Diese Funktionen sind nur für fortgeschrittene Benutzer gedacht. Das Ändern der Standardwerte kann die Audioqualität verschlechtern. Möchten Sie wirklich fortfahren?",

        // Simplified UI
        settingsHint: "Die App wendet automatisch die besten Einstellungen für Ihr Audio an.",
        advancedSettings: "Erweiterte Einstellungen",
        advancedWarning: "Nur für fortgeschrittene Benutzer. Änderungen können das Ergebnis verschlechtern."
    },

    pl: {
        // Upload
        uploadTitle: "Przeciągnij plik audio tutaj",
        uploadOr: "lub",
        uploadBrowse: "wybierz plik",
        uploadFormats: "Obsługiwane formaty: MP3, WAV, FLAC, OGG, M4A",

        promoTitle: "Przyspieszanie nagrań na występy halowe",
        promoBtn: "Otwórz",

        // Promo Back (Main)
        promoBackTitle: "Profesjonalna analiza i normalizacja dźwięku",
        promoBackBtn: "Otwórz",

        // App Titles
        appTitleMain: "Kompresor Audio",
        appTitleHall: "Time-Stretch",

        // Analysis
        analysisTitle: "Analiza",

        peakLabel: "Peak:",
        rmsLabel: "RMS:",
        peak: "Peak",
        rms: "RMS",

        // Settings
        settingsTitle: "Ustawienia",
        volumeNormalization: "Normalizacja głośności",
        presetLabel: "Preset:",
        presetLight: "Delikatny",
        presetStandard: "Standardowy",
        presetHeavy: "Agresywny",
        presetCustom: "Własne ustawienia",
        targetRms: "Cel RMS (dB)",
        maxBoost: "Max boost (dB)",
        windowSize: "Okno (ms)",
        target: "Cel",
        enable: "Włącz",
        duration: "Długość",

        limiter: "Limiter",
        limiterCeiling: "Ceiling (dB)",

        fadeIn: "Fade In",
        fadeOut: "Fade Out",
        seconds: "s",
        size: "Rozmiar",

        processBtn: "Przetwórz audio",

        // Results
        resultTitle: "✅ Wynik przetwarzania",
        processedBadge: "PRZETWORZONE",
        tabProcessed: "Przetworzone",
        tabCompare: "Przed/Po",

        whatChanged: "Co się zmieniło",
        changeNormalized: "Głośność znormalizowana do",
        changeFadeIn: "Fade in",
        changeFadeOut: "Fade out",
        changeLimiter: "Limiter ceiling",
        changeRmsChange: "Zmiana RMS",

        abHint: "Kliknij, aby przełączyć Oryginał ↔ Przetworzone",

        backBtn: "Edytuj ustawienia",
        downloadBtn: "Pobierz MP3",
        downloadBtnMp3: "Pobierz MP3",
        downloadBtnWav: "Pobierz WAV",

        // Compare
        original: "Oryginał",
        processed: "Przetworzone",

        // Processing overlay
        processingTitle: "Przetwarzanie audio...",
        processingPrepare: "Przygotowywanie audio...",
        processingCopy: "Kopiowanie kanałów...",
        processingAGC: "Stosowanie normalizacji głośności...",
        processingLimiter: "Limitowanie szczytów...",
        processingFadeIn: "Stosowanie fade in...",
        processingFadeOut: "Stosowanie fade out...",
        processingEncode: "Kodowanie MP3...",
        processingZip: "Tworzenie ZIP...",
        processingDone: "Gotowe!",

        // Footer
        footerText: "Przetwarzanie odbywa się w przeglądarce, pliki nie są nigdzie wysyłane",

        errorAnalysis: "Nie udało się przeanalizować pliku",
        errorProcessing: "Błąd przetwarzania",

        // Warnings
        clipping: "Przesterowanie/Clipping",
        tooQuiet: "Zbyt cicho",
        noProblems: "Świetnie! Nie znaleziono większych problemów z głośnością.",
        problemsFound: "Znalezione problemy",
        andXMore: "... i {x} innych",

        // Analysis status
        analyzingAudio: "Analizowanie audio...",
        calculatingLoudness: "Obliczanie głośności i wykrywanie problemów...",
        errorInvalidFormat: "Proszę przesłać plik audio (MP3, WAV, M4A, OGG, FLAC)",

        // Batch
        batchTitle: "📦 Przetwarzanie wsadowe",
        clear: "Wyczyść",
        batchFinished: "Zakończono! ✅",
        downloadZip: "Pobierz ZIP",
        processAll: "Przetwórz wszystko",
        uploadHint: "Możesz przesłać wiele plików przeciągając je lub wybierając z Ctrl (Cmd na Mac). Zalecamy jednak przetwarzanie utworów pojedynczo dla lepszej kontroli.",

        // Warning Modal
        warningTitle: "Ważna uwaga",
        warningBody: "To narzędzie służy jako pomoc w optymalizacji dźwięku. Automatyczne dostosowania nie zawsze mogą być idealne. Zawsze wykonaj końcowy odsłuch, aby upewnić się, że wynik spełnia Twoje oczekiwania i jest poprawnie zoptymalizowany.",
        warningConfirm: "Rozumiem, kontynuuj",
        warningCancel: "Anuluj",
        tsWarningBody: "Time-Stretch zmienia prędkość dźwięku bez zmiany wysokości tonu. Zawsze sprawdź wynik przez odsłuch. Ekstremalne zmiany prędkości (poniżej 70% lub powyżej 130%) mogą powodować artefakty.",

        // Time-Stretch specific
        tsOriginalAudio: "📊 Oryginalny dźwięk",
        tsInfo: "Informacje",
        tsOriginalDuration: "Oryginalny czas trwania",
        tsSampleRate: "Częstotliwość próbkowania",
        tsSettingsTitle: "⚡ Ustawienia Time-Stretch",
        tsTargetDuration: "Docelowy czas trwania",
        tsOrSpeed: "Lub ustaw prędkość",
        tsSpeedHint: "50% = podwójna długość, 200% = połowa długości",
        tsProcessBtn: "Przetwórz dźwięk",
        tsResultTitle: "✅ Wynik",
        tsTabResult: "Wynik",
        tsTabCompare: "Porównanie A/B",
        tsNewDuration: "Nowy czas trwania",
        tsSpeedChange: "Zmiana prędkości",
        tsEditSettings: "Edytuj ustawienia",
        tsDownloadMp3: "Pobierz MP3",
        tsProcessing: "Przetwarzanie...",
        tsApplyingTimeStretch: "Stosowanie time-stretch",
        tsRemoveFile: "Usuń plik",
        tsPlayOriginal: "Odtwórz/wstrzymaj oryginał",
        tsPlayResult: "Odtwórz/wstrzymaj wynik",
        tsSwitchView: "Przełącz między oryginałem a wynikiem",
        tsClickToPlay: "Kliknij, aby odtworzyć",

        // JS Alerts
        errLoadAudio: "Błąd ładowania dźwięku: ",
        errInvalidTime: "Wprowadź prawidłowy czas",
        errDurationZero: "Docelowy czas trwania musi być większy niż 0",
        errSpeedRange: "Zmiana prędkości musi wynosić od 50% do 200%",
        errBrowserDownload: "Przeglądarka nie obsługuje pobierania plików.",

        tsEncodingMp3: "Kodowanie MP3...",

        // Advanced Warning Modal
        advancedWarningTitle: "Ustawienia zaawansowane",
        advancedWarningBody: "Te funkcje są przeznaczone tylko dla zaawansowanych użytkowników. Zmiana wartości domyślnych może pogorszyć jakość dźwięku. Czy na pewno chcesz kontynuować?",

        // Simplified UI
        settingsHint: "Aplikacja automatycznie stosuje najlepsze ustawienia dla Twojego dźwięku.",
        advancedSettings: "Ustawienia zaawansowane",
        advancedWarning: "Tylko dla zaawansowanych użytkowników. Zmiana wartości może pogorszyć wynik."
    }
};

// Current language
let currentLanguage = 'cs';

// Get translation by key
function t(key) {
    return translations[currentLanguage][key] || translations['en'][key] || key;
}

// Set language and update UI
function setLanguage(lang) {
    if (!translations[lang]) {
        console.warn(`Language ${lang} not supported, falling back to English`);
        lang = 'en';
    }

    currentLanguage = lang;
    localStorage.setItem('audioStudioLang', lang);

    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translation = t(key);

        // Check if it's an input placeholder
        if (el.hasAttribute('data-i18n-placeholder')) {
            el.placeholder = translation;
        } else {
            el.textContent = translation;
        }
    });

    // Update all elements with data-i18n-title attribute
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        el.title = t(key);
    });

    // Update language selector
    const langSelect = document.getElementById('languageSelect');
    if (langSelect) {
        langSelect.value = lang;
    }
}

// Initialize language from localStorage or browser
function initLanguage() {
    // Check localStorage first
    const saved = localStorage.getItem('audioStudioLang');
    if (saved && translations[saved]) {
        setLanguage(saved);
        return;
    }

    // Auto-detect from browser
    const browserLang = navigator.language.split('-')[0];
    if (translations[browserLang]) {
        setLanguage(browserLang);
    } else {
        setLanguage('en'); // Default to English
    }
}

// Export for use in other modules
export { translations, t, setLanguage, initLanguage, currentLanguage };
