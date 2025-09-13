
# **Development Report for an Autonomous Opportunity Agent for Artists**

## **Introduction: Designing an Autonomous Creative Opportunity Agent**

This report presents a comprehensive technical roadmap for developing a local application to automate an artist's monthly competition, award, and exhibition application process. The project's main goal is to design an intelligent and autonomous "agent" system that relieves the artist's administrative burden, providing valuable time to focus on creative work. The presented architecture is built on three fundamental pillars for project success:

* **Modularity:** The system is designed as a collection of independent yet interoperable services (Sentinel, Analyst, etc.) to ensure ease of maintenance and scalability.
* **Locally-Focused Intelligence:** To maximize privacy and personalization of the artist's data, AI and data processing operations running on the user's own device are prioritized. This approach directly addresses the need for a personal and trusted agent.
* **Sustainability:** Learning from the artist's previous Notion-based system failure, foundations are laid for a system that is resilient to changing web technologies and sustainable in the long term.

---

## **Section 1: High-Level System Architecture: A Modular Blueprint**

This section presents the application's macro-level design as an interconnected system composed of specialized modules. At the center of the architecture will be a structure showing data flow between components.

### **1.1. Five Core Modules**

The application will consist of five main modules, each responsible for specific tasks:

* **Orchestrator (Agent Core):** The system's central nervous system. Responsible for scheduling tasks, managing workflows, and coordinating between other modules.
* **Sentinel (Scanning and Data Collection Module):** The agent's sensory input. Tasked with discovering and extracting raw data from various web sources.
* **Analyst (Semantic Matching and Filtering Engine):** The agent's cognitive core. Evaluates the relevance of found opportunities against the artist's profile.
* **Archivist (Data Storage and Management Layer):** The agent's long-term memory. Responsible for data storage, deduplication, and integrity.
* **Liaison (User Interface and External Integrations):** The interface through which the agent communicates with the artist (via user interface) and external systems (like Notion).

### **1.2. Core Framework Selection: NestJS over Express.js**

**NestJS** framework is strongly recommended for this project's backend infrastructure. While Express.js is a strong option, its "unopinionated" structure leaves all architectural design burden on the developer.1 This situation poses a significant risk for inconsistency and maintenance difficulties in a complex, multi-module "agent" system.1

In contrast, NestJS offers an opinionated and modular architecture out of the box, heavily inspired by Angular. It supports features like Dependency Injection (DI), modular structure, and strong TypeScript integration as first-class citizens.2 This structure directly aligns with the proposed five-module design and makes it a superior choice by creating a scalable and sustainable foundation for an application of this complexity.1

### **1.3. Open Source Ecosystem Integration**

The open-source projects researched by the user are not a random selection but form an almost complete blueprint for a modern AI-driven automation system when combined. For example, JobSpy and Huginn represent automation and agent concepts, Firecrawl and ScrapeGraphAI modern AI-supported web scraping capabilities, Resume-Matcher and NaturalLanguageRecommendations fundamental matching logic, and LlamaIndex the advanced agent-based reasoning layer. These projects naturally integrate into the Sentinel, Analyst, and Orchestrator modules, forming the system's building blocks. The table below summarizes these projects' roles in the proposed architecture.

**Table 1: Open Source Project Integration Matrix**

| Project Name | Core Function | Key Technology | Target Module |
| :---- | :---- | :---- | :---- |
| crawl4ai/firecrawl | Converting websites to clean, LLM-ready Markdown/JSON format. | Python/API | **Sentinel Module** |
| ScrapeGraphAI/Scrapegraph-ai | Structured data extraction using LLM with natural language prompts. | Python/Playwright | **Sentinel Module** |
| srbhr/Resume-Matcher | Matching a profile (resume) with a description (job posting) using AI. | Python/FastAPI | **Analyst Engine (Architectural Pattern)** |
| huginn/huginn | Event-driven automation agent framework. | Ruby on Rails | **Orchestrator (Architectural Pattern)** |
| run-llama/LlamaIndexTS | Framework for building agent-based RAG applications on data. | TypeScript | **Orchestrator (Core Implementation)** |
| pedramamini/RSSidian | RSS feed monitoring and integration. | N/A | **Sentinel Module** |

