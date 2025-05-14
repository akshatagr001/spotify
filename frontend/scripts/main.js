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
    }
});

// Add context menu-related variables
let contextMenu = null;
let currentContextSong = null;

function showContextMenu(e, song) {
    e.preventDefault();
    e.stopPropagation();
    
    // Hide existing menu if any
    if (contextMenu) {
        document.body.removeChild(contextMenu);
    }
    
    currentContextSong = song;
    
    // Create new menu
    contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    
    // Calculate position
    const clickX = e.clientX;
    const clickY = e.clientY;
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    
    // Add menu items
    const addToPlaylistItem = document.createElement('div');
    addToPlaylistItem.className = 'context-menu-item has-submenu';
    addToPlaylistItem.innerHTML = '<i class="fas fa-plus"></i>Add to Playlist<i class="fas fa-chevron-right submenu-arrow"></i>';
    
    const submenu = document.createElement('div');
    submenu.className = 'context-submenu';
    
    // New playlist option
    const newPlaylistItem = document.createElement('div');
    newPlaylistItem.className = 'context-menu-item';
    newPlaylistItem.innerHTML = '<i class="fas fa-music"></i>Create New Playlist';
    newPlaylistItem.onclick = () => {
        hideContextMenu();
        playlistModal.style.display = 'block';
        updatePlaylistSongList();
        // Pre-select the current song
        const checkbox = Array.from(playlistSongList.querySelectorAll('input[type="checkbox"]'))
            .find(cb => cb.value === currentContextSong.name);
        if (checkbox) checkbox.checked = true;
    };
    submenu.appendChild(newPlaylistItem);
    
    // Add separator if there are playlists
    if (Object.keys(playlists).length > 0) {
        const separator = document.createElement('div');
        separator.className = 'context-menu-separator';
        submenu.appendChild(separator);
        
        // Add existing playlists
        Object.keys(playlists).forEach(playlistName => {
            const playlistItem = document.createElement('div');
            playlistItem.className = 'context-menu-item';
            playlistItem.innerHTML = `<i class="fas fa-list"></i>${playlistName}`;
            playlistItem.onclick = () => addSongToPlaylist(playlistName, currentContextSong);
            submenu.appendChild(playlistItem);
        });
    }
    
    addToPlaylistItem.appendChild(submenu);
    contextMenu.appendChild(addToPlaylistItem);
    
    // Add "Remove from Playlist" option if in a playlist
    if (currentPlaylist) {
        const separator = document.createElement('div');
        separator.className = 'context-menu-separator';
        contextMenu.appendChild(separator);
        
        const removeItem = document.createElement('div');
        removeItem.className = 'context-menu-item';
        removeItem.innerHTML = '<i class="fas fa-minus"></i>Remove from Playlist';
        removeItem.onclick = () => removeSongFromPlaylist(currentPlaylist, currentContextSong);
        contextMenu.appendChild(removeItem);
    }
    
    // Add to DOM
    document.body.appendChild(contextMenu);
    
    // Position the menu
    const menuRect = contextMenu.getBoundingClientRect();
    let menuX = clickX;
    let menuY = clickY;
    
    if (menuX + menuRect.width > screenW) {
        menuX = screenW - menuRect.width;
    }
    
    if (menuY + menuRect.height > screenH) {
        menuY = screenH - menuRect.height;
    }
    
    contextMenu.style.left = menuX + 'px';
    contextMenu.style.top = menuY + 'px';
    
    // Show the menu with animation
    requestAnimationFrame(() => {
        contextMenu.classList.add('active');
    });
    
    // Handle clicks outside
    const closeContextMenu = (e) => {
        if (!contextMenu.contains(e.target)) {
            hideContextMenu();
            document.removeEventListener('click', closeContextMenu);
            document.removeEventListener('contextmenu', closeContextMenu);
        }
    };
    
    document.addEventListener('click', closeContextMenu);
    document.addEventListener('contextmenu', closeContextMenu);
}

function hideContextMenu() {
    if (contextMenu && contextMenu.parentNode) {
        contextMenu.classList.remove('active');
        setTimeout(() => {
            if (contextMenu && contextMenu.parentNode) {
                contextMenu.parentNode.removeChild(contextMenu);
                contextMenu = null;
            }
        }, 200);
    }
}

