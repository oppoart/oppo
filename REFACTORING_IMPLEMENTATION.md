# OPPO Configuration Refactoring Implementation

## Overview

This document outlines the implementation of Phase 1 of the OPPO codebase refactoring plan, focusing on creating a centralized configuration management system and extracting hardcoded values into reusable constants.

## Changes Implemented

### 1. Centralized Configuration System

Created a comprehensive configuration management system in `packages/shared/src/config/`:

#### Configuration Modules

- **`api.config.ts`** - API settings, endpoints, timeouts, and retry configurations
- **`database.config.ts`** - Database connection settings and query limits  
- **`auth.config.ts`** - Authentication settings, JWT configuration, and security options
- **`ai.config.ts`** - AI service configurations for OpenAI and Anthropic
- **`scraper.config.ts`** - Web scraping configurations with selectors for LinkedIn, Twitter, Bing
- **`rate-limit.config.ts`** - Rate limiting configurations for different endpoints
- **`ui.config.ts`** - UI constants, animations, colors, and form settings
- **`validation.config.ts`** - Validation rules and error messages
- **`validator.ts`** - Configuration validation and environment checking

#### Key Features

- **Environment-aware configuration** - Different settings for development/production
- **Type-safe configuration** - Full TypeScript support with interfaces
- **Validation on startup** - Ensures all required environment variables are set
- **Centralized constants** - No more scattered hardcoded values
- **Easy to extend** - Modular structure allows adding new configuration modules

### 2. Validation Schema Centralization

Created centralized validation schemas in `packages/shared/src/validation/`:

- **`auth.schemas.ts`** - Login, registration, password reset schemas
- **`common.schemas.ts`** - Reusable schemas (pagination, search, file upload, etc.)

### 3. Constants Extraction

Created application-wide constants in `packages/shared/src/constants/`:

- **`app.constants.ts`** - General application constants (pagination, file limits, etc.)
- **`opportunity.constants.ts`** - Opportunity-specific constants (types, categories, statuses)
- **`search.constants.ts`** - Search-related constants (engines, keywords, filters)

### 4. Backend Integration

Updated the backend to use the new configuration system:

- Modified `apps/backend/src/config/env.ts` to integrate with shared configuration
- Updated `apps/backend/src/routes/archivist.ts` as an example implementation
- Replaced hardcoded values with shared constants

## Usage Examples

### Importing Configuration

```typescript
// Import specific configuration modules
import {
  PAGINATION_DEFAULTS,
  HTTP_STATUS,
  API_MESSAGES,
  RATE_LIMIT_WINDOWS,
  paginationSchema,
  getConfig
} from '@oppo/shared';

// Get complete application configuration
const config = getConfig();
console.log(config.database.url); // Database URL
console.log(config.ai.openai.model); // AI model
```

### Using Constants Instead of Hardcoded Values

**Before:**
```typescript
const opportunities = await prisma.opportunity.findMany({
  take: query.limit || 50,
  skip: ((query.page || 1) - 1) * (query.limit || 50)
});

res.status(500).json({
  success: false,
  message: 'Failed to retrieve opportunities'
});
```

**After:**
```typescript
const opportunities = await prisma.opportunity.findMany({
  take: query.limit || PAGINATION_DEFAULTS.LIMIT,
  skip: ((query.page || PAGINATION_DEFAULTS.PAGE) - 1) * (query.limit || PAGINATION_DEFAULTS.LIMIT)
});

res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
  success: false,
  message: API_MESSAGES.ERROR.SERVER_ERROR
});
```

### Using Shared Validation Schemas

**Before:**
```typescript
const querySchema = z.object({
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
  search: z.string().optional()
});
```

**After:**
```typescript
const querySchema = paginationSchema.extend({
  search: z.string().optional(),
  // Add other specific fields as needed
});
```

### Rate Limiting Configuration

**Before:**
```typescript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many requests'
});
```

**After:**
```typescript
const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOWS.FIFTEEN_MINUTES,
  max: 5,
  message: API_MESSAGES.ERROR.RATE_LIMITED
});
```

## Environment Variables

The configuration system validates environment variables on startup. Required variables:

### Required (Development)
- `NODE_ENV`
- `DATABASE_URL`
- `JWT_SECRET`

### Required (Production)
- All development variables plus:
- `FRONTEND_URL`
- `CORS_ORIGIN`

