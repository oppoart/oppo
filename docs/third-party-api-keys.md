# Third-Party API Keys

This document lists all third-party API keys and credentials required for OPPO, organized by implementation priority.

---

## Phase 1: Immediate/Critical (Active)

These keys are currently in use and required for core functionality:

### AI/LLM
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`

### Search
- `SERPER_API_KEY` (or `SERPER_DEV_API_KEY`)
- `GOOGLE_CUSTOM_SEARCH_API_KEY`
- `GOOGLE_SEARCH_ENGINE_ID`

---

## Phase 2: Short-Term (Planned Features)

These keys are needed for features currently in development or planned for near-term implementation:

### Email Services
- `SENDGRID_API_KEY`
- `RESEND_API_KEY`

### Web Scraping
- `FIRECRAWL_API_KEY`
- `SCRAPINGBEE_API_KEY`

### Social Media (Art Platforms)
- `INSTAGRAM_ACCESS_TOKEN`
- `BEHANCE_API_KEY`
- `DRIBBBLE_ACCESS_TOKEN`

### Professional Networks
- `LINKEDIN_CLIENT_ID`
- `LINKEDIN_CLIENT_SECRET`

### Additional Search
- `BRAVE_SEARCH_API_KEY`
- `BING_SEARCH_KEY`

### Alternative LLM Providers
- `GOOGLE_AI_API_KEY` (Gemini)
- `PERPLEXITY_API_KEY`

---

## Phase 3: Long-Term (Future Expansion)

These keys are for potential future integrations and advanced features:

### AI/LLM Providers
- `COHERE_API_KEY`
- `MISTRAL_API_KEY`
- `TOGETHER_API_KEY`
- `HUGGINGFACE_API_KEY`

### AI Search (Hybrid LLM + Search)
- `YOU_API_KEY` (You.com)
- `PHIND_API_KEY`
- `METAPHOR_API_KEY` (Exa.ai)
- `TAVILY_API_KEY`

### Search Engines
- `YANDEX_SEARCH_API_KEY`
- `DUCKDUCKGO_API_KEY` (Instant Answer API)
- `KAGI_API_KEY`
- `MOJEEK_API_KEY`
- `SERPAPI_KEY`
- `SEARCHAPI_KEY`
- `ZENSERP_API_KEY`

### Advanced Web Scraping
- `APIFY_API_KEY`
- `BRIGHTDATA_API_KEY`
- `OXYLABS_API_KEY`
- `SCRAPERAPI_KEY`
- `PARSEHUB_API_KEY`
- `SCRAPFLY_API_KEY`

### Social Media Platforms
- `FACEBOOK_APP_ID`
- `FACEBOOK_APP_SECRET`
- `FACEBOOK_ACCESS_TOKEN`
- `TWITTER_BEARER_TOKEN`
- `TWITTER_API_KEY`
- `TWITTER_API_SECRET`
- `REDDIT_CLIENT_ID`
- `REDDIT_CLIENT_SECRET`
- `PINTEREST_ACCESS_TOKEN`
- `TIKTOK_API_KEY`
- `YOUTUBE_API_KEY`
- `MASTODON_ACCESS_TOKEN`
- `BLUESKY_API_KEY`
- `THREADS_ACCESS_TOKEN`

### Creative Platforms
- `DEVIANTART_CLIENT_ID`
- `DEVIANTART_CLIENT_SECRET`
- `ARTSTATION_API_KEY` (unofficial)
- `CARGO_API_KEY`

### Professional Networks
- `XING_API_KEY`
- `ANGELLIST_API_KEY`

### Email & Newsletter
- `MAILGUN_API_KEY`
- `POSTMARK_API_KEY`
- `AWS_SES_ACCESS_KEY`
- `AWS_SES_SECRET_KEY`
- `MAILCHIMP_API_KEY`
- `FEEDLY_API_KEY`
- `INOREADER_API_KEY`
- `NEWSAPI_KEY`

### Content Discovery
- `POCKET_CONSUMER_KEY`
- `POCKET_ACCESS_TOKEN`
- `READWISE_API_KEY`

### Data Enrichment
- `CLEARBIT_API_KEY`
- `HUNTER_API_KEY` (email finding)
- `FULLCONTACT_API_KEY`
- `PEOPLEDATALABS_API_KEY`
- `PIPL_API_KEY`

### Geolocation & Maps
- `GOOGLE_MAPS_API_KEY`
- `MAPBOX_API_KEY`

### Translation
- `DEEPL_API_KEY`
- `GOOGLE_TRANSLATE_API_KEY`

---

## Notes

- All Phase 1 keys are required for the system to function properly
- Phase 2 keys should be obtained as their respective features are developed
- Phase 3 keys are optional and can be added based on user needs and feature demand
- Always use environment variables or secure secrets management for production deployments
- Never commit actual API keys to version control
