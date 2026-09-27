#!/usr/bin/env bash

# ==============================================================================
# DepEd School Management System (SMS) - Unified Development Runner
# ==============================================================================
# Starts:
#   1. Database (MongoDB via Docker Compose or active system instance)
#   2. Backend  (Go REST API server on :8080)
#   3. Frontend (React 19 + Vite dev server on :5173)
#
# Features:
#   - Automatic dependency & port availability verification
#   - Dynamic port detection from backend/.env
#   - Auto-creates backend/.env from .env.example if missing
#   - Auto-installs frontend dependencies if node_modules is missing
#   - Clean structured startup sequence followed by multiplexed live logs
#   - Graceful shutdown on Ctrl+C (cleans up entire process tree & frees ports)
# ==============================================================================

set -uo pipefail

# Determine repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Text Styling
if [ -t 1 ]; then
    BOLD="$(printf '\033[1m')"
    DIM="$(printf '\033[2m')"
    GREEN="$(printf '\033[0;32m')"
    CYAN="$(printf '\033[0;36m')"
    YELLOW="$(printf '\033[1;33m')"
    RED="$(printf '\033[0;31m')"
    BLUE="$(printf '\033[0;34m')"
    MAGENTA="$(printf '\033[0;35m')"
    NC="$(printf '\033[0m')" # No Color
else
    BOLD=""
    DIM=""
    GREEN=""
    CYAN=""
    YELLOW=""
    RED=""
    BLUE=""
    MAGENTA=""
    NC=""
fi

# Configuration & Flags
SKIP_DB=false
STOP_DB_ON_EXIT=false
CLEAN_MODE=false
STARTED_DOCKER=false

BACKEND_PID=""
FRONTEND_PID=""
TAIL_B_PID=""
TAIL_F_PID=""

# Parse CLI arguments
for arg in "$@"; do
    case "$arg" in
        --skip-db|--no-db)
            SKIP_DB=true
            ;;
        --stop-db)
            STOP_DB_ON_EXIT=true
            ;;
        --clean)
            CLEAN_MODE=true
            ;;
        -h|--help)
            echo -e "${BOLD}DepEd SMS Project Runner${NC}"
            echo ""
            echo "Usage: ./run_project.sh [options]"
            echo ""
            echo "Options:"
            echo "  --skip-db, --no-db    Skip starting/checking MongoDB"
            echo "  --stop-db             Stop Docker MongoDB container on exit"
            echo "  --clean               Remove caches and re-verify modules"
            echo "  -h, --help            Show this help message and exit"
            echo ""
            exit 0
            ;;
        *)
            echo -e "${YELLOW}Unknown option: $arg${NC} (Use --help for usage)"
            ;;
    esac
done

# ------------------------------------------------------------------------------
# Banner
# ------------------------------------------------------------------------------
echo -e "${CYAN}${BOLD}"
cat << 'EOF'
 ____             _____    _   ____  __  __ ____  
|  _ \  ___ _ __ | ____|__| | / ___||  \/  / ___| 
| | | |/ _ \ '_ \|  _| / _` | \___ \| |\/| \___ \ 
| |_| |  __/ |_) | |__| (_| |  ___) | |  | |___) |
|____/ \___| .__/|_____\__,_| |____/|_|  |_|____/ 
           |_|                                    
EOF
echo -e "${BLUE}DepEd School Management System - Unified Dev Runner${NC}"
echo -e "${DIM}Repository: ${SCRIPT_DIR}${NC}\n"

# ------------------------------------------------------------------------------
# Process Cleanup & Signal Handling
# ------------------------------------------------------------------------------
kill_tree() {
    local parent_pid="$1"
    if [ -z "$parent_pid" ]; then return 0; fi

    local children
    children=$(pgrep -P "$parent_pid" 2>/dev/null || true)
    for child in $children; do
        kill_tree "$child"
    done
    kill -TERM "$parent_pid" 2>/dev/null || true
}