---

## **Section 2: Sentinel Module: Intelligent Web Data Collection**

This section details the technical strategy for collecting opportunity data. The strategy adopts a tiered approach, starting with high-level tools for simple sites and progressing to advanced automation for complex platforms. This layered approach minimizes complexity and cost by using the most appropriate tool for each source type. The system should first attempt to process a URL with the simplest and fastest method, resorting to more complex and resource-intensive methods only upon failure.

### **2.1. Modern Scraping Toolkit: AI-Focused Data Extraction**

Tools that use AI to understand web page structure will be prioritized. This approach is much more resilient than traditional scrapers that rely solely on specific CSS selectors and can break with even the smallest changes in page structure.

* **Firecrawl:** This tool is ideal for the initial data collection layer.4 Its ability to take a URL and return clean, structured Markdown or JSON format significantly reduces development burden. It handles "heavy lifting" like rotating proxies, caching, and JavaScript-blocked content internally. The Node.js library (
  @mendable/firecrawl-js) will be used to scrape art opportunity portals known to have consistent structure like ArtConnect.6
* **ScrapeGraphAI:** This library represents the next level of intelligence.8 Instead of just cleaning a page, it uses a Large Language Model (LLM) to extract specific information with natural language prompts like "extract application deadline, application fee, and eligibility criteria." While the main library is Python-based, this concept can be replicated in Node.js environment using LangChain.js or LlamaIndex.ts by sending scraped HTML content and a structured data extraction prompt to an LLM. This method is excellent for semi-structured pages where page layout can vary.

### **2.2. Precise Browser Automation with Playwright**

For sources that are highly dynamic, require login, or are protected by aggressive bot protection measures like social media, direct scraping is insufficient. At this point, **Playwright** is the recommended tool due to its robust API, cross-browser support, and first-class Node.js integration.10

A strategy of creating "playbook" scripts for specific targets will be followed. For example, a "Twitter Playbook" would include:

