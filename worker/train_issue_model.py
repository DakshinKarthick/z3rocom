"""
Train Issue Priority & Tags Model (LIGHTWEIGHT VERSION)
========================================================
Trains a minimal-size model to predict:
1. Priority: High/Medium/Low
2. Tags: technical categories (e.g., "database", "api", "ui")

Model size: ~100-300 KB (vs 500+ MB for BERT)
Inference: ~1-5ms per prediction

Usage:
    python train_issue_model.py
    python train_issue_model.py --data custom_issues.csv
"""

import pickle
import argparse
from pathlib import Path
import spacy
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.multioutput import MultiOutputClassifier
from sklearn.naive_bayes import MultinomialNB
from sklearn.preprocessing import MultiLabelBinarizer
import pandas as pd

# Load spaCy (using small model for speed)
print("[INFO] Loading spaCy (en_core_web_sm for lightweight processing)...")
nlp = spacy.load('en_core_web_sm', disable=['parser', 'ner'])  # Disable unused components

def preprocess_text(text):
    """Lightweight preprocessing: lemmatize, lowercase, remove stopwords/punct."""
    doc = nlp(str(text))
    tokens = [token.lemma_.lower() for token in doc if not token.is_stop and not token.is_punct]
    return ' '.join(tokens)

# === TRAINING DATA ===
# Minimal seed dataset (expand with GitHub API or Kaggle data)
SEED_DATA = [
    # High priority - bugs, errors, blocking issues
    ("Database connection keeps timing out", "high", ["database", "backend"]),
    ("API endpoint returning 500 errors", "high", ["api", "backend", "bug"]),
    ("Production deployment failed", "high", ["deployment", "critical"]),
    ("Users can't login to the app", "high", ["auth", "critical", "frontend"]),
    ("Payment processing is broken", "high", ["payment", "backend", "critical"]),
    ("Memory leak causing server crashes", "high", ["performance", "backend", "bug"]),
    ("Security vulnerability in auth system", "high", ["security", "auth", "critical"]),
    ("Critical bug in checkout flow", "high", ["bug", "payment", "frontend"]),
    ("Server keeps crashing under load", "high", ["backend", "performance", "critical"]),
    
    # Medium priority - important but not urgent
    ("Need to add pagination to user list", "medium", ["frontend", "feature"]),
    ("API response time is slow", "medium", ["performance", "api", "backend"]),
    ("Improve error messages for validation", "medium", ["ux", "frontend"]),
    ("Add unit tests for payment module", "medium", ["testing", "backend"]),
    ("Refactor authentication middleware", "medium", ["refactor", "backend", "auth"]),
    ("Update documentation for API endpoints", "medium", ["documentation", "api"]),
    ("Optimize database queries", "medium", ["database", "performance"]),
    ("Add loading states to async operations", "medium", ["ui", "frontend", "feature"]),
    ("Slow query performance on reports page", "medium", ["database", "performance"]),
    
    # Low priority - nice to have, future enhancements
    ("Add dark mode theme option", "low", ["ui", "frontend", "feature"]),
    ("Consider switching to TypeScript", "low", ["refactor", "discussion"]),
    ("What's the best logging library?", "low", ["discussion", "backend"]),
    ("Update dependencies to latest versions", "low", ["maintenance"]),
    ("Add hover animations to buttons", "low", ["ui", "frontend"]),
    ("Write blog post about our tech stack", "low", ["documentation"]),
    ("Explore new deployment options", "low", ["deployment", "discussion"]),
    ("Should we add dark mode support?", "low", ["discussion", "ui", "frontend"]),
    ("Consider migrating from REST to GraphQL", "low", ["discussion", "api"]),
]

def load_training_data(csv_path=None):
    """Load training data from CSV or use seed data."""
    if csv_path and Path(csv_path).exists():
        print(f"[INFO] Loading training data from {csv_path}...")
        df = pd.read_csv(csv_path)
        
        # Handle different column name formats
        if 'issue_title' in df.columns:
            df['text'] = df['issue_title']
        if 'difficulty' in df.columns:
            df['priority'] = df['difficulty']
        
        # Convert CSV format to training format
        texts = df['text'].tolist()
        priorities = df['priority'].tolist()
        
        # Map difficulty levels: hard→high, easy→low (medium stays the same)
        priority_mapping = {'hard': 'high', 'easy': 'low', 'medium': 'medium'}
        priorities = [priority_mapping.get(p.lower(), p.lower()) for p in priorities]
        
        tags = [row.split('|') if pd.notna(row) and row else [] for row in df['tags']]
        
        print(f"[INFO] Loaded {len(texts)} samples from CSV")
        print(f"[INFO] Priority distribution: High={priorities.count('high')}, Medium={priorities.count('medium')}, Low={priorities.count('low')}")
        
        return texts, priorities, tags
    else:
        print("[INFO] Using seed dataset (add --data for custom CSV)")
        return zip(*SEED_DATA)

