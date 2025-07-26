from flask import Blueprint, request, jsonify
import requests
from bs4 import BeautifulSoup

bp = Blueprint('lyrics', __name__)
GENIUS_API_KEY = "Yf3tV4gRCT_8vYEYN69P4GE29TOoGS1A0wF3plJoJNk0WqmRZC6ApiKZf4ePYkUt"

@bp.route('/api/lyrics')
def get_lyrics():
    song_title = request.args.get('song')
    if not song_title:
        return jsonify({'error': 'No song title provided'}), 400
    headers = {"Authorization": f"Bearer {GENIUS_API_KEY}"}
    search_url = f"https://api.genius.com/search?q={song_title}"
    response = requests.get(search_url, headers=headers)
    if response.status_code != 200:
        return jsonify({'error': 'Failed to search Genius API'}), 500
    data = response.json()
    hits = data["response"]["hits"]
    if not hits:
        return jsonify({'lyrics': None}), 200
    song_url = hits[0]["result"]["url"]
    page = requests.get(song_url)
    soup = BeautifulSoup(page.text, "html.parser")
    lyrics_containers = soup.find_all("div", attrs={"data-lyrics-container": "true"})
    if lyrics_containers:
        lyrics = "\n\n".join([div.get_text(separator="\n").strip() for div in lyrics_containers])
    else:
        lyrics_div = soup.find("div", class_="lyrics")
        if lyrics_div:
            lyrics = lyrics_div.get_text(separator="\n").strip()
        else:
            lyrics = None
    return jsonify({'lyrics': lyrics})
