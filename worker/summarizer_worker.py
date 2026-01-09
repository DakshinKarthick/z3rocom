#!/usr/bin/env python3
"""
Summarizer Worker for z3rocom
Uses Sumy with LexRank algorithm to generate session summaries.
Optimized for short chat messages.
"""

import sys
import json

def check_dependencies():
    """Check if required packages are installed."""
    try:
        import nltk
        from sumy.parsers.plaintext import PlaintextParser
        from sumy.nlp.tokenizers import Tokenizer
        from sumy.summarizers.lex_rank import LexRankSummarizer
        from sumy.summarizers.text_rank import TextRankSummarizer
        from sumy.nlp.stemmers import Stemmer
        from sumy.utils import get_stop_words
        
        # Check if punkt tokenizer is available
        try:
            nltk.data.find('tokenizers/punkt')
        except LookupError:
            nltk.download('punkt', quiet=True)
        
        try:
            nltk.data.find('tokenizers/punkt_tab')
        except LookupError:
            try:
                nltk.download('punkt_tab', quiet=True)
            except:
                pass
        
        try:
            nltk.data.find('corpora/stopwords')
        except LookupError:
            nltk.download('stopwords', quiet=True)
            
        return True
    except ImportError:
        return False

def extract_key_topics(messages: list[str]) -> list[str]:
    """Extract key topics from messages using simple keyword extraction."""
    # Common stop words to filter out
    stop_words = {
        'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 
        "you're", "you've", "you'll", "you'd", 'your', 'yours', 'yourself',
        'yourselves', 'he', 'him', 'his', 'himself', 'she', "she's", 'her',
        'hers', 'herself', 'it', "it's", 'its', 'itself', 'they', 'them',
        'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom',
        'this', 'that', "that'll", 'these', 'those', 'am', 'is', 'are',
        'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having',
        'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if',
        'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for',
        'with', 'about', 'against', 'between', 'into', 'through', 'during',
        'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down',
        'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further',
        'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how',
        'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
        'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
        'very', 's', 't', 'can', 'will', 'just', 'don', "don't", 'should',
        "should've", 'now', 'd', 'll', 'm', 'o', 're', 've', 'y', 'ain',
        'aren', "aren't", 'couldn', "couldn't", 'didn', "didn't", 'doesn',
        "doesn't", 'hadn', "hadn't", 'hasn', "hasn't", 'haven', "haven't",
        'isn', "isn't", 'ma', 'mightn', "mightn't", 'mustn', "mustn't",
        'needn', "needn't", 'shan', "shan't", 'shouldn', "shouldn't",
        'wasn', "wasn't", 'weren', "weren't", 'won', "won't", 'wouldn',
        "wouldn't", 'yeah', 'yes', 'no', 'ok', 'okay', 'like', 'get',
        'got', 'going', 'go', 'went', 'come', 'came', 'let', 'lets',
        'think', 'know', 'want', 'need', 'would', 'could', 'should',
        'maybe', 'also', 'well', 'really', 'actually', 'basically',
        'hey', 'hi', 'hello', 'bye', 'thanks', 'thank', 'please', 'sorry'
    }
    
    # Combine all messages and extract words
    all_text = ' '.join(messages).lower()
    words = all_text.replace('?', ' ').replace('!', ' ').replace('.', ' ').replace(',', ' ').split()
    
    # Count word frequency (excluding stop words)
    word_freq = {}
    for word in words:
        word = word.strip()
        if len(word) > 2 and word not in stop_words and word.isalpha():
            word_freq[word] = word_freq.get(word, 0) + 1
    
    # Get top keywords
    sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
    return [word for word, freq in sorted_words[:10] if freq >= 1]

def summarize_with_sumy(text: str, max_sentences: int = 3) -> str:
    """Use Sumy LexRank to summarize text."""
    from sumy.parsers.plaintext import PlaintextParser
    from sumy.nlp.tokenizers import Tokenizer
    from sumy.summarizers.lex_rank import LexRankSummarizer
    from sumy.nlp.stemmers import Stemmer
    from sumy.utils import get_stop_words
    
    LANGUAGE = "english"
    
    parser = PlaintextParser.from_string(text, Tokenizer(LANGUAGE))
    stemmer = Stemmer(LANGUAGE)
    summarizer = LexRankSummarizer(stemmer)
    summarizer.stop_words = get_stop_words(LANGUAGE)
    
    sentences = summarizer(parser.document, max_sentences)
    return ' '.join(str(sentence) for sentence in sentences)

