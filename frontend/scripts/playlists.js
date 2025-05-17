const API_URL = `https://spotify-backend-6mr0.onrender.com`;

let playlists = {};
let allSongs = [];
let playlistModal = document.getElementById('playlist-modal');
let playlistNameInput = document.getElementById('playlist-name');
let playlistSongList = document.getElementById('playlist-song-list');
let savePlaylistBtn = document.getElementById('save-playlist');
let closeModal = document.querySelector('.close');
let currentPlaylist = null;
let currentIndex = 0;

// Fetch playlists from database and render cards
function fetchAndRenderPlaylists() {
    fetch(`${API_URL}/playlists`)
        .then(response => response.json())
        .then(data => {
            playlists = data.playlists || {};
            renderPlaylistCards();
        })
        .catch(error => console.error('Error loading playlists:', error));
}

function renderPlaylistCards() {
    const playlistsView = document.getElementById('playlists-view');
    playlistsView.innerHTML = '';

    // Create Playlist button
    const newPlaylistCard = document.createElement('div');
    newPlaylistCard.className = 'playlist-card new-playlist playlist-fadein';
    newPlaylistCard.innerHTML = `
        <div class="plus-icon">
            <i class="fas fa-plus"></i>
        </div>
        <span>Create Playlist</span>
    `;
    newPlaylistCard.onclick = () => {
        playlistModal.style.display = 'block';
        updatePlaylistSongList();
    };
    playlistsView.appendChild(newPlaylistCard);

    // Render existing playlists
    Object.entries(playlists).forEach(([name, songs], idx) => {
        if (!Array.isArray(songs) || songs.length === 0) return;
        
        const card = document.createElement('div');
        card.className = 'playlist-card playlist-fadein';
        const firstSong = songs[0];
        const image = firstSong?.image ? 
            `${API_URL}/static/images/${firstSong.image}` : 
            'default.jpg';

        card.innerHTML = `
            <img src="${image}" alt="${name}">
            <span>${name}</span>
        `;

        card.onclick = () => showPlaylistSongs(name, songs);
        playlistsView.appendChild(card);
    });

    // Show all cards with animation
    setTimeout(() => {
        document.querySelectorAll('.playlist-card').forEach(card => {
            card.classList.add('show');
        });
    }, 10);
}

function showPlaylistSongs(playlistName, songs) {
    const playlistsView = document.getElementById('playlists-view');
    const songListDiv = document.getElementById('playlist-songs');
    const title = document.querySelector('h1');

    playlistsView.style.display = 'none';
    songListDiv.style.display = 'flex';
    title.textContent = playlistName;
    songListDiv.innerHTML = '';

    // Add back button
    const backBtn = document.createElement('button');
    backBtn.className = 'back-button';
    backBtn.innerHTML = '<i class="fas fa-arrow-left"></i> Back';
    backBtn.onclick = () => {
        playlistsView.style.display = 'grid';
        songListDiv.style.display = 'none';
        title.textContent = 'Playlists';
    };
    songListDiv.appendChild(backBtn);

    // Render songs
    songs.forEach((song, index) => {
        const btn = document.createElement('button');
        btn.className = 'playlist-song';
        btn.innerHTML = `
            <img src="${song.image ? `${API_URL}/static/images/${song.image}` : 'default.jpg'}" 
                 alt="${song.name}"
                 onerror="this.src='default.jpg'">
            <span>${song.name.replace(/\.(mp3|m4a)$/, '')}</span>
        `;
        btn.onclick = () => playSong(index, songs);
        songListDiv.appendChild(btn);
    });

    currentPlaylist = songs;
}

function updatePlaylistSongList() {
    playlistSongList.innerHTML = '';
    allSongs.forEach(song => {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = song.name;
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(song.name.replace(/\.(mp3|m4a)$/, '')));
        playlistSongList.appendChild(label);
    });
}

