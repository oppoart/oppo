# Sprint 2 - Personal Foundation & Artist Profile

**Duration**: September 9, 2025 - September 23, 2025 (2 weeks)
**Sprint Goal**: Set up foundational infrastructure for personal OPPO - database, single-user profile, and dashboard with settings to enable AI-powered opportunity discovery in Sprint 3

## Sprint Objectives

### Primary Goal
Build personal foundational infrastructure including database setup, single-user authentication, and artist profile management to support OPPO's AI-powered opportunity discovery features.

### Secondary Goals
- Create comprehensive artist profile with skills, interests, and preferences
- Build dashboard with integrated settings panel for configuration
- Establish robust error handling and validation
- Configure production-ready environment setup

## Sprint Backlog

| Story ID | Story Title | Component | Estimate | Priority | Status |
|----------|-------------|-----------|----------|----------|---------|
| FOUND-001 | Database Setup with Prisma (Single User + Profile) | Backend | 4 | High | ✅ Done |
| FOUND-002 | Single User Authentication System (betterAuth) | Backend | 3 | High | ✅ Done |
| FOUND-003 | Artist Profiles API Endpoints (Multi-Profile) | Backend | 4 | High | ✅ Done |
| FOUND-004 | Dashboard with Profile & Settings UI | Frontend | 6 | High | ✅ Done |
| FOUND-005 | Environment Configuration (Dev/Prod) | Backend | 2 | Medium | ✅ Done |
| FOUND-006 | Error Handling & Validation System | Full-Stack | 3 | Medium | Ready |
| FOUND-007 | Basic Testing Setup | Backend | 2 | Low | Ready |

**Total Estimated Points**: 24 points
**Sprint Capacity**: Reduced scope for personal use, focus on Sprint 3 preparation

---

## User Stories

### 🎯 Epic: Personal Foundation

#### FOUND-001: Database Setup with Prisma (Single User + Profile)
**As the** OPPO system  
**I want** a database configured with single user and artist profile models  
**So that** I can store my personal artist information and discovered opportunities  

**Acceptance Criteria:**
- [x] Prisma schema defined with User and ArtistProfile models (1:1 relationship)
- [x] Database connection established (PostgreSQL for production)
- [x] Initial migration created and applied
- [x] Prisma Client integrated in backend
- [x] Database seed script with default user and profile
- [x] Future Opportunity model schema prepared

**Technical Tasks:**
- Set up Prisma in backend package
- Define User model with basic authentication fields
- Define ArtistProfile model with skills, interests, bio, preferences (1:1 with User)
- Define basic Opportunity model structure (for Sprint 3)
- Configure PostgreSQL connection
- Create and run initial migration
- Add database commands to package.json
- Create seed script with default user and artist profile

---

#### FOUND-002: Single User Authentication System
**As the** single user of OPPO  
**I want** simple authentication to access my personal dashboard and settings  
**So that** I can securely manage my profile and OPPO configuration  

**Acceptance Criteria:**
- [x] Email-only login using betterAuth (no password required)
- [x] Session management for authenticated access
- [x] Basic middleware for protected routes
- [x] Logout functionality
- [x] Secure session storage with betterAuth
- [x] Rate limiting for auth endpoints

**Technical Tasks:**
- Create simple login/logout endpoints
- Implement session-based auth (simpler than JWT for single user)
- Add password hashing with bcrypt
- Create auth middleware for protected routes
- Add rate limiting to auth routes
- Store user credentials in database

---

#### FOUND-003: Artist Profiles API Endpoints (Multi-Profile)
**As the** OPPO system  
**I want** API endpoints to manage multiple artist profiles per user  
**So that** different artistic mediums/themes can have dedicated profiles for targeted opportunity matching  

**Acceptance Criteria:**
- [x] GET /api/profiles - Get all artist profiles for user
- [x] GET /api/profiles/:id - Get specific artist profile
- [x] POST /api/profiles - Create new artist profile
- [x] PUT /api/profiles/:id - Update specific artist profile
- [x] DELETE /api/profiles/:id - Delete artist profile
- [x] Profile categories (generative art, textile art, new media art, AI art, etc.)
- [x] Each profile has independent skills, interests, artist statement
- [x] Input validation for all profile data
- [x] Structured response format

