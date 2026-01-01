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
    python focus_worker.py --analyze "message text"  # Analyze single message (for Next.js integration)
    python focus_worker.py --analyze-batch "msg1" "msg2" ...  # Analyze multiple messages and return weighted score
"""

import os
import sys
import pickle
import time
import argparse
import json
from pathlib import Path
from datetime import datetime, timedelta

# Load environment variables FIRST (before other imports that might need them)
from dotenv import load_dotenv
load_dotenv()

# Check if running in analyze mode (don't load heavy deps until needed)
_ANALYZE_MODE = "--analyze" in sys.argv or "--analyze-batch" in sys.argv

# Only import supabase when needed (not for --analyze mode)
Client = None
create_client = None

# Configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
ALPHA = float(os.environ.get("ALPHA", "0.8"))  # Decay factor
MAX_MESSAGES = int(os.environ.get("MAX_MESSAGES", "10"))
FOCUS_FLOOR = int(os.environ.get("FOCUS_FLOOR", "20"))
FOCUS_CEILING = int(os.environ.get("FOCUS_CEILING", "95"))
MODEL_PATH = Path(__file__).parent / "models" / "focus_model.pkl"

# Global model and spaCy instance
_model = None
_nlp = None


def get_model(quiet: bool = False):
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
        if not quiet:
            print(f"[INFO] Loaded model from {MODEL_PATH}", file=sys.stderr)
    return _model


def get_nlp(quiet: bool = False):
    """Lazy-load spaCy model for preprocessing."""
    global _nlp
    if _nlp is None:
        import spacy
        _nlp = spacy.load("en_core_web_sm")
        if not quiet:
            print("[INFO] Loaded spaCy model en_core_web_sm", file=sys.stderr)
    return _nlp


def preprocess_text(text: str, quiet: bool = False) -> str:
    """
    Preprocess text using spaCy: lemmatize, lowercase, remove stopwords/punct.
    Must match the preprocessing used during training.
    """
    nlp = get_nlp(quiet)
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


def get_supabase_client():
    """Create Supabase client with service-role key (lazy import)."""
    global Client, create_client
    if create_client is None:
        from supabase import create_client as _create_client, Client as _Client
        create_client = _create_client
        Client = _Client
    
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


# ============================================================================
# Standalone Analysis Functions (for Next.js integration)
# ============================================================================

def analyze_single_message(text: str) -> dict:
    """
    Analyze a single message and return its focus probability.
    
    Args:
        text: Message content to analyze.
        
    Returns:
        Dictionary with focus_probability (0-1) where 1 = work-focused.
    """
    model = get_model(quiet=True)
    preprocessed = preprocess_text(text, quiet=True)
    
    try:
        proba = model.predict_proba([preprocessed])
        work_prob = float(proba[0][1])  # Probability of class 1 (work-focused)
    except AttributeError:
        # Fallback if model doesn't have predict_proba
        prediction = model.predict([preprocessed])[0]
        work_prob = float(prediction)
    
    return {
        "focus_probability": work_prob,
        "preprocessed": preprocessed
    }


def analyze_messages_batch(messages: list[str]) -> dict:
    """
    Analyze multiple messages and return weighted focus score.
    Messages should be in order from newest to oldest.
    
    Args:
        messages: List of message contents (newest first).
        
    Returns:
        Dictionary with focus_level (0-100), individual probabilities, etc.
    """
    if not messages:
        return {
            "focus_level": 100,
            "probabilities": [],
            "message_count": 0
        }
    
    # Limit to MAX_MESSAGES
    messages = messages[:MAX_MESSAGES]
    
    model = get_model(quiet=True)
    preprocessed = [preprocess_text(msg, quiet=True) for msg in messages]
    
    try:
        proba = model.predict_proba(preprocessed)
        work_probs = [float(p[1]) for p in proba]  # P(work-focused) for each
    except AttributeError:
        predictions = model.predict(preprocessed)
        work_probs = [float(p) for p in predictions]
    
    focus_level = compute_weighted_focus(work_probs)
    
    return {
        "focus_level": focus_level,
        "probabilities": work_probs,
        "message_count": len(messages)
    }


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
    parser.add_argument(
        "--analyze",
        type=str,
        help="Analyze a single message and output JSON result"
    )
    parser.add_argument(
        "--analyze-batch",
        nargs="+",
        metavar="MSG",
        help="Analyze multiple messages (newest first) and output JSON with weighted focus score"
    )
    
    args = parser.parse_args()
    verbose = not args.quiet
    
    # Single message analysis mode (for Next.js integration)
    if args.analyze:
        result = analyze_single_message(args.analyze)
        print(json.dumps(result))
        return
    
    # Batch analysis mode (for Next.js integration)
    if args.analyze_batch:
        result = analyze_messages_batch(args.analyze_batch)
        print(json.dumps(result))
        return
    
    # Standard worker modes
    if args.loop:
        run_loop(interval_seconds=args.interval, verbose=verbose)
    else:
        run_once(session_id=args.session, verbose=verbose)


if __name__ == "__main__":
    main()
