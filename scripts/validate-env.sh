#!/bin/bash

# =====================================
# OPPO Environment Validation Script
# =====================================

set -e

echo "🔍 Validating OPPO environment configuration..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅ Found: $1${NC}"
        return 0
    else
        echo -e "${RED}❌ Missing: $1${NC}"
        return 1
    fi
}

# Function to check if a variable is set in .env file
check_env_var() {
    local file="$1"
    local var="$2"
    local required="$3"
    
    if [ -f "$file" ]; then
        if grep -q "^${var}=" "$file"; then
            local value=$(grep "^${var}=" "$file" | cut -d '=' -f 2- | sed 's/^"//' | sed 's/"$//')
            if [ ! -z "$value" ] && [ "$value" != "your_" ] && [ "$value" != "change_me" ]; then
                echo -e "${GREEN}✅ $var is set${NC}"
                return 0
            else
                if [ "$required" = "true" ]; then
                    echo -e "${RED}❌ $var is not properly configured${NC}"
                    return 1
                else
                    echo -e "${YELLOW}⚠️  $var should be configured${NC}"
                    return 0
                fi
            fi
        else
            if [ "$required" = "true" ]; then
                echo -e "${RED}❌ $var is missing${NC}"
                return 1
            else
                echo -e "${YELLOW}⚠️  $var is missing (optional)${NC}"
                return 0
            fi
        fi
    else
        echo -e "${RED}❌ Environment file $file not found${NC}"
        return 1
    fi
}

# Check backend environment files
echo ""
echo "📁 Checking backend environment files..."
cd apps/backend

missing_files=0
check_file ".env" || missing_files=$((missing_files + 1))
check_file ".env.example" || missing_files=$((missing_files + 1))
check_file ".env.production.example" || missing_files=$((missing_files + 1))
check_file ".env.test.example" || missing_files=$((missing_files + 1))

# Check required environment variables in backend
echo ""
echo "🔧 Checking backend environment variables..."
failed_vars=0

# Required variables
check_env_var ".env" "DATABASE_URL" "true" || failed_vars=$((failed_vars + 1))
check_env_var ".env" "JWT_SECRET" "true" || failed_vars=$((failed_vars + 1))
check_env_var ".env" "NODE_ENV" "true" || failed_vars=$((failed_vars + 1))
check_env_var ".env" "PORT" "true" || failed_vars=$((failed_vars + 1))
check_env_var ".env" "FRONTEND_URL" "true" || failed_vars=$((failed_vars + 1))

# Optional variables (warnings only)
check_env_var ".env" "OPENAI_API_KEY" "false"
check_env_var ".env" "FIRECRAWL_API_KEY" "false"
check_env_var ".env" "LOG_LEVEL" "false"

# Check frontend environment files
echo ""
echo "📁 Checking frontend environment files..."
cd ../web

check_file ".env.local.example" || missing_files=$((missing_files + 1))
check_file ".env.production.example" || missing_files=$((missing_files + 1))

# Check if local env file exists (optional)
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✅ Found: .env.local${NC}"
    check_env_var ".env.local" "NEXT_PUBLIC_API_URL" "true" || failed_vars=$((failed_vars + 1))
else
    echo -e "${YELLOW}⚠️  .env.local not found (using defaults)${NC}"
fi

# Go back to root
cd ../..

# Final validation
echo ""
echo "📊 Validation Summary:"
echo "======================"

if [ $missing_files -eq 0 ] && [ $failed_vars -eq 0 ]; then
    echo -e "${GREEN}✅ All environment configuration is valid!${NC}"
    echo ""
    echo "🚀 Ready to start OPPO servers:"
    echo "   Backend:  cd apps/backend && pnpm run dev"
    echo "   Frontend: cd apps/web && pnpm run dev"
    exit 0
else
    echo -e "${RED}❌ Environment validation failed:${NC}"
    echo "   Missing files: $missing_files"
    echo "   Failed variables: $failed_vars"
    echo ""
    echo "🔧 Please fix the issues above before starting OPPO."
    echo ""
    echo "💡 Quick fixes:"
    echo "   1. Copy .env.example to .env and configure values"
    echo "   2. Ensure DATABASE_URL points to your PostgreSQL database"
    echo "   3. Generate a strong JWT_SECRET (32+ characters)"
    echo "   4. Configure API keys for Sprint 3 features"
    exit 1
fi