if (savePlaylistBtn) {
    savePlaylistBtn.onclick = async () => {
        const playlistName = playlistNameInput.value.trim();
        if (!playlistName) {
            alert('Please enter a playlist name');
            return;
        }
        const selectedSongs = Array.from(playlistSongList.querySelectorAll('input[type="checkbox"]:checked'))
            .map(checkbox => {
                const song = allSongs.find(s => s.name === checkbox.value);
                return song;
            });
        if (selectedSongs.length === 0) {
            alert('Please select at least one song');
            return;
        }
        try {
            const response = await fetch(`${API_URL}/playlists/${encodeURIComponent(playlistName)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ songs: selectedSongs })
            });
            if (response.ok) {
                // Refresh playlists from database after creation
                fetchAndRenderPlaylists();
                playlistModal.style.display = 'none';
                playlistNameInput.value = '';
                alert('Playlist created successfully!');
            } else {
                alert('Error creating playlist');
            }
        } catch (error) {
            console.error('Error saving playlist:', error);
            alert('Error saving playlist');
        }
    };
}

if (closeModal) {
    closeModal.onclick = () => {
        playlistModal.style.display = 'none';
    };
}
if (window && playlistModal) {
    window.onclick = (event) => {
        if (event.target === playlistModal) {
            playlistModal.style.display = 'none';
        }
    };
}

// Fetch all songs for playlist creation
fetch(`${API_URL}/songs`)
    .then(response => response.json())
    .then(data => {
        if (Array.isArray(data?.songs)) {
            allSongs = data.songs;
        } else {
            allSongs = [];
        }
    })
    .catch(error => {
        allSongs = [];
    });

// Initial fetch and render of playlists
fetchAndRenderPlaylists();

// Import necessary player functions
document.addEventListener('DOMContentLoaded', () => {
    const audioPlayer = document.getElementById('audio-player');
    const playPauseBtn = document.getElementById('play-pause');
    const progressBar = document.getElementById('progress');
    const currentTimeEl = document.getElementById('current-time');
    const durationEl = document.getElementById('duration');
    const songListDiv = document.getElementById('playlist-songs');
    const prevTrackBtn = document.getElementById('prev-track');
    const nextTrackBtn = document.getElementById('next-track');

    let currentSongs = [];

    function renderPlaylistSongs(playlistName, songs) {
        const songListDiv = document.getElementById('playlist-songs');
        if (!songListDiv) return;

        songListDiv.innerHTML = '';
        document.querySelector('h1').textContent = playlistName;
        
        // Hide grid and show song list
        document.getElementById('playlists-view').style.display = 'none';
        songListDiv.style.display = 'flex';

        // Add back button
        const backBtn = document.createElement('button');
        backBtn.className = 'back-button';
        backBtn.innerHTML = '<i class="fas fa-arrow-left"></i> Back';
        backBtn.onclick = () => {
            document.getElementById('playlists-view').style.display = 'grid';
            songListDiv.style.display = 'none';
            document.querySelector('h1').textContent = 'Playlists';
        };
        songListDiv.appendChild(backBtn);

        songs.forEach((song, index) => {
            const btn = document.createElement('button');
            btn.className = currentIndex === index ? 'active' : '';
            btn.innerHTML = `
                <img src="${song.image ? `${API_URL}/static/images/${song.image}` : 'default.jpg'}" 
                     alt="${song.name}"
                     onerror="this.src='default.jpg'">
                <span>${song.name.replace(/\.(mp3|m4a)$/, '')}</span>
            `;
            btn.addEventListener('click', () => playSong(index, songs));
            songListDiv.appendChild(btn);
        });
    }

    function playSong(index, songs) {
        currentIndex = index;
        currentSongs = songs;
        const song = songs[index];
        
        if (audioPlayer) {
            audioPlayer.src = `${API_URL}/stream/${song.name}`;
            audioPlayer.play()
                .then(() => {
                    playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
                })
                .catch(error => console.error('Error playing song:', error));
        }

        // Update now playing info
        document.getElementById('now-playing-img').src = 
            song.image ? `${API_URL}/static/images/${song.image}` : 'default.jpg';
        document.getElementById('now-playing-title').textContent = 
            song.name.replace(/\.(mp3|m4a)$/, '');

        // Update active song in list
        document.querySelectorAll('#playlist-songs button').forEach(btn => btn.classList.remove('active'));
        songListDiv.children[index + 1].classList.add('active'); // +1 because of back button
    }

    // Player Controls
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', () => {
            if (audioPlayer.paused) {
                audioPlayer.play();
                playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            } else {
                audioPlayer.pause();
                playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            }
        });
    }

    // Progress bar
    audioPlayer.addEventListener('timeupdate', () => {
        if (!isNaN(audioPlayer.duration)) {
            const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
            progressBar.value = progress;
            progressBar.style.setProperty('--value', `${progress}%`);
            currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
            durationEl.textContent = formatTime(audioPlayer.duration);
        }
    });

    progressBar.addEventListener('click', (e) => {
        const bounds = progressBar.getBoundingClientRect();
        const percent = (e.clientX - bounds.left) / bounds.width;
        audioPlayer.currentTime = percent * audioPlayer.duration;
    });

    // Track navigation
    prevTrackBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
            playSong(currentIndex - 1, currentSongs);
        }
    });

    nextTrackBtn.addEventListener('click', () => {
        if (currentIndex < currentSongs.length - 1) {
            playSong(currentIndex + 1, currentSongs);
        }
    });

    audioPlayer.addEventListener('ended', () => {
        if (currentIndex < currentSongs.length - 1) {
            playSong(currentIndex + 1, currentSongs);
        }
    });

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    // Load playlists
    fetch(`${API_URL}/playlists`)
        .then(response => response.json())
        .then(data => {
            playlists = data.playlists;
            renderPlaylistCards();
        });

    function renderPlaylistCards() {
        playlistsGrid.innerHTML = '';
        
        Object.entries(playlists).forEach(([name, songs]) => {
            const card = document.createElement('div');
            card.className = 'playlist-card';
            
            const firstSong = songs[0];
            card.innerHTML = `
                <img src="${firstSong?.image ? `${API_URL}/static/images/${firstSong.image}` : 'default.jpg'}" alt="${name}">
                <span>${name}</span>
            `;
            
            card.onclick = () => renderPlaylistSongs(name, songs);
            playlistsGrid.appendChild(card);
        });
    }
});
