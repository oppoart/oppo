# Technology Stack

## Overview

This document provides a comprehensive overview of the technology choices for the OPPO system, with detailed rationale for each selection. The stack prioritizes cloud-hosted personal deployment, pluggable architecture, and sustainable maintainability.

## Core Technology Decisions

### Backend Framework: NestJS

**Selection**: NestJS over Express.js

**Rationale**:
- **Opinionated Architecture**: Provides structure and best practices out-of-the-box
- **Modular Design**: Natural fit for our five-module architecture
- **TypeScript First**: Strong typing throughout the application
- **Dependency Injection**: Built-in DI container for better testability
- **Decorator-based**: Clean, declarative programming model
- **Enterprise Ready**: Proven patterns from Angular ecosystem

**Implementation**:
```bash
pnpm add -g @nestjs/cli
nest new oppo-backend
```

### Database: PostgreSQL

**Selection**: PostgreSQL over SQLite/MySQL

**Rationale**:
- **Cloud Native**: Perfect for cloud hosting (Railway, Neon, Supabase)
- **Concurrent Access**: Better for multiple agent processes
- **Advanced Features**: JSON columns, full-text search, vector extensions
- **Scalability**: Handles growth from personal to team use
- **Backup & Recovery**: Built-in cloud backup solutions
- **Performance**: Excellent query optimization and indexing

**Configuration**:
```typescript
{
  type: 'postgresql',
  url: process.env.DATABASE_URL,
  synchronize: false,
  logging: true,
  entities: ['dist/**/*.entity{.ts,.js}'],
  ssl: { rejectUnauthorized: false }
}
```

### ORM: Prisma vs TypeORM

**Selection**: Prisma (recommended) with TypeORM as alternative

**Prisma Advantages**:
- Modern, type-safe database toolkit
- Excellent TypeScript integration
- Intuitive schema definition
- Built-in migrations
- Great developer experience

**TypeORM Advantages**:
- More mature, battle-tested
- Better NestJS integration
- Active Record and Data Mapper patterns
- Broader database support

**Decision Factor**: Choose Prisma for new projects, TypeORM if team has existing expertise

## AI/ML Stack

### Pluggable AI Service Architecture

**Design Pattern**: Port/Adapter pattern for AI service abstraction

**Rationale**:
- **Provider Flexibility**: Easy switching between OpenAI, Hugging Face, local models
- **Performance Testing**: A/B test different providers
- **Cost Optimization**: Choose best price/performance ratio
- **Fallback Support**: Automatic fallback if primary service fails
- **Future Proofing**: Add new AI services without code changes

**Architecture**:
```typescript
// AI Service Port (Interface)
interface AIServicePort {
  generateEmbedding(text: string): Promise<number[]>;
  analyzeRelevance(profile: string, opportunity: string): Promise<AnalysisResult>;
  answerQuery(query: string, context: string[]): Promise<string>;
  getServiceInfo(): ServiceMetrics;
}

// Multiple Adapters
class OpenAIAdapter implements AIServicePort { /* ... */ }
class HuggingFaceAdapter implements AIServicePort { /* ... */ }
class TransformersJSAdapter implements AIServicePort { /* ... */ }

// Service Registry with Performance Tracking
class AIServiceRegistry {
  private services: Map<string, AIServicePort> = new Map();
  private metrics: Map<string, ServiceMetrics> = new Map();
  
  async getBestService(operation: string): Promise<AIServicePort> {
    // Return service based on performance metrics
  }
}
```

**Available AI Service Adapters**:

#### 1. OpenAI Adapter (Recommended)
```typescript
class OpenAIAdapter implements AIServicePort {
  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: "text-embedding-3-small", // $0.02 per 1M tokens
      input: text
    });
    return response.data[0].embedding;
  }
  
  getServiceInfo(): ServiceMetrics {
    return {
      cost: 'low',
      latency: '~200ms',
      quality: 'excellent',
      privacy: 'cloud-processed'
    };
  }
}
```