cleanup() {
    # Prevent repeated execution of trap handler
    trap - SIGINT SIGTERM EXIT

    echo -e "\n${YELLOW}${BOLD}>> Shutting down DepEd SMS services...${NC}"

    # Stop log tailing
    if [ -n "$TAIL_B_PID" ]; then
        kill_tree "$TAIL_B_PID"
    fi
    if [ -n "$TAIL_F_PID" ]; then
        kill_tree "$TAIL_F_PID"
    fi

    # Stop backend
    if [ -n "$BACKEND_PID" ]; then
        echo -e "${DIM}Stopping backend server (PID: $BACKEND_PID)...${NC}"
        kill_tree "$BACKEND_PID"
    fi

    # Stop frontend
    if [ -n "$FRONTEND_PID" ]; then
        echo -e "${DIM}Stopping frontend server (PID: $FRONTEND_PID)...${NC}"
        kill_tree "$FRONTEND_PID"
    fi

    # Free listening ports if processes remained
    sleep 0.5
    if command -v fuser >/dev/null 2>&1; then
        fuser -k "${BACKEND_PORT:-8080}/tcp" >/dev/null 2>&1 || true
        fuser -k "${FRONTEND_PORT:-5173}/tcp" >/dev/null 2>&1 || true
    fi

    # Handle database container
    if [ "$STOP_DB_ON_EXIT" = true ] && [ "$STARTED_DOCKER" = true ]; then
        echo -e "${DIM}Stopping MongoDB container...${NC}"
        if docker compose version >/dev/null 2>&1; then
            docker compose stop mongo >/dev/null 2>&1 || true
        elif command -v docker-compose >/dev/null 2>&1; then
            docker-compose stop mongo >/dev/null 2>&1 || true
        fi
    elif [ "$STARTED_DOCKER" = true ]; then
        echo -e "${DIM}MongoDB container 'deped-sms-mongo' was left running. Run 'docker compose down' to stop it.${NC}"
    fi

    echo -e "${GREEN}${BOLD}✓ All application processes terminated successfully.${NC}"
    echo -e "${DIM}Logs preserved in: ./logs/backend.log and ./logs/frontend.log${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# ------------------------------------------------------------------------------
# Dependency & Configuration Checks
# ------------------------------------------------------------------------------
echo -e "${BOLD}[1/4] Checking prerequisites...${NC}"

check_cmd() {
    local cmd="$1"
    local name="$2"
    local install_help="$3"
    if ! command -v "$cmd" >/dev/null 2>&1; then
        echo -e "  ${RED}✗ Missing required tool: ${BOLD}$name${NC}"
        echo -e "    ${DIM}$install_help${NC}"
        exit 1
    else
        echo -e "  ${GREEN}✓${NC} $name is installed (${DIM}$(command -v "$cmd")${NC})"
    fi
}

check_cmd "go" "Go (Golang)" "Install Go from https://golang.org or via package manager."
check_cmd "node" "Node.js" "Install Node.js (v18+) from https://nodejs.org."
check_cmd "npm" "npm" "npm is usually bundled with Node.js."

if [ "$SKIP_DB" = false ]; then
    if command -v docker >/dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} Docker is installed (${DIM}$(command -v docker)${NC})"
    else
        echo -e "  ${YELLOW}!${NC} Docker not found. Assuming MongoDB is managed as a local system service."
    fi
fi

# Clean mode handling
if [ "$CLEAN_MODE" = true ]; then
    echo -e "\n${YELLOW}Clean mode enabled: clearing frontend caches...${NC}"
    rm -rf frontend/.vite frontend/dist logs/*.log
fi

# Ensure backend/.env exists
if [ ! -f "backend/.env" ]; then
    if [ -f "backend/.env.example" ]; then
        echo -e "  ${YELLOW}!${NC} backend/.env not found. Creating from backend/.env.example..."
        cp backend/.env.example backend/.env
        echo -e "  ${GREEN}✓${NC} backend/.env created successfully."
    else
        echo -e "  ${RED}✗ backend/.env and backend/.env.example are missing!${NC}"
        exit 1
    fi
else
    echo -e "  ${GREEN}✓${NC} backend/.env exists."
fi

# Extract configured ports
BACKEND_PORT=$(grep -E '^PORT=' backend/.env 2>/dev/null | head -n1 | cut -d '=' -f2 | tr -d ' "' || true)
BACKEND_PORT="${BACKEND_PORT:-8080}"

MONGO_PORT=$(grep -E '^MONGO_URI=' backend/.env 2>/dev/null | head -n1 | sed -E 's/.*:([0-9]+).*/\1/' || true)
MONGO_PORT="${MONGO_PORT:-27017}"

FRONTEND_PORT="5173"

# Ensure frontend dependencies exist
if [ ! -d "frontend/node_modules" ]; then
    echo -e "  ${YELLOW}!${NC} frontend/node_modules not found. Installing frontend dependencies..."
    (cd frontend && npm install)
    echo -e "  ${GREEN}✓${NC} Frontend dependencies installed."
