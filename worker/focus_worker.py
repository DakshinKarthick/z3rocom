"""
Focus Level Worker
==================
Periodically updates session focus_level based on ML classification of recent messages.

Uses a trained Naive Bayes classifier (TF-IDF + spaCy preprocessing) to score messages
as work-focused (1) or casual (0), then computes an exponentially-weighted average
of the last N messages to derive a 0-100 focus score.

Usage:
    python focus_worker.py              # Run once for all active sessions
    python focus_worker.py --loop       # Run continuously every 60s
    python focus_worker.py --session <uuid>  # Run for a specific session
"""

import os
import sys
import pickle
import time
import argparse
from pathlib import Path
from datetime import datetime, timedelta

import spacy
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
ALPHA = float(os.environ.get("ALPHA", 0.8))  # Decay factor
MAX_MESSAGES = int(os.environ.get("MAX_MESSAGES", 10))
FOCUS_FLOOR = int(os.environ.get("FOCUS_FLOOR", 20))
FOCUS_CEILING = int(os.environ.get("FOCUS_CEILING", 95))
MODEL_PATH = Path(__file__).parent / "models" / "focus_model.pkl"

# Global model and spaCy instance
_model = None
_nlp = None


def get_model():
    """Lazy-load the pickled classifier."""
    global _model
    if _model is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Model not found at {MODEL_PATH}. "
                "Place your trained focus_model.pkl in worker/models/"
            )
        with open(MODEL_PATH, "rb") as f:
            _model = pickle.load(f)
        print(f"[INFO] Loaded model from {MODEL_PATH}")
    return _model


def get_nlp():
    """Lazy-load spaCy model for preprocessing."""
    global _nlp
    if _nlp is None:
        _nlp = spacy.load("en_core_web_sm")
        print("[INFO] Loaded spaCy model en_core_web_sm")
    return _nlp


def preprocess_text(text: str) -> str:
    """
    Preprocess text using spaCy: lemmatize, lowercase, remove stopwords/punct.
    Must match the preprocessing used during training.
    """
    nlp = get_nlp()
    doc = nlp(str(text))
    tokens = [
        token.lemma_.lower()
        for token in doc
        if not token.is_stop and not token.is_punct
    ]
    return " ".join(tokens)


def compute_weighted_focus(probabilities: list[float]) -> int:
    """
    Compute exponentially-weighted average of work-focus probabilities.
    
    Args:
        probabilities: List of P(work-focused) for messages, newest first.
        
    Returns:
        Focus level in range [FOCUS_FLOOR, FOCUS_CEILING].
    """
    if not probabilities:
        return 100  # Default if no messages
    
    # Exponential decay weights: w_i = alpha^(i-1)
    weights = [ALPHA ** i for i in range(len(probabilities))]
    
    # Weighted average
    weighted_sum = sum(w * p for w, p in zip(weights, probabilities))
    total_weight = sum(weights)
    p_agg = weighted_sum / total_weight
    
    # Map to 0-100 scale and clamp
    focus = round(100 * p_agg)
    focus = max(FOCUS_FLOOR, min(FOCUS_CEILING, focus))
    
    return focus


