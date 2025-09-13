# Google Custom Search API Setup

## 🔧 Setup Instructions

### Step 1: Get Google Custom Search API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Custom Search API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Custom Search API"
   - Click "Enable"
4. Create API credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the API key

### Step 2: Create Custom Search Engine
1. Go to [Google Custom Search Engine](https://cse.google.com/cse/)
2. Click "Add" to create a new search engine
3. Configure your search engine:
   - **Sites to search**: `*` (to search the entire web)
   - **Name**: "OPPO Art Opportunities Search"
   - **Language**: English
4. After creation, click "Control Panel"
5. Go to "Setup" tab
6. Copy the **Search engine ID** (cx parameter)

### Step 3: Configure Environment Variables
Add these to your `.env` file:

```bash
# Google Custom Search API Configuration (standardized names)
GOOGLE_SEARCH_API_KEY="your_api_key_here"
GOOGLE_SEARCH_ENGINE_ID="your_search_engine_id_here"
```

> **Note:** The old environment variable name `GOOGLE_CUSTOM_SEARCH_API_KEY` is still supported for backward compatibility, but `GOOGLE_SEARCH_API_KEY` is now the preferred standard name.

### Step 4: Test the Configuration
Restart your backend server and try generating queries. You should see:
```
🔍 Google Custom Search: "your query here"
✅ Google Custom Search found X results
```

## 📊 API Limits
- **Free tier**: 100 searches per day
- **Paid tier**: $5 per 1,000 queries (up to 10k/day)

## ❌ Troubleshooting

**Error: "API not configured"**
- Check that both `GOOGLE_SEARCH_API_KEY` and `GOOGLE_SEARCH_ENGINE_ID` are set

**Error: "403 Forbidden"**
- API key is invalid or Custom Search API is not enabled
- Check billing is enabled for paid usage

**Error: "400 Bad Request"**
- Search engine ID (cx parameter) is incorrect

**No results returned**
- Your custom search engine might be restricted to specific sites
- Set sites to search to `*` for web-wide search
