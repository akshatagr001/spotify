import requests
from bs4 import BeautifulSoup

GENIUS_API_KEY = "Yf3tV4gRCT_8vYEYN69P4GE29TOoGS1A0wF3plJoJNk0WqmRZC6ApiKZf4ePYkUt"

def fetch_lyrics(song_title):
    try:
        headers = {"Authorization": f"Bearer {GENIUS_API_KEY}"}
        search_url = f"https://api.genius.com/search?q={song_title}"

        response = requests.get(search_url, headers=headers)
        if response.status_code != 200:
            return {"error": "Failed to search Genius API"}

        data = response.json()
        hits = data["response"]["hits"]
        if not hits:
            return {"error": "Lyrics not found"}

        song_url = hits[0]["result"]["url"]
        page = requests.get(song_url)
        soup = BeautifulSoup(page.text, "html.parser")

        # Try new format first - multiple divs with data-lyrics-container="true"
        lyrics_containers = soup.find_all("div", attrs={"data-lyrics-container": "true"})
        if lyrics_containers:
            lyrics = "\n\n".join([div.get_text(separator="\n").strip() for div in lyrics_containers])
        else:
            # Fallback to old format
            lyrics_div = soup.find("div", class_="lyrics")
            if lyrics_div:
                lyrics = lyrics_div.get_text(separator="\n").strip()
            else:
                return {"error": "Lyrics not found on the page"}

        return {
            "lyrics": lyrics,
            "source_url": song_url
        }
    except Exception as e:
        return {"error": str(e)}