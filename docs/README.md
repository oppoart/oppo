# OPPO - Autonomous Opportunity Agent for Artists

## Project Overview

OPPO (Autonomous Opportunity Agent) is a modular, AI-driven, and privacy-focused system designed to automate an artist's opportunity search and application process. The system relieves artists from administrative burden, providing valuable time to focus on creative work.

## Documentation Structure

### 📋 [Introduction & Overview](./introduction.md)
Project goals, core principles, and system benefits.

### 🏗️ Architecture Documentation

- **[System Architecture](./architecture/system-architecture.md)** - High-level system design and module overview
- **[Technology Stack](./architecture/technology-stack.md)** - Detailed technology choices and rationale

### 🔧 Module Documentation

- **[Orchestrator Module](./modules/orchestrator.md)** - Agent core and workflow automation
- **[Sentinel Module](./modules/sentinel.md)** - Web scraping and data collection
- **[Analyst Module](./modules/analyst.md)** - Semantic matching and relevance scoring
- **[Archivist Module](./modules/archivist.md)** - Data persistence and management
- **[Liaison Module](./modules/liaison.md)** - User interface and external integrations

### 📊 Implementation

- **[Development Roadmap](./implementation/roadmap.md)** - Phased development plan
- **[Database Schema](./implementation/database-schema.md)** - Data model and structure
- **[Integration Guide](./implementation/integrations.md)** - External service integrations

## Quick Start

Start with the [Introduction](./introduction.md) to understand the project's vision, then explore the [System Architecture](./architecture/system-architecture.md) for technical overview.

## Core Features

- **Modular Architecture** - Independent, interoperable services
- **Privacy-First** - On-device AI processing and local data storage
- **Intelligent Matching** - Semantic analysis for opportunity relevance
- **Automated Workflow** - Event-driven automation system
- **Seamless Integration** - Notion synchronization and external APIs

## Technology Highlights

- **Backend**: NestJS with TypeScript
- **Database**: SQLite for local storage
- **AI/ML**: transformers.js for on-device processing
- **Automation**: LlamaIndex.ts for RAG capabilities
- **Frontend**: React/Next.js with modern UI components
- **Web Scraping**: Firecrawl and Playwright