else
    echo -e "  ${GREEN}✓${NC} frontend/node_modules exists."
fi

# Prepare logs directory
mkdir -p logs
> logs/backend.log
> logs/frontend.log

# ------------------------------------------------------------------------------
# MongoDB Service Check
# ------------------------------------------------------------------------------
echo -e "\n${BOLD}[2/4] Verifying MongoDB database service...${NC}"

is_port_listening() {
    local host="$1"
    local port="$2"
    (timeout 1 bash -c "</dev/tcp/$host/$port") >/dev/null 2>&1 && return 0
    if command -v ss >/dev/null 2>&1; then
        ss -tuln | grep -qE ":$port\b" && return 0
    fi
    return 1
}

if [ "$SKIP_DB" = true ]; then
    echo -e "  ${YELLOW}!${NC} Database check skipped (--skip-db specified)."
else
    if is_port_listening "127.0.0.1" "$MONGO_PORT"; then
        echo -e "  ${GREEN}✓${NC} MongoDB is active and reachable on port ${MONGO_PORT}."
    else
        echo -e "  ${YELLOW}→${NC} Port $MONGO_PORT is not responding. Attempting to start MongoDB container..."
        
        DOCKER_COMPOSE_CMD=""
        if docker compose version >/dev/null 2>&1; then
            DOCKER_COMPOSE_CMD="docker compose"
        elif command -v docker-compose >/dev/null 2>&1; then
            DOCKER_COMPOSE_CMD="docker-compose"
        fi

        if [ -n "$DOCKER_COMPOSE_CMD" ]; then
            echo -e "  ${DIM}Running: $DOCKER_COMPOSE_CMD up -d mongo${NC}"
            if $DOCKER_COMPOSE_CMD up -d mongo; then
                STARTED_DOCKER=true
                echo -ne "  ${YELLOW}Waiting for MongoDB on port ${MONGO_PORT}...${NC}"
                
                WAIT_COUNT=0
                MAX_WAIT=25
                until is_port_listening "127.0.0.1" "$MONGO_PORT" || [ "$WAIT_COUNT" -ge "$MAX_WAIT" ]; do
                    sleep 1
                    WAIT_COUNT=$((WAIT_COUNT + 1))
                    echo -ne "."
                done
                echo ""

                if is_port_listening "127.0.0.1" "$MONGO_PORT"; then
                    echo -e "  ${GREEN}✓${NC} MongoDB started and reachable on port ${MONGO_PORT}."
                else
                    echo -e "  ${RED}✗ MongoDB container started but port ${MONGO_PORT} timed out after ${MAX_WAIT}s.${NC}"
                    echo -e "    Inspect container logs with: ${BOLD}$DOCKER_COMPOSE_CMD logs mongo${NC}"
                    exit 1
                fi
            else
                echo -e "  ${RED}✗ Failed to start MongoDB container with $DOCKER_COMPOSE_CMD.${NC}"
                exit 1
            fi
        else
            echo -e "  ${RED}✗ MongoDB is not listening on port ${MONGO_PORT} and Docker Compose is not available.${NC}"
            echo -e "    Please start MongoDB manually or install Docker, then re-run this script."
            exit 1
        fi
    fi
fi

# ------------------------------------------------------------------------------
# Port Conflict Check
# ------------------------------------------------------------------------------
free_port_if_busy() {
    local port="$1"
    local svc="$2"
    if is_port_listening "127.0.0.1" "$port"; then
        echo -e "  ${YELLOW}!${NC} Port $port ($svc) is occupied. Freeing port..."
        if command -v fuser >/dev/null 2>&1; then
            fuser -k "$port/tcp" >/dev/null 2>&1 || true
            sleep 1
        fi
        if is_port_listening "127.0.0.1" "$port"; then
            echo -e "  ${RED}✗ Port $port could not be freed automatically. Please terminate the process and retry.${NC}"
            exit 1
        else
            echo -e "  ${GREEN}✓${NC} Port $port freed."
        fi
    fi
}

free_port_if_busy "$BACKEND_PORT" "Backend API"
free_port_if_busy "$FRONTEND_PORT" "Frontend Vite"

# ------------------------------------------------------------------------------
# Launch Backend & Frontend Services
# ------------------------------------------------------------------------------
echo -e "\n${BOLD}[3/4] Launching application services...${NC}"

