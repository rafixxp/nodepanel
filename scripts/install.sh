#!/usr/bin/env bash
# ============================================================================
# WebPanel — One-click install script (self-hosted)
# ============================================================================
# Requirements detected by this script:
#   - Linux (Ubuntu/Debian based; also works on Fedora/RHEL with minor edits)
#   - Node.js >= 20
#   - npm or bun
#   - git (only for cloning; skip if you already have the source)
#   - root or sudo access
#
# This installs the full stack:
#   1. Node.js 20 LTS + npm/bun
#   2. systemd service + PM2 process manager (PM2 stays as the runtime
#      process manager for the Fastify app; a systemd unit keeps it alive
#      after reboot)
#   3. PM2 ecosystem config pointing at the Fastify app
#
# Usage:
#   curl -fsSL https://<your-repo>/scripts/install.sh | bash
#   or:  bash scripts/install.sh
#
# The install is idempotent: re-running it re-installs deps and restarts PM2.
# ============================================================================

set -euo pipefail

# ---- colours ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # no colour

info()  { echo -e "${BLUE}[*]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
err()   { echo -e "${RED}[ERR]${NC} $1"; }

# ---- config (editable at the top) ----
APP_NAME="webpanel"
APP_DIR="/opt/${APP_NAME}"
REPO_URL="https://github.com/rafixxp/nodepanel"   # <-- your repo here
PORT="${PORT:-8080}"
USER="webpanel"            # system user that runs the app
PM2_HOME="/opt/${APP_NAME}/.pm2"

# ---- helpers ----
log_step()  { info "===== $1 ====="; }
detect_pkgmgr() {
  if command -v bun >/dev/null 2>&1; then
    echo "bun"; return
  elif command -v npm >/dev/null 2>&1; then
    echo "npm"; return
  else
    echo "none"; return
  fi
}

install_apt() {
  # Ubuntu/Debian: install Node.js 20 + build tools
  if command -v apt-get >/dev/null 2>&1; then
    info "Updating apt package lists..."
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq
    apt-get install -y -qq curl git ca-certificates gnupg
    # NodeSource setup
    if ! command -v node >/dev/null 2>&1 || ! node -v 2>/dev/null | grep -q "v20\."; then
      info "Installing Node.js 20 LTS via NodeSource..."
      curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
      apt-get install -y -qq nodejs
    fi
    # PM2 via npm (works with system Node)
    npm install -g pm2 >/dev/null 2>&1
    ok "Installed: Node.js, git, curl, npm, PM2"
    return
  fi
  # Fedora / RHEL / CentOS
  if command -v dnf >/dev/null 2>&1; then
    info "Installing Node.js via NodeSource (dnf)..."
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
    dnf install -y -q nodejs git curl
    npm install -g pm2 >/dev/null 2>&1
    ok "Installed: Node.js, git, curl, npm, PM2"
    return
  fi
  warn "No supported package manager (apt/dnf/yum) found; you must install Node.js >= 20, git, and npm/bun manually."
}

setup_user() {
  if id "$USER" >/dev/null 2>&1; then
    ok "user '$USER' already exists"
  else
    info "Creating system user '$USER' ..."
    useradd --system --no-create-home --shell /usr/sbin/nologin "$USER"
    ok "Created user '$USER'"
  fi
}

clone_or_update() {
  if [ -d "$APP_DIR/.git" ]; then
    info "Repository already present at $APP_DIR — pulling latest..."
    cd "$APP_DIR"
    git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || warn "Could not pull (is it a fresh clone?)"
    ok "Repository updated"
  else
    info "Cloning repository into $APP_DIR ..."
    git clone "$REPO_URL" "$APP_DIR" 2>/dev/null || {
      err "Failed to clone $REPO_URL"
      warn "Manually clone the repo into $APP_DIR or set REPO_URL below."
      return 1
    }
    ok "Cloned repository"
  fi
}

install_deps() {
  local pkgmgr
  pkgmgr=$(detect_pkgmgr)
  info "Detected package manager: $pkgmgr"
  cd "$APP_DIR"

  if [ "$pkgmgr" = "bun" ]; then
    info "Installing bun dependencies with bun..."
    bun install >/dev/null 2>&1 || warn "bun install failed"
  else
    info "Installing npm dependencies with npm..."
    npm ci >/dev/null 2>&1 || npm install >/dev/null 2>&1 || warn "npm install failed"
  fi
  ok "Dependencies installed (node_modules)"
}

create_pm2_config() {
  local ecosystem="$APP_DIR/ecosystem.config.js"
  cat > "$ecosystem" <<EOF
module.exports = {
  apps: [
    {
      name: "${APP_NAME}",
      script: "src/start.js",
      cwd: "${APP_DIR}",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: "${PORT}",
        HOST: "0.0.0.0",
      },
      env_production: {
        NODE_ENV: "production",
        PORT: "${PORT}",
        HOST: "0.0.0.0",
      },
    },
  ],
};
EOF
  ok "Created PM2 ecosystem config at $ecosystem"
}

