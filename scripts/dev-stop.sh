#!/bin/bash

# OPPO Development Stop Script
# Stops development servers and Docker containers

echo "🛑 Stopping OPPO Development Environment"
echo "========================================"
echo ""

# Stop Docker containers
echo "🐳 Stopping Docker containers..."
if docker-compose down > /dev/null 2>&1; then
    echo "✅ Docker containers stopped"
else
    echo "⚠️  No Docker containers were running"
fi

# Kill any running dev processes
echo "🔍 Checking for running dev processes..."

# Find and kill turbo processes
TURBO_PIDS=$(pgrep -f "turbo dev" 2>/dev/null || true)
if [ -n "$TURBO_PIDS" ]; then
    echo "🔪 Stopping Turbo dev processes..."
    echo "$TURBO_PIDS" | xargs kill -9 2>/dev/null || true
    echo "✅ Turbo processes stopped"
fi

# Find and kill node processes related to the project
NODE_PIDS=$(pgrep -f "node.*oppo" 2>/dev/null || true)
if [ -n "$NODE_PIDS" ]; then
    echo "🔪 Stopping Node processes..."
    echo "$NODE_PIDS" | xargs kill -9 2>/dev/null || true
    echo "✅ Node processes stopped"
fi

echo ""
echo "✨ Development environment stopped successfully"
