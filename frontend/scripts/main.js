// Global state variables
let contextMenu = null;
let currentContextSong = null;
let playlists = {};
let currentPlaylist = null;
let allSongs = [];
let filteredSongs = [];
let songList = [];
let currentIndex = 0;
let currentButton = null;
let shuffleMode = false;
let isDragging = false;
let wasPlaying = false;
let searchTimeout;

// DOM element selections - moved all together
const songListDiv = document.getElementById('song-list');
const audioPlayer = document.getElementById('audio-player');
const playPauseBtn = document.getElementById('play-pause');
const prevTrackBtn = document.getElementById('prev-track');
const nextTrackBtn = document.getElementById('next-track');
const shuffleBtn = document.getElementById('shuffle');
const progressBar = document.getElementById('progress');
const volumeControl = document.getElementById('volume-control');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');
const nowPlayingImg = document.getElementById('now-playing-img');
const nowPlayingTitle = document.getElementById('now-playing-title');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const playlistSelect = document.getElementById('playlist-select');
const createPlaylistBtn = document.getElementById('create-playlist-btn');
const playlistModal = document.getElementById('playlist-modal');
const closeModal = document.querySelector('.close');
const playlistNameInput = document.getElementById('playlist-name');
const playlistSongList = document.getElementById('playlist-song-list');
const savePlaylistBtn = document.getElementById('save-playlist');

// Network configuration
const API_URL = `https://spotify-backend-6mr0.onrender.com`;

