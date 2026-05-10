#!/bin/bash

# Krynox Aegis - Automated Installation Script
# This script installs the eBPF kernel module, the Python sentinel, and the React dashboard.

# Color Codes for UX
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🛡️ Starting Krynox Aegis Installation...${NC}"

# --- ROOT CHECK ---
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}ERROR: This script must be run as root (sudo).${NC}"
   exit 1
fi

# --- SYSTEM DEPENDENCIES ---
echo -e "${YELLOW}📦 Updating system and installing kernel dependencies...${NC}"
apt-get update -y
apt-get install -y \
    bpfcc-tools \
    linux-headers-$(uname -r) \
    python3-bpfcc \
    python3-pip \
    nodejs \
    npm \
    libbpf-dev

# --- BACKEND SETUP ---
echo -e "${YELLOW}⚙️ Setting up Krynox Backend (/opt/krynox)...${NC}"
INSTALL_DIR="/opt/krynox"
mkdir -p $INSTALL_DIR

# Copy project files
cp sentinel.py $INSTALL_DIR/
cp krynox_core.bpf.c $INSTALL_DIR/
cp requirements.txt $INSTALL_DIR/

# Check for .env file
if [ -f .env ]; then
    cp .env $INSTALL_DIR/
    echo -e "${GREEN}✅ .env file copied successfully.${NC}"
else
    echo -e "${RED}⚠️ WARNING: .env file missing. Forensic AI features will require a GROQ_API_KEY.${NC}"
fi

# Install Python dependencies
echo -e "${YELLOW}🐍 Installing Python dependencies...${NC}"
pip3 install -r $INSTALL_DIR/requirements.txt --break-system-packages

# --- FRONTEND SETUP ---
echo -e "${YELLOW}🎨 Building React Dashboard...${NC}"
if [ -d "krynox-ui" ]; then
    cd krynox-ui
    npm install
    npm run build
    echo -e "${GREEN}✅ Frontend build complete.${NC}"
    cd ..
else
    echo -e "${RED}❌ ERROR: krynox-ui directory not found in current path.${NC}"
fi

# --- SYSTEMD DAEMON SETUP ---
echo -e "${YELLOW}🔄 Configuring Krynox Systemd Service...${NC}"
if [ -f "krynox.service" ]; then
    cp krynox.service /etc/systemd/system/
    systemctl daemon-reload
    systemctl enable krynox
    systemctl start krynox
    echo -e "${GREEN}✅ Krynox Sentinel is now running as a background daemon.${NC}"
else
    echo -e "${RED}❌ ERROR: krynox.service file not found.${NC}"
fi

# --- FINAL STATUS ---
echo -e "\n${GREEN}🛡️ KRYNOX AEGIS INSTALLATION COMPLETE!${NC}"
echo -e "${YELLOW}--------------------------------------------------${NC}"
echo -e "Backend Status: $(systemctl is-active krynox)"
echo -e "API Endpoint:   http://localhost:8000/threats"
echo -e "UI Port:        Local build located in krynox-ui/dist"
echo -e "${YELLOW}--------------------------------------------------${NC}"
echo -e "To view logs, run: ${GREEN}journalctl -u krynox -f${NC}"