def generate_smart_summary(messages: list[str], max_sentences: int = 5) -> str:
    """
    Generate a smart summary optimized for chat messages.
    Combines keyword extraction with Sumy summarization.
    """
    if not messages:
        return "No messages to summarize."
    
    # Filter out very short messages (greetings, etc.)
    meaningful_messages = [m for m in messages if len(m.split()) >= 3]
    
    if not meaningful_messages:
        meaningful_messages = messages
    
    # Extract key topics
    topics = extract_key_topics(meaningful_messages)
    
    # Combine messages into paragraphs for better Sumy processing
    # Group every 3-5 messages as a "paragraph"
    paragraphs = []
    chunk_size = 3
    for i in range(0, len(meaningful_messages), chunk_size):
        chunk = meaningful_messages[i:i + chunk_size]
        paragraphs.append('. '.join(chunk))
    
    full_text = '. '.join(paragraphs)
    
    # Ensure text ends with period for proper sentence detection
    if not full_text.endswith('.'):
        full_text += '.'
    
    # Count actual sentences in the text
    sentence_count = full_text.count('.') + full_text.count('!') + full_text.count('?')
    
    # If we have very few sentences, create a topic-based summary instead
    if sentence_count <= max_sentences or len(meaningful_messages) <= 5:
        # For short sessions, create a structured summary
        summary_parts = []
        
        if topics:
            summary_parts.append(f"Main topics discussed: {', '.join(topics[:5])}")
        
        # Add message count context
        summary_parts.append(f"Session contained {len(messages)} message(s)")
        
        # If we have meaningful content, try Sumy anyway
        if len(full_text) > 100:
            try:
                sumy_summary = summarize_with_sumy(full_text, min(max_sentences, 2))
                if sumy_summary and len(sumy_summary) > 20:
                    summary_parts.insert(0, sumy_summary)
            except Exception:
                pass
        
        return '. '.join(summary_parts) + '.'
    
    # For longer sessions, use Sumy
    try:
        sumy_summary = summarize_with_sumy(full_text, max_sentences)
        
        # If Sumy returned something meaningful
        if sumy_summary and len(sumy_summary) > 50:
            # Add topics if we have them
            if topics:
                return f"{sumy_summary} Key topics: {', '.join(topics[:5])}."
            return sumy_summary
        
        # Fallback to topic-based summary
        if topics:
            return f"Discussion covered: {', '.join(topics)}. Session had {len(messages)} messages."
        
        return f"Session contained {len(messages)} messages."
        
    except Exception as e:
        # Fallback
        if topics:
            return f"Topics discussed: {', '.join(topics)}."
        return f"Session summary: {len(messages)} messages exchanged."

def main():
    """Main entry point for the summarizer worker."""
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "No arguments provided",
            "usage": "python summarizer_worker.py --summarize-json '{\"messages\": [...], \"max_sentences\": 5}'"
        }))
        sys.exit(1)
    
    # Check dependencies first
    if not check_dependencies():
        print(json.dumps({
            "error": "sumy not installed. Install with: pip install sumy nltk",
            "summary": ""
        }))
        sys.exit(1)
    
    if sys.argv[1] == "--summarize-json":
        if len(sys.argv) < 3:
            print(json.dumps({"error": "No JSON data provided", "summary": ""}))
            sys.exit(1)
        
        try:
            data = json.loads(sys.argv[2])
            messages = data.get("messages", [])
            max_sentences = data.get("max_sentences", 5)
            
            if not messages:
                print(json.dumps({"summary": "No messages to summarize.", "error": None}))
                sys.exit(0)
            
            summary = generate_smart_summary(messages, max_sentences)
            print(json.dumps({"summary": summary, "error": None}))
            
        except json.JSONDecodeError as e:
            print(json.dumps({"error": f"Invalid JSON: {str(e)}", "summary": ""}))
            sys.exit(1)
        except Exception as e:
            print(json.dumps({"error": str(e), "summary": ""}))
            sys.exit(1)
    else:
        print(json.dumps({
            "error": f"Unknown command: {sys.argv[1]}",
            "usage": "python summarizer_worker.py --summarize-json '{\"messages\": [...]}'"
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()
