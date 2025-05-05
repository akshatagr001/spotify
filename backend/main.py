from fastapi import FastAPI, Response, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import logging
from models import Playlist
from database import init_db
from tortoise.contrib.fastapi import register_tortoise

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Configure CORS
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SONGS_FOLDER = "./static/songs"
IMAGES_FOLDER = "./static/images"
DEFAULT_IMAGE = "./static/images/default.jpg"

# Create default image if it doesn't exist
if not os.path.exists(DEFAULT_IMAGE):
    os.makedirs(IMAGES_FOLDER, exist_ok=True)
    if os.path.exists("./static/download.JPG"):
        import shutil
        shutil.copy("./static/download.JPG", DEFAULT_IMAGE)

@app.get("/songs")
def get_song_list():
    try:
        if not os.path.exists(SONGS_FOLDER):
            logger.error(f"Songs folder not found: {SONGS_FOLDER}")
            return {"songs": [], "error": "Songs folder not found"}
            
        if not os.path.exists(IMAGES_FOLDER):
            logger.error(f"Images folder not found: {IMAGES_FOLDER}")
            return {"songs": [], "error": "Images folder not found"}

        songs = [song for song in os.listdir(SONGS_FOLDER) if song.endswith((".mp3", ".m4a"))]
        logger.info(f"Found {len(songs)} songs")
        
        images = {os.path.splitext(image)[0].upper(): image 
                 for image in os.listdir(IMAGES_FOLDER) 
                 if image.lower().endswith((".jpg", ".jpeg", ".png"))}
        logger.info(f"Found {len(images)} images")
        
        song_data = []
        for song in songs:
            song_name = os.path.splitext(song)[0].upper()
            image = images.get(song_name)
            if image:
                image_path = os.path.join(IMAGES_FOLDER, image)
                if not os.path.exists(image_path):
                    logger.warning(f"Image not found for song {song_name}: {image_path}")
                    image = "default.jpg"
            else:
                logger.info(f"No image found for song {song_name}")
                image = "default.jpg"
                
            song_data.append({
                "name": song,
                "image": image
            })
        
        if not song_data:
            logger.warning("No songs found in the directory")
            return {"songs": [], "error": "No songs found"}
            
        logger.info(f"Returning {len(song_data)} songs")
        return {"songs": song_data}
    except Exception as e:
        logger.error(f"Error loading songs: {e}")
        return {"songs": [], "error": str(e)}

@app.get("/stream/{song_name}")
def stream_song(song_name: str):
    try:
        song_path = os.path.join(SONGS_FOLDER, song_name)
        if os.path.exists(song_path):
            if song_path.endswith('.mp3'):
                return FileResponse(song_path, media_type="audio/mpeg")
            elif song_path.endswith('.m4a'):
                return FileResponse(song_path, media_type="audio/mp4")
        logger.error(f"Song not found: {song_path}")
        return Response("Song not found", status_code=404)
    except Exception as e:
        logger.error(f"Error streaming song: {e}")
        return Response("Error streaming song", status_code=500)

# Serve static files
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/playlists")
async def get_playlists():
    try:
        playlists = await Playlist.all()
        return {
            "playlists": {
                playlist.name: playlist.songs for playlist in playlists
            }
        }
    except Exception as e:
        logger.error(f"Error loading playlists: {e}")
        return {"playlists": {}}

@app.post("/playlists/{playlist_name}")
async def create_playlist(playlist_name: str, request: Request):
    try:
        playlist_data = await request.json()
        
        # Check if playlist exists
        playlist = await Playlist.get_or_none(name=playlist_name)
        
        if playlist:
            # Update existing playlist
            playlist.songs = playlist_data["songs"]
            await playlist.save()
        else:
            # Create new playlist
            await Playlist.create(name=playlist_name, songs=playlist_data["songs"])
            
        return JSONResponse({"message": "Playlist saved successfully"})
    except Exception as e:
        logger.error(f"Error saving playlist: {e}")
        return JSONResponse(
            status_code=500,
            content={"message": f"Error saving playlist: {str(e)}"}
        )

@app.delete("/playlists/{playlist_name}")
async def delete_playlist(playlist_name: str):
    try:
        playlist = await Playlist.get_or_none(name=playlist_name)
        if playlist:
            await playlist.delete()
            return JSONResponse({"message": "Playlist deleted successfully"})
        return JSONResponse(
            status_code=404,
            content={"message": "Playlist not found"}
        )
    except Exception as e:
        logger.error(f"Error deleting playlist: {e}")
        return JSONResponse(
            status_code=500,
            content={"message": f"Error deleting playlist: {str(e)}"}
        )

@app.get("/recommendations")
def get_recommendations():
    try:
        # Example static recommendations; replace with dynamic logic
        recommendations = [
            {"title": "Song 1"},
            {"title": "Song 2"},
            {"title": "Song 3"},
        ]
        return {"recommendations": recommendations}
    except Exception as e:
        logger.error(f"Error fetching recommendations: {e}")
        return {"recommendations": [], "error": str(e)}

@app.get("/api/recommendations")
def get_recommendations():
    try:
        # Get all available songs
        songs = [song for song in os.listdir(SONGS_FOLDER) if song.endswith((".mp3", ".m4a"))]
        if not songs:
            return {"recommendations": []}

        # Randomly select up to 5 songs
        import random
        num_recommendations = min(5, len(songs))
        recommended_songs = random.sample(songs, num_recommendations)

        # Get song data including images
        recommendations = []
        images = {os.path.splitext(image)[0].upper(): image 
                 for image in os.listdir(IMAGES_FOLDER) 
                 if image.lower().endswith((".jpg", ".jpeg", ".png"))}

        for song in recommended_songs:
            song_name = os.path.splitext(song)[0].upper()
            image = images.get(song_name, "default.jpg")
            recommendations.append({
                "title": song_name,
                "name": song,
                "image": image
            })

        return {"recommendations": recommendations}
    except Exception as e:
        logger.error(f"Error fetching recommendations: {e}")
        return {"recommendations": [], "error": str(e)}

# Initialize Tortoise ORM
register_tortoise(
    app,
    config={
        "connections": {"default": os.getenv("DATABASE_URL")},
        "apps": {
            "models": {
                "models": ["models"],
                "default_connection": "default",
            },
        },
        "use_tz": False,
    },
    generate_schemas=True,
)

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

