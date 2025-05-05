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

// Seek through progress bar
progressBar.addEventListener('input', () => {
    const time = (progressBar.value / 100) * audioPlayer.duration;
    audioPlayer.currentTime = time;
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

// Theme toggle functionality
const themeToggleBtn = document.createElement('button');
themeToggleBtn.id = 'theme-toggle';
themeToggleBtn.style.position = 'fixed';
themeToggleBtn.style.top = '10px';
themeToggleBtn.style.right = '10px';
themeToggleBtn.style.padding = '10px';
themeToggleBtn.style.backgroundColor = '#1DB954';
themeToggleBtn.style.color = 'white';
themeToggleBtn.style.border = 'none';
themeToggleBtn.style.borderRadius = '5px';
themeToggleBtn.style.cursor = 'pointer';
document.body.appendChild(themeToggleBtn);

// Function to dynamically update the theme toggle button text
function updateThemeToggleButton() {
    const isDarkTheme = document.body.classList.contains('dark-theme');
    themeToggleBtn.textContent = isDarkTheme ? 'Switch to Light Theme' : 'Switch to Dark Theme';
}

// Set default theme to dark
if (!localStorage.getItem('theme')) {
    localStorage.setItem('theme', 'dark');
}

document.body.classList.toggle('dark-theme', localStorage.getItem('theme') === 'dark');
updateThemeToggleButton();

themeToggleBtn.addEventListener('click', () => {
    const currentTheme = localStorage.getItem('theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    document.body.classList.toggle('dark-theme', newTheme === 'dark');
    updateThemeToggleButton();
});

// Enhanced fetchRecommendations with image support
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
