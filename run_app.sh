#!/usr/bin/env bash
# Starts the Judge the Sample app locally. Run from anywhere: bash run_app.sh
# Stop it with Ctrl+C.

set -e

# Always work from the project folder (the folder this script lives in).
cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  echo "node_modules/ not found - running npm install first..."
  npm install
fi

echo
echo "Starting the app. Open this address in your browser:"
echo "  http://localhost:5173/"
echo "(If that port is busy, Vite picks the next one and prints the real address below.)"
echo "Press Ctrl+C to stop."
echo

npm run dev