// Utility functions
function formatTime(seconds) {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function fetchRecommendations() {
    fetch(`${API_URL}/api/recommendations`)
        .then(response => response.json())
        .then(data => {
            const recommendationsGrid = document.getElementById('recommendations-grid');
            if (!recommendationsGrid) return;
            
            recommendationsGrid.innerHTML = '';
            const recommendations = data.recommendations?.slice(0, 10) || [];
            
            recommendations.forEach(song => {
                const div = document.createElement('div');
                div.className = 'recommendation-item';
                div.innerHTML = `
                    <img src="${song.image ? `${API_URL}/static/images/${song.image}` : 'default.jpg'}" 
                         alt="${song.title}">
                    <div class="recommendation-info">
                        <p class="recommendation-title">${song.title}</p>
                        <p class="recommendation-plays">${song.play_count} plays</p>
                    </div>
                `;
                div.addEventListener('click', () => {
                    const songIndex = allSongs.findIndex(s => s.name === song.name);
                    if (songIndex !== -1) {
                        playSong(songIndex);
                    }
                });
                recommendationsGrid.appendChild(div);
            });
        })
        .catch(error => console.error('Error fetching recommendations:', error));
}

// Function declarations - move before usage
function updateLastSession() {
    fetch(`${API_URL}/recently-played`)
        .then(response => response.json())
        .then(data => {
            const lastSessionTracks = document.getElementById('last-session-tracks');
            if (!lastSessionTracks) return;
            
            lastSessionTracks.innerHTML = '';
            if (Array.isArray(data.recently_played) && data.recently_played.length > 0) {
                data.recently_played.slice(0, 25).forEach(song => {
                    // Only create button if song exists in allSongs
                    const songIndex = allSongs.findIndex(s => s.name === song.name);
                    if (songIndex === -1) return;

                    const btn = document.createElement('button');
                    const img = document.createElement('img');
                    const text = document.createElement('span');
                    
                    img.src = song.image ? `${API_URL}/static/images/${song.image}` : 'default.jpg';
                    img.alt = song.name;
                    
                    text.innerText = song.name.replace(/\.(mp3|m4a)$/, '');
                    
                    btn.appendChild(img);
                    btn.appendChild(text);
                    btn.onclick = () => {
                        if (songIndex !== -1) {
                            playSong(songIndex);
                        }
                    };
                    
                    lastSessionTracks.appendChild(btn);
                });
            } else {
                lastSessionTracks.innerHTML = '<p style="color:#b3b3b3;font-weight:bold;">No recently played songs</p>';
            }
        })
        .catch(error => {
            console.error('Error fetching last session:', error);
        });
}

function playSong(index) {
    // Defensive: ensure songList[index] exists and has a valid .name string
    if (
        !songList ||
        !songList[index] ||
        typeof songList[index].name !== 'string' ||
        !songList[index].name.trim()
    ) {
        console.error('Invalid song data');
        return;
    }

    const song = songList[index];
    currentIndex = index;
    
    // Use originalName for audio source if available, fallback to name
    const audioName = song.originalName || song.name;
    if (!audioName) {
        console.error('Invalid song data: missing filename');
        return;
    }

    const audioSrc = `${API_URL}/stream/${encodeURIComponent(audioName)}`;
    console.log('Playing:', audioSrc); // Debug log

    // Track user activity if song.name exists
    if (song.name) {
        fetch(`${API_URL}/track-activity/${encodeURIComponent(song.name)}`, {
            method: 'POST'
        })
        .then(() => {
            updateLastSession();
            fetchRecommendations();
        })
        .catch(error => console.error('Error tracking activity:', error));
    }

    // Update UI only if elements exist
    if (currentButton) currentButton.classList.remove('active');
    if (typeof currentIndex === "number" && songListDiv?.children[currentIndex]) {
        currentButton = songListDiv.children[currentIndex];
        currentButton.classList.add('active');
    }

    // Update now playing info
    if (nowPlayingImg) {
        nowPlayingImg.src = song.image
            ? `${API_URL}/static/images/${song.image}`
            : (song.thumbnail || 'default.jpg');
    }
    if (nowPlayingTitle) {
        nowPlayingTitle.textContent = song.title || (song.name ? song.name.replace(/\.(mp3|m4a)$/, '') : '');
    }

    // Update audio source and play
    if (audioPlayer) {
        audioPlayer.src = audioSrc;
        audioPlayer.load();
        audioPlayer.play()
            .then(() => {
                playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            })
            .catch(error => {
                console.error('Error playing song:', error);
                console.log('Attempted source:', audioSrc);
            });
    }
}

// Progress bar interaction
progressBar.addEventListener('click', (e) => {
    if (!isFinite(audioPlayer.duration) || audioPlayer.duration === 0) return;
    const bounds = progressBar.getBoundingClientRect();
    const x = e.clientX - bounds.left;
    const percentage = x / bounds.width;
    audioPlayer.currentTime = percentage * audioPlayer.duration;
});

progressBar.addEventListener('mousedown', (e) => {
    isDragging = true;
    wasPlaying = !audioPlayer.paused;
    if (wasPlaying) {
        audioPlayer.pause();
    }
});

progressBar.addEventListener('mousemove', (e) => {
    if (isDragging && isFinite(audioPlayer.duration) && audioPlayer.duration > 0) {
        const bounds = progressBar.getBoundingClientRect();
        const x = e.clientX - bounds.left;
        const percentage = Math.min(Math.max(x / bounds.width, 0), 1);
        progressBar.value = percentage * 100;
        const time = percentage * audioPlayer.duration;
        // Only update the time display, not audioPlayer.currentTime
        const currentMinutes = Math.floor(time / 60);
        const currentSeconds = Math.floor(time % 60);
        currentTimeEl.textContent = `${currentMinutes}:${currentSeconds.toString().padStart(2, '0')}`;
    }
});

progressBar.addEventListener('mouseup', (e) => {
    if (isDragging && isFinite(audioPlayer.duration) && audioPlayer.duration > 0) {
        isDragging = false;
        const bounds = progressBar.getBoundingClientRect();
        const x = e.clientX - bounds.left;
        const percentage = Math.min(Math.max(x / bounds.width, 0), 1);
        audioPlayer.currentTime = percentage * audioPlayer.duration;
        if (wasPlaying) {
            audioPlayer.play();
        }
        wasPlaying = false;
    }
});

// Handle cases where mouse is released outside the progress bar
document.addEventListener('mouseup', (e) => {
    if (isDragging && isFinite(audioPlayer.duration) && audioPlayer.duration > 0) {
        isDragging = false;
        const bounds = progressBar.getBoundingClientRect();
        let percentage;
        if (
            e.clientX >= bounds.left &&
            e.clientX <= bounds.right &&
            e.clientY >= bounds.top &&
            e.clientY <= bounds.bottom
        ) {
            const x = e.clientX - bounds.left;
            percentage = Math.min(Math.max(x / bounds.width, 0), 1);
        } else {
            percentage = progressBar.value / 100;
        }
        audioPlayer.currentTime = percentage * audioPlayer.duration;
        if (wasPlaying) {
            audioPlayer.play();
        }
        wasPlaying = false;
    }
});

// Update progress bar and time displays
audioPlayer.addEventListener('timeupdate', () => {
    if (!isNaN(audioPlayer.duration)) {
        const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progressBar.value = progress;
        progressBar.style.setProperty('--value', `${progress}%`);
        // Update current time display
        currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
        // Update duration display if not already set
        if (durationEl.textContent === '0:00') {
            durationEl.textContent = formatTime(audioPlayer.duration);
        }
    }
});

// Update duration when metadata is loaded
audioPlayer.addEventListener('loadedmetadata', () => {
    const durationMinutes = Math.floor(audioPlayer.duration / 60);
    const durationSeconds = Math.floor(audioPlayer.duration % 60);
    durationEl.textContent = `${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}`;
});

// Wrap all playlist-related code in DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const menuLines = document.querySelector('.menu-lines');
    const playlistsBtn = document.getElementById('playlists-btn');
    const lastSessionTracks = document.getElementById('last-session-tracks');

    // Initialize hamburger menu
    if (menuLines && hamburgerMenu) {
        menuLines.addEventListener('click', () => {
            hamburgerMenu.classList.toggle('active');
        });
    }

    // Initialize playlist button click handler
    if (playlistsBtn) {
        playlistsBtn.addEventListener('click', () => {
            // Animate all playlist cards
            setTimeout(() => {
                document.querySelectorAll('.playlist-fadein').forEach(card => {
                    card.classList.add('show');
                });
            }, 10);
            // Close hamburger menu
            if (hamburgerMenu) hamburgerMenu.classList.remove('active');
        });
    }

    // Initialize last session
    if (lastSessionTracks) {
        updateLastSession();
    }

    // Define renderSongList inside DOMContentLoaded to ensure DOM is ready
    function renderSongList() {
        const songListDiv = document.getElementById('song-list');
        if (!songListDiv) {
            console.error('Song list container not found');
            return;
        }

        console.log('Rendering songs:', songList?.length || 0);
        songListDiv.innerHTML = '';

        if (!Array.isArray(songList) || songList.length === 0) {
            songListDiv.innerHTML = '<p style="color: #b3b3b3;">No songs found</p>';
            return;
        }

        songList.forEach((song, index) => {
            if (!song?.name) {
                console.warn('Invalid song data:', song);
                return;
            }

            const button = document.createElement('button');
            const img = document.createElement('img');
            const span = document.createElement('span');

            img.src = song.image ? `${API_URL}/static/images/${song.image}` : 'default.jpg';
            img.alt = song.name;
            img.onerror = () => img.src = 'default.jpg';

            span.textContent = song.name.replace(/\.(mp3|m4a)$/, '');

            button.appendChild(img);
            button.appendChild(span);
            
            // Safe event binding
            button.addEventListener('click', () => playSong(index));

            songListDiv.appendChild(button);
        });
    }

    // Load songs first, then render
    fetch(`${API_URL}/songs`)
        .then(response => response.json())
        .then(data => {
            if (Array.isArray(data?.songs)) {
                allSongs = data.songs;
                songList = allSongs;
                console.log('Songs loaded:', allSongs.length);
                renderSongList(); // Call render after songs are loaded
                updateLastSession();
                fetchRecommendations();
            } else {
                console.error('Invalid song data:', data);
            }
        })
        .catch(error => {
            console.error('Error loading songs:', error);
            allSongs = [];
            songList = [];
            renderSongList();
        });

    // Load playlists
    fetch(`${API_URL}/playlists`)
        .then(response => response.json())
        .then(data => {
            playlists = data.playlists;
        })
        .catch(error => console.error('Error loading playlists:', error));
    
    // Add home button functionality
    const homeBtn = document.getElementById('home-btn');
    if (homeBtn) {
        homeBtn.addEventListener('click', () => {
            const playlistsView = document.getElementById('playlists-view');
            const songList = document.getElementById('song-list');
            const lastSession = document.querySelector('.last-session');
            const forYouSection = document.querySelector('.for-you-section');
            
            // Show main sections
            songList.style.display = 'grid';
            lastSession.style.display = 'block';
            forYouSection.style.display = 'block';
            
            // Hide playlists
            playlistsView.style.display = 'none';
            
            currentPlaylist = null;
            songList = allSongs;
            renderSongList();
        });
    }

    // Player Controls - Move inside DOMContentLoaded
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', () => {
            if (!audioPlayer.src && songList.length > 0) {
                playSong(0);
            } else if (audioPlayer.paused) {
                audioPlayer.play().then(() => {
                    playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
                });
            } else {
                audioPlayer.pause();
                playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            }
        });
    }

    if (prevTrackBtn) {
        prevTrackBtn.addEventListener('click', () => {
            if (currentIndex > 0) {
                playSong(currentIndex - 1);
            } else {
                playSong(songList.length - 1);
            }
        });
    }

    if (nextTrackBtn) {
        nextTrackBtn.addEventListener('click', () => {
            playNextSong();
        });
    }

    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', () => {
            shuffleMode = !shuffleMode;
            shuffleBtn.classList.toggle('active');
        });
    }

    if (progressBar) {
        progressBar.addEventListener('click', (e) => {
            const bounds = progressBar.getBoundingClientRect();
            const percent = (e.clientX - bounds.left) / bounds.width;
            audioPlayer.currentTime = percent * audioPlayer.duration;
        });
    }

    if (volumeControl) {
        volumeControl.addEventListener('input', (e) => {
            if (audioPlayer) {
                audioPlayer.volume = e.target.value / 100;
                const volumeIcon = document.querySelector('.fa-volume-up');
                if (volumeIcon) {
                    if (e.target.value == 0) {
                        volumeIcon.className = 'fas fa-volume-mute';
                    } else if (e.target.value < 50) {
                        volumeIcon.className = 'fas fa-volume-down';
                    } else {
                        volumeIcon.className = 'fas fa-volume-up';
                    }
                }
            }
        });
    }

    if (audioPlayer) {
        audioPlayer.addEventListener('ended', () => {
            playNextSong();
        });

        audioPlayer.addEventListener('timeupdate', () => {
            if (!isNaN(audioPlayer.duration)) {
                const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
                progressBar.value = progress;
                progressBar.style.setProperty('--value', `${progress}%`);
                currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
                durationEl.textContent = formatTime(audioPlayer.duration);
            }
        });
    }

    // Move playNextSong inside DOMContentLoaded
    function playNextSong() {
        if (!songList?.length) return;
        if (shuffleMode) {
            let newIndex;
            do {
                newIndex = Math.floor(Math.random() * songList.length);
            } while (newIndex === currentIndex && songList.length > 1);
            playSong(newIndex);
        } else {
            playSong((currentIndex + 1) % songList.length);
        }
    }

    // Autoplay next song
    audioPlayer.addEventListener('ended', () => {
        playNextSong();
    });

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && e.target === document.body) {
            e.preventDefault();
            playPauseBtn.click();
        } else if (e.code === 'ArrowLeft') {
            prevTrackBtn.click();
        } else if (e.code === 'ArrowRight') {
            nextTrackBtn.click();
        } else if (e.code === 'KeyF' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            searchInput.focus();
        } else if (e.code === 'KeyY' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            searchBtn.click();
        } else if (e.code === 'F11') {
            e.preventDefault();
            toggleFullScreen();
        } else if (e.code === 'Escape') {
            const playlistsView = document.getElementById('playlists-view');
            const songList = document.getElementById('song-list');
            
            if (playlistsView.style.display === 'grid') {
                playlistsView.style.display = 'none';
                songList.style.display = 'grid';
                currentPlaylist = null;
                songList = allSongs;
                renderSongList();
            }
        }
    });

    // Update fullscreen toggle function with better cross-platform support
    function toggleFullScreen() {
        // Get the main element (document.documentElement for web, window for desktop app)
        const element = document.documentElement;

        try {
            if (!isFullscreen()) {
                // Request fullscreen with fallbacks
                if (element.requestFullscreen) {
                    element.requestFullscreen();
                } else if (element.webkitRequestFullscreen) { // Safari
                    element.webkitRequestFullscreen();
                } else if (element.msRequestFullscreen) { // IE11
                    element.msRequestFullscreen();
                }
            } else {
                // Exit fullscreen with fallbacks
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) { // Safari
                    document.webkitExitFullscreen();
                } else if (document.msExitFullscreen) { // IE11
                    document.msExitFullscreen();
                }
            }
        } catch (err) {
            console.log(`Fullscreen error: ${err.message}`);
        }
    }

    // Helper function to check fullscreen state
    function isFullscreen() {
        return !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
        );
    }

    // Auto-sync recently played every 2 seconds
    setInterval(updateLastSession, 2000);
});

