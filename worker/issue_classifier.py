"""
Issue Classifier Worker
=======================
Predicts priority and tags for issue text.

Usage:
    # Analyze single issue
    python issue_classifier.py --analyze "Database connection timeout"
    
    # Analyze with verbose output
    python issue_classifier.py --analyze "API returning 500 errors" --verbose
    
    # Test the model
    python issue_classifier.py --test
"""

import os
import sys
import pickle
import argparse
import json
import re
from pathlib import Path
from typing import Dict, List

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

MODEL_PATH = Path(__file__).parent / "models" / "issue_model.pkl"

_model = None
_nlp = None

def get_model():
    """Lazy-load the pickled model bundle."""
    global _model
    if _model is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Model not found at {MODEL_PATH}.\n"
                f"Run 'python train_issue_model.py' first to create the model."
            )
        with open(MODEL_PATH, "rb") as f:
            _model = pickle.load(f)
        print(f"[INFO] Loaded model from {MODEL_PATH}", file=sys.stderr)
    return _model

def get_nlp():
    """Lazy-load spaCy model (optional, can use fast preprocessing instead)."""
    global _nlp
    if _nlp is None:
        try:
            import spacy
            _nlp = spacy.load("en_core_web_sm", disable=['parser', 'ner'])
            print("[INFO] Loaded spaCy model", file=sys.stderr)
        except OSError:
            print("[WARNING] spaCy model not found. Using fast preprocessing.", file=sys.stderr)
            _nlp = None
    return _nlp

def preprocess_text_fast(text: str) -> str:
    """
    Ultra-fast preprocessing without spaCy (use in production).
    10x faster than spaCy for inference.
    """
    # Lowercase
    text = text.lower()
    
    # Remove special characters (keep alphanumeric and spaces)
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    
    # Remove common stopwords manually (faster than loading spaCy)
    stopwords = {
        'the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 
        'to', 'for', 'of', 'and', 'or', 'but', 'with', 'from', 'by',
        'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it',
        'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how'
    }
    tokens = [word for word in text.split() if word and word not in stopwords]
    
    return ' '.join(tokens)

def preprocess_text_spacy(text: str) -> str:
    """Preprocessing with spaCy: lemmatize, lowercase, remove stopwords/punct."""
    nlp = get_nlp()
    if nlp is None:
        # Fallback to fast preprocessing
        return preprocess_text_fast(text)
    
    doc = nlp(str(text))
    tokens = [
        token.lemma_.lower()
        for token in doc
        if not token.is_stop and not token.is_punct
    ]
    return " ".join(tokens)

def classify_issue(text: str, use_fast: bool = True, verbose: bool = False) -> Dict:
    """
    Classify issue text and return priority + tags.
    
    Args:
        text: Issue description text
        use_fast: Use fast preprocessing (recommended for production)
        verbose: Include additional debug information
    
    Returns:
        {
            "priority": "high" | "medium" | "low",
            "priority_confidence": float,
            "tags": ["database", "backend", ...],
            "all_tag_scores": {"database": 0.85, ...}
        }
    """
    model = get_model()
    
    # Preprocess
    if use_fast:
        processed = preprocess_text_fast(text)
    else:
        processed = preprocess_text_spacy(text)
    
    if verbose:
        print(f"[DEBUG] Original: {text}", file=sys.stderr)
        print(f"[DEBUG] Processed: {processed}", file=sys.stderr)
    
    # Predict priority
    priority_pred = model['priority_pipeline'].predict([processed])[0]
    priority_proba = model['priority_pipeline'].predict_proba([processed])[0]
    priority_str = model['priority_map_inv'][priority_pred]
    priority_confidence = float(max(priority_proba))
    
    if verbose:
        print(f"[DEBUG] Priority probas: {dict(zip(['low', 'medium', 'high'], priority_proba))}", file=sys.stderr)
    
    # Predict tags
    X_test = model['tfidf'].transform([processed])
    tags_pred = model['tags_classifier'].predict(X_test)  # Returns 2D array
    predicted_tags = list(model['mlb'].inverse_transform(tags_pred)[0])
    
    # Get tag probabilities for top tags
    tags_proba = model['tags_classifier'].predict_proba(X_test)
    tag_scores = {}
    for i, tag in enumerate(model['all_tags']):
        # Probability of tag being present
        prob = float(tags_proba[i][0][1]) if len(tags_proba[i][0]) > 1 else 0.0
        if prob > 0.3:  # Only include confident predictions
            tag_scores[tag] = prob
    
    # Sort by confidence and take top 3
    top_tags = sorted(tag_scores.items(), key=lambda x: x[1], reverse=True)[:3]
    final_tags = [tag for tag, score in top_tags]
    
    result = {
        "priority": priority_str,
        "priority_confidence": priority_confidence,
        "tags": final_tags,
        "all_tag_scores": dict(top_tags),
        "text": text
    }
    
    if verbose:
        result["processed_text"] = processed
        result["all_priority_scores"] = {
            "low": float(priority_proba[0]),
            "medium": float(priority_proba[1]),
            "high": float(priority_proba[2])
        }
    
    return result

