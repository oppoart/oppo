# OPPO - Autonomous Opportunity Agent

🚀 **AI-powered opportunity discovery and application automation for artists**

## Overview

OPPO is a modular, AI-driven system that automates the discovery and application process for artist opportunities. Built with a **privacy-first** approach and **five core intelligent modules**, it helps artists focus on their creative work while the system handles administrative tasks.

## 🏗️ Architecture

Built as a **modular monolith** with five core services:

- **🎯 Orchestrator** - Central coordinator and workflow automation
- **🔍 Sentinel** - Web scraping and opportunity discovery
- **🧠 Analyst** - AI-powered relevance scoring and matching
- **💾 Archivist** - Data storage and deduplication
- **🔗 Liaison** - User interface and external integrations

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm 8+
- PostgreSQL 14+

### Development Setup

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp apps/backend/.env.example apps/backend/.env
cp apps/web/.env.example apps/web/.env.local

# Run database migrations
cd apps/backend && pnpm db:migrate

# Start development servers
pnpm dev
```

This will start:
- **Frontend**: http://localhost:3000 (Next.js 14)
- **Backend**: http://localhost:3001/api (NestJS)
- **API Docs**: http://localhost:3001/docs (Swagger)

## 📁 Project Structure

```
OPPO/
├── apps/
│   ├── backend/          # NestJS API server
│   │   ├── src/
│   │   │   ├── modules/  # Feature modules (5 core + support)
│   │   │   ├── shared/   # Internal utilities
│   │   │   └── common/   # Guards, filters, interceptors
│   │   └── prisma/       # Database schema & migrations
│   │
│   └── web/             # Next.js 14 frontend
│       └── src/
│           ├── app/      # App router pages
│           └── components/ # React components
│
├── packages/
│   ├── services/        # Core business logic
│   │   ├── orchestrator/
│   │   ├── sentinel/
│   │   ├── analyst/
│   │   ├── archivist/
│   │   └── liaison/
│   │
│   └── shared/          # Shared types & utilities
│
├── docs/                # Documentation
│   ├── architecture/    # System design docs
│   ├── implementation/  # Technical details
│   └── modules/         # Module specifications
│
└── scripts/             # Build & deployment scripts
```

## 🛠️ Tech Stack

### Backend
- **Framework**: NestJS (modular architecture)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Better Auth
- **AI**: OpenAI GPT-4, Anthropic Claude
- **Web Scraping**: Firecrawl, Playwright
- **Real-time**: WebSockets (Socket.io)

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI**: Tailwind CSS + shadcn/ui
- **State**: Zustand
- **Forms**: React Hook Form + Zod

## 📦 Monorepo Commands

```bash
# Development
pnpm dev                    # Start all apps
pnpm build                  # Build all packages
pnpm test                   # Run all tests
pnpm lint                   # Lint all code

# Backend specific
pnpm --filter backend dev   # Start backend only
pnpm --filter backend build # Build backend
pnpm --filter backend test  # Test backend

# Frontend specific
pnpm --filter web dev       # Start frontend only
pnpm --filter web build     # Build frontend
```

## 🚢 Deployment

### Railway (Backend)
1. Connect GitHub repository to Railway
2. Railway auto-detects `railway.toml` configuration
3. Set environment variables in Railway dashboard
4. Deploy with automatic builds on push

### Vercel (Frontend)
1. Import project to Vercel
2. Configure:
   - Build Command: `pnpm build --filter=web`
   - Output Directory: `apps/web/.next`
   - Install Command: `pnpm install`
3. Set environment variables
4. Deploy with automatic builds

## 🔐 Environment Variables

### Backend (`apps/backend/.env`)
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/oppo_dev

# Auth
JWT_SECRET=your-secret-key
BCRYPT_ROUNDS=12

# AI Services
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Web Scraping
FIRECRAWL_API_KEY=fc-...

# Email (optional)
SENDGRID_API_KEY=SG...
RESEND_API_KEY=re_...
```

### Frontend (`apps/web/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

## ✨ Features

- 🤖 **AI-Powered Matching** - Intelligent opportunity relevance scoring
- 🔍 **Automated Discovery** - Web scraping from multiple sources
- 📊 **Smart Analytics** - Track application success rates
- 🔄 **Workflow Automation** - Event-driven task orchestration
- 🎯 **Personalization** - Learns from user preferences
- 🔐 **Privacy-First** - Local processing where possible
- 📱 **Modern UI** - Responsive design with drag-and-drop
- 🔌 **Integrations** - Notion, calendar sync (planned)

## 📚 Documentation

- [System Architecture](./docs/architecture/system-architecture.md)
- [Technology Stack](./docs/architecture/technology-stack.md)
- [Development Roadmap](./docs/implementation/roadmap.md)
- [Module Documentation](./docs/modules/)

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run specific module tests
pnpm --filter backend test src/modules/analyst
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

Built with ❤️ for the artist community to reduce administrative burden and maximize creative time.