// Move playlist modal code into DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    if (createPlaylistBtn && playlistModal) {
        createPlaylistBtn.onclick = () => {
            playlistModal.style.display = 'block';
            updatePlaylistSongList();
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
});

function showContextMenu(e, song) {
    e.preventDefault();

    // Remove existing context menu
    if (contextMenu) hideContextMenu();

    // Create context menu
    contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    contextMenu.innerHTML = `
        <div class="context-menu-item has-submenu">
            <i class="fas fa-plus"></i>
            Add to Playlist
            <div class="context-submenu">
                ${Object.keys(playlists).map(name => `
                    <div class="context-menu-item" data-playlist="${name}">
                        <i class="fas fa-list"></i>${name}
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    // Add click handlers for playlist items
    contextMenu.querySelectorAll('.context-submenu .context-menu-item').forEach(item => {
        item.onclick = () => {
            const playlistName = item.dataset.playlist;
            addSongToPlaylist(playlistName, song);
            hideContextMenu();
        };
    });

    // Position and show menu
    contextMenu.style.top = `${e.pageY}px`;
    contextMenu.style.left = `${e.pageX}px`;
    document.body.appendChild(contextMenu);
    setTimeout(() => contextMenu.classList.add('active'), 10);

    // Hide on click outside
    document.addEventListener('click', hideContextMenu);
}

