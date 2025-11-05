#!/bin/bash

# OPPO Docker Setup Script
# This script sets up PostgreSQL and Redis using Docker Compose

set -e

echo "🚀 OPPO Docker Setup"
echo "===================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env file exists
if [ ! -f "apps/backend/.env" ]; then
    echo "⚠️  Backend .env file not found. Creating from .env.example..."
    cp apps/backend/.env.example apps/backend/.env
    echo "✅ Created apps/backend/.env"
    echo "📝 Please edit apps/backend/.env with your configuration"
    echo ""
fi

# Start Docker containers
echo "🐳 Starting Docker containers..."
docker-compose up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Check PostgreSQL connection
if docker-compose exec -T postgres pg_isready -U oppo_user -d oppo_dev > /dev/null 2>&1; then
    echo "✅ PostgreSQL is ready"
else
    echo "⚠️  PostgreSQL might not be fully ready yet. Please wait a moment."
fi

# Check Redis connection
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is ready"
else
    echo "⚠️  Redis might not be fully ready yet. Please wait a moment."
fi

echo ""
echo "🎉 Docker setup complete!"
echo ""
echo "Next steps:"
echo "  1. Make sure apps/backend/.env has correct DATABASE_URL"
echo "  2. Run: pnpm db:push     (to sync Prisma schema)"
echo "  3. Run: pnpm dev         (to start the development server)"
echo ""
echo "Useful commands:"
echo "  - View logs:       docker-compose logs -f"
echo "  - Stop services:   docker-compose down"
echo "  - Reset data:      docker-compose down -v"
echo "  - DB Studio:       pnpm db:studio"
echo ""
