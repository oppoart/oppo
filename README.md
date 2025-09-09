# OPPO - Autonomous Opportunity Agent

🚀 **AI-powered opportunity discovery and application automation for artists**

## Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm 8+

### Development Setup

```bash
# Install dependencies
pnpm install

# Start development servers
pnpm dev
```

This will start:
- **Frontend**: http://localhost:3000 (Next.js)
- **Backend**: http://localhost:3001 (Express API)

### Project Structure

```
OPPO/
├── apps/
│   ├── web/          # Next.js frontend
│   └── backend/      # Express.js API
├── packages/
│   ├── shared/       # Shared types & utilities
│   ├── database/     # Database schemas & migrations
│   └── ui/           # Shared UI components
├── docs/             # Project documentation
└── todo-pm/          # Project management files
```

## Monorepo Commands

```bash
# Development
pnpm dev                    # Start all apps in development
pnpm build                  # Build all apps
pnpm test                   # Run all tests
pnpm lint                   # Lint all packages

# Package-specific commands
pnpm --filter backend dev   # Start only backend
pnpm --filter web dev       # Start only frontend
```

## Deployment

### Vercel (Frontend)
1. Connect your GitHub repository to Vercel
2. Set build command: `pnpm build --filter=web`
3. Set output directory: `apps/web/.next`

### Railway (Backend)
1. Connect your GitHub repository to Railway  
2. Railway will automatically detect the `railway.toml` configuration
3. Set environment variables in Railway dashboard

## Environment Variables

Copy `.env.example` files in each app and configure:

**Backend** (`apps/backend/.env`):
```
DATABASE_URL=your_postgres_url
JWT_SECRET=your_jwt_secret
OPENAI_API_KEY=your_openai_key
FIRECRAWL_API_KEY=your_firecrawl_key
```

**Frontend** (`apps/web/.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Features

- 🤖 **AI-Powered** - Intelligent opportunity matching
- 🔒 **Privacy-First** - Local data processing
- ⚡ **Real-time** - Live updates and notifications  
- 🌐 **Web Scraping** - Automated opportunity discovery
- 📱 **Modern UI** - Responsive React interface
- 🛠 **Developer Experience** - TypeScript, hot reload, testing

## License

MIT