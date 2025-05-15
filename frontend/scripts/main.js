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

// Progress bar interaction
let isDragging = false;
let wasPlaying = false;

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

// Add playlist-related DOM elements
const createPlaylistBtn = document.getElementById('create-playlist-btn');
const playlistSelect = document.getElementById('playlist-select');
const playlistModal = document.getElementById('playlist-modal');
const closeModal = document.querySelector('.close');
const playlistNameInput = document.getElementById('playlist-name');
const playlistSongList = document.getElementById('playlist-song-list');
const savePlaylistBtn = document.getElementById('save-playlist');

// Network configuration
const API_URL = `https://spotify-backend-6mr0.onrender.com`; // Use current hostname

let allSongs = []; // Store all songs
let filteredSongs = []; // Store filtered songs
let songList = []; // Add this line to declare songList
let currentIndex = 0;
let currentButton = null;
let shuffleMode = false;

// Network configuration

// Playlist management
let playlists = {};
let currentPlaylist = null;

// Load playlists when the app starts
fetch(`${API_URL}/playlists`)
    .then(response => response.json())
    .then(data => {
        playlists = data.playlists;
        updatePlaylistSelect();
    })
    .catch(error => console.error('Error loading playlists:', error));

// Update playlist dropdown
function updatePlaylistSelect() {
    playlistSelect.innerHTML = '<option value="">All Songs</option>';
    Object.keys(playlists).forEach(playlistName => {
        const option = document.createElement('option');
        option.value = playlistName;
        option.textContent = playlistName;
        playlistSelect.appendChild(option);
    });
}

// Show/hide modal
createPlaylistBtn.onclick = () => {
    playlistModal.style.display = 'block';
    updatePlaylistSongList();
};

closeModal.onclick = () => {
    playlistModal.style.display = 'none';
};

window.onclick = (event) => {
    if (event.target === playlistModal) {
        playlistModal.style.display = 'none';
    }
};

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
let searchTimeout;
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
    }).catch(error => console.error('Error tracking activity:', error));
    
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
    if (playQueue.length > 0 && queueIndex !== -1) {
        if (repeatMode === 2) {
            // Repeat one
            playFromQueue();
        } else if (queueIndex < playQueue.length - 1) {
            queueIndex++;
            playFromQueue();
        } else if (repeatMode === 1) {
            queueIndex = 0;
            playFromQueue();
        } else {
            queueIndex = -1;
            // Optionally, stop playback or play from songList
        }
    } else if (shuffleMode) {
        let newIndex;
        do {
            newIndex = Math.floor(Math.random() * songList.length);
        } while (newIndex === currentIndex && songList.length > 1);
        playSong(newIndex);
    } else if (repeatMode === 2) {
        playSong(currentIndex);
    } else if (currentIndex < songList.length - 1) {
        playSong(currentIndex + 1);
    } else if (repeatMode === 1) {
        playSong(0);
    }
}

// Previous track logic for queue
prevTrackBtn.addEventListener('click', () => {
    if (playQueue.length > 0 && queueIndex > 0) {
        queueIndex--;
        playFromQueue();
    } else if (currentIndex > 0) {
        playSong(currentIndex - 1);
    } else {
        playSong(songList.length - 1);
    }
});

