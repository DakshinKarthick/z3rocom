# Focus Level Worker

A Python worker that uses ML to calculate session focus levels based on chat message content.

## Overview

This worker:
1. Loads a trained Naive Bayes classifier (`focus_model.pkl`)
2. Fetches the last 10 messages from each active session
3. Scores each message as work-focused (1) or casual (0)
4. Computes an exponentially-weighted average
5. Updates `sessions.focus_level` in Supabase

## Setup

### 1. Install Dependencies

```bash
cd worker
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

### 2. Add Your Model

Place your trained model at:
```
worker/models/focus_model.pkl
```

The model should be a scikit-learn Pipeline with TF-IDF + MultinomialNB, trained with:
- Class 0: Casual/fun chat
- Class 1: Work-focused chat

### 3. Configure Environment

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Important:** Use the service-role key (not anon key) to allow updating sessions.

## Usage

### Run Once (All Sessions)
```bash
python focus_worker.py
```

### Run for Specific Session
```bash
python focus_worker.py --session <session-uuid>
```

### Run Continuously (Every 60s)
```bash
python focus_worker.py --loop
```

### Custom Interval
```bash
python focus_worker.py --loop --interval 120
```

## Configuration

Environment variables in `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `SUPABASE_URL` | - | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | - | Service role key for write access |
| `ALPHA` | 0.8 | Exponential decay factor (0-1) |
| `MAX_MESSAGES` | 10 | Number of recent messages to analyze |
| `FOCUS_FLOOR` | 20 | Minimum focus level |
| `FOCUS_CEILING` | 95 | Maximum focus level |

## Algorithm

### Weighted Average Formula

For the last N messages (newest first), with probabilities $p_i$:

$$\text{focus\_level} = 100 \times \frac{\sum_{i=1}^{N} \alpha^{i-1} \cdot p_i}{\sum_{i=1}^{N} \alpha^{i-1}}$$

With $\alpha = 0.8$, recent messages have more weight:
- Message 1 (newest): weight = 1.0
- Message 2: weight = 0.8
- Message 3: weight = 0.64
- Message 10: weight = 0.134

### Preprocessing

Must match training preprocessing:
```python
def preprocess_text(text):
    doc = nlp(str(text))
    tokens = [
        token.lemma_.lower()
        for token in doc
        if not token.is_stop and not token.is_punct
    ]
    return ' '.join(tokens)
```

## Deployment Options

### Option 1: Cron Job
```bash
# Run every 2 minutes
*/2 * * * * cd /path/to/worker && python focus_worker.py
```

### Option 2: Systemd Service
```ini
[Unit]
Description=Z3roCom Focus Worker
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/worker
ExecStart=/usr/bin/python3 focus_worker.py --loop
Restart=always

[Install]
WantedBy=multi-user.target
```

### Option 3: Docker
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt && python -m spacy download en_core_web_sm
COPY . .
CMD ["python", "focus_worker.py", "--loop"]
```

## Database

The worker updates `public.sessions.focus_level` (integer 0-100).

Optionally add this RPC function for efficient active session lookup:

```sql
CREATE OR REPLACE FUNCTION get_active_sessions_for_focus_update(cutoff_time timestamptz)
RETURNS TABLE (id uuid) AS $$
  SELECT DISTINCT s.id
  FROM public.sessions s
  JOIN public.messages m ON m.session_id = s.id
  WHERE m.created_at > cutoff_time
$$ LANGUAGE sql SECURITY DEFINER;
```