function hideContextMenu() {
    if (contextMenu) {
        contextMenu.remove();
        contextMenu = null;
    }
}

async function addSongToPlaylist(playlistName, song) {
    const playlist = playlists[playlistName] || [];
    const updatedSongs = [...playlist, song];

    try {
        const response = await fetch(`${API_URL}/playlists/${encodeURIComponent(playlistName)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ songs: updatedSongs })
        });

        if (response.ok) {
            playlists[playlistName] = updatedSongs;
            alert(`Added to ${playlistName}`);
        }
    } catch (error) {
        console.error('Error adding song to playlist:', error);
        alert('Error adding song to playlist');
    }
}

// Playlist drawer functionality
const showPlaylistsBtn = document.getElementById('show-playlists');
const playlistDrawer = document.getElementById('playlist-drawer');
const closeDrawerBtn = document.querySelector('.close-drawer');
const playlistView = document.getElementById('playlist-view');
const backToPlaylistsBtn = document.querySelector('.back-to-playlists');
const playlistsContainer = document.getElementById('playlists-container');

// Event Listeners
showPlaylistsBtn.addEventListener('click', () => {
    playlistDrawer.classList.add('open');
    loadPlaylists();
});

closeDrawerBtn.addEventListener('click', () => {
    playlistDrawer.classList.remove('open');
});

backToPlaylistsBtn.addEventListener('click', () => {
    playlistView.classList.remove('open');
    playlistDrawer.classList.add('open');
});

// Playlist Functions
async function loadPlaylists() {
    try {
        const response = await fetch('https://spotify-backend-6mr0.onrender.com/playlists');
        const data = await response.json();
        
        if (data.playlists) {
            const playlists = Object.entries(data.playlists).map(([username, songs]) => {
                return {
                    name: `${username}'s Collection`,
                    owner: username,
                    songs: songs.map(song => ({
                        title: song.name.replace('.m4a', '').replace('.mp3', ''),
                        artist: 'Various Artists',
                        thumbnail: `https://spotify-backend-6mr0.onrender.com/static/images/${encodeURIComponent(song.image)}`,
                        audioSrc: `https://spotify-backend-6mr0.onrender.com/songs/${encodeURIComponent(song.name)}`,
                        duration: 0 // Will be set when audio loads
                    }))
                };
            });
            
            displayPlaylists(playlists);
        }
    } catch (error) {
        console.error('Error loading playlists:', error);
        playlistsContainer.innerHTML = '<p>Error loading playlists</p>';
    }
}

