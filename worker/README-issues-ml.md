# Issue Classifier ML Pipeline

Complete ML pipeline for predicting issue priority (High/Medium/Low) and tags (database, api, frontend, etc.) from issue text.

## 📁 Files

| File | Purpose | Usage |
|------|---------|-------|
| [`collect_github_data.py`](worker/collect_github_data.py ) | Collect training data from GitHub | Data collection |
| [`train_issue_model.py`](worker/train_issue_model.py ) | Train the ML model | Model training |
| [`issue_classifier.py`](worker/issue_classifier.py ) | Use model for predictions | Inference |
| `models/issue_model.pkl` | Trained model (~100-300 KB) | Model artifact |

## 🚀 Quick Start

### 1. Collect Training Data from GitHub

```powershell
# Set GitHub token (optional, for higher rate limits)
$env:GITHUB_TOKEN="ghp_your_token_here"

# Collect issues from popular repos
cd worker
python collect_github_data.py --repos "facebook/react" "microsoft/vscode" "vercel/next.js" --max-pages 5 --output github_issues.csv
```

**Output:** `github_issues.csv` with ~1500 labeled issues

### 2. Train the Model

```powershell
# Train on collected data
python train_issue_model.py --data github_issues.csv

# Or use seed data (faster, less accurate)
python train_issue_model.py
```

**Output:** `models/issue_model.pkl` (~100-300 KB)

### 3. Use the Model

```powershell
# Test the model
python issue_classifier.py --test

# Classify single issue
python issue_classifier.py --analyze "Database connection timeout"

# Verbose output
python issue_classifier.py --analyze "API returning 500 errors" --verbose
```

**Output:**
```json
{
  "priority": "high",
  "priority_confidence": 0.92,
  "tags": ["database", "backend"],
  "all_tag_scores": {
    "database": 0.87,
    "backend": 0.73
  }
}
```

## 📊 CSV Format

The training data CSV should have these columns:

```csv
text,priority,tags
"Database connection timeout",high,"database|backend"
"Add dark mode option",low,"ui|frontend|feature"
"API 500 errors",high,"api|backend|bug"
```

- **text**: Issue title + description
- **priority**: "high", "medium", or "low"
- **tags**: Pipe-separated tags (e.g., "database|backend|bug")

## 🔧 Configuration

### GitHub Data Collection

```powershell
python collect_github_data.py `
  --repos "owner/repo1" "owner/repo2" `  # Repos to scrape
  --max-pages 10 `                        # 100 issues per page
  --output custom_issues.csv `            # Output file
  --state all                             # all, open, or closed
```

**Rate Limits:**
- Without token: 60 requests/hour
- With token: 5000 requests/hour
- Get token: https://github.com/settings/tokens (public_repo scope)

### Model Training

```powershell
# Train on custom data
python train_issue_model.py --data my_issues.csv

# Use seed data (27 samples, good for testing)
python train_issue_model.py
```

**Model Stats:**
- Size: ~100-300 KB
- Training time: 1-10 seconds
- Inference: 1-5 ms per prediction
- Accuracy: 85-90% (depends on training data quality)

### Inference

```powershell
# Fast preprocessing (recommended for production)
python issue_classifier.py --analyze "issue text"

# spaCy preprocessing (slower, slightly more accurate)
python issue_classifier.py --analyze "issue text" --spacy

# Show debug info
python issue_classifier.py --analyze "issue text" --verbose
```

## 🏗️ Architecture

### Data Flow

```
1. Data Collection
   GitHub API → collect_github_data.py → github_issues.csv

2. Training
   github_issues.csv → train_issue_model.py → models/issue_model.pkl

3. Inference
   Issue text → issue_classifier.py → {priority, tags}
                      ↓
             Next.js API (/api/issues/classify)
                      ↓
             Frontend (widget UI)
```

### Model Architecture

**Lightweight Pipeline:**
```
Input text
    ↓
Fast preprocessing (regex + stopwords)
    ↓
TF-IDF (200 features, unigrams + bigrams)
    ↓
Naive Bayes (fast, no GPU needed)
    ↓
Output: {priority, tags, confidence}
```

**Features:**
- ✅ Tiny model size (~100-300 KB vs 500+ MB for BERT)
- ✅ Fast inference (~1-5 ms vs 50-200 ms for transformers)
- ✅ Runs on serverless (Vercel, AWS Lambda)
- ✅ No GPU required
- ✅ Works offline

