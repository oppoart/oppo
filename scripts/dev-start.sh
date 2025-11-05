#!/bin/bash

# OPPO Development Start Script
# Starts Docker containers and development servers with TUI

set -e

echo "🚀 Starting OPPO Development Environment"
echo "========================================"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start Docker containers
echo "🐳 Starting Docker containers..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 3

# Check PostgreSQL
if docker-compose exec -T postgres pg_isready -U oppo_user -d oppo_dev > /dev/null 2>&1; then
    echo "✅ PostgreSQL is ready"
else
    echo "⚠️  PostgreSQL is starting up..."
    sleep 2
fi

# Check Redis
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is ready"
else
    echo "⚠️  Redis is starting up..."
fi

echo ""
echo "🎨 Starting development servers with TUI..."
echo "   Press Ctrl+C to stop"
echo ""

# Cleanup function to stop Docker when script exits
cleanup() {
    echo ""
    echo "🛑 Stopping development environment..."
    docker-compose down
    echo "✅ Docker containers stopped"
    exit 0
}

# Trap Ctrl+C and call cleanup
trap cleanup SIGINT SIGTERM

# Start development with Turbo TUI
pnpm dev

# This line will only run if pnpm dev exits normally
cleanup