// When playing a song directly, reset queueIndex
function playSong(index) {
    currentIndex = index;
    queueIndex = -1;
    const song = songList[index];
    
    // Track user activity
    fetch(`${API_URL}/track-activity/${encodeURIComponent(song.name)}`, {
        method: 'POST'
    }).catch(error => console.error('Error tracking activity:', error));
    
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

// Repeat Modes
const repeatBtn = document.getElementById('repeat-btn');
let repeatMode = 0; // 0: no repeat, 1: repeat all, 2: repeat one
const repeatIcons = [
    '<i class="fas fa-redo"></i>',         // no repeat (gray)
    '<i class="fas fa-redo-alt"></i>',     // repeat all (green)
    '<i class="fas fa-redo"></i><span style="font-size:10px;vertical-align:super;">1</span>' // repeat one
];
repeatBtn.onclick = () => {
    repeatMode = (repeatMode + 1) % 3;
    updateRepeatBtn();
};
function updateRepeatBtn() {
    repeatBtn.innerHTML = repeatIcons[repeatMode];
    if (repeatMode === 1 || repeatMode === 2) {
        repeatBtn.classList.add('active');
    } else {
        repeatBtn.classList.remove('active');
    }
}
updateRepeatBtn();

// Play Queue Management
const queueBtn = document.getElementById('queue-btn');
const queueModal = document.getElementById('queue-modal');
const closeQueueModal = document.getElementById('close-queue-modal');
const queueListDiv = document.getElementById('queue-list');
let playQueue = [];
let queueIndex = -1;

function updateQueueUI() {
    queueListDiv.innerHTML = '';
    if (playQueue.length === 0) {
        queueListDiv.innerHTML = '<p style="color:#b3b3b3;">Queue is empty.</p>';
        return;
    }
    playQueue.forEach((song, idx) => {
        const div = document.createElement('div');
        div.className = 'queue-song';
        const img = document.createElement('img');
        img.src = song.image ? `${API_URL}/static/images/${song.image}` : 'default.jpg';
        img.alt = song.name;
        const span = document.createElement('span');
        span.textContent = song.name.replace(/\.(mp3|m4a)$/,'')
        div.appendChild(img);
        div.appendChild(span);

        // Remove from queue button
        const removeBtn = document.createElement('span');
        removeBtn.className = 'remove-queue';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            playQueue.splice(idx, 1);
            updateQueueUI();
        };
        div.appendChild(removeBtn);

        div.onclick = () => {
            queueIndex = idx;
            playFromQueue();
            queueModal.style.display = 'none';
        };
        queueListDiv.appendChild(div);
    });
}

queueBtn.onclick = () => {
    updateQueueUI();
    queueModal.style.display = 'block';
};
closeQueueModal.onclick = () => {
    queueModal.style.display = 'none';
};
window.addEventListener('click', (event) => {
    if (event.target === queueModal) {
        queueModal.style.display = 'none';
    }
});

// Add to queue from context menu
// Add this to showContextMenu after other menu items:
    // ...
    // Add "Add to Queue" option
    const addToQueueItem = document.createElement('div');
    addToQueueItem.className = 'context-menu-item';
    addToQueueItem.innerHTML = '<i class="fas fa-list"></i>Add to Queue';
    addToQueueItem.onclick = () => {
        playQueue.push(song);
        hideContextMenu();
        alert(`Added "${song.name.replace(/\.(mp3|m4a)$/,'')}" to queue`);
    };
    contextMenu.appendChild(addToQueueItem);
// ...existing code...

// Play from queue if queueIndex is set
function playFromQueue() {
    if (queueIndex >= 0 && queueIndex < playQueue.length) {
        const song = playQueue[queueIndex];
        // Find index in allSongs to keep UI in sync
        const idx = allSongs.findIndex(s => s.name === song.name);
        if (idx !== -1) playSong(idx);
    }
}

// Override playNextSong for queue/repeat logic
function playNextSong() {
    if (playQueue.length > 0 && queueIndex !== -1) {
        if (repeatMode === 2) {
            // Repeat one
            playFromQueue();
        } else if (queueIndex < playQueue.length - 1) {
            queueIndex++;
            playFromQueue();
        } else if (repeatMode === 1) {
            queueIndex = 0;
            playFromQueue();
        } else {
            queueIndex = -1;
            // Optionally, stop playback or play from songList
        }
    } else if (shuffleMode) {
        let newIndex;
        do {
            newIndex = Math.floor(Math.random() * songList.length);
        } while (newIndex === currentIndex && songList.length > 1);
        playSong(newIndex);
    } else if (repeatMode === 2) {
        playSong(currentIndex);
    } else if (currentIndex < songList.length - 1) {
        playSong(currentIndex + 1);
    } else if (repeatMode === 1) {
        playSong(0);
    }
}

// Previous track logic for queue
prevTrackBtn.addEventListener('click', () => {
    if (playQueue.length > 0 && queueIndex > 0) {
        queueIndex--;
        playFromQueue();
    } else if (currentIndex > 0) {
        playSong(currentIndex - 1);
    } else {
        playSong(songList.length - 1);
    }
});

// When playing a song directly, reset queueIndex
function playSong(index) {
    currentIndex = index;
    queueIndex = -1;
    const song = songList[index];
    
    // Track user activity
    fetch(`${API_URL}/track-activity/${encodeURIComponent(song.name)}`, {
        method: 'POST'
    }).catch(error => console.error('Error tracking activity:', error));
    
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

// Hide context menu when switching views
playlistSelect.addEventListener('change', hideContextMenu);
searchInput.addEventListener('input', hideContextMenu);

// Hamburger Menu functionality
document.addEventListener('DOMContentLoaded', () => {
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const menuLines = document.querySelector('.menu-lines');

    menuLines.addEventListener('click', () => {
        hamburgerMenu.classList.toggle('active');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!hamburgerMenu.contains(e.target) && hamburgerMenu.classList.contains('active')) {
            hamburgerMenu.classList.remove('active');
        }
    });
});