#### 2. Hugging Face Adapter (Budget Option)
```typescript
class HuggingFaceAdapter implements AIServicePort {
  async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch('https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.HF_TOKEN}` },
      body: JSON.stringify({ inputs: text })
    });
    return response.json();
  }
  
  getServiceInfo(): ServiceMetrics {
    return {
      cost: 'very-low', 
      latency: '~500ms',
      quality: 'good',
      privacy: 'cloud-processed'
    };
  }
}
```

#### 3. Transformers.js Adapter (Privacy Option)
```typescript
class TransformersJSAdapter implements AIServicePort {
  private pipeline: any;
  
  async initialize() {
    this.pipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  
  async generateEmbedding(text: string): Promise<number[]> {
    const output = await this.pipeline(text, {
      pooling: 'mean',
      normalize: true
    });
    return Array.from(output.data);
  }
  
  getServiceInfo(): ServiceMetrics {
    return {
      cost: 'none',
      latency: '~1000ms',
      quality: 'good', 
      privacy: 'local-only'
    };
  }
}
```

### Agent Framework: LlamaIndex.ts

**Selection**: LlamaIndex.ts over LangChain.js

**Rationale**:
- **TypeScript Native**: Built for TypeScript from ground up
- **RAG Focused**: Specialized for retrieval-augmented generation
- **Simpler API**: Less complexity than LangChain
- **Better Documentation**: Clear, comprehensive guides
- **Active Development**: Rapid feature additions

**Alternative**: LangChain.js if needing broader tool ecosystem

## Web Scraping Stack

### Structured Scraping: Firecrawl

**Selection**: Firecrawl for primary scraping

**Features**:
- Clean Markdown/JSON output
- Handles JavaScript rendering
- Built-in proxy rotation
- Automatic retries
- Rate limiting

**Installation**:
```bash
pnpm add @mendable/firecrawl-js
```

### Browser Automation: Playwright

**Selection**: Playwright over Puppeteer/Selenium

**Rationale**:
- **Multi-browser**: Chromium, Firefox, WebKit support
- **Better API**: More intuitive than Puppeteer
- **Auto-wait**: Smart waiting for elements
- **Network Interception**: Full control over requests
- **Parallel Execution**: Built-in test runner

**Key Features**:
```typescript
const features = {
  browsers: ['chromium', 'firefox', 'webkit'],
  headless: true,
  autoWait: true,
  tracing: true,
  screenshots: true
}
```

## Frontend Stack

### Framework: Next.js 15.5

**Selection**: Next.js over Create React App

**Rationale**:
- **Full-stack Framework**: API routes included
- **App Router**: Modern routing with RSC
- **Performance**: Automatic optimizations
- **TypeScript**: First-class support
- **Deployment**: Easy Vercel deployment

**Features Used**:
- App Router
- Server Components
- API Routes
- Image Optimization
- Font Optimization

### UI Components

#### Component Library: shadcn/ui

**Selection**: shadcn/ui over Material-UI/Ant Design

**Rationale**:
- **Copy-Paste Components**: Own your components, no external dependency
- **Tailwind CSS**: Perfect integration with Tailwind styling
- **Radix Primitives**: Built on accessible, unstyled components
- **TypeScript First**: Full TypeScript support out of the box
- **Customizable**: Easy to modify and extend components
- **Modern Design**: Beautiful, modern component designs
- **Tree Shaking**: Only bundle components you actually use

**Installation & Setup**:
```bash
# Initialize shadcn/ui in Next.js project
npx shadcn-ui@latest init

# Add components as needed
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add form
npx shadcn-ui@latest add input
npx shadcn-ui@latest add table
npx shadcn-ui@latest add toast
```

**Key Components for OPPO**:
```typescript
// UI components needed for the app
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { DataTable } from "@/components/ui/data-table";
import { Toast } from "@/components/ui/toast";
```

#### Drag & Drop: @dnd-kit

**Selection**: @dnd-kit over react-beautiful-dnd

**Rationale**:
- **Modern**: Actively maintained
- **Accessible**: WCAG compliant
- **Performant**: Optimized rendering
- **Flexible**: Sortable, droppable, draggable
- **Touch Support**: Mobile-friendly

#### Calendar: react-big-calendar

**Selection**: react-big-calendar over FullCalendar

**Rationale**:
- **React Native**: Built for React
- **Customizable**: Extensive theming
- **Lightweight**: Smaller bundle
- **Google Calendar-like**: Familiar UX

### State Management: Zustand

**Selection**: Zustand over Redux/MobX

**Rationale**:
- **Simplicity**: Minimal boilerplate
- **TypeScript**: Excellent TS support
- **Size**: ~8KB bundle size
- **DevTools**: Redux DevTools compatible
- **Persistence**: Built-in persistence

## Integration Stack

### Notion API: @notionhq/client

**Official SDK Features**:
- Full API coverage
- TypeScript types
- Automatic retries
- Rate limiting
- Pagination handling

### Task Queue: BullMQ

**Selection**: BullMQ over Agenda/Bee-Queue

**Rationale**:
- **Redis-based**: Reliable persistence
- **Feature Rich**: Priority, delays, retries
- **Dashboard**: Bull Board for monitoring
- **TypeScript**: Native TS support
- **Scalable**: Handles thousands of jobs

## Development Tools

### Package Manager: pnpm

**Selection**: pnpm over npm/yarn

**Rationale**:
- **Disk Efficient**: Shared dependency storage
- **Fast**: Parallel installations
- **Strict**: Prevents phantom dependencies
- **Monorepo**: Built-in workspace support

### Testing

#### Unit Testing: Vitest
- Fast, Vite-powered
- Jest-compatible API
- Native ESM support

#### E2E Testing: Playwright Test
- Cross-browser testing
- Parallel execution
- Visual regression

#### API Testing: Supertest
- HTTP assertions
- NestJS integration
- Mock support

### Code Quality

#### Linting: ESLint + Prettier
```json
{
  "extends": [
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "no-console": "warn",
    "@typescript-eslint/explicit-module-boundary-types": "off"
  }
}
```

#### Type Checking: TypeScript 5.9
```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "commonjs",
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

## Infrastructure

### Deployment Options

#### Cloud Hosting: Railway + Vercel

**Backend (Railway)**:
```bash
# Deploy NestJS backend with PostgreSQL
railway login
railway init
railway add postgresql
railway deploy
```

**Frontend (Vercel)**:
```bash
# Deploy Next.js frontend
vercel --prod
```

#### Alternative: Docker Deployment
```dockerfile
FROM node:20.17-alpine
RUN corepack enable pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod
COPY . .
RUN pnpm build
CMD ["pnpm", "start"]
```

### Monitoring

#### Logging: Winston
```typescript
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

#### Metrics: Prometheus + Grafana
- Application metrics
- Scraping success rates
- Performance monitoring

## Security Considerations

### Authentication: Better Auth

**Selection**: Better Auth over NextAuth.js

**Rationale**:
- **TypeScript First**: Built from ground up with TypeScript
- **Modern Architecture**: Uses Web Standards (Web Crypto API)
- **Framework Agnostic**: Works with any framework
- **Better DX**: Superior developer experience
- **Edge Ready**: Optimized for edge computing
- **Type Safety**: Full end-to-end type safety

**Authentication Configuration**:
```typescript
// lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql"
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true
  },
  // No social providers needed - email only
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24 // Update every day
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "artist"
      },
      artistProfile: {
        type: "string",
        required: false
      }
    }
  }
});