def classify_batch(texts: List[str], use_fast: bool = True) -> List[Dict]:
    """
    Classify multiple issues at once (more efficient for batch processing).
    
    Args:
        texts: List of issue descriptions
        use_fast: Use fast preprocessing
    
    Returns:
        List of classification results
    """
    model = get_model()
    
    # Preprocess all texts
    if use_fast:
        processed = [preprocess_text_fast(t) for t in texts]
    else:
        processed = [preprocess_text_spacy(t) for t in texts]
    
    # Batch predict priorities
    priority_preds = model['priority_pipeline'].predict(processed)
    priority_probas = model['priority_pipeline'].predict_proba(processed)
    
    # Batch predict tags
    X_test = model['tfidf'].transform(processed)
    tags_preds = model['tags_classifier'].predict(X_test)
    
    # Format results
    results = []
    for i, text in enumerate(texts):
        priority_str = model['priority_map_inv'][priority_preds[i]]
        priority_confidence = float(max(priority_probas[i]))
        predicted_tags = list(model['mlb'].inverse_transform(tags_preds)[i])
        
        results.append({
            "priority": priority_str,
            "priority_confidence": priority_confidence,
            "tags": predicted_tags[:3],  # Top 3 tags
            "text": text
        })
    
    return results

def test_model():
    """Test the model with sample issues."""
    test_cases = [
        "Critical database connection error causing production outage",
        "Add dark mode theme option to user settings",
        "API response time is very slow for large datasets",
        "Should we migrate from MongoDB to PostgreSQL?",
        "Users reporting login failures with Google OAuth",
        "Memory leak in background worker process",
        "Update documentation for new API endpoints",
        "Security vulnerability in password reset flow",
        "Add unit tests for payment processing module",
        "UI button alignment issue on mobile devices",
    ]
    
    print("\n" + "="*70)
    print("MODEL TEST - Sample Predictions")
    print("="*70 + "\n")
    
    for issue in test_cases:
        result = classify_issue(issue, use_fast=True, verbose=False)
        
        print(f"Issue: {issue}")
        print(f"  Priority: {result['priority'].upper()} ({result['priority_confidence']:.1%} confidence)")
        print(f"  Tags: {', '.join(result['tags']) if result['tags'] else 'none'}")
        print()

def main():
    parser = argparse.ArgumentParser(description="Issue Priority & Tags Classifier")
    parser.add_argument("--analyze", type=str, help="Analyze a single issue text")
    parser.add_argument("--verbose", action="store_true", help="Show detailed debug information")
    parser.add_argument("--test", action="store_true", help="Run model test with sample issues")
    parser.add_argument("--fast", action="store_true", default=True, help="Use fast preprocessing (default)")
    parser.add_argument("--spacy", action="store_true", help="Use spaCy preprocessing (slower but more accurate)")
    
    args = parser.parse_args()
    
    if args.test:
        test_model()
        return
    
    if args.analyze:
        use_fast = not args.spacy  # Use fast unless explicitly asked for spacy
        result = classify_issue(args.analyze, use_fast=use_fast, verbose=args.verbose)
        
        # Output as JSON for API integration
        print(json.dumps(result, indent=2 if args.verbose else None))
    else:
        print("Usage: python issue_classifier.py --analyze 'issue text'", file=sys.stderr)
        print("       python issue_classifier.py --test", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
