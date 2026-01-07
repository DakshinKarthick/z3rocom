"""
Collect GitHub Issues for Training Data
=========================================
Fetches issues from public repos and labels them based on keywords/labels.

Usage:
    # Basic usage (no token - 60 requests/hour)
    python collect_github_data.py --repos "facebook/react" "microsoft/vscode" --output github_issues.csv
    
    # With GitHub token (5000 requests/hour)
    $env:GITHUB_TOKEN="your_token_here"
    python collect_github_data.py --repos "facebook/react" "vercel/next.js" "supabase/supabase" --max-pages 10
    
    # Multiple repos
    python collect_github_data.py --repos "facebook/react" "microsoft/vscode" "vercel/next.js" --output issues.csv
"""

import os
import requests
import pandas as pd
import argparse
import time
from typing import List, Tuple
from datetime import datetime

# GitHub API settings
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN")
HEADERS = {"Authorization": f"token {GITHUB_TOKEN}"} if GITHUB_TOKEN else {}

# Priority mapping based on labels
PRIORITY_MAP = {
    "critical": "high",
    "blocker": "high",
    "bug": "high",
    "security": "high",
    "high priority": "high",
    "p0": "high",
    "p1": "high",
    "severity: high": "high",
    "type: bug": "high",
    
    "enhancement": "medium",
    "feature": "medium",
    "feature request": "medium",
    "improvement": "medium",
    "p2": "medium",
    "type: feature": "medium",
    
    "documentation": "low",
    "question": "low",
    "discussion": "low",
    "good first issue": "low",
    "help wanted": "low",
    "p3": "low",
    "type: docs": "low",
}

# Tag mapping based on labels and content
TAG_MAP = {
    "bug": ["bug"],
    "security": ["security", "critical"],
    "api": ["api", "backend"],
    "ui": ["ui", "frontend"],
    "ux": ["ux", "frontend"],
    "performance": ["performance"],
    "database": ["database", "backend"],
    "auth": ["auth"],
    "authentication": ["auth", "backend"],
    "testing": ["testing"],
    "deployment": ["deployment"],
    "documentation": ["documentation"],
    "docs": ["documentation"],
    "frontend": ["frontend"],
    "backend": ["backend"],
    "cli": ["backend"],
    "mobile": ["frontend", "mobile"],
}

def fetch_issues(repo: str, max_pages: int = 5, state: str = "all") -> List[dict]:
    """
    Fetch issues from a GitHub repository.
    
    Args:
        repo: Repository in format "owner/repo"
        max_pages: Maximum number of pages to fetch (100 issues per page)
        state: "all", "open", or "closed"
    
    Returns:
        List of issue dictionaries
    """
    issues = []
    page = 1
    
    print(f"\n[INFO] Fetching issues from {repo}...")
    
    while page <= max_pages:
        url = f"https://api.github.com/repos/{repo}/issues"
        params = {
            "state": state,
            "per_page": 100,
            "page": page,
            "sort": "created",
            "direction": "desc"
        }
        
        try:
            response = requests.get(url, headers=HEADERS, params=params, timeout=10)
            
            if response.status_code == 403:
                reset_time = int(response.headers.get("X-RateLimit-Reset", 0))
                if reset_time:
                    wait_time = reset_time - int(time.time())
                    print(f"  [WARNING] Rate limit exceeded. Reset in {wait_time}s")
                    if wait_time > 0 and wait_time < 3600:
                        print(f"  [INFO] Waiting {wait_time}s...")
                        time.sleep(wait_time + 5)
                        continue
                break
                
            if response.status_code != 200:
                print(f"  [ERROR] {response.status_code} - {response.text[:100]}")
                break
            
            data = response.json()
            if not data:
                break
            
            # Filter out pull requests (GitHub API returns both)
            page_issues = [item for item in data if "pull_request" not in item]
            issues.extend(page_issues)
            
            print(f"  Page {page}: Found {len(page_issues)} issues (Total: {len(issues)})")
            
            # Check rate limit
            remaining = int(response.headers.get("X-RateLimit-Remaining", 999))
            if remaining < 10:
                print(f"  [WARNING] Only {remaining} API calls remaining")
            
            page += 1
            time.sleep(0.5)  # Be nice to GitHub API
            
        except requests.exceptions.RequestException as e:
            print(f"  [ERROR] Request failed: {e}")
            break
    
    print(f"  [SUCCESS] Fetched {len(issues)} issues from {repo}")
    return issues