function fetchRecommendations() {
    console.log('Fetching recommendations from:', `${API_URL}/api/recommendations`);
    fetch(`${API_URL}/api/recommendations`)
        .then(response => {
            console.log('Response status:', response.status);
            if (!response.ok) {
                throw new Error('Failed to fetch recommendations');
            }
            return response.json();
        })
        .then(data => {
            console.log('Received data:', data);
            if (!Array.isArray(data.recommendations)) {
                throw new Error('Invalid recommendations format');
            }
            const slidingTab = document.getElementById('sliding-tab');
            slidingTab.innerHTML = '';
            data.recommendations.forEach(song => {
                console.log('Adding song to UI:', song.title);
                const songDiv = document.createElement('div');
                songDiv.className = 'song';
                
                // Create and append image
                const img = document.createElement('img');
                img.src = song.image ? `${API_URL}/static/images/${song.image}` : 'default.jpg';
                img.alt = song.title;
                songDiv.appendChild(img);
                
                // Add song title
                const titleSpan = document.createElement('span');
                titleSpan.textContent = song.title;
                songDiv.appendChild(titleSpan);
                
                // Add click handler to play the song
                songDiv.addEventListener('click', () => {
                    const songIndex = allSongs.findIndex(s => s.name === song.name);
                    if (songIndex !== -1) {
                        playSong(songIndex);
                    }
                });
                
                slidingTab.appendChild(songDiv);
            });
        })
        .catch(error => {
            console.error('Error fetching recommendations:', error);
        });
}

// Fetch recommendations periodically
setInterval(fetchRecommendations, 60000); // Update every 60 seconds
fetchRecommendations(); // Initial fetch

// Recently Played Modal Elements
const recentlyPlayedBtn = document.getElementById('recently-played-btn');
const recentlyPlayedModal = document.getElementById('recently-played-modal');
const closeRecentlyPlayed = document.getElementById('close-recently-played');
const recentlyPlayedList = document.getElementById('recently-played-list');

// Show Recently Played Modal
recentlyPlayedBtn.onclick = () => {
    fetch(`${API_URL}/recently-played`)
        .then(response => response.json())
        .then(data => {
            recentlyPlayedList.innerHTML = '';
            if (Array.isArray(data.recently_played) && data.recently_played.length > 0) {
                data.recently_played.forEach(song => {
                    const div = document.createElement('div');
                    div.className = 'recently-played-song';
                    div.style.display = 'flex';
                    div.style.alignItems = 'center';
                    div.style.gap = '15px';
                    div.style.marginBottom = '12px';

                    const img = document.createElement('img');
                    img.src = song.image ? `${API_URL}/static/images/${song.image}` : 'default.jpg';
                    img.alt = song.name;
                    img.style.width = '48px';
                    img.style.height = '48px';
                    img.style.borderRadius = '6px';
                    img.style.objectFit = 'cover';

                    const info = document.createElement('div');
                    info.innerHTML = `<strong>${song.name.replace(/\.(mp3|m4a)$/,'')}</strong><br>
                        <small>Played: ${song.play_count} times</small><br>
                        <small>Last Played: ${song.last_played ? new Date(song.last_played).toLocaleString() : '-'}</small>`;

                    div.appendChild(img);
                    div.appendChild(info);

                    div.addEventListener('click', () => {
                        // Find index in allSongs and play
                        const idx = allSongs.findIndex(s => s.name === song.name);
                        if (idx !== -1) playSong(idx);
                        recentlyPlayedModal.style.display = 'none';
                    });

                    recentlyPlayedList.appendChild(div);
                });
            } else {
                recentlyPlayedList.innerHTML = '<p style="color:#b3b3b3;">No recently played songs.</p>';
            }
            recentlyPlayedModal.style.display = 'block';
        })
        .catch(() => {
            recentlyPlayedList.innerHTML = '<p style="color:#b3b3b3;">Failed to load recently played songs.</p>';
            recentlyPlayedModal.style.display = 'block';
        });
};

closeRecentlyPlayed.onclick = () => {
    recentlyPlayedModal.style.display = 'none';
};

window.addEventListener('click', (event) => {
    if (event.target === recentlyPlayedModal) {
        recentlyPlayedModal.style.display = 'none';
    }
});