def get_supabase_client() -> Client:
    """Create Supabase client with service-role key."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError(
            "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. "
            "Set them in worker/.env"
        )
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def get_active_sessions(supabase: Client, since_minutes: int = 120) -> list[dict]:
    """
    Get sessions that have had recent activity.
    
    Args:
        supabase: Supabase client.
        since_minutes: Consider sessions with messages in the last N minutes.
        
    Returns:
        List of session records.
    """
    cutoff = (datetime.utcnow() - timedelta(minutes=since_minutes)).isoformat()
    
    # Get sessions with recent messages
    result = supabase.rpc(
        "get_active_sessions_for_focus_update",
        {"cutoff_time": cutoff}
    ).execute()
    
    # Fallback: if RPC doesn't exist, query directly
    if not result.data:
        result = supabase.table("sessions").select("id").execute()
    
    return result.data or []


def get_recent_messages(supabase: Client, session_id: str) -> list[str]:
    """
    Fetch the last N user messages for a session.
    
    Args:
        supabase: Supabase client.
        session_id: UUID of the session.
        
    Returns:
        List of message contents, newest first.
    """
    result = (
        supabase.table("messages")
        .select("content")
        .eq("session_id", session_id)
        .eq("kind", "user")  # Only user messages, not system/command
        .order("created_at", desc=True)
        .limit(MAX_MESSAGES)
        .execute()
    )
    return [m["content"] for m in (result.data or [])]


def update_session_focus(supabase: Client, session_id: str, focus_level: int) -> None:
    """
    Update the focus_level for a session.
    
    Args:
        supabase: Supabase client.
        session_id: UUID of the session.
        focus_level: New focus level (0-100).
    """
    supabase.table("sessions").update(
        {"focus_level": focus_level}
    ).eq("id", session_id).execute()


def process_session(supabase: Client, session_id: str, verbose: bool = True) -> int | None:
    """
    Process a single session: score messages and update focus_level.
    
    Args:
        supabase: Supabase client.
        session_id: UUID of the session.
        verbose: Print progress info.
        
    Returns:
        New focus level, or None if no messages.
    """
    # Get recent messages
    messages = get_recent_messages(supabase, session_id)
    
    if not messages:
        if verbose:
            print(f"  [SKIP] No messages for session {session_id}")
        return None
    
    # Preprocess messages
    preprocessed = [preprocess_text(msg) for msg in messages]
    
    # Get model predictions
    model = get_model()
    
    # Get probabilities for class 1 (work-focused)
    # The model should have predict_proba method (Naive Bayes does)
    try:
        proba = model.predict_proba(preprocessed)
        # Assuming class 1 is "work/focused" (level=1 in training data)
        work_probs = proba[:, 1].tolist()
    except AttributeError:
        # Fallback if model doesn't have predict_proba
        predictions = model.predict(preprocessed)
        work_probs = [float(p) for p in predictions]
    
    # Compute weighted focus
    focus_level = compute_weighted_focus(work_probs)
    
    # Update database
    update_session_focus(supabase, session_id, focus_level)
    
    if verbose:
        print(f"  [OK] Session {session_id}: {len(messages)} msgs -> focus={focus_level}")
        print(f"       Probs (newest first): {[f'{p:.2f}' for p in work_probs[:5]]}...")
    
    return focus_level


def run_once(session_id: str | None = None, verbose: bool = True) -> None:
    """
    Run the focus update once for all active sessions or a specific session.
    
    Args:
        session_id: Optional specific session to process.
        verbose: Print progress info.
    """
    supabase = get_supabase_client()
    
    if session_id:
        # Process specific session
        if verbose:
            print(f"[RUN] Processing session {session_id}")
        process_session(supabase, session_id, verbose)
    else:
        # Process all active sessions
        sessions = get_active_sessions(supabase)
        if verbose:
            print(f"[RUN] Processing {len(sessions)} active sessions")
        
        for sess in sessions:
            process_session(supabase, sess["id"], verbose)
    
    if verbose:
        print("[DONE]")


def run_loop(interval_seconds: int = 60, verbose: bool = True) -> None:
    """
    Run the focus update in a continuous loop.
    
    Args:
        interval_seconds: Seconds between runs.
        verbose: Print progress info.
    """
    print(f"[LOOP] Starting focus worker, interval={interval_seconds}s")
    print(f"       Config: ALPHA={ALPHA}, MAX_MESSAGES={MAX_MESSAGES}, "
          f"FLOOR={FOCUS_FLOOR}, CEILING={FOCUS_CEILING}")
    
    while True:
        try:
            run_once(verbose=verbose)
        except Exception as e:
            print(f"[ERROR] {e}", file=sys.stderr)
        
        time.sleep(interval_seconds)


def main():
    parser = argparse.ArgumentParser(description="Focus Level Worker")
    parser.add_argument(
        "--loop", 
        action="store_true", 
        help="Run continuously every 60 seconds"
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=60,
        help="Interval in seconds for loop mode (default: 60)"
    )
    parser.add_argument(
        "--session",
        type=str,
        help="Process a specific session UUID"
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Suppress verbose output"
    )
    
    args = parser.parse_args()
    verbose = not args.quiet
    
    if args.loop:
        run_loop(interval_seconds=args.interval, verbose=verbose)
    else:
        run_once(session_id=args.session, verbose=verbose)


if __name__ == "__main__":
    main()
