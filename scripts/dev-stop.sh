#!/bin/bash

# OPPO Development Stop Script
# Stops development servers and Docker containers

echo "🛑 Stopping OPPO Development Environment"
echo "========================================"
echo ""

# Stop Docker Compose containers
echo "🐳 Stopping Docker Compose containers..."
if docker-compose down > /dev/null 2>&1; then
    echo "✅ Docker Compose containers stopped"
else
    echo "⚠️  No Docker Compose containers were running"
fi

# Stop standalone Docker containers (MinIO, etc.)
echo "🐳 Stopping standalone OPPO/Orkhanart containers..."
OPPO_CONTAINERS=$(docker ps --filter "name=orkhanart" --filter "name=oppo" -q 2>/dev/null || true)
if [ -n "$OPPO_CONTAINERS" ]; then
    echo "$OPPO_CONTAINERS" | xargs docker stop 2>/dev/null || true
    echo "✅ Standalone containers stopped"
else
    echo "⚠️  No standalone containers were running"
fi

# Kill processes using common dev ports (3000, 5000, 9000, 9001)
echo "🔌 Checking and cleaning up ports..."
for PORT in 3000 5000 9000 9001; do
    PIDS=$(sudo lsof -ti :$PORT 2>/dev/null || true)
    if [ -n "$PIDS" ]; then
        echo "🔪 Killing processes on port $PORT..."
        echo "$PIDS" | xargs sudo kill -9 2>/dev/null || true
    fi
done

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