1. Launching a browser with persistent authentication to avoid frequent logins.12
2. Navigating to relevant search pages (e.g., searching hashtags like #opencall, #artistopportunity).
3. Implementing infinite scroll logic to load sufficient posts.13
4. Extracting raw text content of posts for later processing by the Analyst Engine.

This approach also considers the challenges of social media scraping, such as rate limiting and the need for local proxies or custom APIs for large-scale operations.12

### **2.3. Source-Specific Strategies**

* **Art Portals (e.g., ArtConnect):** Primary candidates for Firecrawl due to their structured nature.6 The goal is to get full page content and pass it to the Analyst module.
* **Social Media (Twitter/X, Instagram):** These platforms require Playwright. Focus will be on scraping public posts containing relevant keywords. It's acknowledged that third-party APIs may be needed if platforms' defense mechanisms are too strong for simple scripts.15 Strategy will be to extract text and links rather than parsing complex media.
* **Search Engines (Google/Yandex):** Direct scraping is difficult. The strategy here is to use tools like LangChain.js or LlamaIndex.ts that have integrations with search APIs like SerpAPI or Tavily. The Orchestrator agent will generate search queries like "new artist grants for visual art 2025" and use these tools to get a list of relevant URLs, which will then be fed back to the Sentinel module's Firecrawl or Playwright queue.

---

## **Section 3: Analyst Engine: Locally-Focused Semantic Matching**

This section forms the intellectual core of the agent. It details how to go beyond simple keyword matching to ensure nuanced, semantic understanding of relevance while keeping the artist's data private on their local machine. Central to this approach is adopting privacy as a primary architectural principle by preventing the artist's personal data (artist statement, themes, application history, etc.) from being sent to third-party APIs.

### **3.1. Adapting Resume-Matcher Architecture**

The **srbhr/Resume-Matcher** project provides an excellent architectural template for this task.19 Its core logic is to take two documents (a resume and a job posting), transform them into a comparable format (e.g., keyword extraction, skill identification), and calculate a match score. This flow will be directly adapted for artist profile and opportunity details:

* **"Resume" -> "Artist Profile":** The artist's profile will be a structured document containing artist statement, keywords/themes (e.g., "post-humanism", "ecological art"), primary media (e.g., "oil painting", "digital sculpture"), and past exhibitions.
* **"Job Posting" -> "Opportunity Details":** Structured data extracted by the Sentinel module (deadline, description, eligibility, etc.).
* **"Matching Logic" -> "Relevance Scoring":** The engine will produce a relevance score by comparing these two documents.

### **3.2. On-Device Semantic Search with transformers.js**

The key innovation here is performing matching not just by keyword overlap but by semantic similarity. **transformers.js** plays a critical role at this point.21 This library allows AI models to run directly within the Node.js process, without needing an external server or complex setup. This maximizes privacy as the artist's sensitive data never leaves their device.

The process steps will be as follows:

1. **Model Selection:** Select a lightweight, efficient "sentence-transformer" model compatible with transformers.js (e.g., Xenova/all-MiniLM-L6-v2). These models are small enough (~30-100MB) to run in a standard Node.js environment without requiring a special GPU.22
2. **Embedding the Artist Profile:** During setup, the application processes the artist's profile, converting the artist statement and key themes into numerical vectors (embeddings) and storing them.
3. **Embedding Opportunities:** As the Sentinel module collects new opportunities, each opportunity's text description is passed through the same model to create a corresponding embedding.
4. **Calculating Cosine Similarity:** The engine calculates cosine similarity between the artist's profile embedding and each new opportunity's embedding. This gives a score between -1 and 1 (usually 0 to 1) representing semantic relevance. A high score means concepts in the opportunity description are closely related to concepts in the artist's profile, even if they don't use the same words.
5. **Hybrid Scoring:** The final relevance score can be a weighted average of this semantic score with more traditional filters (e.g., does medium match? is artist eligible based on location/career stage?).

---

## **Section 4: Orchestrator: Automating Workflow**

This section details the "brain" that connects all modules, transforming a series of tools into an autonomous and reasoning agent. The system will have a two-tier structure to not only execute a fixed pipeline but also proactively update its knowledge base and dynamically reason over this knowledge base.

### **4.1. Huginn-Inspired Event-Driven Automation**

The **huginn/huginn** project is a system where "agents" produce and consume events in a directed graph.23 Although Huginn is written in Ruby, the architectural pattern is directly applicable. A simple Node.js-specific event emitter or lightweight job queue (like BullMQ if persistence is needed) will be designed to manage workflow:

* A SchedulerAgent emits a SCAN_SOURCES event every 24 hours.
* SentinelModule listens to this event, starts scanning, and emits an OPPORTUNITY_FOUND event for each new item discovered.
* AnalystEngine listens to OPPORTUNITY_FOUND event, processes the item, calculates a relevance score, and emits an OPPORTUNITY_ANALYZED event with scored data.
* ArchivistModule listens to OPPORTUNITY_ANALYZED event and saves the final, scored record to the database.

This discrete, event-driven architecture makes the system highly modular and easy to extend.

### **4.2. Building an Agent-Based RAG System with LlamaIndex.ts**

This is where the system transitions from simple automation to true "agent" behavior. **LlamaIndex.ts** is an ideal framework for this purpose in TypeScript/Node.js environment.24

**Core Concept:** A Retrieval-Augmented Generation (RAG) agent will be created.

1. **Data Retrieval and Indexing:** The artist's profile and all high-relevance opportunities stored in the PostgreSQL database by the Archivist are imported into a LlamaIndex vector store. This creates a knowledge base the agent can query.
2. **Defining Tools:** The agent will be provided with "tools" - functions it can decide to call. This concept is also central to LangChain.27 Example tools:
   * get_upcoming_deadline_opportunities(): A tool that queries the PostgreSQL database to get opportunities with deadlines within the next 7 days.
   * search_web(query): A tool that uses a search API to find new information on demand.
   * summarize_opportunity(opportunity_id): A tool that uses an LLM to provide a concise summary of a long opportunity description.
3. **Agent Loop:** The Orchestrator can pose high-level questions to the LlamaIndex agent like "Create a weekly summary of the top 3 most relevant grants for oil painters." The agent autonomously:
   * Understands the question.
   * Decides which tools to use (e.g., query internal knowledge base for relevant grants).
   * Executes the tools.
   * Synthesizes results as a natural language response.

This structure combines a "low-level" automation layer for routine data collection and processing with a "high-level" agent layer providing advanced reasoning and task execution capabilities. This makes the system both proactively autonomous and reactively intelligent.

---

## **Section 5: Archivist: Data Persistence and Integrity**

This section covers the design of the local database that ensures data is stored efficiently, accurately, and without duplication.

### **5.1. Database Selection: PostgreSQL for Cloud-Native Scalability**

For a modern, cloud-deployed application that needs to scale and handle concurrent access, **PostgreSQL** is the optimal choice. PostgreSQL provides enterprise-grade reliability, excellent performance, and advanced features like JSON columns, full-text search, and vector extensions that are essential for AI-powered applications.

Cloud hosting on Railway provides automatic backups, scaling, and managed database operations, making PostgreSQL the superior choice for production deployment.

### **5.2. Proposed Database Schema**

A simple, relational schema containing the following tables is recommended:

* ArtistProfile: Stores the artist's statement, keywords, media, etc.
* Opportunities: Main table for storing scraped opportunities. Fields will include: title, institution, description, deadline, url, application_fee, eligibility_criteria, relevance_score, status (e.g., 'new', 'reviewing', 'applying', 'submitted'), and a source_hash.
* Sources: A table linked to Opportunities table to track original URLs where an opportunity was found.

### **5.3. Advanced Deduplication Strategy**

Simple URL-based deduplication is insufficient because the same opportunity can be published on multiple sites. The proposed strategy is to create a canonical hash for each opportunity to identify logical duplicates:

1. When a new opportunity is found, key fields are normalized: title and institution are converted to lowercase and punctuation is removed.
2. Core deadline is extracted ignoring time information.
3. A combined string is created from these normalized fields: lowercasetitle|lowercaseinstitution|YYYY-MM-DD.
4. A stable hash (e.g., SHA-256) of this combined string is created. This will be the source_hash.
5. Before adding a new opportunity, check if an entry with the same source_hash exists in the Opportunities table.
6. If it exists, instead of creating a new record, add the new source URL to the Sources table and associate it with the existing opportunity. This enriches the existing record without creating a duplicate and is one of the best deduplication practices discussed in scraping literature.30

---

## **Section 6: Liaison: User Interface and External Integrations**

This section details the frontend components that make the agent's data accessible and actionable for the artist, and the critical connection with Notion.

### **6.1. Building the Artist's Dashboard with React**

A React-based frontend using a framework like Next.js is recommended.31 The focus will be on selecting best-in-class, specialized libraries for building UI components quickly and effectively.

* **Kanban Board:** A drag-and-drop Kanban board is needed to track application status. **dnd-kit** is the modern and recommended library for this task. Its high performance, accessibility, and flexibility make it superior to older libraries like react-beautiful-dnd.33
* **Calendar View:** A robust calendar component is needed to visualize deadlines. **react-big-calendar** 36 or
  **FullCalendar** 38 are excellent options.
  react-big-calendar is particularly suitable for displaying events and is inspired by Google Calendar, making it a natural choice for this use case.

The user interface should be designed not just as a passive data display tool but as an active feedback channel. When the artist drags an opportunity from the "New" column to the "Not Interested" column on the Kanban board, this action is not just a status update but valuable feedback that the Analyst Engine's recommendation was weak. This interaction creates a "human-in-the-loop" system that allows the system to learn and improve over time. dnd-kit's onDragEnd callback can trigger a function that records this negative feedback, and this data can be used to improve future scoring algorithms.

### **6.2. Seamless Notion Synchronization**

This is a critical requirement to ensure transition from the artist's old workflow. The official **@notionhq/client** JavaScript library will be used.41

Implementation will include the following steps:

1. **Authentication:** Guide the user through creating a Notion integration and providing the API key to the application.
2. **Database Connection:** The user will specify a Notion database they want to synchronize. The application will use the Notion API to read this database's properties.
3. **Two-Way Synchronization Logic:**
   * **Application to Notion:** When a new high-relevance opportunity is saved to the PostgreSQL database, a page is created in the linked Notion database with relevant properties (Title, Deadline, URL, Status).
   * **Notion to Application:** The application periodically queries the Notion database for changes. If the artist updates a page's 'Status' property in Notion (e.g., from "Applying" to "Submitted"), the application detects this change and updates the corresponding record in the PostgreSQL database. This allows the artist to use the interface they're most comfortable with. Notion API documentation provides clear examples for page creation and updating.41

---

## **Section 7: Phased Prototype Development Roadmap**

This section presents a practical, step-by-step plan that breaks the project into manageable phases to make an ambitious goal achievable.

* **Phase 1: Backend Foundation and Core Data Model**
  * Create a new **NestJS** project.
  * Define the **PostgreSQL** database schema using Prisma for type-safe database operations and migrations.
  * Create basic CRUD APIs for manually managing opportunities.
* **Phase 2: Sentinel - Manual Scraping**
  * Implement **Firecrawl** and **Playwright** scripts.
  * Create initial "Playbooks" for 2-3 target websites.
  * Create a simple command-line interface (CLI) command to trigger a scan and populate the database. Scanning is manually triggered at this stage.
* **Phase 3: Analyst - Local Relevance Scoring**
  * Integrate **transformers.js**.
  * Implement logic to embed the artist's profile and incoming opportunities.
  * Add relevance_score column to database and populate it after each scan.
* **Phase 4: Liaison - UI and Notion Synchronization**
  * Create basic **React/Next.js** frontend.
  * Integrate **Kanban board (dnd-kit)** and **Calendar (react-big-calendar)** populating them with data from backend API.
  * Implement **Notion API integration** for one-way synchronization (App -> Notion).
* **Phase 5: Orchestrator - Full Automation**
  * Implement event-driven workflow to automate Scan -> Analyze -> Store pipeline on a schedule.
  * (Optional Advanced) Begin implementing **LlamaIndex.ts** agent for advanced querying and summarization tasks.

---

## **Conclusion: A Sustainable System for Creative Focus**

This report has outlined the architecture of a modular, AI-driven, and privacy-focused system designed to automate an artist's opportunity search and application process. The proposed structure directly responds to the user's needs by combining NestJS's structured infrastructure, on-device semantic analysis provided by transformers.js, and advanced agent capabilities offered by LlamaIndex.ts. This system is not just a tool but a sustainable platform that grows with the artist, freeing them from administrative tasks to focus on their real work: creativity.

**Table 2: Proposed Technology Stack Summary**

| Layer | Proposed Technology | Rationale / Role |
| :---- | :---- | :---- |
| Backend Framework | NestJS | Modular, opinionated architecture provides scalability and ease of maintenance for a complex agent system. |
| Database | PostgreSQL | Cloud-native database with enterprise features, scalability, and managed hosting on Railway. |
| ORM | Prisma / TypeORM | Facilitates database schema management and migrations. |
| Web Scraping | Firecrawl, Playwright | Fast API-based scraping for structured sites and full browser automation for dynamic sites. |
| AI/Semantic Search | transformers.js | Provides on-device, privacy-preserving semantic analysis for matching artist profile with opportunities. |
| Automation/Orchestration | LlamaIndex.ts | Offers event-driven framework for routine data collection and advanced, reasoning RAG agent functionality. |
| Frontend Framework | React (with Next.js) | Industry standard for building modern, component-based user interfaces. |
| UI Components | dnd-kit, react-big-calendar | Modern drag-and-drop functionality for Kanban board and feature-rich event calendar for calendar view. |
| External Integrations | @notionhq/client | Provides seamless two-way synchronization with artist's existing workflow. |
