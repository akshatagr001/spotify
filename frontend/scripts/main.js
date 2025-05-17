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

// Function declarations - move before usage
function updateLastSession() {
    fetch(`${API_URL}/recently-played`)
        .then(response => response.json())
        .then(data => {
            const lastSessionTracks = document.getElementById('last-session-tracks');
            if (!lastSessionTracks) return;
            
            lastSessionTracks.innerHTML = '';
            if (Array.isArray(data.recently_played) && data.recently_played.length > 0) {
                // Limit to 25 songs
                data.recently_played.slice(0, 25).forEach(song => {
                    const btn = document.createElement('button');
                    const img = document.createElement('img');
                    const text = document.createElement('span');
                    
                    img.src = song.image ? `${API_URL}/static/images/${song.image}` : 'default.jpg';
                    img.alt = song.name;
                    
                    text.innerText = song.name.replace(/\.(mp3|m4a)$/, '');
                    
                    btn.appendChild(img);
                    btn.appendChild(text);
                    btn.onclick = () => playSong(allSongs.findIndex(s => s.name === song.name));
                    
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

// Progress bar interaction
progressBar.addEventListener('click', (e) => {
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
    if (isDragging) {
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
    if (isDragging) {
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
    if (isDragging) {
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
            renderPlaylistCards();
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

    // Initialize playlist selection
    if (playlistSelect) {
        playlistSelect.addEventListener('change', () => {
            const selectedPlaylist = playlistSelect.value;
            if (selectedPlaylist === '') {
                songList = allSongs;
            } else {
                songList = playlists[selectedPlaylist] || [];
            }
            currentPlaylist = selectedPlaylist;
            renderSongList();
            hideContextMenu();
        });
    }

    // Initialize hamburger menu close
    if (hamburgerMenu) {
        document.addEventListener('click', (e) => {
            if (!hamburgerMenu.contains(e.target) && hamburgerMenu.classList.contains('active')) {
                hamburgerMenu.classList.remove('active');
            }
        });
    }

    // Initialize last session
    if (lastSessionTracks) {
        updateLastSession();
    }

    // Load playlists
    fetch(`${API_URL}/playlists`)
        .then(response => response.json())
        .then(data => {
            playlists = data.playlists;
            updatePlaylistSelect();
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

    // Initialize recommendations
    fetchRecommendations();
});

// Add this function
function fetchRecommendations() {
    fetch(`${API_URL}/api/recommendations`)
        .then(response => response.json())
        .then(data => {
            const recommendationsGrid = document.getElementById('recommendations-grid');
            if (!recommendationsGrid) return;
            
            recommendationsGrid.innerHTML = '';
            
            // Get the first 10 recommendations
            const recommendations = data.recommendations.slice(0, 10);
            
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
                
                div.onclick = () => {
                    const songIndex = allSongs.findIndex(s => s.name === song.name);
                    if (songIndex !== -1) {
                        playSong(songIndex);
                    }
                };
                
                recommendationsGrid.appendChild(div);
            });
        })
        .catch(error => {
            console.error('Error fetching recommendations:', error);
        });
}

// Fix: Only set up playlist controls if elements exist
function updatePlaylistSelect() {
    if (!playlistSelect) return;
    playlistSelect.innerHTML = '<option value="">All Songs</option>';
    Object.keys(playlists).forEach(playlistName => {
        const option = document.createElement('option');
        option.value = playlistName;
        option.textContent = playlistName;
        playlistSelect.appendChild(option);
    });
}

// Show/hide modal
if (createPlaylistBtn) {
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

// Update song list in modal
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

// Save playlist
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
            updatePlaylistSelect();
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

// Update the fetch call to use API_URL
fetch(`${API_URL}/songs`)
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (Array.isArray(data?.songs)) {
            allSongs = data.songs;
            songList = allSongs;
            console.log('Loaded songs:', songList); // Debug log
        } else {
            console.error('Invalid response format from server');
            allSongs = [];
        }
        renderSongList();
    })
    .catch(error => {
        console.error('Error fetching songs:', error);
        allSongs = [];
        renderSongList();
    });

// Enhanced search functionality
function performSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    console.log('Searching for:', searchTerm);
    
    if (searchTerm === '') {
        songList = allSongs;
    } else {
        const searchWords = searchTerm.split(' ');
        songList = allSongs.filter(song => {
            const songName = song.name.toLowerCase()
                .replace(/\.(mp3|m4a)$/, '')
                .replace(/_/g, ' ');
            
            // Match if all search words are found in the song name
            return searchWords.every(word => songName.includes(word));
        });
    }
    
    console.log('Found', songList.length, 'matches');
    renderSongList();
    
    // Save search term if results were found
    if (songList.length > 0 && searchTerm) {
        const recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
        if (!recentSearches.includes(searchTerm)) {
            recentSearches.unshift(searchTerm);
            if (recentSearches.length > 5) recentSearches.pop();
            localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
        }
    }
}

// Debounce search for better performance
searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(performSearch, 300);
});

function renderSongList() {
    songListDiv.innerHTML = '';
    if (songList.length === 0) {
        songListDiv.innerHTML = '<p style="color: #b3b3b3;">No songs found</p>';
        return;
    }
    songList.forEach((song, index) => {
        const btn = document.createElement('button');
        const img = document.createElement('img');
        const text = document.createElement('span');
        
        img.src = song.image ? `${API_URL}/static/images/${song.image}` : 'default.jpg';
        img.alt = song.name;
        
        text.innerText = song.name.replace(/\.(mp3|m4a)$/, '');
        
        btn.appendChild(img);
        btn.appendChild(text);
        btn.onclick = () => playSong(index);
        
        // Add context menu event with position check
        btn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Hide any existing context menu
            if (contextMenu) {
                hideContextMenu();
            }
            
            // Show new context menu
            showContextMenu(e, song);
            return false;
        });
        
        songListDiv.appendChild(btn);
    });
}

function playSong(index) {
    currentIndex = index;
    const song = songList[index];
    
    // Track user activity
    fetch(`${API_URL}/track-activity/${encodeURIComponent(song.name)}`, {
        method: 'POST'
    })
    .then(() => {
        updateLastSession();
        fetchRecommendations(); // Refresh recommendations
    })
    .catch(error => console.error('Error tracking activity:', error));
    
    // Update UI
    if (currentButton) currentButton.classList.remove('active');
    currentButton = songListDiv.children[index];
    currentButton.classList.add('active');
    
    // Update now playing info with network URLs
    nowPlayingImg.src = song.image ? `${API_URL}/static/images/${song.image}` : 'default.jpg';
    nowPlayingTitle.textContent = song.name.replace(/\.(mp3|m4a)$/, '');
    
    // Update audio source with network URL
    audioPlayer.src = `${API_URL}/stream/${song.name}`;
    audioPlayer.play()
        .then(() => {
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        })
        .catch(error => console.error('Error playing audio:', error));
}

// Play/Pause button
playPauseBtn.addEventListener('click', () => {
    if (audioPlayer.paused) {
        if (!audioPlayer.src) {
            playSong(0);
        } else {
            audioPlayer.play();
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        }
    } else {
        audioPlayer.pause();
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
});

// Previous track
prevTrackBtn.addEventListener('click', () => {
    if (currentIndex > 0) {
        playSong(currentIndex - 1);
    } else {
        playSong(songList.length - 1);
    }
});

// Next track
nextTrackBtn.addEventListener('click', () => {
    playNextSong();
});

// Shuffle button
shuffleBtn.addEventListener('click', () => {
    shuffleMode = !shuffleMode;
    shuffleBtn.classList.toggle('active');
});

// Volume control
volumeControl.addEventListener('input', (e) => {
    audioPlayer.volume = e.target.value / 100;
    const volumeIcon = document.querySelector('.fa-volume-up');
    if (e.target.value == 0) {
        volumeIcon.className = 'fas fa-volume-mute';
    } else if (e.target.value < 50) {
        volumeIcon.className = 'fas fa-volume-down';
    } else {
        volumeIcon.className = 'fas fa-volume-up';
    }
});

// Update progress bar and time
audioPlayer.addEventListener('timeupdate', () => {
    if (!isNaN(audioPlayer.duration)) {
        const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progressBar.value = progress;
        progressBar.style.setProperty('--value', progress + '%');
        currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
        durationEl.textContent = formatTime(audioPlayer.duration);
    }
});

// Format seconds into MM:SS
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Autoplay next song
audioPlayer.addEventListener('ended', () => {
    playNextSong();
});

function playNextSong() {
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

// Handle playlist selection
if (playlistSelect) {
    playlistSelect.onchange = () => {
        const selectedPlaylist = playlistSelect.value;
        if (selectedPlaylist === '') {
            songList = allSongs;
        } else {
            songList = playlists[selectedPlaylist] || [];
        }
        currentPlaylist = selectedPlaylist;
        renderSongList();
    };
}

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

// Add function to render playlist cards
function renderPlaylistCards() {
    const playlistsView = document.getElementById('playlists-view');
    const songListDiv = document.getElementById('song-list');
    const lastSession = document.querySelector('.last-session');
    const forYouSection = document.querySelector('.for-you-section');

    // Hide other sections, show playlists grid
    if (songListDiv) songListDiv.style.display = 'none';
    if (lastSession) lastSession.style.display = 'none';
    if (forYouSection) forYouSection.style.display = 'none';
    playlistsView.style.display = 'grid';

    // Clear playlists grid
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

    // Fix: playlists is an object with playlistName: [songs]
    Object.entries(playlists).forEach(([name, songs], idx) => {
        // Defensive: skip if songs is not an array or empty
        if (!Array.isArray(songs) || songs.length === 0) return;
        const card = document.createElement('div');
        card.className = 'playlist-card playlist-fadein';
        // Use first song's image or default
        const firstSong = songs[0];
        const image = firstSong && firstSong.image ?
            `${API_URL}/static/images/${firstSong.image}` :
            'default.jpg';

        card.innerHTML = `
            <img src="${image}" alt="${name}">
            <span>${name}</span>
        `;

        card.onclick = () => {
            songList = songs;
            currentPlaylist = name;
            playlistsView.style.display = 'none';
            if (songListDiv) songListDiv.style.display = 'grid';
            if (lastSession) lastSession.style.display = 'block';
            if (forYouSection) forYouSection.style.display = 'block';
            renderSongList();
        };

        card.style.animationDelay = `${0.05 * (idx + 1)}s`;
        playlistsView.appendChild(card);
    });
}

// Auto-sync recently played every 2 seconds
setInterval(updateLastSession, 2000);