function displayPlaylists(playlists) {
    const container = document.getElementById('playlists-container');
    container.innerHTML = '';
    
    playlists.forEach(playlist => {
        const card = document.createElement('div');
        card.className = 'playlist-card';
        
        // Get first song's thumbnail for the playlist cover
        const coverImage = playlist.songs[0]?.thumbnail || 'default.jpg';
        
        card.innerHTML = `
            <div class="playlist-cover">
                <img src="${coverImage}" 
                     alt="Playlist cover"
                     onerror="this.src='default.jpg'">
            </div>
            <div class="playlist-info">
                <h3>${playlist.name}</h3>
                <p>${playlist.songs.length} songs • By ${playlist.owner}</p>
            </div>
        `;
        
        card.addEventListener('click', () => {
            showPlaylistSongs(playlist);
        });
        
        container.appendChild(card);
    });
}

function showPlaylistSongs(playlist) {
    const playlistView = document.getElementById('playlist-view');
    const playlistSongs = document.getElementById('playlist-songs');
    const playlistTitle = document.querySelector('.playlist-title');
    
    if (!playlist || !Array.isArray(playlist.songs)) {
        console.error('Invalid playlist data:', playlist);
        return;
    }

    playlistTitle.textContent = playlist.name || 'Playlist';
    playlistSongs.innerHTML = '';
    
    // Set current songList to match playlist songs format
    songList = playlist.songs.map(song => {
        // Extract the filename from audioSrc if present or use name
        const songName = song.audioSrc ? 
            decodeURIComponent(song.audioSrc.split('/').pop()) : 
            (song.name || '');
            
        return {
            name: songName,            // The full filename with extension for streaming
            title: song.title || (songName ? songName.replace(/\.(mp3|m4a)$/i, '') : 'Unknown Track'),
            image: song.image || (song.thumbnail ? song.thumbnail.split('/').pop() : 'default.jpg'),
            artist: song.artist || 'Unknown'
        };
    });

    console.log('Mapped songList:', songList); // Debug log
    
    songList.forEach((song, index) => {
        const songElement = document.createElement('div');
        songElement.className = 'song-item';
        songElement.innerHTML = `
            <img src="${API_URL}/static/images/${song.image}" 
                 alt="${song.title}" 
                 class="song-thumbnail"
                 onerror="this.src='default.jpg'">
            <div class="song-info">
                <div class="song-title">${song.title}</div>
                <div class="song-artist">${song.artist}</div>
            </div>
            <div class="song-number">#${index + 1}</div>
        `;
        
        songElement.addEventListener('click', () => {
            playSong(index);
        });
        
        playlistSongs.appendChild(songElement);
    });
    
    playlistView.classList.add('open');
}

// Update style for proper scrolling
const style = document.createElement('style');
style.textContent = `
    .playlist-view {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100vh;
        background: #121212;
        z-index: 1001;
        padding: 20px;
    }

    .playlist-view.open {
        display: block;
    }

    .playlist-header {
        margin-bottom: 20px;
    }

    .song-item {
        display: grid;
        grid-template-columns: 60px 1fr 60px;
        align-items: center;
        padding: 10px;
        gap: 15px;
        background: #282828;
        border-radius: 4px;
        margin-bottom: 8px;
        transition: background 0.2s;
    }

    .song-item:hover {
        background: #383838;
        cursor: pointer;
    }

    .song-thumbnail {
        width: 50px;
        height: 50px;
        object-fit: cover;
        border-radius: 4px;
    }
`;
document.head.appendChild(style);

// Update these in your existing player code
function updateNowPlaying(song) {
    document.getElementById('now-playing-title').textContent = song.title;
    document.getElementById('now-playing-artist').textContent = song.artist;
    document.getElementById('now-playing-img').src = song.thumbnail || 'default.jpg';
}