#!/usr/bin/env bash
set -e

echo "========================================================"
echo "  Launching StudentOS - Personal Student Management System"
echo "========================================================"
echo ""

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "[1/2] Installing requirements..."
python3 -m pip install -r backend/requirements.txt

echo "[2/2] Starting StudentOS Unified Server on http://localhost:8000 ..."
echo ""
echo "========================================================"
echo "  Open your browser at: http://localhost:8000"
echo "  Demo Student: demo@studentos.dev / student123"
echo "  (or click 'Launch Demo Workspace' on the sign-in page)"
echo "========================================================"
echo ""

cd backend
python3 main.py