# Start Backend
echo -e "  ${CYAN}►${NC} Launching Backend Go API server (:${BACKEND_PORT})..."
(
    cd "$SCRIPT_DIR/backend"
    exec go run ./cmd/server > "$SCRIPT_DIR/logs/backend.log" 2>&1
) &
BACKEND_PID=$!

# Start Frontend
echo -e "  ${MAGENTA}►${NC} Launching Frontend Vite dev server (:${FRONTEND_PORT})..."
(
    cd "$SCRIPT_DIR/frontend"
    exec npm run dev > "$SCRIPT_DIR/logs/frontend.log" 2>&1
) &
FRONTEND_PID=$!

# ------------------------------------------------------------------------------
# Service Readiness Verification
# ------------------------------------------------------------------------------
echo -e "\n${BOLD}[4/4] Verifying service readiness...${NC}"

# Check Backend Health
echo -ne "  ${DIM}Waiting for Backend API (:8080/health)...${NC}"
BACKEND_READY=false
for _ in $(seq 1 30); do
    if command -v curl >/dev/null 2>&1; then
        if curl -s -f "http://localhost:${BACKEND_PORT}/health" >/dev/null 2>&1; then
            BACKEND_READY=true
            break
        fi
    else
        if is_port_listening "127.0.0.1" "$BACKEND_PORT"; then
            BACKEND_READY=true
            break
        fi
    fi
    sleep 0.5
    echo -ne "."
done
echo ""

if [ "$BACKEND_READY" = true ]; then
    echo -e "  ${GREEN}✓${NC} Backend API is online and healthy!"
else
    echo -e "  ${YELLOW}!${NC} Backend health check timed out. Showing last lines from logs/backend.log:"
    tail -n 6 logs/backend.log 2>/dev/null || true
fi

# Check Frontend Health
echo -ne "  ${DIM}Waiting for Frontend dev server (:5173)...${NC}"
FRONTEND_READY=false
for _ in $(seq 1 30); do
    if command -v curl >/dev/null 2>&1; then
        if curl -s -f "http://localhost:${FRONTEND_PORT}" >/dev/null 2>&1; then
            FRONTEND_READY=true
            break
        fi
    else
        if is_port_listening "127.0.0.1" "$FRONTEND_PORT"; then
            FRONTEND_READY=true
            break
        fi
    fi
    sleep 0.5
    echo -ne "."
done
echo ""

if [ "$FRONTEND_READY" = true ]; then
    echo -e "  ${GREEN}✓${NC} Frontend dev server is online and responding!"
else
    echo -e "  ${YELLOW}!${NC} Frontend timed out. Showing last lines from logs/frontend.log:"
    tail -n 6 logs/frontend.log 2>/dev/null || true
fi

# ------------------------------------------------------------------------------
# Dashboard Summary
# ------------------------------------------------------------------------------
echo -e "\n${GREEN}${BOLD}================================================================${NC}"
echo -e "${GREEN}${BOLD}  DepEd SMS Services are running!                               ${NC}"
echo -e "${GREEN}${BOLD}================================================================${NC}"
echo -e "  ${BOLD}Web Application:${NC}   ${CYAN}http://localhost:${FRONTEND_PORT}${NC}"
echo -e "  ${BOLD}Backend API:${NC}       ${CYAN}http://localhost:${BACKEND_PORT}/api/v1${NC}"
echo -e "  ${BOLD}API Health Check:${NC}  ${CYAN}http://localhost:${BACKEND_PORT}/health${NC}"
echo -e "  ${BOLD}MongoDB Database:${NC}  ${CYAN}mongodb://localhost:${MONGO_PORT}/deped_sms${NC}"
echo -e "${DIM}----------------------------------------------------------------${NC}"
echo -e "  ${YELLOW}${BOLD}Live server logs streaming below.${NC}"
echo -e "  Press ${RED}${BOLD}[Ctrl + C]${NC} at any time to stop all services cleanly."
echo -e "${GREEN}${BOLD}================================================================${NC}\n"

# ------------------------------------------------------------------------------
# Multiplexed Log Streaming
# ------------------------------------------------------------------------------
tail -n +1 -f "$SCRIPT_DIR/logs/backend.log" 2>/dev/null | sed -u "s/^/${CYAN}[backend]${NC} /" &
TAIL_B_PID=$!

tail -n +1 -f "$SCRIPT_DIR/logs/frontend.log" 2>/dev/null | sed -u "s/^/${MAGENTA}[frontend]${NC} /" &
TAIL_F_PID=$!

# Wait on background processes
wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