def train_model(data_path=None):
    """Train and save the lightweight model."""
    
    # Load data
    raw_texts, priorities, tags = load_training_data(data_path)
    raw_texts = list(raw_texts)
    priorities = list(priorities)
    tags = list(tags)
    
    print(f"[INFO] Training on {len(raw_texts)} samples")
    
    # Preprocess text (this is the slowest part - batch process)
    print("[INFO] Preprocessing text...")
    texts = [preprocess_text(text) for text in raw_texts]
    
    # === PRIORITY MODEL (Single-label classification) ===
    print("[INFO] Training priority classifier...")
    
    # Map priority to numbers
    priority_map = {"low": 0, "medium": 1, "high": 2}
    priority_labels = [priority_map[p] for p in priorities]
    
    # LIGHTWEIGHT CONFIG: Fewer features = smaller model + faster inference
    priority_pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(
            max_features=200,      # Small vocabulary (vs 500+ in heavy models)
            ngram_range=(1, 2),    # Unigrams + bigrams for context
            min_df=2,              # Ignore rare words (reduces features)
            max_df=0.8,            # Ignore very common words
            strip_accents='ascii', # Normalize text
            lowercase=True,
            stop_words='english'   # Remove stopwords
        )),
        ('clf', MultinomialNB(alpha=0.1))  # Fast & lightweight classifier
    ])
    priority_pipeline.fit(texts, priority_labels)
    
    # === TAGS MODEL (Multi-label classification) ===
    print("[INFO] Training tags classifier...")
    
    # Get all unique tags
    all_tags = set()
    for tag_list in tags:
        all_tags.update(tag_list)
    all_tags = sorted(list(all_tags))
    print(f"[INFO] Found {len(all_tags)} unique tags: {all_tags}")
    
    # Multi-hot encode tags
    mlb = MultiLabelBinarizer(classes=all_tags)
    tags_encoded = mlb.fit_transform(tags)
    
    # Lightweight TF-IDF (same config as priority model)
    tfidf = TfidfVectorizer(
        max_features=200,      # Keep it small
        ngram_range=(1, 2),
        min_df=2,
        max_df=0.8,
        strip_accents='ascii',
        lowercase=True,
        stop_words='english'
    )
    X_tfidf = tfidf.fit_transform(texts)
    
    # Use lightweight classifier per tag
    tags_classifier = MultiOutputClassifier(
        MultinomialNB(alpha=0.1),
        n_jobs=1  # Single thread to keep it simple
    )
    tags_classifier.fit(X_tfidf, tags_encoded)
    
    # === SAVE MODELS ===
    MODEL_DIR = Path(__file__).parent / "models"
    MODEL_DIR.mkdir(exist_ok=True)
    
    model_bundle = {
        'priority_pipeline': priority_pipeline,
        'priority_map': priority_map,
        'priority_map_inv': {v: k for k, v in priority_map.items()},
        'tfidf': tfidf,
        'tags_classifier': tags_classifier,
        'mlb': mlb,
        'all_tags': all_tags
    }
    
    MODEL_PATH = MODEL_DIR / "issue_model.pkl"
    with open(MODEL_PATH, 'wb') as f:
        # Use highest protocol for smaller file size
        pickle.dump(model_bundle, f, protocol=pickle.HIGHEST_PROTOCOL)
    
    # Print model size
    model_size_kb = MODEL_PATH.stat().st_size / 1024
    print(f"\n[SUCCESS] Model saved to {MODEL_PATH}")
    print(f"[INFO] Model size: {model_size_kb:.1f} KB (lightweight!)")
    
    # === TEST ===
    print("\n[TEST] Sample predictions:")
    test_issues = [
        "Critical database connection error",
        "Add dark mode to settings page",
        "API performance is degraded",
        "Should we migrate to PostgreSQL?",
        "Users reporting login failures",
    ]
    
    for issue in test_issues:
        processed = preprocess_text(issue)
        
        # Predict priority
        priority_pred = priority_pipeline.predict([processed])[0]
        priority_str = model_bundle['priority_map_inv'][priority_pred]
        priority_proba = priority_pipeline.predict_proba([processed])[0]
        
        # Predict tags
        X_test = tfidf.transform([processed])
        tags_pred = tags_classifier.predict(X_test)  # Returns 2D array (1, n_tags)
        predicted_tags = mlb.inverse_transform(tags_pred)[0]
        
        print(f"\n  '{issue}'")
        print(f"    Priority: {priority_str.upper()} (confidence: {max(priority_proba):.2%})")
        print(f"    Tags: {', '.join(predicted_tags) if predicted_tags else 'none'}")
    
    print("\n[INFO] Model ready for deployment!")
    print("[INFO] Lightweight features:")
    print("  - Model size: ~100-300 KB")
    print("  - Inference: ~1-5ms per prediction")
    print("  - No GPU required")
    print("  - Runs on serverless (Vercel, Lambda)")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train lightweight issue classifier")
    parser.add_argument("--data", type=str, help="Path to CSV file (text, priority, tags columns)")
    args = parser.parse_args()
    
    train_model(args.data)
