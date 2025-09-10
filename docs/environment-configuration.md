# Environment Configuration Guide

This guide covers environment setup and configuration for the OPPO application across development, testing, and production environments.

## Overview

OPPO uses environment-specific configuration to ensure secure and reliable deployment across different stages:

- **Development**: Local development with debug features
- **Testing**: Isolated environment for automated tests
- **Production**: Live environment with enhanced security

## Backend Environment Variables

### Required Variables

| Variable | Description | Example | Notes |
|----------|-------------|---------|-------|
| `NODE_ENV` | Environment mode | `development` | `development`, `production`, `test` |
| `PORT` | Server port | `3001` | Port for backend server |
| `FRONTEND_URL` | Frontend URL | `http://localhost:3000` | CORS configuration |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@host:5432/db` | Database connection string |
| `JWT_SECRET` | JWT signing secret | `your_secret_32_chars_min` | Must be 32+ characters |

### Security Variables

| Variable | Description | Default | Notes |
|----------|-------------|---------|-------|
| `BCRYPT_ROUNDS` | Password hashing rounds | `12` | Higher = more secure, slower |
| `SESSION_TIMEOUT_HOURS` | Session expiry time | `24` | Hours before session expires |
| `AUTH_RATE_LIMIT_MAX` | Auth rate limit | `5` | Max auth attempts per window |

### External API Keys (Sprint 3)

| Variable | Description | Required | Notes |
|----------|-------------|----------|-------|
| `OPENAI_API_KEY` | OpenAI API access | Sprint 3 | For AI opportunity analysis |
| `FIRECRAWL_API_KEY` | Firecrawl API access | Sprint 3 | For web scraping |

### Optional Configuration

| Variable | Description | Default | Notes |
|----------|-------------|---------|-------|
| `LOG_LEVEL` | Logging verbosity | `info` | `error`, `warn`, `info`, `debug` |
| `CORS_ORIGIN` | CORS allowed origin | `http://localhost:3000` | Restrict in production |
| `ADMIN_EMAIL` | Admin email address | - | For admin notifications |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` | 15 minutes in ms |
| `RATE_LIMIT_MAX_REQUESTS` | Rate limit max requests | `100` | Per IP per window |

## Frontend Environment Variables

### Public Variables (prefixed with `NEXT_PUBLIC_`)

| Variable | Description | Example | Notes |
|----------|-------------|---------|-------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:3001` | Points to backend |
| `NEXT_PUBLIC_APP_NAME` | Application name | `OPPO` | Used in UI |
| `NEXT_PUBLIC_APP_VERSION` | App version | `1.0.0` | Version display |
| `NEXT_PUBLIC_DEBUG_MODE` | Debug mode flag | `true` | Development debugging |

### Feature Flags

| Variable | Description | Default | Notes |
|----------|-------------|---------|-------|
| `NEXT_PUBLIC_ENABLE_NOTIFICATIONS` | Notifications feature | `false` | Future feature |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | Analytics tracking | `false` | Production only |

## Environment Setup

### 1. Development Setup

```bash
# Backend
cd apps/backend
cp .env.example .env
# Edit .env with your local settings

# Frontend  
cd apps/web
cp .env.local.example .env.local
# Edit .env.local with your settings
```

### 2. Environment Validation

Run the validation script to check your configuration:

```bash
./scripts/validate-env.sh
```

### 3. Required Services

#### PostgreSQL Database

**Development:**
```bash
# Install PostgreSQL
brew install postgresql
brew services start postgresql

# Create database
createdb oppo_dev
createdb oppo_test
```

**Production:**
- Use managed database service (AWS RDS, Google Cloud SQL, etc.)
- Enable SSL connections
- Configure backups and monitoring

## Environment-Specific Configurations

### Development Environment

```bash
NODE_ENV=development
PORT=3001
DATABASE_URL="postgresql://username:password@localhost:5432/oppo_dev"
JWT_SECRET=development_secret_at_least_32_characters_long
LOG_LEVEL=debug
CORS_ORIGIN=http://localhost:3000
```

**Features:**
- Debug logging enabled
- Hot reload
- Local database
- Relaxed security settings

### Production Environment

```bash
NODE_ENV=production  
PORT=3001
DATABASE_URL="postgresql://username:password@prod-host:5432/oppo_prod?sslmode=require"
JWT_SECRET=GENERATED_STRONG_SECRET_64_CHARACTERS_OR_MORE
LOG_LEVEL=warn
CORS_ORIGIN=https://your-domain.com
BCRYPT_ROUNDS=14
AUTH_RATE_LIMIT_MAX=3
```

**Features:**
- Enhanced security
- SSL database connections
- Restricted CORS
- Higher bcrypt rounds
- Stricter rate limiting

### Test Environment

```bash
NODE_ENV=test
PORT=3002
DATABASE_URL="postgresql://username:password@localhost:5432/oppo_test"
JWT_SECRET=test_secret_32_characters_minimum
LOG_LEVEL=error
RATE_LIMIT_MAX_REQUESTS=10000
AUTH_RATE_LIMIT_MAX=10000
```

**Features:**
- Isolated test database
- Rate limiting disabled
- Fast bcrypt rounds
- Error-only logging

## Security Best Practices

### JWT Secrets
```bash
# Generate strong JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Database Security
- Use managed database services in production
- Enable SSL/TLS connections
- Configure proper firewall rules
- Regular security updates

### API Keys
- Store in environment variables
- Use different keys per environment  
- Rotate keys regularly
- Monitor usage and costs

## Deployment Checklists

### Development Checklist
- [ ] PostgreSQL installed and running
- [ ] Environment files configured
- [ ] Database migrations applied
- [ ] Services start without errors

### Production Checklist
- [ ] Managed database configured
- [ ] SSL certificates installed
- [ ] Environment secrets secured
- [ ] CORS configured for production domain
- [ ] Rate limiting configured
- [ ] Monitoring and logging enabled
- [ ] Backup and recovery configured
- [ ] Security headers enabled
- [ ] API keys configured
- [ ] Health checks working

## Troubleshooting

### Common Issues

**Database Connection Failed**
- Check DATABASE_URL format
- Verify PostgreSQL is running
- Check firewall settings
- Verify credentials

**JWT Secret Error**
- Ensure JWT_SECRET is 32+ characters
- Check for special characters in secret
- Verify environment loading

**CORS Issues**
- Check CORS_ORIGIN matches frontend URL
- Verify protocol (http vs https)
- Check for trailing slashes

**Rate Limiting Issues**
- Check rate limit configuration
- Verify IP detection
- Adjust limits for your usage

### Environment Validation

Use the validation script to diagnose issues:
```bash
./scripts/validate-env.sh
```

### Manual Verification

Test environment loading:
```bash
# Backend
cd apps/backend
node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL ? 'DB configured' : 'DB missing')"

# Frontend
cd apps/web
npm run build
```

## Support

For environment configuration issues:
1. Run the validation script
2. Check the logs for specific errors
3. Verify all required variables are set
4. Ensure proper formatting of URLs and secrets
5. Test with minimal configuration first