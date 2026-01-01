"""
Train Focus Model
==================
Trains the Naive Bayes classifier on work vs casual chat data and saves to focus_model.pkl

Run this script once to create the model:
    python train_model.py
"""

import pickle
from pathlib import Path

import spacy
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from sklearn.pipeline import Pipeline
from sklearn.naive_bayes import MultinomialNB
from sklearn.feature_extraction.text import TfidfVectorizer

# Load spaCy
print("[INFO] Loading spaCy...")
nlp = spacy.load('en_core_web_sm')

def preprocess_text(text):
    """Preprocess text: lemmatize, lowercase, remove stopwords/punct."""
    doc = nlp(str(text))
    tokens = [token.lemma_.lower() for token in doc if not token.is_stop and not token.is_punct]
    return ' '.join(tokens)

# === CONFIGURE YOUR DATA PATHS HERE ===
WORK_CHAT_PATH = 'E:/Coding proj/ml/data/archive/Ubuntu-dialogue-corpus/dialogueText_196.csv'
WORK_CHAT2_PATH = 'E:/Coding proj/ml/data/archive/Ubuntu-dialogue-corpus/work2o.csv'
FUN_CHAT_PATH = 'E:/Coding proj/ml/data/archive (1)/discord chat.csv'

# Load datasets
print("[INFO] Loading datasets...")
try:
    WorkChat = pd.read_csv(WORK_CHAT_PATH)
    print(f"  WorkChat: {len(WorkChat)} rows")
except FileNotFoundError:
    print(f"  [WARN] {WORK_CHAT_PATH} not found, using empty DataFrame")
    WorkChat = pd.DataFrame(columns=['text'])

try:
    WorkChat2 = pd.read_csv(WORK_CHAT2_PATH, on_bad_lines='skip')
    print(f"  WorkChat2: {len(WorkChat2)} rows")
except FileNotFoundError:
    print(f"  [WARN] {WORK_CHAT2_PATH} not found, using empty DataFrame")
    WorkChat2 = pd.DataFrame(columns=['text'])

try:
    FunChat = pd.read_csv(FUN_CHAT_PATH, on_bad_lines='skip')
    print(f"  FunChat: {len(FunChat)} rows")
except FileNotFoundError:
    print(f"  [WARN] {FUN_CHAT_PATH} not found, using empty DataFrame")
    FunChat = pd.DataFrame(columns=['message', 'person'])

# Balance datasets
minSample = min(len(WorkChat) + len(WorkChat2), len(FunChat))
print(f"[INFO] Balancing to {minSample} samples per class")

if len(WorkChat) > 0:
    df_work1 = WorkChat[['text']].copy().sample(min(len(WorkChat), minSample), random_state=42)
else:
    df_work1 = pd.DataFrame(columns=['text'])

if len(WorkChat2) > 0:
    df_work2 = WorkChat2[['text']].copy().sample(min(len(WorkChat2), minSample), random_state=42)
else:
    df_work2 = pd.DataFrame(columns=['text'])

df_work = pd.concat([df_work1, df_work2], ignore_index=True)

if len(FunChat) > 0 and 'message' in FunChat.columns:
    df_fun = FunChat[['message']].copy().sample(min(len(FunChat), minSample), random_state=42)
    df_fun = df_fun.rename(columns={'message': 'text'})
else:
    df_fun = pd.DataFrame(columns=['text'])

# Label: 0 = casual/fun, 1 = work/focused
df_fun['level'] = 0
df_work['level'] = 1

# Combine
df = pd.concat([df_fun, df_work], ignore_index=True)
df = df.dropna(subset=['text'])
print(f"[INFO] Total samples: {len(df)} (fun={len(df_fun)}, work={len(df_work)})")

if len(df) < 100:
    print("[ERROR] Not enough data to train. Check your CSV paths.")
    exit(1)

# Preprocess
print("[INFO] Preprocessing text (this may take a while)...")
df['text'] = df['text'].apply(preprocess_text)

# Split
X_train, X_test, y_train, y_test = train_test_split(
    df['text'], df['level'], 
    test_size=0.2, 
    random_state=42,
    stratify=df['level']
)
print(f"[INFO] Train: {len(X_train)}, Test: {len(X_test)}")

# Train
print("[INFO] Training classifier...")
clf = Pipeline([
    ('tfidf', TfidfVectorizer()),
    ('clf', MultinomialNB())
])
clf.fit(X_train, y_train)

# Evaluate
print("[INFO] Evaluating...")
y_pred = clf.predict(X_test)
print(classification_report(y_test, y_pred, target_names=['casual', 'work']))

# Save model
MODEL_PATH = Path(__file__).parent / "models" / "focus_model.pkl"
MODEL_PATH.parent.mkdir(exist_ok=True)

with open(MODEL_PATH, 'wb') as f:
    pickle.dump(clf, f)
print(f"[SUCCESS] Model saved to {MODEL_PATH}")

# Test with sample inputs
print("\n[TEST] Sample predictions:")
test_msgs = [
    "hey what's up lol",
    "We need to fix the database connection issue",
    "anyone wanna play games later?",
    "The API endpoint is returning 500 errors",
    "haha that's so funny",
    "Let's schedule the sprint review for tomorrow"
]
for msg in test_msgs:
    processed = preprocess_text(msg)
    pred = clf.predict([processed])[0]
    proba = clf.predict_proba([processed])[0]
    label = "work" if pred == 1 else "casual"
    print(f"  '{msg[:40]}...' -> {label} (work_prob={proba[1]:.2f})")