export type Session = typeof auth.$Infer.Session;
```

**Client-Side Usage**:
```typescript
// hooks/use-auth.ts
import { useAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL
});

// In components
const { data: session, isPending } = authClient.useSession();
const { signIn, signOut } = authClient;
```

**Available Authentication Methods**:
1. **Email/Password**: Traditional signup with email verification
2. **Magic Links**: Passwordless email authentication (optional)

**Security Features**:
- **Email Verification**: Required for account activation
- **Password Policies**: Strong password requirements
- **Session Management**: Secure JWT tokens with expiration
- **Rate Limiting**: Built-in brute force protection
- **CSRF Protection**: Automatic CSRF token handling
- **Password Reset**: Secure email-based password recovery

### Data Encryption
- **At rest**: PostgreSQL encryption + encrypted environment variables
- **In transit**: TLS 1.3 for all API communications
- **API Keys**: Encrypted storage for AI service credentials

### API Security
- Rate limiting
- Input validation
- CORS configuration
- Helmet.js middleware

## Performance Optimization

### Backend
- Query optimization with indexes
- Response caching with Redis
- Lazy loading for large datasets
- Connection pooling

### Frontend
- Code splitting
- Lazy loading routes
- Image optimization
- Bundle size monitoring

## Complete Package List

### Core Dependencies
```json
{
  "@nestjs/core": "^11.1.6",
  "@nestjs/common": "^11.1.6",
  "@nestjs/config": "^3.3.0",
  "@nestjs/swagger": "^7.4.2",
  "pg": "^8.12.0",
  "prisma": "^5.20.0",
  "@prisma/client": "^5.20.0"
}
```

### AI/ML Dependencies
```json
{
  "llamaindex": "^0.4.12",
  "openai": "^5.19.1",
  "@ai-sdk/openai": "^2.0.25",
  "@huggingface/inference": "^2.8.1",
  "@xenova/transformers": "^2.18.0"
}
```

### Authentication Dependencies
```json
{
  "better-auth": "^1.3.9",
  "@better-auth/cli": "^1.3.8"
}
```

### Scraping Dependencies
```json
{
  "@mendable/firecrawl-js": "^1.0.8",
  "playwright": "^1.43.1",
  "cheerio": "^1.0.0-rc.12"
}
```

### Frontend Dependencies
```json
{
  "next": "^15.5.2",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "@dnd-kit/core": "^6.1.0",
  "@dnd-kit/sortable": "^8.0.0",
  "react-big-calendar": "^1.13.4",
  "zustand": "^4.5.4",
  "@notionhq/client": "^2.2.15"
}
```

**Safe React 19 Migration Strategy**:
```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.9",
    "@types/react-dom": "^18.3.0"
  }
}
```

### UI Component Dependencies
```json
{
  "@radix-ui/react-dialog": "^1.0.5",
  "@radix-ui/react-dropdown-menu": "^2.0.6",
  "@radix-ui/react-slot": "^1.0.2",
  "@radix-ui/react-toast": "^1.1.5",
  "@radix-ui/react-calendar": "^1.0.0",
  "@radix-ui/react-popover": "^1.0.7",
  "class-variance-authority": "^0.7.0",
  "clsx": "^2.1.1",
  "lucide-react": "^0.379.0",
  "tailwind-merge": "^2.3.0",
  "tailwindcss-animate": "^1.0.7",
  "date-fns": "^3.6.0"
}
```

### Development Dependencies
```json
{
  "typescript": "^5.9.2",
  "@types/node": "^22.7.4",
  "@types/react": "^19.0.0",
  "@types/react-dom": "^19.0.0",
  "vitest": "^2.1.2",
  "@playwright/test": "^1.47.2",
  "eslint": "^9.11.1",
  "eslint-config-next": "^15.5.2",
  "prettier": "^3.3.3",
  "tailwindcss": "^3.4.13",
  "autoprefixer": "^10.4.20",
  "postcss": "^8.4.47"
}
```

## Technology Decision Matrix

| Category | Selected | Alternative | Decision Factor |
|----------|----------|-------------|-----------------|
| Backend Framework | NestJS | Express.js | Structure & Scalability |
| Database | PostgreSQL | SQLite | Cloud-native deployment |
| ORM | Prisma | TypeORM | Developer experience |
| AI Processing | Pluggable (OpenAI default) | Single provider | Flexibility & testing |
| Web Scraping | Firecrawl | Beautiful Soup | JavaScript support |
| Browser Automation | Playwright | Puppeteer | Multi-browser support |
| Frontend | Next.js | Create React App | Full-stack capabilities |
| UI Components | shadcn/ui | Material-UI | Copy-paste components |
| State Management | Zustand | Redux | Simplicity |
| Task Queue | BullMQ | Celery | TypeScript support |
| Testing | Vitest | Jest | Speed & ESM support |
| Authentication | Better Auth | NextAuth.js | TypeScript-first & Modern |
| Deployment | Railway + Vercel | Electron | Always-on cloud hosting |

## Service Performance Monitoring

### AI Service Metrics Dashboard
```typescript
interface ServiceMetrics {
  responseTime: number;     // Average response time in ms
  successRate: number;      // Success rate percentage
  costPerRequest: number;   // Cost in USD per request
  qualityScore: number;     // Relevance accuracy (0-100)
  uptime: number;          // Service availability percentage
}