**Technical Tasks:**
- Update database schema for one-to-many User -> ArtistProfile relationship
- Create profiles router and controller for CRUD operations
- Implement profile categorization (medium/theme types)
- Add independent skills and interests per profile
- Add artist statement field per profile
- Integrate with updated Prisma models
- Add input validation with Zod for multi-profile structure
- Test all profile endpoints
- Document API responses

---

### 🖥️ Epic: Personal Interface

#### FOUND-004: Multi-Profile Dashboard & Management UI
**As the** single user  
**I want** a comprehensive dashboard to manage multiple artist profiles and settings  
**So that** I can organize different artistic mediums/themes and configure OPPO for targeted opportunity matching  

**Acceptance Criteria:**
- [x] Main dashboard with overview of all artist profiles
- [x] Profile grid/list view showing profile categories (generative art, textile art, new media art, AI art, etc.)
- [x] Create new profile functionality with mediums selection (multi-select)
- [x] Individual profile editing interface for each artistic medium/theme
- [x] Per-profile skills management (add/remove skills with tags)
- [x] Per-profile interests/focus areas management
- [x] Per-profile artist statement editing
- [x] Per-profile bio editing
- [x] Per-profile website links management
- [x] Profile switching/selection interface
- [x] Settings panel for OPPO configuration (API keys, preferences)
- [x] Responsive design for mobile access
- [x] Multi-medium support (users can select multiple mediums per profile)
- [x] Clean, simplified UI with subtitle removal and location removal

**Technical Tasks:**
- Set up shadcn/ui component library
- Create main dashboard layout with profile overview grid using shadcn Card components
- Build profile creation flow with category selection using shadcn Form/Select components
- Implement profile switching interface using shadcn Tabs or Select components
- Build individual profile editing interface with shadcn forms
- Implement per-profile skills/interests tag management using shadcn Badge/Input components
- Add per-profile artist statement editor using shadcn Textarea
- Create settings panel using shadcn components (Sheet, Form, Input)
- Add form validation with react-hook-form + zod integration for multi-profile structure
- Use shadcn dashboard templates as foundation
- Make responsive for mobile access
- Add profile completion progress per profile using shadcn Progress component
- Integrate with updated multi-profile backend API
- Add settings for future Sprint 3 features (API keys, notification preferences)

---

### 🔧 Epic: Configuration & Reliability

#### FOUND-005: Environment Configuration (Dev/Prod)
**As a** developer  
**I want** proper environment configuration for different deployment stages  
**So that** OPPO runs securely and reliably in development and production  

**Acceptance Criteria:**
- [x] Environment variables for all configuration
- [x] Database connection strings per environment
- [x] Admin credentials management
- [x] API keys configuration (for future Sprint 3)
- [x] Logging levels per environment
- [x] CORS configuration
- [x] Production security settings
- [x] Environment validation with Zod schemas
- [x] Automatic environment validation on startup
- [x] Environment setup and validation scripts
- [x] Comprehensive documentation and examples for all environments

**Technical Tasks:**
- Create environment variable schemas
- Set up development environment config
- Configure production environment settings
- Add environment validation on startup
- Document all required environment variables
- Test deployment configurations
- Add environment health checks

---

#### FOUND-006: Error Handling & Validation System
**As the** OPPO system  
**I want** comprehensive error handling and validation  
**So that** the application is robust and provides clear feedback  

**Acceptance Criteria:**
- [ ] Input validation using Zod schemas
- [ ] Consistent error response format
- [ ] Graceful error handling for database operations
- [ ] Client-side error boundaries
- [ ] Request logging for debugging
- [ ] Validation feedback in UI forms

**Technical Tasks:**
- Implement Zod validation schemas for all inputs
- Create error handling middleware
- Add request/response logging
- Create error response standards
- Add client-side error boundaries
- Test error scenarios
- Document error handling patterns

