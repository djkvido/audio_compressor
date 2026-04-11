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
        promoBackTitle: "Analýza a normalizace audia",
        promoBackBtn: "Otevřít",

        // App Titles
        appTitleMain: "Audio Kompresor",
        appTitleHall: "Time-Stretch",

        // Analysis
        analysisTitle: "Analýza",

        peakLabel: "True Peak:",
        rmsLabel: "Loudness:",
        lufsLabel: "Integrated Loudness (LUFS)",
        loudness: "Hlasitost",
        peak: "Peak",
        rms: "LUFS",

        // Settings
        settingsTitle: "Nastavení",
        volumeNormalization: "Vyrovnání hlasitosti (LUFS)",
        presetLabel: "Preset:",
        presetLight: "Jemné (-16 LUFS)",
        presetStandard: "Standard (-14 LUFS)",
        presetHeavy: "Hlasité (-12 LUFS)",
        presetCustom: "Vlastní nastavení",
        targetRms: "Cíl LUFS",
        maxBoost: "Max boost (dB)",
        windowSize: "Okno (ms)",
        target: "Cíl",
        enable: "Povolit",
        duration: "Délka",

        limiter: "Limiter",
        limiterCeiling: "Ceiling (dBTP)",

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
        changeRmsChange: "LUFS změna",
        changeLoudnessDelta: "Změna hlasitosti",

        abHint: "Klikni pro přepnutí Originál ↔ Upraveno",

        backBtn: "Upravit nastavení",
        downloadBtn: "Stáhnout", // Fallback
        downloadBtnMp3: "Stáhnout MP3",
        downloadBtnWav: "Stáhnout WAV",

        // Analysis status
        analyzingAudio: "Analyzuji audio...",
        decodingFile: "Dekóduji soubor...",
        calculatingLoudness: "Počítám hlasitost a hledám problémy...",

        // Compare
        original: "Originál",
        processed: "Upraveno",

        // Processing overlay
        processingTitle: "Zpracovávám audio...",
        processingPrepare: "Připravuji audio...",
        processingAGC: "Aplikuji vyrovnání hlasitosti...",
        processingLimiter: "Limitace peaků...",
        processingFadeIn: "Aplikuji fade in...",
        processingFadeOut: "Aplikuji fade out...",
        processingHPF: "Čistím sub-basy (HPF 20 Hz)...",
        processingEncode: "Kóduji MP3...",
        processingZip: "Balím ZIP...",
        processingDone: "Hotovo!",

        // Tooltips
        titleChangeLang: "Změnit jazyk",

        // Footer
        footerText: "Zpracování probíhá v prohlížeči, soubory se nikam neodesílají",

        errorAnalysis: "Nepodařilo se analyzovat soubor",
        errorProcessing: "Chyba při zpracování",
        errorZip: "Chyba při tvorbě ZIP",
        batchError: "Chyba",

        // Warnings
        clipping: "Přebuzení/clipping",
        tooQuiet: "Velmi tiché",
        warnOverCompressed: "Master je over-comprimovaný (LRA {lra} LU) – dynamika už byla zredukována. Normalizace proběhne, ale zvuk už moc neotevřeme.",
        warnEffectivelyMono: "Stereo soubor je efektivně mono (korelace {corr}) – kanály jsou prakticky identické.",
        warnPhaseIssue: "Fázové problémy mezi L/R kanálem (korelace {corr}) – mono přehrávání může znít tence nebo s vybranými frekvencemi.",
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
        errSpeedRange: "Změna rychlosti ({tempo}×) je mimo povolený rozsah 50 % – 200 %. Výraznější změny by zničily kvalitu zvuku.",
        errBrowserDownload: "Prohlížeč nepodporuje stahování souborů.",

        // Validační chyby (bezpečné limity vstupu)
        errFileEmpty: "Soubor je prázdný",
        errFileTooLarge: "Soubor je příliš velký ({size}, max {max}). Rozdělte jej na menší části",
        errDecodeFailed: "Soubor se nepodařilo dekódovat. Je poškozený nebo ve formátu, který prohlížeč neumí.",
        errChannelCount: "Nepodporovaný počet kanálů: {n} (max {max}). Převeďte na mono/stereo",
        errSampleRate: "Nepodporovaná vzorkovací frekvence: {sr} Hz (povolené: {min}–{max} Hz)",
        errAudioTooShort: "Audio je příliš krátké (min. {min} s) pro smysluplnou analýzu",
        errAudioTooLong: "Audio je příliš dlouhé ({actual}, max {max}). Delší soubory by vyčerpaly paměť prohlížeče",
        errAudioSilent: "Audio je prakticky tiché (peak {peak} dBFS). Zesílení by jen zvýraznilo šum.",
        warnAudioClipped: "Vstupní soubor je už zaklipovaný (peak {peak} dBFS). Výsledek bude jen částečně opravený – pro lepší kvalitu nahrajte zdroj znovu s nižší úrovní.",
        warnContinueAnyway: "Přesto pokračovat?",

        tsEncodingMp3: "Enkóduji MP3...",

        // Advanced Warning Modal
        advancedWarningTitle: "Pokročilé nastavení",
        advancedWarningBody: "Tyto funkce jsou určeny pouze pro zkušené uživatele. Změna výchozích hodnot může vést ke zhoršení kvality zvuku. Opravdu chcete pokračovat?",

        // Simplified UI
        settingsHint: "Aplikace automaticky použije nejlepší nastavení pro vaše audio.",
        advancedSettings: "Pokročilé nastavení",
        advancedWarning: "Pouze pro zkušené uživatele. Změna hodnot může zhoršit výsledek.",

        // Missing / new keys
        errorInvalidFormat: "Nahrajte prosím audio soubor (MP3, WAV, M4A, OGG, FLAC)",
        batchWaiting: "Čeká",
        dynamicRange: "Dynamický rozsah",
        durationLabel: "Délka",
        legendLoud: "Přebuzené (clipping)",
        legendQuiet: "Příliš tiché",
        legendOk: "V pořádku",
        maxAttenuation: "Max atenuace",
        formatLabel: "Formát",
        volume: "Hlasitost",
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
        promoBackTitle: "Audio Analysis & Normalization",
        promoBackBtn: "Open",

        // App Titles
        appTitleMain: "Audio Compressor",
        appTitleHall: "Time-Stretch",

        // Analysis
        analysisTitle: "Analysis",

        peakLabel: "True Peak:",
        rmsLabel: "Loudness:",
        lufsLabel: "Integrated Loudness (LUFS)",
        loudness: "Loudness",
        peak: "Peak",
        rms: "LUFS",

        // Settings
        settingsTitle: "Settings",
        volumeNormalization: "Loudness Normalization (LUFS)",
        presetLabel: "Preset:",
        presetLight: "Light (-16 LUFS)",
        presetStandard: "Standard (-14 LUFS)",
        presetHeavy: "Loud (-12 LUFS)",
        presetCustom: "Custom",
        targetRms: "Target LUFS",
        maxBoost: "Max boost (dB)",
        windowSize: "Window (ms)",
        target: "Target",
        enable: "Enable",
        duration: "Duration",

        limiter: "Limiter",
        limiterCeiling: "Ceiling (dBTP)",

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
        changeNormalized: "Loudness normalized to",
        changeFadeIn: "Fade in",
        changeFadeOut: "Fade out",
        changeLimiter: "Limiter ceiling",
        changeRmsChange: "LUFS change",
        changeLoudnessDelta: "Loudness change",

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
        processingAGC: "Applying volume normalization...",
        processingLimiter: "Limiting peaks...",
        processingFadeIn: "Applying fade in...",
        processingFadeOut: "Applying fade out...",
        processingHPF: "Cleaning sub-bass (HPF 20 Hz)...",
        processingEncode: "Encoding MP3...",
        processingZip: "Creating ZIP...",
        processingDone: "Done!",

        // Tooltips
        titleChangeLang: "Change language",

        // Footer
        footerText: "Processing happens in your browser, files are never uploaded",

        errorAnalysis: "Failed to analyze file",
        errorProcessing: "Processing error",
        errorZip: "Error creating ZIP",
        batchError: "Error",

        // Warnings
        clipping: "Clipping/Distortion",
        tooQuiet: "Too quiet",
        warnOverCompressed: "Master is over-compressed (LRA {lra} LU) – dynamics have already been squashed. Normalization will run, but headroom is limited.",
        warnEffectivelyMono: "Stereo file is effectively mono (correlation {corr}) – channels are practically identical.",
        warnPhaseIssue: "Phase issues between L/R channels (correlation {corr}) – mono playback may sound thin or have missing frequencies.",
        noProblems: "Great! No major volume issues found.",
        problemsFound: "Issues found",
        andXMore: "... and {x} more",

        // Analysis status
        analyzingAudio: "Analyzing audio...",
        decodingFile: "Decoding file...",
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
        errSpeedRange: "Speed change ({tempo}×) is outside the allowed 50%–200% range. More extreme values would destroy audio quality.",
        errBrowserDownload: "Browser does not support file downloading.",

        // Input validation errors (safe limits)
        errFileEmpty: "File is empty",
        errFileTooLarge: "File is too large ({size}, max {max}). Split it into smaller parts",
        errDecodeFailed: "Failed to decode file. It may be corrupted or in an unsupported format.",
        errChannelCount: "Unsupported channel count: {n} (max {max}). Convert to mono or stereo",
        errSampleRate: "Unsupported sample rate: {sr} Hz (allowed: {min}–{max} Hz)",
        errAudioTooShort: "Audio is too short (min {min}s) for meaningful analysis",
        errAudioTooLong: "Audio is too long ({actual}, max {max}). Longer files would exhaust browser memory",
        errAudioSilent: "Audio is practically silent (peak {peak} dBFS). Amplification would only emphasize noise.",
        warnAudioClipped: "Input file is already clipped (peak {peak} dBFS). The result will be only partially recovered – for better quality, re-record the source at a lower level.",
        warnContinueAnyway: "Continue anyway?",

        tsEncodingMp3: "Encoding MP3...",

        // Advanced Warning Modal
        advancedWarningTitle: "Advanced Settings",
        advancedWarningBody: "These features are intended for advanced users only. Changing default values may degrade audio quality. Do you really want to proceed?",

        // Simplified UI
        settingsHint: "The app automatically applies the best settings for your audio.",
        advancedSettings: "Advanced Settings",
        advancedWarning: "For advanced users only. Changing values may degrade results.",

        // Missing / new keys
        batchWaiting: "Waiting",
        dynamicRange: "Dynamic range",
        durationLabel: "Duration",
        legendLoud: "Clipping",
        legendQuiet: "Too quiet",
        legendOk: "OK",
        maxAttenuation: "Max attenuation",
        formatLabel: "Format",
        volume: "Volume",
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
        promoBackTitle: "Audio-Analyse & Normalisierung",
        promoBackBtn: "Öffnen",

        // App Titles
        appTitleMain: "Audio Kompressor",
        appTitleHall: "Time-Stretch",

        // Analysis
        analysisTitle: "Analyse",

        peakLabel: "True Peak:",
        rmsLabel: "Lautheit:",
        lufsLabel: "Integrierte Lautheit (LUFS)",
        loudness: "Lautheit",
        peak: "Peak",
        rms: "LUFS",

        // Settings
        settingsTitle: "Einstellungen",
        volumeNormalization: "Lautheit-Normalisierung (LUFS)",
        presetLabel: "Voreinstellung:",
        presetLight: "Leicht (-16 LUFS)",
        presetStandard: "Standard (-14 LUFS)",
        presetHeavy: "Laut (-12 LUFS)",
        presetCustom: "Benutzerdefiniert",
        targetRms: "Ziel-LUFS",
        maxBoost: "Max Boost (dB)",
        windowSize: "Fenster (ms)",
        target: "Ziel",
        enable: "Aktivieren",
        duration: "Dauer",

        limiter: "Limiter",
        limiterCeiling: "Ceiling (dBTP)",

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
        changeNormalized: "Lautheit normalisiert auf",
        changeFadeIn: "Fade in",
        changeFadeOut: "Fade out",
        changeLimiter: "Limiter Ceiling",
        changeRmsChange: "LUFS Änderung",
        changeLoudnessDelta: "Lautheitsänderung",

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
        processingAGC: "Lautstärke-Normalisierung anwenden...",
        processingLimiter: "Peaks begrenzen...",
        processingFadeIn: "Fade in anwenden...",
        processingFadeOut: "Fade out anwenden...",
        processingHPF: "Subbässe bereinigen (HPF 20 Hz)...",
        processingEncode: "MP3 kodieren...",
        processingZip: "Erstelle ZIP...",
        processingDone: "Fertig!",

        // Tooltips
        titleChangeLang: "Sprache ändern",

        // Footer
        footerText: "Die Verarbeitung erfolgt im Browser, Dateien werden nicht hochgeladen",

        errorAnalysis: "Datei konnte nicht analysiert werden",
        errorProcessing: "Verarbeitungsfehler",
        errorZip: "Fehler beim Erstellen der ZIP-Datei",
        batchError: "Fehler",

        // Warnings
        clipping: "Übersteuerung/Clipping",
        tooQuiet: "Zu leise",
        warnOverCompressed: "Master ist überkomprimiert (LRA {lra} LU) – die Dynamik wurde bereits reduziert. Die Normalisierung läuft, aber es gibt kaum noch Spielraum.",
        warnEffectivelyMono: "Stereo-Datei ist faktisch mono (Korrelation {corr}) – die Kanäle sind praktisch identisch.",
        warnPhaseIssue: "Phasenprobleme zwischen L/R-Kanal (Korrelation {corr}) – Mono-Wiedergabe kann dünn klingen oder Frequenzlücken haben.",
        noProblems: "Großartig! Keine größeren Lautstärkeprobleme gefunden.",
        problemsFound: "Gefundene Probleme",
        andXMore: "... und {x} weitere",

        // Analysis status
        analyzingAudio: "Audio analysieren...",
        decodingFile: "Datei dekodieren...",
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
        errSpeedRange: "Geschwindigkeitsänderung ({tempo}×) liegt außerhalb des zulässigen Bereichs 50%–200%. Extremere Werte würden die Audioqualität zerstören.",
        errBrowserDownload: "Der Browser unterstützt das Herunterladen von Dateien nicht.",

        // Eingabevalidierungsfehler (sichere Grenzwerte)
        errFileEmpty: "Datei ist leer",
        errFileTooLarge: "Datei ist zu groß ({size}, max. {max}). In kleinere Teile aufteilen",
        errDecodeFailed: "Datei konnte nicht dekodiert werden. Sie ist möglicherweise beschädigt oder in einem nicht unterstützten Format.",
        errChannelCount: "Nicht unterstützte Kanalanzahl: {n} (max. {max}). In Mono oder Stereo konvertieren",
        errSampleRate: "Nicht unterstützte Abtastrate: {sr} Hz (zulässig: {min}–{max} Hz)",
        errAudioTooShort: "Audio ist zu kurz (min. {min} s) für eine sinnvolle Analyse",
        errAudioTooLong: "Audio ist zu lang ({actual}, max. {max}). Längere Dateien würden den Browser-Speicher überlasten",
        errAudioSilent: "Audio ist praktisch stumm (Peak {peak} dBFS). Eine Verstärkung würde nur das Rauschen betonen.",
        warnAudioClipped: "Eingabedatei ist bereits übersteuert (Peak {peak} dBFS). Das Ergebnis wird nur teilweise korrigiert – für bessere Qualität die Quelle mit niedrigerem Pegel neu aufnehmen.",
        warnContinueAnyway: "Trotzdem fortfahren?",

        tsEncodingMp3: "MP3 wird kodiert...",

        // Advanced Warning Modal
        advancedWarningTitle: "Erweiterte Einstellungen",
        advancedWarningBody: "Diese Funktionen sind nur für fortgeschrittene Benutzer gedacht. Das Ändern der Standardwerte kann die Audioqualität verschlechtern. Möchten Sie wirklich fortfahren?",

        // Simplified UI
        settingsHint: "Die App wendet automatisch die besten Einstellungen für Ihr Audio an.",
        advancedSettings: "Erweiterte Einstellungen",
        advancedWarning: "Nur für fortgeschrittene Benutzer. Änderungen können das Ergebnis verschlechtern.",

        // Missing / new keys
        batchWaiting: "Wartend",
        dynamicRange: "Dynamikbereich",
        durationLabel: "Dauer",
        legendLoud: "Übersteuerung (Clipping)",
        legendQuiet: "Zu leise",
        legendOk: "In Ordnung",
        maxAttenuation: "Max Dämpfung",
        formatLabel: "Format",
        volume: "Lautstärke",
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
        promoBackTitle: "Analiza i normalizacja dźwięku",
        promoBackBtn: "Otwórz",

        // App Titles
        appTitleMain: "Kompresor Audio",
        appTitleHall: "Time-Stretch",

        // Analysis
        analysisTitle: "Analiza",

        peakLabel: "True Peak:",
        rmsLabel: "Głośność:",
        lufsLabel: "Zintegrowana głośność (LUFS)",
        loudness: "Głośność",
        peak: "Peak",
        rms: "LUFS",

        // Settings
        settingsTitle: "Ustawienia",
        volumeNormalization: "Normalizacja głośności (LUFS)",
        presetLabel: "Preset:",
        presetLight: "Delikatny (-16 LUFS)",
        presetStandard: "Standardowy (-14 LUFS)",
        presetHeavy: "Głośny (-12 LUFS)",
        presetCustom: "Własne ustawienia",
        targetRms: "Cel LUFS",
        maxBoost: "Max boost (dB)",
        windowSize: "Okno (ms)",
        target: "Cel",
        enable: "Włącz",
        duration: "Długość",

        limiter: "Limiter",
        limiterCeiling: "Ceiling (dBTP)",

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
        changeRmsChange: "Zmiana LUFS",
        changeLoudnessDelta: "Zmiana głośności",

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
        processingAGC: "Stosowanie normalizacji głośności...",
        processingLimiter: "Limitowanie szczytów...",
        processingFadeIn: "Stosowanie fade in...",
        processingFadeOut: "Stosowanie fade out...",
        processingHPF: "Czyszczenie sub-basów (HPF 20 Hz)...",
        processingEncode: "Kodowanie MP3...",
        processingZip: "Tworzenie ZIP...",
        processingDone: "Gotowe!",

        // Tooltips
        titleChangeLang: "Zmień język",

        // Footer
        footerText: "Przetwarzanie odbywa się w przeglądarce, pliki nie są nigdzie wysyłane",

        errorAnalysis: "Nie udało się przeanalizować pliku",
        errorProcessing: "Błąd przetwarzania",
        errorZip: "Błąd podczas tworzenia ZIP",
        batchError: "Błąd",

        // Warnings
        clipping: "Przesterowanie/Clipping",
        tooQuiet: "Zbyt cicho",
        warnOverCompressed: "Master jest nadmiernie skompresowany (LRA {lra} LU) – dynamika została już ograniczona. Normalizacja zadziała, ale zapasu już dużo nie jest.",
        warnEffectivelyMono: "Plik stereo jest efektywnie mono (korelacja {corr}) – kanały są praktycznie identyczne.",
        warnPhaseIssue: "Problemy fazowe między kanałami L/R (korelacja {corr}) – odtwarzanie mono może brzmieć cienko lub z brakami częstotliwości.",
        noProblems: "Świetnie! Nie znaleziono większych problemów z głośnością.",
        problemsFound: "Znalezione problemy",
        andXMore: "... i {x} innych",

        // Analysis status
        analyzingAudio: "Analizowanie audio...",
        decodingFile: "Dekodowanie pliku...",
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
        errSpeedRange: "Zmiana prędkości ({tempo}×) jest poza dozwolonym zakresem 50%–200%. Bardziej ekstremalne wartości zniszczyłyby jakość dźwięku.",
        errBrowserDownload: "Przeglądarka nie obsługuje pobierania plików.",

        // Błędy walidacji wejścia (bezpieczne limity)
        errFileEmpty: "Plik jest pusty",
        errFileTooLarge: "Plik jest za duży ({size}, maks. {max}). Podziel go na mniejsze części",
        errDecodeFailed: "Nie udało się zdekodować pliku. Może być uszkodzony lub w nieobsługiwanym formacie.",
        errChannelCount: "Nieobsługiwana liczba kanałów: {n} (maks. {max}). Przekonwertuj na mono lub stereo",
        errSampleRate: "Nieobsługiwana częstotliwość próbkowania: {sr} Hz (dozwolone: {min}–{max} Hz)",
        errAudioTooShort: "Dźwięk jest za krótki (min. {min} s) dla sensownej analizy",
        errAudioTooLong: "Dźwięk jest za długi ({actual}, maks. {max}). Dłuższe pliki wyczerpałyby pamięć przeglądarki",
        errAudioSilent: "Dźwięk jest praktycznie cichy (peak {peak} dBFS). Wzmocnienie tylko podkreśliłoby szum.",
        warnAudioClipped: "Plik wejściowy jest już przesterowany (peak {peak} dBFS). Wynik będzie tylko częściowo naprawiony – dla lepszej jakości nagraj źródło ponownie z niższym poziomem.",
        warnContinueAnyway: "Kontynuować mimo to?",

        tsEncodingMp3: "Kodowanie MP3...",

        // Advanced Warning Modal
        advancedWarningTitle: "Ustawienia zaawansowane",
        advancedWarningBody: "Te funkcje są przeznaczone tylko dla zaawansowanych użytkowników. Zmiana wartości domyślnych może pogorszyć jakość dźwięku. Czy na pewno chcesz kontynuować?",

        // Simplified UI
        settingsHint: "Aplikacja automatycznie stosuje najlepsze ustawienia dla Twojego dźwięku.",
        advancedSettings: "Ustawienia zaawansowane",
        advancedWarning: "Tylko dla zaawansowanych użytkowników. Zmiana wartości może pogorszyć wynik.",

        // Missing / new keys
        batchWaiting: "Oczekuje",
        dynamicRange: "Zakres dynamiczny",
        durationLabel: "Długość",
        legendLoud: "Przesterowanie (Clipping)",
        legendQuiet: "Zbyt cicho",
        legendOk: "OK",
        maxAttenuation: "Max tłumienie",
        formatLabel: "Format",
        volume: "Głośność",
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
        let translation = t(key);

        // Support {x} substitution via data-x attribute (e.g. andXMore)
        if (el.hasAttribute('data-x')) {
            translation = translation.replace('{x}', el.getAttribute('data-x'));
        }

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