### Optional (with defaults)
- `PORT` (default: 3001)
- `RATE_LIMIT_WINDOW_MS` (default: 900000)
- `RATE_LIMIT_MAX_REQUESTS` (default: 100)
- `AI_MODEL_PRIMARY` (default: gpt-4)
- `AI_MAX_TOKENS` (default: 2000)
- And many more...

### Optional (warnings if missing)
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `SERPAPI_KEY`
- `FIRECRAWL_API_KEY`
- OAuth provider keys

## File Structure

```
packages/shared/src/
├── config/
│   ├── index.ts              # Main config exports
│   ├── types.ts              # TypeScript interfaces
│   ├── validator.ts          # Configuration validation
│   ├── api.config.ts         # API configuration
│   ├── database.config.ts    # Database configuration
│   ├── auth.config.ts        # Authentication configuration
│   ├── ai.config.ts          # AI services configuration
│   ├── scraper.config.ts     # Scraping configuration
│   ├── rate-limit.config.ts  # Rate limiting configuration
│   ├── ui.config.ts          # UI constants
│   └── validation.config.ts  # Validation rules
├── constants/
│   ├── index.ts              # Constants exports
│   ├── app.constants.ts      # Application constants
│   ├── opportunity.constants.ts # Opportunity constants
│   └── search.constants.ts   # Search constants
├── validation/
│   ├── index.ts              # Validation exports
│   ├── auth.schemas.ts       # Auth validation schemas
│   └── common.schemas.ts     # Common validation schemas
└── index.ts                  # Main shared package exports
```

## Benefits Achieved

### 1. **Centralization**
- All configuration in one place
- No more scattered hardcoded values
- Single source of truth for constants

### 2. **Type Safety**
- Full TypeScript support
- Compile-time validation
- IntelliSense support

### 3. **Environment Awareness**
- Different configs for dev/prod
- Automatic environment detection
- Validation on startup

### 4. **Maintainability**
- Easy to update constants
- Consistent error messages
- Reusable validation schemas

### 5. **Developer Experience**
- Clear import structure
- Well-documented interfaces
- Helpful error messages

## Next Steps

Based on the original refactoring plan, the following phases remain:

### Phase 2: Service Layer Refactoring
- Refactor LinkedIn scraper (1,016 lines) to use configuration
- Refactor Twitter scraper (917 lines)
- Refactor Research routes (775 lines)

### Phase 3: UI Component Refactoring
- Break down Settings page (800 lines)
- Create shared component library
- Standardize component interfaces

### Phase 4: Technical Debt Resolution
- Complete TODO implementations
- Add comprehensive error handling
- Implement testing for refactored components

## Migration Guide for Developers

### 1. Update Imports
Replace individual imports with shared package imports:

```typescript
// Old
import rateLimit from 'express-rate-limit';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

// New
import { RATE_LIMIT_WINDOWS, createRateLimiter } from '@oppo/shared';
const limiter = createRateLimiter('/api/endpoint');
```

### 2. Replace Hardcoded Values
Look for magic numbers and strings to replace:

```typescript
// Old patterns to replace:
- 50, 20, 100 (pagination limits)
- 404, 500, 200 (HTTP status codes) 
- 'Failed to...', 'Success' (API messages)
- 15 * 60 * 1000 (time calculations)

// Use shared constants instead
```

### 3. Use Shared Validation
Replace custom validation with shared schemas where possible:

```typescript
// Import shared schemas
import { paginationSchema, searchSchema } from '@oppo/shared';

// Extend rather than recreate
const customSchema = paginationSchema.extend({
  // Add custom fields
});
```

### 4. Configuration Access
Use the centralized configuration:

```typescript
import { getConfig } from '@oppo/shared';
const config = getConfig();

// Access any configuration section
const dbConfig = config.database;
const aiConfig = config.ai;
```

## Testing

The configuration system includes validation to ensure it works correctly:

```bash
# Test configuration loading
cd packages/shared
npm run build

# Test in backend context
cd apps/backend
# Configuration will be validated on startup
```

## Conclusion

Phase 1 of the refactoring plan has been successfully implemented, providing:

- A robust, type-safe configuration management system
- Centralized constants and validation schemas
- Better developer experience with IntelliSense support
- Foundation for future refactoring phases

The system is now ready for Phase 2, where we can refactor the large service files to use these new patterns, making them more maintainable and consistent.