---

#### FOUND-007: Basic Testing Setup
**As a** developer  
**I want** basic testing infrastructure  
**So that** core functionality remains reliable during development  

**Acceptance Criteria:**
- [ ] Jest setup for backend testing
- [ ] Basic API endpoint tests
- [ ] Database operation tests
- [ ] React Testing Library for frontend
- [ ] Test utilities and helpers
- [ ] CI-ready test configuration

**Technical Tasks:**
- Set up Jest testing framework
- Create test database configuration
- Write basic tests for profile API
- Add frontend component tests
- Create test utilities
- Configure test scripts
- Add basic CI test automation

---

## Technical Architecture

### Database Schema (Prisma)
```prisma
model User {
  id        String          @id @default(cuid())
  email     String          @unique
  name      String?         // User name for betterAuth
  emailVerified Boolean     @default(false) // For betterAuth
  image     String?         // For betterAuth
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt
  profiles  ArtistProfile[] // One-to-many relationship
  accounts  Account[]       // For betterAuth
  sessions  Session[]       // For betterAuth
  
  @@map("users")
}

model ArtistProfile {
  id            String   @id @default(cuid())
  userId        String   
  name          String   // Profile name (e.g., "Generative Art", "Textile Art", "AI Art")
  category      String   // Profile category/medium (e.g., "generative-art", "textile-art", "new-media-art", "ai-art")
  artistStatement String? // Per-profile artist statement
  bio           String?  // Per-profile bio
  skills        String[] // Array of skills specific to this profile
  interests     String[] // Areas of interest specific to this profile
  experience    String?  // Experience level for this medium (e.g., "Emerging", "Mid-career", "Established")
  location      String?  // Current location
  website       String?  // Profile-specific website
  portfolioUrl  String?  // Profile-specific portfolio URL
  preferences   Json?    // Opportunity preferences for this profile (funding amounts, locations, etc.)
  isActive      Boolean  @default(true) // Whether this profile is active for opportunity matching
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("artist_profiles")
}

// Future Sprint 3+ models:
model Opportunity {
  id           String   @id @default(cuid())
  title        String
  description  String
  url          String
  deadline     DateTime?
  amount       String?
  location     String?
  tags         String[]
  source       String   // Website scraped from
  discoveredAt DateTime @default(now())
  relevanceScore Float? // AI-calculated relevance
  applied      Boolean  @default(false)
  
  @@map("opportunities")
}

model OpportunityMatch {
  id            String      @id @default(cuid())
  opportunityId String
  matchScore    Float       // AI-calculated match score
  reasoning     String?     // AI reasoning for the match
  createdAt     DateTime    @default(now())
  opportunity   Opportunity @relation(fields: [opportunityId], references: [id])
  
  @@map("opportunity_matches")
}
```

### API Endpoints
```
# Health & Status
GET    /api/health            - System health check

# Single User Authentication
POST   /api/auth/login        - User login
POST   /api/auth/logout       - User logout
GET    /api/auth/me           - Get current user info

# Artist Profiles Management (Multi-Profile)
GET    /api/profiles          - Get all artist profiles for user
GET    /api/profiles/:id      - Get specific artist profile
POST   /api/profiles          - Create new artist profile
PUT    /api/profiles/:id      - Update specific artist profile
DELETE /api/profiles/:id      - Delete artist profile
PUT    /api/profiles/:id/settings - Update profile-specific settings
```

