#!/bin/bash

# Local development server for testnet dashboard

echo "🔧 Starting local development server..."

# Check if Python is available
if command -v python3 &> /dev/null; then
    echo "📡 Server running at: http://localhost:8000"
    echo "🛑 Press Ctrl+C to stop"
    cd site && python3 -m http.server 8000
elif command -v python &> /dev/null; then
    echo "📡 Server running at: http://localhost:8000"
    echo "🛑 Press Ctrl+C to stop"
    cd site && python -m SimpleHTTPServer 8000
elif command -v node &> /dev/null && command -v npx &> /dev/null; then
    echo "📡 Server running at: http://localhost:8000"
    echo "🛑 Press Ctrl+C to stop"
    cd site && npx http-server -p 8000
else
    echo "❌ No suitable web server found"
    echo "Please install Python 3 or Node.js to run local server"
    exit 1
fi