// Add song to playlist
async function addSongToPlaylist(playlistName, song) {
    const playlist = playlists[playlistName] || [];
    if (!playlist.find(s => s.name === song.name)) {
        playlist.push(song);
        playlists[playlistName] = playlist;
        
        try {
            await fetch(`${API_URL}/playlists/${encodeURIComponent(playlistName)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ songs: playlist })
            });
            
            alert(`Added "${song.name}" to playlist "${playlistName}"`);
        } catch (error) {
            console.error('Error updating playlist:', error);
            alert('Error updating playlist');
        }
    }
    hideContextMenu();
}

// Remove song from playlist
async function removeSongFromPlaylist(playlistName, song) {
    const playlist = playlists[playlistName] || [];
    const updatedPlaylist = playlist.filter(s => s.name !== song.name);
    playlists[playlistName] = updatedPlaylist;
    
    try {
        await fetch(`${API_URL}/playlists/${encodeURIComponent(playlistName)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ songs: updatedPlaylist })
        });
        
        // Update display if we're viewing the playlist
        if (currentPlaylist === playlistName) {
            songList = updatedPlaylist;
            renderSongList();
        }
        
        alert(`Removed "${song.name}" from playlist "${playlistName}"`);
    } catch (error) {
        console.error('Error updating playlist:', error);
        alert('Error updating playlist');
    }
    hideContextMenu();
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

// Password modal logic
(function() {
    // Create modal elements
    const modal = document.createElement('div');
    modal.id = 'password-modal';
    modal.style.position = 'fixed';
    modal.style.top = 0;
    modal.style.left = 0;
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.85)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = 9999;

    const box = document.createElement('div');
    box.style.background = '#181818';
    box.style.padding = '2rem';
    box.style.borderRadius = '10px';
    box.style.boxShadow = '0 2px 16px #000';
    box.style.display = 'flex';
    box.style.flexDirection = 'column';
    box.style.alignItems = 'center';

    const label = document.createElement('label');
    label.textContent = 'Enter Password:';
    label.style.color = '#fff';
    label.style.marginBottom = '1rem';

    const input = document.createElement('input');
    input.type = 'password';
    input.style.padding = '0.5rem';
    input.style.fontSize = '1rem';
    input.style.marginBottom = '1rem';
    input.style.borderRadius = '5px';
    input.style.border = '1px solid #333';
    input.autofocus = true;

    const error = document.createElement('div');
    error.style.color = '#ff4d4d';
    error.style.height = '1.5em';
    error.style.marginBottom = '1rem';

    const btn = document.createElement('button');
    btn.textContent = 'Enter';
    btn.style.padding = '0.5rem 2rem';
    btn.style.fontSize = '1rem';
    btn.style.background = '#1db954';
    btn.style.color = '#fff';
    btn.style.border = 'none';
    btn.style.borderRadius = '5px';
    btn.style.cursor = 'pointer';

    box.appendChild(label);
    box.appendChild(input);
    box.appendChild(error);
    box.appendChild(btn);
    modal.appendChild(box);
    document.body.appendChild(modal);

    // Prevent tabbing out of modal
    input.focus();
    modal.tabIndex = -1;
    modal.focus();

    // Block scrolling
    document.body.style.overflow = 'hidden';

    // Password check (change 'letmein' to your desired password)
    const CORRECT_PASSWORD = 'letmein';

    function unlock() {
        modal.remove();
        document.body.style.overflow = '';
    }

    function checkPassword() {
        if (input.value === CORRECT_PASSWORD) {
            unlock();
        } else {
            error.textContent = 'Incorrect password!';
            input.value = '';
            input.focus();
        }
    }

    btn.onclick = checkPassword;
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') checkPassword();
    });

    // Prevent interaction with the rest of the app
    window.addEventListener('click', function(e) {
        if (!modal.contains(e.target)) {
            e.stopPropagation();
            e.preventDefault();
        }
    }, true);
    window.addEventListener('keydown', function(e) {
        if (!modal.contains(document.activeElement)) {
            e.stopPropagation();
            e.preventDefault();
        }
    }, true);
})();