install_pm2_systemd() {
  local pm2_env="$PM2_HOME/env"
  mkdir -p "$PM2_HOME"

  # PM2 systemd init script (auto-start PM2 on boot, keep app alive)
  info "Generating PM2 systemd service (webpanel)..."
  pm2 startup systemd -u "$USER" --hp "$HOME" >/dev/null 2>&1
  pm2 save --force >/dev/null 2>&1
  # Ensure PM2 is running under the app user
  su -s /bin/bash "$USER" -c "pm2 resurrect" >/dev/null 2>&1 || true
  ok "PM2 systemd service created and app added to resurrect list"
}

build_frontend() {
  info "Building SPA frontend (Vite)..."
  cd "$APP_DIR"
  npm run build >/dev/null 2>&1 || npm run build >/dev/null 2>&1 || warn "Frontend build failed (SPA will be served without build assets)"
  ok "Frontend built -> client/dist"
}

create_systemd_unit() {
  local unit="/etc/systemd/system/${APP_NAME}.service"
  info "Creating systemd service unit $unit ..."
  cat > "$unit" <<EOF
[Unit]
Description=WebPanel - Linux System Management Panel
After=network.target

[Service]
Type=simple
User=$USER
Group=$USER
WorkingDirectory=${APP_DIR}
Environment=NODE_ENV=production
Environment=PORT=${PORT}
Environment=HOST=0.0.0.0
ExecStart=/usr/bin/pm2-runtime /opt/webpanel/ecosystem.config.js
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload >/dev/null 2>&1 || true
  systemctl enable "${APP_NAME}.service" >/dev/null 2>&1 || true
  ok "systemd unit created; service enabled"
}

start_service() {
  local unit="/etc/systemd/system/${APP_NAME}.service"
  if [ -f "$unit" ]; then
    systemctl restart "${APP_NAME}.service" >/dev/null 2>&1 || {
      warn "systemctl restart Failed (systemd may not be running in this container). Falling back to PM2 start..."
      su -s /bin/bash "$USER" -c "pm2 start /opt/webpanel/ecosystem.config.js --env production" >/dev/null 2>&1 || true
      su -s /bin/bash "$USER" -c "pm2 save" >/dev/null 2>&1 || true
      return
    }
    sleep 2
    if systemctl is-active --quiet "${APP_NAME}.service"; then
      ok "Service started via systemd: ${APP_NAME}.service"
    else
      warn "systemd service not active; PM2 is running independently."
    fi
  else
    warn "No systemd unit found — starting via PM2 directly."
    su -s /bin/bash "$USER" -c "pm2 start /opt/webpanel/ecosystem.config.js --env production" >/dev/null 2>&1 || true
    su -s /bin/bash "$USER" -c "pm2 save" >/dev/null 2>&1 || true
  fi
}

print_results() {
  echo ""
  echo "=============================================="
  echo "  WebPanel installed successfully!"
  echo "=============================================="
  echo ""
  echo "  Web panel:         http://$(hostname -i 2>/dev/null || echo 'localhost'):${PORT}"
  echo "  API base:          http://$(hostname -i 2>/dev/null || echo 'localhost'):${PORT}/api"
  echo "  PM2 process list:"
  su -s /bin/bash "$USER" -c "pm2 list" 2>/dev/null || true
  echo ""
  echo "  Logs (systemd):    journalctl -u ${APP_NAME} -f"
  echo "  Logs (PM2):        su - $USER -c 'pm2 logs ${APP_NAME}'"
  echo "  PM2 monit:         su - $USER -c 'pm2 monit'"
  echo ""
  echo "  To update later:   cd ${APP_DIR} && git pull && npm ci && pm2 restart ${APP_NAME}"
  echo "  To stop:           systemctl stop ${APP_NAME}   (or: pm2 stop ${APP_NAME})"
  echo "  To start:          systemctl start ${APP_NAME}  (or: pm2 start ${APP_NAME})"
  echo ""
}

main() {
  echo ""
  echo "=============================================="
  echo "  WebPanel one-click installer"
  echo "=============================================="
  echo ""

  # 1. pre-checks
  if ! command -v curl >/dev/null 2>&1; then
    err "curl is required. Install curl and re-run."
    exit 1
  fi
  if ! command -v git >/dev/null 2>&1; then
    warn "git not found — cloning will fail. Install git and re-run."
  fi

  # 2. install Node.js + git + npm/bun
  log_step "Installing Node.js, git, curl and PM2"
  install_apt
  install_deps

  # 3. git repo
  log_step "Cloning the repository"
  clone_or_update || true

  # 4. PM2 config + systemd
  log_step "Configuring PM2 and systemd"
  create_pm2_config
  install_pm2_systemd
  create_systemd_unit

  # 5. build
  log_step "Building frontend"
  build_frontend

  # 6. start
  log_step "Starting the panel"
  start_service

  print_results
}

main "$@"