### Component Architecture
```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── form.tsx
│   │   ├── tabs.tsx
│   │   ├── sheet.tsx
│   │   ├── badge.tsx
│   │   ├── progress.tsx
│   │   ├── dialog.tsx
│   │   └── ...          # Other shadcn components
│   ├── auth/            # Authentication components
│   │   ├── LoginForm.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── AuthProvider.tsx
│   ├── dashboard/       # Main dashboard components
│   │   ├── Dashboard.tsx
│   │   ├── ProfileSection.tsx
│   │   ├── SettingsPanel.tsx
│   │   └── StatsOverview.tsx
│   ├── profile/         # Profile management
│   │   ├── ProfileForm.tsx
│   │   ├── SkillsManager.tsx
│   │   ├── InterestsManager.tsx
│   │   └── ProfileProgress.tsx
│   ├── settings/        # Settings components
│   │   ├── GeneralSettings.tsx
│   │   ├── APIKeysSettings.tsx
│   │   └── NotificationSettings.tsx
│   └── layout/          # Layout components
│       ├── Header.tsx
│       ├── Navigation.tsx
│       └── Layout.tsx
├── hooks/               # Custom React hooks
│   ├── useAuth.ts
│   ├── useProfile.ts
│   ├── useSettings.ts
│   └── useApi.ts
├── services/            # API service layer
│   ├── auth.ts
│   ├── profile.ts
│   ├── settings.ts
│   └── api.ts
├── lib/                 # shadcn/ui utilities
│   └── utils.ts
└── utils/               # Utility functions
    ├── validation.ts
    ├── auth.ts
    └── api.ts
```

---

## Definition of Done

### Backend Tasks
- [ ] Code implemented and tested
- [ ] Database migrations applied
- [ ] API endpoints working and documented
- [ ] Basic tests written and passing
- [ ] Error handling implemented
- [ ] Environment configuration complete

### Frontend Tasks
- [ ] Components implemented and styled
- [ ] Responsive design verified
- [ ] Form validation working
- [ ] Integration with backend verified
- [ ] Error states handled
- [ ] Mobile-friendly interface

### Configuration Tasks
- [ ] Environment variables documented
- [ ] Development environment working
- [ ] Production deployment ready
- [ ] Database connection stable
- [ ] Basic security measures in place

---

## Sprint Risks

### Low Priority Risks (Simplified Scope)

1. **Database Setup Complexity**
   - *Risk*: PostgreSQL configuration issues
   - *Mitigation*: Start simple, use managed database service
   - *Owner*: Backend Developer

2. **Profile Data Structure**
   - *Risk*: Unclear requirements for opportunity matching
   - *Mitigation*: Keep flexible JSON fields, iterate based on Sprint 3 needs
   - *Owner*: Full-Stack Developer

---

## Dependencies

### External Dependencies
- PostgreSQL database (local for dev, managed service for production)
- shadcn/ui component library
- React Hook Form + Zod for form handling
- Radix UI primitives (via shadcn)
- Environment configuration

### Internal Dependencies
- Sprint 1 monorepo foundation must be stable
- Shared type definitions from packages/shared

---

## Success Metrics

### Functional Metrics
- [ ] Artist profile creation and editing working
- [ ] Simple admin access functioning
- [ ] Database operations stable
- [ ] API endpoints responding <200ms
- [ ] UI responsive on desktop and mobile

### Quality Metrics
- [ ] Basic test coverage for critical paths
- [ ] Zero database connection issues
- [ ] Clean error handling throughout
- [ ] Mobile interface fully functional

---

## Sprint 3 Preparation

### Sprint 3 Scope (Opportunity Discovery Engine)
- Firecrawl API integration for web scraping
- OpenAI API integration for opportunity analysis
- Opportunity matching algorithm using artist profile
- Basic opportunity dashboard and tracking
- Automated opportunity discovery workflows
- Email/notification system for new matches

### Technical Preparation
- Artist profile data will drive AI matching
- Opportunity models ready for Sprint 3 implementation
- Clean API structure for adding discovery features
- Environment ready for external API integrations

---

## Notes

### Development Approach
- Keep it simple - this is a personal tool
- Use shadcn/ui for consistent, beautiful design system
- Leverage existing dashboard templates and components
- Focus on functionality over complex auth
- Prepare foundation for exciting Sprint 3 features
- Mobile-first design for on-the-go access

### Future Considerations
- Sprint 3 will add the core OPPO magic (AI + scraping)
- Profile data structure should support AI matching
- Keep opportunity model flexible for various grant/residency types
- Consider notification preferences in profile

This simplified sprint focuses on essential foundation while preparing for the exciting AI-powered opportunity discovery features in Sprint 3.