## 📦 Dependencies

Already in [`requirements.txt`](worker/requirements.txt ):
```txt
scikit-learn>=1.0.0
pandas>=1.3.0
numpy>=1.20.0
spacy>=3.0.0
requests>=2.25.0
python-dotenv>=0.19.0
```

Install spaCy model:
```powershell
python -m spacy download en_core_web_sm
```

## 🔗 Integration with Next.js

See [`client/app/api/issues/classify/route.ts`](client/app/api/issues/classify/route.ts ) for API integration:

```typescript
// Frontend calls this API
const response = await fetch("/api/issues/classify", {
  method: "POST",
  body: JSON.stringify({ text: "Database timeout" })
})

const result = await response.json()
// { priority: "high", tags: ["database", "backend"], ... }
```

## 📈 Improving Model Accuracy

### 1. Collect More Data
```powershell
# Scrape 10+ repos with 1000+ issues each
python collect_github_data.py --repos `
  "facebook/react" `
  "microsoft/vscode" `
  "vercel/next.js" `
  "supabase/supabase" `
  "prisma/prisma" `
  --max-pages 20
```

### 2. Balance Dataset
```python
# Check distribution
import pandas as pd
df = pd.read_csv("github_issues.csv")
print(df['priority'].value_counts())

# Undersample majority class or oversample minority
```

### 3. Add Domain-Specific Data
- Collect issues from repos in your domain (e.g., database tools, web frameworks)
- Add manually labeled examples for edge cases
- Use active learning: deploy → collect corrections → retrain

### 4. Tune Hyperparameters
In `train_issue_model.py`:
```python
TfidfVectorizer(
    max_features=500,     # Try 200-1000
    ngram_range=(1, 3),   # Try (1,2) or (1,3)
    min_df=2,             # Try 1-5
    max_df=0.8            # Try 0.7-0.9
)
```

## 🧪 Testing

```powershell
# Test model with sample issues
python issue_classifier.py --test

# Measure inference speed
Measure-Command { python issue_classifier.py --analyze "test issue" }

# Check model size
ls models/issue_model.pkl
```

## 🐛 Troubleshooting

**Model not found error:**
```powershell
python train_issue_model.py  # Create the model first
```

**GitHub rate limit exceeded:**
```powershell
$env:GITHUB_TOKEN="your_token"  # Get higher rate limit
```

**spaCy model not found:**
```powershell
python -m spacy download en_core_web_sm
```

**Out of memory during training:**
```python
# Reduce max_features in train_issue_model.py
TfidfVectorizer(max_features=100)  # Instead of 200
```

## 📝 Example Workflows

### Workflow 1: Quick Start (Seed Data)
```powershell
cd worker
python train_issue_model.py           # Train on 27 seed examples
python issue_classifier.py --test     # Test the model
```

### Workflow 2: GitHub Data (Production)
```powershell
cd worker

# 1. Collect data (3000+ issues)
python collect_github_data.py --repos `
  "facebook/react" "microsoft/vscode" "vercel/next.js" `
  --max-pages 10 --output github_issues.csv

# 2. Train model
python train_issue_model.py --data github_issues.csv

# 3. Test
python issue_classifier.py --test

# 4. Use in API (see Next.js integration)
```

### Workflow 3: Continuous Improvement
```powershell
# 1. Initial training
python train_issue_model.py --data initial_data.csv

# 2. Deploy to production
# 3. Collect user corrections in database

# 4. Export corrections
# 5. Combine with original data
python -c "import pandas as pd; pd.concat([
  pd.read_csv('initial_data.csv'),
  pd.read_csv('user_corrections.csv')
]).to_csv('combined.csv', index=False)"

# 6. Retrain
python train_issue_model.py --data combined.csv

# 7. Deploy updated model
```

## 🎯 Next Steps

1. ✅ Train model with real GitHub data
2. ✅ Integrate with Next.js API (see `/api/issues/classify`)
3. ⬜ Add AI predictions to issues widget UI
4. ⬜ Collect user feedback for model improvement
5. ⬜ Set up monthly retraining pipeline

---

**Questions?** Check the code comments or test with `--verbose` flag for debugging!
