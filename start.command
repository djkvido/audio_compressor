#!/usr/bin/env bash
# Audio Compressor — Kvido Production
# macOS / Linux launcher: checks environment and starts the local server.

cd "$(dirname "$0")" || exit 1

# ----- ANSI colors -----------------------------------------------------------
BOLD='\033[1m'
DIM='\033[2m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Output helpers — use %b so ANSI escapes inside the argument are expanded.
ok()    { printf "   ${GREEN}[  OK  ]${NC} %b\n" "$1"; }
info()  { printf "   ${BLUE}[ INFO ]${NC} %b\n" "$1"; }
warn()  { printf "   ${YELLOW}[ WARN ]${NC} %b\n" "$1"; }
err()   { printf "   ${RED}[ ERR  ]${NC} %b\n" "$1"; }
step()  { printf "   ${MAGENTA}[ STEP ]${NC} %b\n" "$1"; }

hr() {
    printf "   ${DIM}%b${NC}\n" "────────────────────────────────────────────────────────────────"
}

banner() {
    # `clear` needs TERM; silently skip if it fails (e.g. launched without TERM)
    clear 2>/dev/null || printf "\n\n"
    printf "\n"
    printf "   ${CYAN}${BOLD}╔════════════════════════════════════════════════════════════════╗${NC}\n"
    printf "   ${CYAN}${BOLD}║                                                                ║${NC}\n"
    printf "   ${CYAN}${BOLD}║${NC}       ${BOLD}AUDIO  COMPRESSOR${NC}  ${DIM}by${NC}  ${BOLD}Kvido Production${NC}             ${CYAN}${BOLD}║${NC}\n"
    printf "   ${CYAN}${BOLD}║${NC}                                                                ${CYAN}${BOLD}║${NC}\n"
    printf "   ${CYAN}${BOLD}║${NC}                ${DIM}Local offline launcher${NC}                          ${CYAN}${BOLD}║${NC}\n"
    printf "   ${CYAN}${BOLD}║                                                                ║${NC}\n"
    printf "   ${CYAN}${BOLD}╚════════════════════════════════════════════════════════════════╝${NC}\n"
    printf "\n"
}

pause_exit() {
    printf "\n"
    read -r -p "   Stiskni Enter pro ukončení..."
    exit "${1:-0}"
}

# ----- Start -----------------------------------------------------------------
banner
info "Kontroluji prostředí..."
printf "\n"

# ----- Detect Python ---------------------------------------------------------
PYTHON_CMD=""

if command -v python3 >/dev/null 2>&1; then
    PYTHON_CMD="python3"
elif command -v python >/dev/null 2>&1; then
    if python -c 'import sys; sys.exit(0 if sys.version_info[0] >= 3 else 1)' >/dev/null 2>&1; then
        PYTHON_CMD="python"
    fi
fi

if [ -z "$PYTHON_CMD" ]; then
    warn "Python 3 není nainstalován"
    printf "\n"
    hr
    printf "   Aplikace potřebuje ${BOLD}Python 3${NC} ke spuštění lokálního serveru.\n"
    printf "   Na macOS je nejjednodušší cesta oficiální instalátor z python.org.\n"
    hr
    printf "\n"

    read -r -p "   Otevřít stránku s instalátorem teď? (a/N): " answer
    case "$answer" in
        [Aa]|[Aa][Nn][Oo]|[Yy]|[Yy][Ee][Ss])
            info "Otevírám https://www.python.org/downloads/macos/"
            open "https://www.python.org/downloads/macos/" 2>/dev/null
            printf "\n"
            info "Po nainstalování Pythonu spusť tento skript znovu."
            pause_exit 1
            ;;
        *)
            info "Instalaci přeskočeno."
            pause_exit 1
            ;;
    esac
fi

PY_VERSION=$($PYTHON_CMD --version 2>&1)
ok "Python nalezen: ${BOLD}$PY_VERSION${NC}"

# ----- Verify app files ------------------------------------------------------
if [ ! -f "start_server.py" ]; then
    err "start_server.py nenalezen!"
    err "Spusť tento skript ze složky s aplikací."
    pause_exit 1
fi

if [ ! -f "index.html" ]; then
    err "index.html nenalezen!"
    pause_exit 1
fi

ok "Soubory aplikace přítomny"

# ----- Check port 8081 -------------------------------------------------------
if command -v lsof >/dev/null 2>&1; then
    if lsof -iTCP:8081 -sTCP:LISTEN >/dev/null 2>&1; then
        warn "Port 8081 už něco používá — server možná nepůjde spustit."
        warn "Zavři běžící instanci nebo jinou aplikaci na tomto portu."
        printf "\n"
    fi
fi

# ----- Ready -----------------------------------------------------------------
printf "\n"
printf "   ${CYAN}════════════════════════════════════════════════════════════════${NC}\n"
step "Spouštím lokální server na ${BOLD}http://localhost:8081${NC}"
step "Aplikace se otevře automaticky v prohlížeči."
step "Pro ukončení stiskni ${BOLD}Ctrl+C${NC} nebo zavři toto okno."
printf "   ${CYAN}════════════════════════════════════════════════════════════════${NC}\n"
printf "\n"

exec $PYTHON_CMD start_server.py
