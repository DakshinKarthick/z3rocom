# Sumy Session Summarizer Integration

This document explains the session summarization setup using Sumy and how to run it.

## Overview

The summarization system automatically generates a concise summary of session messages when a session ends. It uses the **Sumy library** with the **LexRank algorithm** to extract key sentences from the conversation transcript.

## Architecture

```
Client (Next.js)
    ↓
/api/summarize (Route Handler)
    ↓
summarizer_worker.py (Python Worker)
    ↓
Sumy (LexRank Algorithm)
```

## Setup Steps

### 1. Install Python Dependencies

Navigate to the `worker` directory and install required packages:

```bash
cd worker
pip install -r requirements.txt
```

This installs:
- **sumy** - Automatic text summarization library
- **nltk** - Natural language toolkit (required by Sumy)

### 2. Download NLTK Data

After installation, download required NLTK models:

```bash
python -m nltk.downloader punkt stopwords
```

This downloads:
- **punkt** - Sentence tokenizer for English
- **stopwords** - Common English stopwords for filtering

## How It Works

### 1. User Ends Session

When a user clicks `/end` command or triggers session end in the UI, the `handleSessionEnd` function in `session/page.tsx`:
- Extracts all user and assistant messages from the session
- Formats them as "Author: Message" for context
- Calls `/api/summarize` with the message list

### 2. API Endpoint

The `/api/summarize` route handler (`client/app/api/summarize/route.ts`):
- Receives the messages array
- Spawns a Python subprocess with `summarizer_worker.py`
- Passes messages as JSON to the worker
- Returns the generated summary to the client

### 3. Python Worker

The `summarizer_worker.py` script:
- Receives messages via `--summarize-json` argument
- Joins messages into a single text document
- Uses Sumy's **LexRankSummarizer** to extract key sentences
- Returns JSON with summary and metadata

### 4. Outcome Display

The summary is stored in the outcome data and displayed on the outcome page with:
- Summary section showing the generated text
- Included in exported markdown for documentation

## Usage

### Manual Testing

To test the summarizer independently:

```bash
python worker/summarizer_worker.py --summarize-json '{
  "messages": [
    "We discussed the project architecture today",
    "Decided to use React for the frontend",
    "Backend will be Node.js with Express"
  ],
  "max_sentences": 5
}'
```

### In Session

1. Start a session in `/session`
2. Add messages through the chat interface
3. Click `/end` to finish the session
4. Wait for summarization to complete
5. View the summary on the `/outcome` page

## Configuration

### Message Filtering

The client filters out empty/short messages before sending:
- Filters: `message.trim().length > 0`
- Messages < 10 characters are ignored during summarization

### Summary Length

Default: **5 sentences**

Customize by passing `max_sentences` (1-10):

```typescript
summarizeSession(messages, 10)  // Get up to 10 sentences
```

## Troubleshooting

### "Worker script not found"
- Ensure `worker/summarizer_worker.py` exists
- Check the CWD in the route handler

### "sumy not installed"
- Run: `pip install -r requirements.txt`
- Verify: `pip list | grep sumy`

### Summary is Empty
- Ensure messages are not all very short
- Check that messages have content (no just punctuation)

### NLTK Data Missing
- Error: `Resource punkt not found`
- Fix: `python -m nltk.downloader punkt stopwords`

## Performance Notes

- Summarization takes 1-3 seconds for typical sessions
- Longer sessions (50+ messages) may take 5+ seconds
- The process is non-blocking (async) to not freeze the UI

## Future Enhancements

- Store summaries in Supabase for session history
- Allow custom summary length per user preference
- Support multiple summarization algorithms (TextRank, SumBasic)
- Add summary confidence scoring
- Auto-tag main topics in summary
