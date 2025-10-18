import requests
from bs4 import BeautifulSoup
import logging
import time
from urllib.parse import quote
import json
import os
import re
from pathlib import Path
from typing import Dict, Optional, Any

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

GENIUS_API_KEY = "Yf3tV4gRCT_8vYEYN69P4GE29TOoGS1A0wF3plJoJNk0WqmRZC6ApiKZf4ePYkUt"
CACHE_DIR = Path("lyrics_cache")
CACHE_DIR.mkdir(exist_ok=True)

def clean_filename(title):
    """Clean the title to create a valid filename."""
    return "".join(c for c in title if c.isalnum() or c in " -_").rstrip()

def get_cached_lyrics(song_title):
    """Try to get lyrics from cache."""
    try:
        cache_file = CACHE_DIR / f"{clean_filename(song_title)}.json"
        if cache_file.exists():
            with open(cache_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                # Check if cache is less than 1 week old
                if time.time() - data.get("cached_at", 0) < 7 * 24 * 3600:
                    logger.info(f"Cache hit for {song_title}")
                    return data
    except Exception as e:
        logger.error(f"Cache error for {song_title}: {e}")
    return None

def save_to_cache(song_title, data):
    """Save lyrics to cache."""
    try:
        cache_file = CACHE_DIR / f"{clean_filename(song_title)}.json"
        data["cached_at"] = time.time()
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Failed to cache lyrics for {song_title}: {e}")

def detect_language(text):
    """Detect if text contains Hindi characters."""
    return bool(re.search(r'[\u0900-\u097F]', text))

def clean_song_title(title):
    """Clean the song title for better search results."""
    if not title:
        return ""
        
    # Store original for logging
    original_title = title
        
    # Remove file extensions first
    title = re.sub(r'\.(mp3|m4a)$', '', title, flags=re.IGNORECASE)
    
    # Detect language after basic cleaning
    contains_devanagari = bool(re.search(r'[\u0900-\u097F]', title))
    contains_english = bool(re.search(r'[a-zA-Z]', title))
    
    logger.info(f"Language detection for '{title}': Hindi/Devanagari = {contains_devanagari}, English = {contains_english}")
    
    if contains_devanagari:
        # For Hindi songs, preserve more of the original text
        # Remove only clearly problematic parts
        title = re.sub(r'\b(official|video|audio|full|hd|hq)\b', '', title, flags=re.IGNORECASE)
        title = re.sub(r'\([^)]*\)|\[[^\]]*\]', '', title)
        # Keep spaces, dashes, and quotes that might be part of the title
        title = re.sub(r'["""'']', '', title )  # Remove smart quotes
        title = ' '.join(title.split())  # Just normalize whitespace
        
        # If title contains both scripts, generate both versions
        if contains_english:
            logger.info("Title contains both Hindi and English text")
            # Split into words and group by script
            words = title.split()
            devanagari_words = [w for w in words if re.search(r'[\u0900-\u097F]', w)]
            english_words = [w for w in words if re.search(r'[a-zA-Z]', w)]
            
            # Create alternative with only Devanagari words
            if devanagari_words:
                title = ' '.join(devanagari_words)
                logger.info(f"Using Devanagari-only version: {title}")
    else:
        # For English/other songs, be more aggressive with cleaning
        title = re.sub(r'\b(official|video|audio|full|lyrics|hd|hq)\b', '', title, flags=re.IGNORECASE)
        title = re.sub(r'\([^)]*\)|\[[^\]]*\]', '', title)
        title = re.sub(r'\b(feat\.?|ft\.?|featuring)\s+[^-]*', '', title, flags=re.IGNORECASE)
        title = re.sub(r'[^\w\s-]', ' ', title)  # Remove special characters except hyphen
        title = ' '.join(title.split())  # Normalize whitespace
    
    cleaned = title.strip()
    logger.info(f"Title cleaning: {original_title} -> {cleaned}")
    return cleaned

def fetch_lyrics(song_title):
    """Fetch lyrics from Genius API with caching and better error handling."""
    try:
        original_title = song_title
        logger.info(f"Original song title: {original_title}")
        
        # Clean the song title
        song_title = clean_song_title(song_title)
        logger.info(f"Cleaned song title: {song_title}")
        
        # Check cache first
        cached = get_cached_lyrics(song_title)
        if cached:
            logger.info(f"Cache hit for {song_title}")
            return cached

        # Prepare API request
        headers = {
            "Authorization": f"Bearer {GENIUS_API_KEY}",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }

        # Add common browser headers to avoid blocking
        browser_headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Cache-Control": "max-age=0"
        }

        # Set up retry parameters
        max_retries = 3
        retry_delay = 1  # seconds

        # Prepare search variations
        search_variations = [song_title]
        
        # Add variations with 'lyrics' keyword
        search_variations.append(f"{song_title} lyrics")
        
        # For Hindi songs, try with and without 'hindi lyrics'
        if detect_language(original_title):
            search_variations.extend([
                f"{song_title} hindi lyrics",
                f"{song_title} hindi song lyrics",
                # Try without diacritics/special chars for Hindi titles
                re.sub(r'[^\w\s]', '', song_title)
            ])
        
        # Try each search variation
        hits = []
        for search_query in search_variations:
            search_url = f"https://api.genius.com/search?q={quote(search_query)}"
            logger.info(f"Trying search variation: {search_query}")
            
            for attempt in range(max_retries):
                try:
                    logger.info(f"Searching Genius API (attempt {attempt + 1}): {search_url}")
                    response = requests.get(search_url, headers=headers, timeout=10)
                    response.raise_for_status()
                    
                    data = response.json()
                    hits = data.get("response", {}).get("hits", [])
                    
                    if hits:
                        logger.info(f"Found {len(hits)} results with variation: {search_query}")
                        break
                        
                    if attempt < max_retries - 1:
                        time.sleep(retry_delay)
                        continue
                        
                except requests.exceptions.RequestException as e:
                    if attempt < max_retries - 1:
                        logger.warning(f"Attempt {attempt + 1} failed: {e}")
                        time.sleep(retry_delay)
                        continue
                    logger.error(f"All attempts failed for variation {search_query}: {e}")
            
            if hits:
                break
        
        if not hits:
            logger.warning(f"No results found for any variation of: {song_title}")
            return {"error": f"No lyrics found for '{song_title}'"}

        # Get first result
        first_hit = hits[0]["result"]
        song_url = first_hit["url"]
        song_title = first_hit["title"]
        
        logger.info(f"Found song: {song_title} at {song_url}")

        # Function to fetch page with retries
        def fetch_page_with_retries(url, max_retries=3, delay=1):
            for attempt in range(max_retries):
                try:
                    logger.info(f"Fetching lyrics page (attempt {attempt + 1}): {url}")
                    session = requests.Session()

                    # Make headers more browser-like and include a Referer
                    fetch_headers = browser_headers.copy()
                    fetch_headers.update({
                        "Referer": "https://genius.com/",
                        # Client hints (may help bypass simple bot checks)
                        "sec-ch-ua": '"Chromium";v="116", "Not)A;Brand";v="24"',
                        "sec-ch-ua-mobile": "?0",
                        "sec-ch-ua-platform": '"Windows"',
                    })

                    # Use the session to persist cookies and headers
                    session.headers.update(fetch_headers)

                    # First, make a HEAD request to warm up cookies (some sites respond differently)
                    try:
                        session.head(url, timeout=10)
                    except requests.exceptions.RequestException:
                        # Non-fatal: continue to GET which will surface the real status
                        pass

                    # Then get the actual page
                    page = session.get(url, timeout=10)
                    page.raise_for_status()
                    return page
                except requests.exceptions.RequestException as e:
                    if attempt < max_retries - 1:
                        logger.warning(f"Page fetch attempt {attempt + 1} failed: {e}")
                        time.sleep(delay)
                        continue
                    # If we've exhausted retries, re-raise so outer handler can decide
                    raise
            return None

        # Fallback: try to fetch via a text-proxy if direct requests are blocked (e.g., 403)
        def fetch_via_text_proxy(url):
            try:
                logger.info(f"Attempting fallback proxy fetch for: {url}")
                # Use jina.ai text proxy which fetches and returns a textified version of the page
                # Construct a proxy URL that proxies the target page
                # Example: https://r.jina.ai/http://genius.com/... returns a text-based rendering
                if url.startswith("https://"):
                    proxy_target = url.replace("https://", "http://")
                else:
                    proxy_target = url
                proxy_url = f"https://r.jina.ai/http://{proxy_target.lstrip('http://').lstrip('https://')}"
                resp = requests.get(proxy_url, headers={"User-Agent": browser_headers.get("User-Agent")}, timeout=15)
                resp.raise_for_status()
                # Wrap the text response in a minimal object that mimics requests.Response
                class SimplePage:
                    def __init__(self, text, url):
                        self.text = text
                        self.url = url
                return SimplePage(resp.text, url)
            except requests.exceptions.RequestException as e:
                logger.warning(f"Proxy fetch failed: {e}")
                return None

        # Fetch lyrics page with retry mechanism
        try:
            page = fetch_page_with_retries(song_url)
        except requests.exceptions.RequestException as e:
            logger.warning(f"Direct fetch failed with exception: {e}")
            page = None

        # If direct fetch failed or returned None, try the text proxy fallback
        if not page:
            logger.info("Direct fetch failed or blocked; attempting proxy fallback")
            page = fetch_via_text_proxy(song_url)

        if not page:
            return {"error": f"Failed to fetch lyrics page after multiple attempts"}
        
        soup = BeautifulSoup(page.text, "html.parser")
        
        # Try multiple methods to find lyrics
        lyrics = ""
        
        # Method 1: New Genius format
        lyrics_containers = soup.find_all("div", attrs={"data-lyrics-container": "true"})
        if lyrics_containers:
            lyrics = "\n\n".join([container.get_text(separator="\n").strip() for container in lyrics_containers])
            
        # Method 2: Old Genius format
        if not lyrics:
            lyrics_div = soup.find("div", class_="lyrics")
            if lyrics_div:
                lyrics = lyrics_div.get_text(separator="\n").strip()
                
        # Method 3: Alternative container format
        if not lyrics:
            lyrics_div = soup.find("div", class_="Lyrics__Container-sc-1ynbvzw-6")
            if lyrics_div:
                lyrics = lyrics_div.get_text(separator="\n").strip()

        # If we found lyrics, clean them up
        if lyrics:
            # Clean up common issues
            lyrics = lyrics.replace("[", "\n[")  # Put section headers on new lines
            lyrics = "\n".join(line.strip() for line in lyrics.split("\n"))  # Clean whitespace
            lyrics = "\n".join(filter(None, lyrics.split("\n")))  # Remove empty lines
            
            result = {
                "lyrics": lyrics,
                "source_url": song_url,
                "title": song_title
            }
            
            # Cache the successful result
            save_to_cache(song_title, result)
            
            logger.info(f"Successfully fetched lyrics for {song_title}")
            return result
        
        logger.warning(f"No lyrics found in page for {song_title}")
        return {"error": f"Could not extract lyrics from {song_url}"}
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Network error for {song_title}: {e}")
        return {"error": f"Network error: {str(e)}"}
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON from Genius API for {song_title}: {e}")
        return {"error": "Invalid response from Genius API"}
    except Exception as e:
        logger.error(f"Unexpected error for {song_title}: {e}", exc_info=True)
        return {"error": f"An unexpected error occurred: {str(e)}"}