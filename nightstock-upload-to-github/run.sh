#!/usr/bin/env bash
# NIGHTSTOCK One-Click Launcher Script for macOS & Linux
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "🎃 Summoning NIGHTSTOCK — The Inventory of the Damned..."

if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    ./venv/bin/pip install --upgrade pip
    ./venv/bin/pip install -r requirements.txt
fi

./venv/bin/python run.py