class AIServiceMonitor {
  async compareServices(): Promise<ServiceComparison> {
    return {
      openai: { responseTime: 200, successRate: 99.5, cost: 0.0001, quality: 95 },
      huggingface: { responseTime: 500, successRate: 97.2, cost: 0.00005, quality: 88 },
      transformers: { responseTime: 1000, successRate: 99.9, cost: 0, quality: 85 }
    };
  }
}
```

## Migration Path

### From Local to Cloud Deployment
1. **Database Migration**: Export SQLite → Import to PostgreSQL
2. **AI Service Setup**: Configure multiple AI service adapters
3. **Cloud Deployment**: Deploy backend to Railway, frontend to Vercel
4. **Performance Testing**: Compare AI services, select optimal configuration
5. **Monitoring Setup**: Enable service performance tracking

## Safe Migration Strategy - Avoiding Breaking Changes

### **Recommended Safe Versions for Production**

To avoid breaking changes while using modern features, use these **battle-tested stable versions**:

#### **Frontend Stack (Safe)**
```json
{
  "next": "^15.0.3",
  "react": "^18.3.1", 
  "react-dom": "^18.3.1",
  "typescript": "^5.6.3",
  "zustand": "^4.5.4"
}
```

#### **Backend Stack (Safe)**
```json
{
  "@nestjs/core": "^10.4.4",
  "@nestjs/common": "^10.4.4",
  "better-auth": "^0.9.3",
  "prisma": "^5.19.1",
  "openai": "^4.67.1"
}
```

### **Migration Timeline**

#### **Phase 1: Stable Foundation (Immediate)**
- Use React 18.3.1 (stable, no breaking changes)
- Use Next.js 15.0.3 (stable App Router)
- Use NestJS 10.4.4 (mature, well-tested)

#### **Phase 2: Gradual Upgrades (After 6 months)**
```typescript
// Safe upgrade path
const upgradeSequence = [
  "1. Test React 19 in separate branch",
  "2. Update TypeScript to 5.9 first",
  "3. Migrate to NestJS 11 with compatibility layer",
  "4. Finally upgrade React when ecosystem stabilizes"
];
```

#### **Phase 3: Latest Versions (When Ready)**
- Full React 19 migration after community adoption
- Better Auth V1 when migration guide is solid

### **Breaking Change Mitigation**

#### **React 18 → 19 Safe Path**
```typescript
// Use React 18 compatible patterns
// These work in both React 18 and 19
const SafeComponent = () => {
  // ✅ Safe: Traditional useState
  const [state, setState] = useState(initialValue);
  
  // ✅ Safe: Traditional useEffect
  useEffect(() => {
    // Side effects
  }, [dependencies]);
  
  // ❌ Avoid: New React 19 features initially
  // const [state, setState, isPending] = useOptimistic();
};
```

#### **Next.js 15 Safe Configuration**
```typescript
// next.config.js - Safe configuration
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Don't enable experimental features initially
    turbo: false, // Use stable bundler first
  },
  // Use stable App Router patterns
  typescript: {
    // Strict type checking
    ignoreBuildErrors: false,
  }
};
```

#### **Better Auth Migration Strategy**
```typescript
// Gradual migration from Better Auth 0.9 → 1.x
// 1. Keep current version initially
"better-auth": "^0.9.3"

// 2. Plan migration after documentation stabilizes  
// 3. Test in development first
// 4. Use compatibility layer if available
```

### **AI Service Selection Guide**

| Use Case | Recommended Service | Reasoning |
|----------|--------------------|-----------|
| **Personal Budget** | Hugging Face | Lowest cost (~$2/month) |
| **Best Quality** | OpenAI | Highest accuracy, latest models |
| **Maximum Privacy** | Transformers.js | Local processing only |
| **High Volume** | OpenAI + HF Fallback | Reliability with cost optimization |
| **Experimentation** | All Services | A/B testing capabilities |

### Future Technology Considerations
- **Vector Database**: Pinecone/Weaviate for scaling beyond PostgreSQL pgvector
- **Edge AI**: Local model deployment with Ollama for hybrid approach
- **Multi-modal AI**: Image analysis for opportunity logos/visuals
- **Real-time Updates**: WebSocket connections for live opportunity feeds

## Related Documentation

- [System Architecture](./system-architecture.md)
- [Development Roadmap](../implementation/roadmap.md)
- [Module Documentation](../modules/)