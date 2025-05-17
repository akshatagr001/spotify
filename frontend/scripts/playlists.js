const API_URL = `https://spotify-backend-6mr0.onrender.com`;

let playlists = {};
let allSongs = [];
let playlistModal = document.getElementById('playlist-modal');
let playlistNameInput = document.getElementById('playlist-name');
let playlistSongList = document.getElementById('playlist-song-list');
let savePlaylistBtn = document.getElementById('save-playlist');
let closeModal = document.querySelector('.close');

function renderPlaylistCards() {
    const playlistsView = document.getElementById('playlists-view');
    playlistsView.innerHTML = '';

    // Add new playlist card (always first)
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

    Object.entries(playlists).forEach(([name, songs], idx) => {
        if (!Array.isArray(songs) || songs.length === 0) return;
        const card = document.createElement('div');
        card.className = 'playlist-card playlist-fadein';
        const firstSong = songs[0];
        const image = firstSong && firstSong.image ?
            `${API_URL}/static/images/${firstSong.image}` :
            'default.jpg';

        card.innerHTML = `
            <img src="${image}" alt="${name}">
            <span>${name}</span>
        `;

        card.onclick = () => {
            alert(`Playlist: ${name}\nSongs:\n${songs.map(s => s.name.replace(/\.(mp3|m4a)$/,'')).join('\n')}`);
        };

        card.style.animationDelay = `${0.05 * (idx + 1)}s`;
        playlistsView.appendChild(card);
    });
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
                playlists[playlistName] = selectedSongs;
                renderPlaylistCards();
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

fetch(`${API_URL}/playlists`)
    .then(response => response.json())
    .then(data => {
        playlists = data.playlists;
        renderPlaylistCards();
    })
    .catch(error => console.error('Error loading playlists:', error));

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
