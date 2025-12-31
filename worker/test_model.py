"""
Test Focus Model
================
Quick test script to verify the trained model works correctly.
"""

import pickle
from pathlib import Path
import spacy

# Load model
MODEL_PATH = Path(__file__).parent / "models" / "focus_model.pkl"
print(f"[INFO] Loading model from {MODEL_PATH}")

with open(MODEL_PATH, "rb") as f:
    clf = pickle.load(f)

print("[INFO] Loading spaCy...")
nlp = spacy.load('en_core_web_sm')

def preprocess_text(text):
    """Preprocess text: lemmatize, lowercase, remove stopwords/punct."""
    doc = nlp(str(text))
    tokens = [token.lemma_.lower() for token in doc if not token.is_stop and not token.is_punct]
    return ' '.join(tokens)

# Test messages
test_messages = [
    # Casual/fun messages (should be level 0, low work_prob)
    "want to see a funny meme about work",
    "hey what's up lol",
    "anyone wanna play games later?",
    "haha that's so funny",
    "lmaooo bruh",
    "yooo what time you free",
    "netflix and chill?",
    "did you see that tiktok",
    
    # Work/focused messages (should be level 1, high work_prob)
    "We need to fix the database connection issue",
    "The API endpoint is returning 500 errors",
    "Let's schedule the sprint review for tomorrow",
    "Can you review my pull request?",
    "The deployment failed on staging",
    "We should refactor this module",
    "What's the status of the migration?",
    "I pushed the hotfix to production",
]

print("\n" + "="*70)
print("FOCUS MODEL TEST RESULTS")
print("="*70)
print(f"{'Message':<45} {'Pred':>6} {'Casual':>8} {'Work':>8}")
print("-"*70)

for msg in test_messages:
    processed = preprocess_text(msg)
    pred = clf.predict([processed])[0]
    proba = clf.predict_proba([processed])[0]
    label = "WORK" if pred == 1 else "CASUAL"
    
    # Truncate message for display
    display_msg = msg[:42] + "..." if len(msg) > 45 else msg
    print(f"{display_msg:<45} {label:>6} {proba[0]:>8.2%} {proba[1]:>8.2%}")

print("-"*70)
print("\nInterpretation:")
print("  - 'Casual' column = P(casual/fun chat)")
print("  - 'Work' column = P(work/focused chat)")
print("  - focus_level = round(100 * Work probability)")
print("\n[INFO] Model loaded and working correctly!")

# Interactive test
print("\n" + "="*70)
print("INTERACTIVE TEST (type 'quit' to exit)")
print("="*70)

while True:
    user_input = input("\nEnter a message to classify: ").strip()
    if user_input.lower() in ('quit', 'exit', 'q'):
        break
    if not user_input:
        continue
    
    processed = preprocess_text(user_input)
    pred = clf.predict([processed])[0]
    proba = clf.predict_proba([processed])[0]
    
    label = "WORK" if pred == 1 else "CASUAL"
    focus = round(100 * proba[1])
    
    print(f"  Prediction: {label}")
    print(f"  Casual prob: {proba[0]:.2%}")
    print(f"  Work prob: {proba[1]:.2%}")
    print(f"  Focus level: {focus}/100")
