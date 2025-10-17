import requests
from bs4 import BeautifulSoup
import logging
import time
from urllib.parse import quote
import json
import os
from pathlib import Path

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

def fetch_lyrics(song_title):
    """Fetch lyrics from Genius API with caching and better error handling."""
    try:
        logger.info(f"Fetching lyrics for: {song_title}")
        
        # Check cache first
        cached = get_cached_lyrics(song_title)
        if cached:
            return cached

        # Prepare API request
        headers = {
            "Authorization": f"Bearer {GENIUS_API_KEY}",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        search_url = f"https://api.genius.com/search?q={quote(song_title)}"
        
        # Search Genius API
        logger.info(f"Searching Genius API: {search_url}")
        response = requests.get(search_url, headers=headers)
        response.raise_for_status()
        
        data = response.json()
        hits = data.get("response", {}).get("hits", [])
        
        if not hits:
            logger.warning(f"No results found for: {song_title}")
            return {"error": f"No lyrics found for '{song_title}'"}

        # Get first result
        first_hit = hits[0]["result"]
        song_url = first_hit["url"]
        song_title = first_hit["title"]
        
        logger.info(f"Found song: {song_title} at {song_url}")

        # Fetch lyrics page
        page = requests.get(
            song_url,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        )
        page.raise_for_status()
        
        soup = BeautifulSoup(page.text, "html.parser")
        
        # Try multiple methods to find lyrics
        lyrics = ""
        
        # Method 1: New Genius format
        lyrics_containers = soup.find_all("div", attrs={"data-lyrics-container": "true"})
        if lyrics_containers:
            lyrics = "\n\n".join([div.get_text(separator="\n").strip() for div in lyrics_containers])
            
        # Method 2: Old Genius format
        if not lyrics:
            lyrics_div = soup.find("div", class_="lyrics")
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