def classify_issue(issue: dict) -> Tuple[str, List[str]]:
    """
    Classify issue priority and tags based on labels and content.
    
    Returns:
        (priority, tags)
    """
    labels = [label["name"].lower() for label in issue.get("labels", [])]
    title = issue.get("title", "").lower()
    body = (issue.get("body") or "").lower()
    text = f"{title} {body}"
    
    # Determine priority
    priority = "medium"  # default
    for label in labels:
        for keyword, mapped_priority in PRIORITY_MAP.items():
            if keyword in label:
                if mapped_priority == "high":
                    priority = "high"
                    break
                elif mapped_priority == "medium" and priority != "high":
                    priority = "medium"
                elif priority == "medium":
                    priority = mapped_priority
        if priority == "high":
            break
    
    # Determine tags from labels
    tags = set()
    for label in labels:
        for keyword, mapped_tags in TAG_MAP.items():
            if keyword in label:
                tags.update(mapped_tags)
    
    # Infer tags from content if none found
    if not tags or len(tags) < 2:
        # Check title and body for keywords
        if any(word in text for word in ["database", "sql", "postgres", "mysql", "mongodb"]):
            tags.update(["database", "backend"])
        if any(word in text for word in ["api", "endpoint", "rest", "graphql"]):
            tags.update(["api", "backend"])
        if any(word in text for word in ["ui", "button", "modal", "component", "css", "style"]):
            tags.update(["ui", "frontend"])
        if any(word in text for word in ["performance", "slow", "optimize", "speed"]):
            tags.add("performance")
        if any(word in text for word in ["security", "vulnerability", "exploit", "xss", "injection"]):
            tags.update(["security", "critical"])
        if any(word in text for word in ["auth", "login", "authentication", "jwt", "oauth"]):
            tags.update(["auth", "backend"])
        if any(word in text for word in ["deploy", "deployment", "production", "server"]):
            tags.add("deployment")
        if any(word in text for word in ["test", "testing", "unit test", "e2e"]):
            tags.add("testing")
        if any(word in text for word in ["docs", "documentation", "readme"]):
            tags.add("documentation")
    
    # Default tag if still empty
    if not tags:
        if "bug" in labels or "bug" in title:
            tags.add("bug")
        else:
            tags.add("feature")
    
    return priority, sorted(list(tags))

def main():
    parser = argparse.ArgumentParser(
        description="Collect GitHub issues for ML training",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        "--repos", 
        nargs="+", 
        required=True, 
        help="GitHub repos (format: owner/repo). Example: facebook/react microsoft/vscode"
    )
    parser.add_argument(
        "--output", 
        default="github_issues.csv", 
        help="Output CSV file (default: github_issues.csv)"
    )
    parser.add_argument(
        "--max-pages", 
        type=int, 
        default=5, 
        help="Max pages per repo (100 issues per page, default: 5 = 500 issues)"
    )
    parser.add_argument(
        "--state",
        choices=["all", "open", "closed"],
        default="all",
        help="Issue state to fetch (default: all)"
    )
    
    args = parser.parse_args()
    
    # Check for GitHub token
    if not GITHUB_TOKEN:
        print("\n[WARNING] No GITHUB_TOKEN found. Rate limit: 60 requests/hour")
        print("[INFO] Set token for 5000 requests/hour: $env:GITHUB_TOKEN='your_token'")
        print("[INFO] Get token at: https://github.com/settings/tokens\n")
    else:
        print(f"\n[INFO] Using GitHub token. Rate limit: 5000 requests/hour\n")
    
    all_data = []
    
    for repo in args.repos:
        issues = fetch_issues(repo, max_pages=args.max_pages, state=args.state)
        
        for issue in issues:
            title = issue.get("title", "")
            body = issue.get("body", "")
            
            # Combine title and body (limit body length)
            if body:
                text = f"{title}. {body[:300]}"  # First 300 chars of body
            else:
                text = title
            
            priority, tags = classify_issue(issue)
            
            all_data.append({
                "text": text,
                "priority": priority,
                "tags": "|".join(tags),
                "repo": repo,
                "url": issue.get("html_url", ""),
                "state": issue.get("state", ""),
                "created_at": issue.get("created_at", ""),
                "labels": ",".join([label["name"] for label in issue.get("labels", [])])
            })
    
    if not all_data:
        print("\n[ERROR] No issues collected. Check repo names and rate limits.")
        return
    
    # Save to CSV
    df = pd.DataFrame(all_data)
    df.to_csv(args.output, index=False, encoding="utf-8")
    
    print(f"\n{'='*60}")
    print(f"[SUCCESS] Saved {len(df)} issues to {args.output}")
    print(f"{'='*60}\n")
    
    print("Priority distribution:")
    print(df["priority"].value_counts())
    print(f"\nTop tags:")
    all_tags = [tag for tags in df["tags"] if tags for tag in tags.split("|")]
    tag_counts = pd.Series(all_tags).value_counts()
    print(tag_counts.head(15))
    
    print(f"\nRepos:")
    print(df["repo"].value_counts())
    
    print(f"\n[INFO] Next step: Train model with this data")
    print(f"[INFO] python train_issue_model.py --data {args.output}\n")

if __name__ == "__main__":
    main()
