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
let userToken = null;
let userEmail = null;
let playlistContextMenu = null;
let currentContextPlaylist = null;

// Navigation state tracking
window.navigationState = {
    currentView: 'home',  // 'home', 'playlist-view', 'playlist-drawer'
    lastView: null,
    currentSongFilename: null,
    currentPlayingSongIndex: null
};

// Listen for browser history events (back/forward buttons)
window.addEventListener('popstate', function(event) {
    console.log('Navigation detected (popstate event)');
    
    // Delay a bit to let the DOM update
    setTimeout(() => {
        syncCurrentSongState();
    }, 100);
});

// Function to sync the current song state across navigation
function syncCurrentSongState() {
    // Get current playing song info
    if (!audioPlayer || !audioPlayer.src) return;
    
    const currentSrc = audioPlayer.src;
    const currentFilename = decodeURIComponent(currentSrc.split('/').pop());
    
    console.log('Syncing song state after navigation, currently playing:', currentFilename);
    
    // Check if songList is empty or doesn't match the current view
    if (!songList || songList.length === 0) {
        console.log('Empty songList detected during sync, restoring from allSongs');
        songList = [...allSongs];
    }
    
    // Determine which view we're in now
    const playlistView = document.getElementById('playlist-view');
    const playlistDrawer = document.getElementById('playlist-drawer');
    
    let currentView = 'home';
    
    if (playlistView && playlistView.classList.contains('open')) {
        currentView = 'playlist-view';
    } else if (playlistDrawer && playlistDrawer.classList.contains('open')) {
        currentView = 'playlist-drawer';
    }
    
    // Update our state tracker
    window.navigationState.lastView = window.navigationState.currentView;
    window.navigationState.currentView = currentView;
    window.navigationState.currentSongFilename = currentFilename;
    
    // Update the current index based on which view we're in
    if (currentView === 'home' && allSongs.length > 0) {
        // Find the song in the main song list
        const homeIndex = allSongs.findIndex(song => 
            song.name === currentFilename || 
            (song.originalName && song.originalName === currentFilename)
        );
        
        if (homeIndex !== -1) {
            currentIndex = homeIndex;
            window.navigationState.currentPlayingSongIndex = homeIndex;
            console.log('Updated index in home view after navigation:', homeIndex);
            
            // Force songList to be allSongs if we're on home view
            songList = [...allSongs];
            renderSongList();
        }
    } else if (currentView === 'playlist-view' && songList.length > 0) {
        // Find the song in the current playlist
        const playlistIndex = songList.findIndex(song => 
            song.name === currentFilename || 
            (song.originalName && song.originalName === currentFilename)
        );
        
        if (playlistIndex !== -1) {
            currentIndex = playlistIndex;
            window.navigationState.currentPlayingSongIndex = playlistIndex;
            console.log('Updated index in playlist view after navigation:', playlistIndex);
        }
    }
    
    // Update UI to reflect current playing state
    if (typeof window.refreshPlayingHighlight === 'function') {
        setTimeout(window.refreshPlayingHighlight, 100);
    }
}

// Initialize header navigation
function initHeaderNav() {
    console.log('Initializing header navigation');
    
    // Get header button elements
    const playlistsBtn = document.getElementById('playlists-header-btn');
    const downloadBtn = document.getElementById('download-header-btn');
    const settingsBtn = document.getElementById('settings-header-btn');
    
    // Playlists button click handler
    if (playlistsBtn) {
        playlistsBtn.addEventListener('click', function(e) {
            console.log('Playlists header button clicked');
            e.preventDefault();
            e.stopPropagation();
            
            const drawer = document.getElementById('playlist-drawer');
            if (drawer) {
                drawer.classList.add('open');
                if (typeof loadPlaylists === 'function') loadPlaylists();
            }
        });
    }
    
    // Download button click handler
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Download header button clicked');
            triggerAppDownload();
        });
    }
    
    // Settings button click handler
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Settings header button clicked');
            // You can add settings functionality here
            showNotification('Settings feature coming soon!', 'info');
        });
    }
    
    console.log('Header navigation initialization complete.');
}

// Ensure initHeaderNav is called after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeaderNav);
} else {
    initHeaderNav();
}
// function onGoogleSignIn(googleUser) {
//     // For Google Identity Services
//     const credential = googleUser.credential;
//     // Send this credential to your backend for verification and to create/get the user
//     fetch(`${API_URL}/auth/google`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ credential })
//     })
//     .then(res => res.json())
//     .then(data => {
//         userToken = data.token; // JWT or session token from your backend
//         userEmail = data.email;
//         localStorage.setItem('userToken', userToken);
//         localStorage.setItem('userEmail', userEmail);
//         showNotification('Logged in successfully!', 'success');
//         // Optionally hide login UI and show app UI
//         // Reload user data (playlists, recommendations, etc.)
//         fetchUserData();
//     })
//     .catch(() => showNotification('Login failed', 'error'));
// }
// Initialize hamburger menu functionality
// document.addEventListener('DOMContentLoaded', function() {
//     // This code has been replaced by the window.initMenu function
// });

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

// Device detection and download automation
function getDeviceType() {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    if (/android/i.test(ua)) return 'android';
    if (/windows/i.test(ua)) return 'windows';
    return 'other';
}

function triggerAppDownload() {
    const device = getDeviceType();
    let endpoint = '';
    
    if (device === 'android') {
        endpoint = '/download/android';
    } else {
        // Default to Windows for desktop or unsupported devices
        endpoint = '/download/windows';
    }
    
    window.location.href = `${API_URL}${endpoint}`;
}

// Utility functions
function formatTime(seconds) {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Event listeners for search
if (searchInput && searchBtn) {
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(handleSearch, 300); // Debounce search
    });

    searchBtn.addEventListener('click', handleSearch);
} else {
    console.error("Search input or button not found, search functionality will not work.");
}

// Fuzzy search options
const fuseOptions = {
    keys: ['name', 'title'],
    threshold: 1, // Lower = more strict matching
    distance: 100000000000000, // How far to extend the fuzzy match
    minMatchCharLength: 1
};

// Function to handle search
function handleSearch() {
    if (!allSongs || allSongs.length === 0) {
        console.warn("allSongs is empty, cannot perform search yet.");
        if (songListDiv) {
             songListDiv.innerHTML = '<p style="color:#b3b3b3;font-weight:bold;text-align:center;margin-top:20px;">Song library is loading or empty. Try again shortly.</p>';
        }
        return;
    }

    const query = searchInput.value.toLowerCase().trim();
    const forYouSection = document.querySelector('.for-you-section');
    const lastSessionSection = document.querySelector('.last-session');
    
    if (query === "") {
        // Show all sections when search is cleared
        if (forYouSection) forYouSection.style.display = 'block';
        if (lastSessionSection) lastSessionSection.style.display = 'block';
        
        if (window.navigationState && window.navigationState.currentView === 'playlist-view' && currentPlaylist && playlists[currentPlaylist] && Array.isArray(playlists[currentPlaylist].songs)) {
            songList = [...playlists[currentPlaylist].songs];
        } else {
            songList = [...allSongs];
        }
        filteredSongs = []; 
    } else {
        // Hide all sections when searching to show only search results
        if (forYouSection) forYouSection.style.display = 'none';
        if (lastSessionSection) lastSessionSection.style.display = 'none';
        
        // Determine which song list to search in
        const searchSource = window.navigationState && window.navigationState.currentView === 'playlist-view' && currentPlaylist && playlists[currentPlaylist] && Array.isArray(playlists[currentPlaylist].songs)
            ? playlists[currentPlaylist].songs
            : allSongs;
        
        // Initialize Fuse with the appropriate song list
        const fuse = new Fuse(searchSource, fuseOptions);
        
        // Get fuzzy search results
        const results = fuse.search(query);
        
        // Extract the matched songs
        filteredSongs = results.map(result => result.item);
        songList = [...filteredSongs];
    }

    if (songListDiv) {
        if (songList.length === 0 && query !== "") {
            songListDiv.innerHTML = '<p style="color:#b3b3b3;font-weight:bold;text-align:center;margin-top:20px;">No songs found matching your search.</p>';
        } else if (songList.length === 0 && query === "" && (!window.navigationState || window.navigationState.currentView === 'home' || (window.navigationState.currentView === 'playlist-view' && (!currentPlaylist || !playlists[currentPlaylist] || playlists[currentPlaylist].songs.length === 0)))) {
             if (typeof window.renderSongList === 'function') {
                window.renderSongList();
            } else {
                 songListDiv.innerHTML = '<p style="color:#b3b3b3;font-weight:bold;text-align:center;margin-top:20px;">Song list is empty.</p>';
            }
        } else {
            if (typeof window.renderSongList === 'function') {
                window.renderSongList();
            } else {
                console.error("renderSongList function not found. Cannot update song display.");
                songListDiv.innerHTML = '<p style="color:red;font-weight:bold;">Error: Could not display songs.</p>';
            }
        }
    } else {
        console.error("songListDiv not found. Cannot update song display for search results.");
    }
    
    currentIndex = 0; 
    if (typeof window.refreshPlayingHighlight === 'function') {
        window.refreshPlayingHighlight();
    }
}

function fetchRecommendations() {
    fetch(`${API_URL}/api/recommendations`)
        .then(response => response.json())
        .then (data => {
            // Remember current song to highlight it later
            const currentlyPlaying = currentIndex !== undefined && songList[currentIndex];
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
            
            // Only call if the function is defined
            if (typeof window.refreshPlayingHighlight === 'function') {
                window.refreshPlayingHighlight();
            }
        })
        .catch(error => console.error('Error fetching recommendations:', error));
}

// Function declarations - move before usage
function updateLastSession() {
    fetch(`${API_URL}/recently-played`)
        .then(response => response.json())
        .then(data => {
            // Remember current song to highlight it later
            const currentlyPlaying = currentIndex !== undefined && songList[currentIndex];
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
                    
                    // Use splitNameTwoRows for two-line display
                    text.innerHTML = splitNameTwoRows(song.name.replace(/\.(mp3|m4a)$/,''));
                    
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
            
            // Only call if the function is defined
            if (typeof window.refreshPlayingHighlight === 'function') {
                window.refreshPlayingHighlight();
            }
        })
        .catch(error => {
            console.error('Error fetching last session:', error);
        });
}

// Ensure audio source is set correctly for all songs
function setAudioSource(song) {
    const audioName = song.originalName || song.name;
    if (!audioName) {
        console.error('Invalid song data: missing filename');
        return;
    }

    const audioSrc = `${API_URL}/stream/${encodeURIComponent(audioName)}`;
    const currentSrc = new URL(audioPlayer.src, window.location.origin).href;
    const newSrc = new URL(audioSrc, window.location.origin).href;

    if (currentSrc !== newSrc) {
        console.log('Setting new audio source:', audioSrc);
        audioPlayer.src = audioSrc;
        audioPlayer.load();
    } else {
        console.log('Audio source is already set to:', audioSrc);
    }
}

// Add helper functions with other utility functions
function isValidAudioState() {
    return audioPlayer && 
           audioPlayer.readyState > 0 && 
           isFinite(audioPlayer.duration) && 
           audioPlayer.duration > 0;
}

function updateProgressDisplay(percentage) {
    const percent = Math.min(Math.max(percentage, 0), 1) * 100;
    progressBar.value = percent;
    progressBar.style.setProperty('--value', `${percent}%`);
    currentTimeEl.textContent = formatTime(percent * audioPlayer.duration / 100);
}

// Replace progress bar event listener

// Update playSong function
function playSong(index, forceList) {
    // Clean up previous audio source
    if (audioPlayer) {
        audioPlayer.pause();
        // audioPlayer.removeAttribute('src');
        // audioPlayer.load();
    }

    const targetSongList = forceList || songList;
    if (!targetSongList || !targetSongList[index] || !targetSongList[index].name) {
        console.error(`Invalid song data at index ${index}`);
        return;
    }

    const song = targetSongList[index];
    currentIndex = index;

    if (window.navigationState) {
        window.navigationState.currentSongFilename = song.name;
        window.navigationState.currentPlayingSongIndex = index;
    }

    const audioName = song.originalName || song.name;
    if (!audioName) {
        console.error('Invalid song data: missing filename');
        return;
    }

    const audioSrc = `${API_URL}/stream/${encodeURIComponent(audioName)}`;
    audioPlayer.src = audioSrc;
    progressBar.value = 0;
    progressBar.style.setProperty('--value', '0%');
    currentTimeEl.textContent = '0:00';
    durationEl.textContent = '0:00';

    const onLoaded = () => {
        audioPlayer.removeEventListener('loadedmetadata', onLoaded);
        if (!isValidAudioState()) {
            console.error('Failed to load audio metadata');
            return;
        }
        audioPlayer.play().catch(e => console.error('Playback failed:', e));
    };

    audioPlayer.addEventListener('loadedmetadata', onLoaded);
    audioPlayer.load();

    // Rest of existing playSong function remains unchanged
    if (song.name) {
        fetch(`${API_URL}/track-activity/${encodeURIComponent(song.name)}`, { method: 'POST' })
            .then(() => {
                updateLastSession();
                fetchRecommendations();
            })
            .catch(error => console.error('Error tracking activity:', error));
    }

    document.querySelectorAll('.playing-song').forEach(el => el.classList.remove('playing-song'));
    if (songListDiv?.children[currentIndex]) {
        currentButton = songListDiv.children[currentIndex];
        currentButton.classList.add('playing-song');
    }
    
    if (nowPlayingImg) {
        nowPlayingImg.src = song.image
        ? `${API_URL}/static/images/${song.image}`
            : 'default.jpg';
    }
    if (nowPlayingTitle) {
        nowPlayingTitle.textContent = song.title || song.name.replace(/\.(mp3|m4a)$/, '');
    }
}
function updateProgressFromEvent(e, setAudioTime = false) {
    if (!audioPlayer.duration || !isFinite(audioPlayer.duration)) return;
    const bounds = progressBar.getBoundingClientRect();
    const x = e.clientX - bounds.left;
    const width = bounds.width;
    const percentage = Math.min(Math.max(x / width, 0), 1);

    // Update progress bar value and UI with enhanced visual feedback
    progressBar.value = percentage * 100;
    progressBar.style.setProperty('--value', `${percentage * 100}%`);
    const newTime = percentage * audioPlayer.duration;
    
    // Update time display
    currentTimeEl.textContent = formatTime(newTime);
    
    // Show preview tooltip with time
    showProgressPreview(e, newTime);
    
    // Add visual feedback classes
    if (!setAudioTime) {
        progressBar.classList.add('seeking');
    }

    // Only set audio time if requested (on mouseup/touchend/click)
    if (setAudioTime) {
        try {
            audioPlayer.currentTime = newTime;
            progressBar.classList.remove('seeking');
            hideProgressPreview();
        } catch (error) {
            console.error('Error setting currentTime:', error);
        }
    }
}

function showProgressPreview(e, time) {
    let preview = document.querySelector('.progress-preview');
    if (!preview) {
        preview = document.createElement('div');
        preview.className = 'progress-preview';
        document.querySelector('.progress-container').appendChild(preview);
    }
    
    const bounds = progressBar.getBoundingClientRect();
    const containerBounds = document.querySelector('.progress-container').getBoundingClientRect();
    const x = e.clientX - containerBounds.left;
    
    preview.textContent = formatTime(time);
    preview.style.left = `${x}px`;
    preview.style.opacity = '1';
    preview.style.transform = 'translateX(-50%) translateY(-5px) scale(1.05)';
}

function hideProgressPreview() {
    const preview = document.querySelector('.progress-preview');
    if (preview) {
        preview.style.opacity = '0';
        preview.style.transform = 'translateX(-50%) translateY(0) scale(1)';
    }
}// Dispatch a seeking event to ensure the audio player updates

progressBar.addEventListener('mousedown', (e) => {
    if (!audioPlayer.duration) return;
    isDragging = true;
    wasPlaying = !audioPlayer.paused;
    if (wasPlaying) audioPlayer.pause();
    updateProgressFromEvent(e);
    progressBar.classList.add('dragging');
    progressBar.classList.add('seeking');
});

progressBar.addEventListener('mouseenter', (e) => {
    if (!isDragging && audioPlayer.duration) {
        progressBar.classList.add('hovering');
    }
});

progressBar.addEventListener('mouseleave', (e) => {
    if (!isDragging) {
        progressBar.classList.remove('hovering');
        hideProgressPreview();
    }
});

progressBar.addEventListener('mousemove', (e) => {
    if (!isDragging && audioPlayer.duration) {
        const bounds = progressBar.getBoundingClientRect();
        const x = e.clientX - bounds.left;
        const width = bounds.width;
        const percentage = Math.min(Math.max(x / width, 0), 1);
        const previewTime = percentage * audioPlayer.duration;
        showProgressPreview(e, previewTime);
    }
});

document.addEventListener('mousemove', (e) => {
    if (isDragging) {
        updateProgressFromEvent(e);
    }
});

document.addEventListener('mouseup', (e) => {
    if (isDragging) {
        isDragging = false;
        progressBar.classList.remove('dragging');
        progressBar.classList.remove('seeking');
        updateProgressFromEvent(e, true); // Final update with audio seek
        if (wasPlaying) audioPlayer.play();
        wasPlaying = false;
        hideProgressPreview();
    }
});

// Touch events for mobile
progressBar.addEventListener('touchstart', (e) => {
    if (!audioPlayer.duration) return;
    isDragging = true;
    wasPlaying = !audioPlayer.paused;
    if (wasPlaying) audioPlayer.pause();
    updateProgressFromEvent(e.touches[0]);
    progressBar.classList.add('dragging');
});

progressBar.addEventListener('touchmove', (e) => {
    if (isDragging) {
        e.preventDefault();
        updateProgressFromEvent(e.touches[0]);
    }
}, { passive: false });

progressBar.addEventListener('touchend', (e) => {
    if (isDragging) {
        isDragging = false;
        progressBar.classList.remove('dragging');
        if (e.changedTouches.length > 0) {
            updateProgressFromEvent(e.changedTouches[0]);
        }
        if (wasPlaying) audioPlayer.play();
        wasPlaying = false;
    }
});

progressBar.addEventListener('click', function progressBarClickHandler(e) {
    if (!isDragging && isValidAudioState()) {
        updateProgressFromEvent(e, true);
    }
});

// Update progress bar and time displays
audioPlayer.addEventListener('timeupdate', () => {
    if (!isNaN(audioPlayer.duration) && !isDragging) {
        const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progressBar.value = progress;
        progressBar.style.setProperty('--value', `${progress}%`);
        
        // Add playing class for visual feedback
        if (!audioPlayer.paused) {
            progressBar.classList.add('playing');
        } else {
            progressBar.classList.remove('playing');
        }
        
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
    if (audioPlayer.duration && isFinite(audioPlayer.duration)) {
        durationEl.textContent = formatTime(audioPlayer.duration);
    }
});

// Wrap all playlist-related code in DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const menuLines = document.querySelector('.menu-lines');
    const playlistsBtn = document.getElementById('playlists-btn');
    const lastSessionTracks = document.getElementById('last-session-tracks');

    // Header navigation is initialized separately

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

    // Make renderSongList available globally
    window.renderSongList = function() {
        const songListDiv = document.getElementById('song-list');
        if (!songListDiv) {
            console.error('Song list container not found');
            return;
        }

        const currentView = window.navigationState?.currentView || 'home';
        console.log(`Rendering songs in ${currentView} view:`, songList?.length || 0);

        songListDiv.innerHTML = '';

        if (!Array.isArray(songList) || songList.length === 0) {
            songListDiv.innerHTML = '<p style="color: #b3b3b3;">No songs found</p>';
            return;
        }

        const currentSongList = [...songList];

        currentSongList.forEach((song, index) => {
            if (!song?.name) {
                console.warn('Invalid song data:', song);
                return;
            }
            const button = document.createElement('button');
            const img = document.createElement('img');
            const span = document.createElement('span');
            const actionsIcon = document.createElement('div');
            img.src = song.image ? `${API_URL}/static/images/${song.image}` : 'default.jpg';
            img.alt = song.name;
            img.onerror = () => img.src = 'default.jpg';
            button.dataset.songName = song.name;
            // Use splitNameTwoRows for two-line display
            span.innerHTML = splitNameTwoRows(song.name.replace(/\.(mp3|m4a)$/,''));
            actionsIcon.className = 'song-actions';
            actionsIcon.innerHTML = '<i class="fas fa-ellipsis-v"></i>';
            button.appendChild(img);
            button.appendChild(span);
            button.appendChild(actionsIcon);
            button.addEventListener('click', (function(capturedIndex, capturedSong) {
                return function(e) {
                    if (e.target.closest('.song-actions')) return;
                    console.log(`Song clicked: ${capturedSong.name} at index ${capturedIndex}`);
                    if (currentView === 'home') {
                        songList = [...allSongs];
                    }
                    playSong(capturedIndex, currentSongList);
                };
            })(index, song));
            actionsIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                showPlaylistContextMenu(e, song);
            });
            button.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                showPlaylistContextMenu(e, song);
            });
            songListDiv.appendChild(button);
        });
    };

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
                
                // Header navigation is always visible
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
    
    // Home button functionality removed - add function to return to home view
    window.returnToHomeView = function() {
        // Track navigation state change
        window.navigationState.lastView = window.navigationState.currentView;
        window.navigationState.currentView = 'home';
        
        const playlistView = document.getElementById('playlist-view');
        const playlistDrawer = document.getElementById('playlist-drawer');
        const songListContainer = document.getElementById('song-list');
        const lastSession = document.querySelector('.last-session');
        const forYouSection = document.querySelector('.for-you-section');
        
        // Show main sections
        if (songListContainer) songListContainer.style.display = 'grid';
        if (lastSession) lastSession.style.display = 'block';
        if (forYouSection) forYouSection.style.display = 'block';
        
        // Hide playlists
        if (playlistView) playlistView.classList.remove('open');
        if (playlistDrawer) playlistDrawer.classList.remove('open');
        
        // Save the currently playing song info
        const currentlyPlaying = audioPlayer && audioPlayer.src ? audioPlayer.src : null;
        const wasPlaying = audioPlayer && !audioPlayer.paused;
        
        // Reset to original song list - FORCE a clean reset
        currentPlaylist = null;
        songList = [...allSongs];
        console.log('Returning to home view: Reset to all songs list with', songList.length, 'songs');
        
        // Force songList to be allSongs - do this twice to ensure it takes effect
        setTimeout(() => {
            songList = [...allSongs];
        }, 50);
        
        // Update current index to match the song that's playing in the new list
        if (currentlyPlaying) {
            // First check if we have a stored home view index
            if (typeof window.homeViewCurrentIndex === 'number' && window.homeViewCurrentIndex >= 0 && 
                window.homeViewCurrentIndex < allSongs.length) {
                currentIndex = window.homeViewCurrentIndex;
                console.log('Restored currentIndex from stored value:', currentIndex);
            } else if (window.songMappings && window.songMappings.homeView) {
                // Use the song mappings if available
                currentIndex = window.songMappings.homeView.index;
                console.log('Restored currentIndex from song mappings:', currentIndex);
            } else {
                // Find the current song in the new list by comparing source URLs
                const currentFilename = decodeURIComponent(currentlyPlaying.split('/').pop());
                console.log('Looking for song in home view:', currentFilename);
                
                // Try to find by exact filename match
                let newIndex = songList.findIndex(song => 
                    song.name === currentFilename || 
                    (song.originalName && song.originalName === currentFilename)
                );
                
                // If not found, try by title if we have the current song details
                if (newIndex === -1 && window.songMappings && window.songMappings.currentPlaylist) {
                    const currentSongDetails = window.songMappings.currentPlaylist.songDetails;
                    if (currentSongDetails && currentSongDetails.title) {
                        newIndex = songList.findIndex(song => 
                            (song.title && song.title === currentSongDetails.title) || 
                            song.name.replace(/\.(mp3|m4a)$/i, '') === currentSongDetails.title
                        );
                    }
                }
                
                if (newIndex !== -1) {
                    currentIndex = newIndex;
                    console.log('Updated currentIndex to', currentIndex, 'in home view');
                } else {
                    // If song not found in the new list, keep the index if it's valid
                    if (currentIndex >= 0 && currentIndex < songList.length) {
                        console.log('Maintaining current index:', currentIndex);
                    } else {
                        // Otherwise reset
                        currentIndex = 0;
                        console.log('Reset currentIndex to 0 in home view - song not found');
                    }
                }
            }
            
            // Clear the stored references after use
            window.homeViewCurrentIndex = undefined;
            if (window.songMappings) {
                window.songMappings = {};
            }
        } else {
            // If nothing is playing, reset the index
            currentIndex = 0;
        }
        
        // Render the updated song list
        renderSongList();
        
        // Header navigation is always visible
        
        // Only call if the function is defined
        if (typeof window.refreshPlayingHighlight === 'function') {
            setTimeout(window.refreshPlayingHighlight, 100);
        }
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

    // Make refreshPlayingHighlight function available globally
window.refreshPlayingHighlight = function() {
        // Get current song file name from audio source if available
        let currentSongName = '';
        let currentSongTitle = '';
        
        if (audioPlayer && audioPlayer.src) {
            // Extract the current song name from the audio source
            const currentSrc = audioPlayer.src;
            const currentFilename = currentSrc.split('/').pop();
            currentSongName = decodeURIComponent(currentFilename);
            
            // For highlighting, we need the display name without extension
            currentSongTitle = currentSongName.replace(/\.(mp3|m4a)$/i, '');
        }
        
        // Remove highlighting from all elements
        document.querySelectorAll('.playing-song').forEach(el => {
            el.classList.remove('playing-song');
        });
        
        // If we don't have a current song playing, don't highlight anything
        if (!currentSongName) return;
        
        // Highlight in main song list
        // We use both currentIndex and song name matching to be more reliable
        if (currentIndex !== undefined && songList[currentIndex]) {
            const song = songList[currentIndex];
            
            // Main song list - try by index first
            if (songListDiv?.children[currentIndex]) {
                songListDiv.children[currentIndex].classList.add('playing-song');
            } else {
                // If index doesn't match, try finding by name
                const songButtons = songListDiv?.querySelectorAll('button') || [];
                Array.from(songButtons).forEach((btn, idx) => {
                    const spanText = btn.querySelector('span')?.textContent;
                    if (spanText && (spanText === currentSongTitle || 
                        spanText === song.title || 
                        spanText === song.name.replace(/\.(mp3|m4a)$/, ''))) {
                        btn.classList.add('playing-song');
                    }
                });
            }
            
            // Highlight in recommendations
            const recommendationsItems = document.querySelectorAll('#recommendations-grid .recommendation-item');
            recommendationsItems.forEach(item => {
                const titleEl = item.querySelector('.recommendation-title');
                if (titleEl && 
                    (titleEl.textContent === currentSongTitle || 
                     titleEl.textContent === song.title || 
                     titleEl.textContent === song.name.replace(/\.(mp3|m4a)$/, ''))) {
                    item.classList.add('playing-song');
                }
            });
            
            // Highlight in last session
            const sessionItems = document.querySelectorAll('#last-session-tracks button');
            sessionItems.forEach(item => {
                const spanText = item.querySelector('span')?.textContent;
                if (spanText && 
                    (spanText === currentSongTitle || 
                     spanText === song.name.replace(/\.(mp3|m4a)$/, ''))) {
                    item.classList.add('playing-song');
                }
            });
            
            // Highlight in playlist view if it exists
            const playlistItems = document.querySelectorAll('#playlist-songs .song-item');
            playlistItems.forEach(item => {
                const titleEl = item.querySelector('.song-title');
                if (titleEl && 
                    (titleEl.textContent === currentSongTitle || 
                     titleEl.textContent === song.title || 
                     titleEl.textContent === song.name.replace(/\.(mp3|m4a)$/, ''))) {
                    item.classList.add('playing-song');
                }
            });
        } else {
            // Fallback if currentIndex is invalid: try to highlight by song name only
            console.log('Invalid currentIndex, trying to highlight by song name');
            
            // Look in all possible locations using the song name/title
            const allSongElements = document.querySelectorAll('#song-list button, #recommendations-grid .recommendation-item, #last-session-tracks button, #playlist-songs .song-item');
            allSongElements.forEach(el => {
                const nameEl = el.querySelector('span, .song-title, .recommendation-title');
                if (nameEl && nameEl.textContent === currentSongTitle) {
                    el.classList.add('playing-song');
                }
            });
        }
    }

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
    
    // Call sync at the end of DOM load to establish initial state
    syncCurrentSongState();

    // Sync current song state after DOM is fully loaded
    window.addEventListener('load', function() {
        // Short delay to ensure everything has initialized
        setTimeout(function() {
            console.log('Window loaded, syncing current song state');
            syncCurrentSongState();
            initLastSessionScrollControls();
            
            // Add home navigation to app title
            const appTitle = document.getElementById('app-title');
            if (appTitle) {
                appTitle.addEventListener('click', function() {
                    window.returnToHomeView();
                });
            }
        }, 500);
    });

    // Detect manual navigation through window focus events
    window.addEventListener('focus', function() {
        console.log('Window focused, checking if navigation occurred');
        setTimeout(syncCurrentSongState, 200);
    });

    // Also check when audio source changes
    if (audioPlayer) {
        audioPlayer.addEventListener('loadeddata', function() {
            console.log('Audio source changed, syncing state');
            syncCurrentSongState();
        });
    }
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

    // Remove existing context menus
    if (contextMenu) hideContextMenu();
    if (playlistContextMenu) hidePlaylistContextMenu();
    
    // Get available playlists
    const playlistOptions = Object.keys(playlists || {});
    
    // Create context menu
    contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    
    if (playlistOptions.length > 0) {
        contextMenu.innerHTML = `
            <div class="context-menu-item has-submenu">
                <i class="fas fa-plus"></i>
                Add to Playlist
                <div class="context-submenu">
                    ${playlistOptions.map(name => `
                        <div class="context-menu-item" data-playlist="${name}">
                            <i class="fas fa-list"></i>${name}
                        </div>
                    `).join('')}
                    <div class="context-menu-divider"></div>
                    <div class="context-menu-item" id="create-new-playlist-context">
                        <i class="fas fa-plus"></i>Create New Playlist
                    </div>
                </div>
            </div>
        `;
    } else {
        contextMenu.innerHTML = `
            <div class="context-menu-item" id="create-new-playlist-context">
                <i class="fas fa-plus"></i>Create New Playlist
            </div>
        `;
    }

    // Add click handlers for playlist items
    contextMenu.querySelectorAll('.context-submenu .context-menu-item[data-playlist]').forEach(item => {
        item.onclick = () => {
            const playlistName = item.dataset.playlist;
            addSongToPlaylist(playlistName, song);
            hideContextMenu();
        };
    });
    
    // Add handler for creating a new playlist
    const createPlaylistItem = contextMenu.querySelector('#create-new-playlist-context');
    if (createPlaylistItem) {
        createPlaylistItem.onclick = () => {
            hideContextMenu();
            createPlaylistModal.style.display = 'flex';
            newPlaylistNameInput.focus();
            
            // Store the song to add after creating playlist
            window.songToAddAfterCreate = song;
            
            // Modify the save button click handler temporarily
            const originalSaveHandler = saveNewPlaylistBtn.onclick;
            saveNewPlaylistBtn.onclick = async () => {
                await createNewPlaylist();
                
                // Add the song to the new playlist if it exists
                if (window.songToAddAfterCreate) {
                    const playlistName = newPlaylistNameInput.value.trim();
                    if (playlistName) {
                        addSongToPlaylist(playlistName, window.songToAddAfterCreate);
                    }
                    window.songToAddAfterCreate = null;
                }
                
                // Restore original handler
                saveNewPlaylistBtn.onclick = originalSaveHandler;
            };
        };
    }

    // Position and show menu
    contextMenu.style.top = `${e.pageY}px`;
    contextMenu.style.left = `${e.pageX}px`;
    document.body.appendChild(contextMenu);
    setTimeout(() => contextMenu.classList.add('active'), 10);

    // Stop immediate closing
    contextMenu.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Hide on click outside - use a separate function to add/remove this event listener
    const handleDocumentClick = (e) => {
        if (!contextMenu.contains(e.target)) {
            hideContextMenu();
        }
    };
    
    document.addEventListener('click', handleDocumentClick);
    
    // Store reference to the handler for removal later
    contextMenu.handleDocumentClick = handleDocumentClick;
}

function hideContextMenu() {
    if (contextMenu) {
        // Remove event listener to avoid memory leaks
        if (contextMenu.handleDocumentClick) {
            document.removeEventListener('click', contextMenu.handleDocumentClick);
        }
        
        contextMenu.classList.remove('active');
        
        // Remove after transition
        setTimeout(() => {
            if (contextMenu && contextMenu.parentNode) {
                contextMenu.remove();
            }
            contextMenu = null;
        }, 100);
    }
}

function hidePlaylistContextMenu() {
    if (playlistContextMenu) {
        // Remove event listener to avoid memory leaks
        if (playlistContextMenu.handleDocumentClick) {
            document.removeEventListener('click', playlistContextMenu.handleDocumentClick);
        }
        // Remove showing-context class from the target element
        if (playlistContextMenu.targetElement) {
            playlistContextMenu.targetElement.classList.remove('showing-context');
        }
        playlistContextMenu.classList.remove('active');
        // Remove after transition
        setTimeout(() => {
            if (playlistContextMenu && playlistContextMenu.parentNode) {
                playlistContextMenu.remove();
            }
            playlistContextMenu = null;
        }, 100);
    }
}

// Header navigation is always visible, no need for show/hide functions

async function addSongToPlaylist(playlistName, song) {
    const playlist = playlists[playlistName] || [];
    // Prevent adding duplicate songs to a playlist
    if (playlist.some(pSong => pSong.name === song.name)) {
        showNotification(`"${song.title || song.name}" is already in ${playlistName}`, 'info');
        return;
    }
    const updatedSongs = [...playlist, song];

    try {
        const response = await fetch(`${API_URL}/playlists/${encodeURIComponent(playlistName)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ songs: updatedSongs })
        });

        if (response.ok) {
            playlists[playlistName] = updatedSongs;
            showNotification(`Added "${song.title || song.name}" to ${playlistName}`, 'success');
        } else {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || 'Failed to add song';
            showNotification(`Error: ${errorMessage}`, 'error');
        }
    } catch (error) {
        console.error('Error adding song to playlist:', error);
        showNotification('Network error adding song to playlist', 'error');
    }
}

// Add a repeat button functionality
const repeatButton = document.getElementById('repeat-button');
let isRepeatOn = false;

if (repeatButton) {
    // Change color on hover
    repeatButton.addEventListener('mouseenter', () => {
        repeatButton.style.color = 'yellow';
    });

    repeatButton.addEventListener('mouseleave', () => {
        repeatButton.style.color = isRepeatOn ? 'green' : '';
    });

    // Toggle repeat functionality
    repeatButton.addEventListener('click', () => {
        isRepeatOn = !isRepeatOn;
        repeatButton.style.color = isRepeatOn ? 'green' : '';

        if (isRepeatOn) {
            audioPlayer.loop = true;
        } else {
            audioPlayer.loop = false;
        }
    });
}

// Playlist drawer functionality
// DO NOT add event listener for showPlaylistsBtn here - it's handled in the main DOMContentLoaded event

// Initialize these elements but don't add duplicated event handlers
const playlistDrawer = document.getElementById('playlist-drawer');
const closeDrawerBtn = document.querySelector('.close-drawer');
const playlistView = document.getElementById('playlist-view');
const backToPlaylistsBtn = document.querySelector('.back-to-playlists');
const playlistsContainer = document.getElementById('playlists-container');
const createPlaylistModal = document.getElementById('create-playlist-modal');
const closeModalBtn = document.querySelector('.close-modal');
const saveNewPlaylistBtn = document.getElementById('save-new-playlist');
const newPlaylistNameInput = document.getElementById('new-playlist-name');

// Add event listener for the back-to-playlists button
if (backToPlaylistsBtn) {
    backToPlaylistsBtn.addEventListener('click', () => {
        console.log('Back to playlists button clicked');
        
        // Track navigation state change
        window.navigationState.lastView = window.navigationState.currentView;
        window.navigationState.currentView = 'playlist-drawer';
        
        // Save current playlist songs and current index before switching
        const currentPlaylistSongs = [...songList];
        const playlistIndex = currentIndex;
        
        // Get currently playing song info from the audio player
        const currentlyPlaying = audioPlayer && audioPlayer.src ? audioPlayer.src : null;
        let currentPlayingSongDetails = null;
        
        if (currentlyPlaying && playlistIndex >= 0 && playlistIndex < currentPlaylistSongs.length) {
            currentPlayingSongDetails = currentPlaylistSongs[playlistIndex];
            console.log('Preserving playing song details:', currentPlayingSongDetails.title || 
                        currentPlayingSongDetails.name.replace(/\.(mp3|m4a)$/i, ''));
        }
        
        // Close the playlist view
        if (playlistView) {
            playlistView.classList.remove('open');
        }
        
        // Show the playlist drawer
        if (playlistDrawer) {
            playlistDrawer.classList.add('open');
        }
        
        // Store information about what's currently playing to maintain consistency between views
        if (currentlyPlaying) {
            // Extract the filename from the playing URL
            const currentFilename = decodeURIComponent(currentlyPlaying.split('/').pop());
            
            // Store mappings for different views to maintain proper indexes
            if (!window.songMappings) {
                window.songMappings = {};
            }
            
            // Store the current playlist mapping
            window.songMappings.currentPlaylist = {
                filename: currentFilename,
                index: playlistIndex,
                songDetails: currentPlayingSongDetails
            };
            
            // Find the equivalent index in the allSongs array for when returning to home view
            if (allSongs.length > 0) {
                const allSongsIndex = allSongs.findIndex(song => 
                    song.name === currentFilename || 
                    (song.originalName && song.originalName === currentFilename)
                );
                
                if (allSongsIndex !== -1) {
                    // Store the home view index reference
                    window.homeViewCurrentIndex = allSongsIndex;
                    
                    // Also store in our mappings object
                    window.songMappings.homeView = {
                        filename: currentFilename,
                        index: allSongsIndex,
                        songDetails: allSongs[allSongsIndex]
                    };
                    
                    console.log('Updated home view index reference:', allSongsIndex);
                }
            }
        }
        
        // Call refreshPlayingHighlight to update visuals
        if (typeof window.refreshPlayingHighlight === 'function') {
            setTimeout(window.refreshPlayingHighlight, 100);
        }
    });
}

// Event Listeners - but NOT for showPlaylistsBtn which is handled elsewhere
// Only set up other handlers that won't conflict
if (closeDrawerBtn) {
    closeDrawerBtn.addEventListener('click', () => {
        if (playlistDrawer) {
            playlistDrawer.classList.remove('open');
            
            // Return to home view using the global function
            if (typeof window.returnToHomeView === 'function') {
                window.returnToHomeView();
            } else {
                // Fallback if function not available
                if (typeof renderSongList === 'function' && window.allSongs) {
                    window.songList = [...window.allSongs];
                    renderSongList();
                }
            }
        }
    });
}

// Create Playlist Functionality
// The createNewPlaylistBtn no longer exists, handled by the card click

closeModalBtn?.addEventListener('click', () => {
    createPlaylistModal.style.display = 'none';
});

saveNewPlaylistBtn?.addEventListener('click', createNewPlaylist);

// Close modal when clicking outside - improved version
window.addEventListener('click', (event) => {
    // Check if the playlist modal exists and is visible
    if (createPlaylistModal && 
        createPlaylistModal.style.display === 'flex' && 
        event.target === createPlaylistModal) {
        createPlaylistModal.style.display = 'none';
    }
    
    // Also handle the main playlist modal if it exists
    if (playlistModal && 
        playlistModal.style.display === 'block' && 
        event.target === playlistModal) {
        playlistModal.style.display = 'none';
    }
});

// Handle Escape key to close modals
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        // Close create playlist modal if open
        if (createPlaylistModal && createPlaylistModal.style.display === 'flex') {
            createPlaylistModal.style.display = 'none';
        }
        
        // Close main playlist modal if open
        if (playlistModal && playlistModal.style.display === 'block') {
            playlistModal.style.display = 'none';
        }
        
        // Close context menus if open
        if (contextMenu) {
            hideContextMenu();
        }
        
        if (playlistContextMenu) {
            hidePlaylistContextMenu();
        }
    }
});

// Handle Enter key in the playlist name input
newPlaylistNameInput?.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
        createNewPlaylist();
    }
});

// Helper: Split long song names into two rows
function splitNameTwoRows(name, maxLen = 18) {
    if (typeof name !== 'string') return name;
    if (name.length > maxLen) {
        let mid = Math.floor(name.length / 2);
        let before = name.lastIndexOf(' ', mid);
        let after = name.indexOf(' ', mid);
        let splitAt;
        if (before === -1 && after === -1) {
            splitAt = mid;
        } else if (before === -1) {
            splitAt = after;
        } else if (after === -1) {
            splitAt = before;
        } else {
            splitAt = (mid - before <= after - mid) ? before : after;
        }
        return name.slice(0, splitAt) + '<br>' + name.slice(splitAt + 1);
    }
    return name;
}

// Function to create a new playlist
async function createNewPlaylist() {
    const playlistName = newPlaylistNameInput.value.trim();
    
    if (!playlistName) {
        showCustomAlert('Input Required', 'Please enter a playlist name.');
        return;
    }
    
    // Check if playlist already exists (case-insensitive for user-friendliness)
    const existingPlaylist = Object.keys(playlists).find(
        name => name.toLowerCase() === playlistName.toLowerCase()
    );
    if (existingPlaylist) {
        showCustomAlert('Playlist Exists', `A playlist named "${existingPlaylist}" already exists. Please choose a different name.`);
        return;
    }

    try {
        const response = await fetch(`${API_URL}/playlists/${encodeURIComponent(playlistName)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ songs: [] })
        });
        
        if (response.ok) {
            // Add the empty playlist to the playlists object
            playlists[playlistName] = [];
            createPlaylistModal.style.display = 'none';
            newPlaylistNameInput.value = '';
            
            // Reload playlists to show the new one
            loadPlaylists();
            showNotification(`Playlist "${playlistName}" created successfully!`, 'success');

            // Make sure original song list display is preserved
            if (window.location.pathname === "/" || window.location.pathname === "/index.html") {
                songList = [...allSongs];
                if(typeof renderSongList === 'function') renderSongList();
            }
        } else {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || 'Failed to create playlist';
            showCustomAlert('Creation Failed', `Failed to create playlist: ${errorMessage}. Please try again.`);
        }
    } catch (error) {
        console.error('Error creating playlist:', error);
        showCustomAlert('Network Error', 'Error creating playlist. Please check your connection and try again.');
    }
}

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
    
    // Add "Create New Playlist" card at the beginning
    const createPlaylistCard = document.createElement('div');
    createPlaylistCard.className = 'playlist-card new-playlist-card';
    createPlaylistCard.innerHTML = `
        <div class="playlist-cover new-playlist-cover">
            <i class="fas fa-plus-circle"></i>
        </div>
        <div class="playlist-info">
            <h3>Create New Playlist</h3>
            <p>Add your favorite songs</p>
        </div>
    `;
    
    createPlaylistCard.addEventListener('click', () => {
        createPlaylistModal.style.display = 'flex';
        newPlaylistNameInput.focus();
    });
    
    // Add right-click context menu for new playlist card
    createPlaylistCard.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showPlaylistContextMenu(e, { isCreateNewCard: true, name: 'Create New Playlist' });
    });
    
    container.appendChild(createPlaylistCard);
    
    // Display existing playlists
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
        
        // Open playlist on click
        card.addEventListener('click', () => {
            showPlaylistSongs(playlist);
        });
        
        // Add right-click context menu
        card.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showPlaylistContextMenu(e, playlist);
        });
        
        container.appendChild(card);
    });
}

function showPlaylistSongs(playlist) {
    const playlistView = document.getElementById('playlist-view');
    const playlistSongs = document.getElementById('playlist-songs');
    const playlistTitle = document.querySelector('.playlist-title');
    const playlistDrawer = document.getElementById('playlist-drawer');
    
    // Track navigation state change
    window.navigationState.lastView = window.navigationState.currentView;
    window.navigationState.currentView = 'playlist-view';
    
    // Store the previous song list for comparison
    const previousSongList = [...songList];
    const previousIndex = currentIndex;
    
    // Save info about currently playing song if any
    let currentlyPlayingSong = null;
    let currentlyPlayingUrl = null;
    
    if (audioPlayer && audioPlayer.src) {
        currentlyPlayingUrl = audioPlayer.src;
        // Extract filename from the URL
        const playingFilename = decodeURIComponent(currentlyPlayingUrl.split('/').pop());
        // Find the song in the previous song list
        if (previousIndex >= 0 && previousIndex < previousSongList.length) {
            currentlyPlayingSong = previousSongList[previousIndex];
        } else {
            // Fallback: try to find by name
            currentlyPlayingSong = previousSongList.find(song => 
                song.name === playingFilename || 
                (song.originalName && song.originalName === playingFilename)
            );
        }
        console.log('Currently playing song detected:', playingFilename);
    }
    
    if (!playlist || !Array.isArray(playlist.songs)) {
        console.error('Invalid playlist data:', playlist);
        return;
    }

    // Close the playlist drawer and open the playlist view
    if (playlistDrawer) {
        playlistDrawer.classList.remove('open');
    }
    
    // Show the playlist view
    if (playlistView) {
        playlistView.classList.add('open');
    }

    // Keep hamburger menu visible - DO NOT hide it
    // const hamburgerMenu = document.querySelector('.hamburger-menu');
    // if (hamburgerMenu) {
    //     hamburgerMenu.style.display = 'none';
    // }

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
    
    // If a song was playing, find its corresponding index in the new playlist
    if (currentlyPlayingSong && currentlyPlayingUrl) {
        const playingFilename = decodeURIComponent(currentlyPlayingUrl.split('/').pop());
        
        // First try to find by exact filename match
        let newIndex = songList.findIndex(song => song.name === playingFilename);
        
        // If not found, try to match by title
        if (newIndex === -1 && currentlyPlayingSong.title) {
            newIndex = songList.findIndex(song => 
                song.title === currentlyPlayingSong.title || 
                song.name.replace(/\.(mp3|m4a)$/i, '') === currentlyPlayingSong.title
            );
        }
        
        // If found, update the current index
        if (newIndex !== -1) {
            currentIndex = newIndex;
            console.log('Updated currentIndex in playlist view to:', currentIndex);
        } else {
            console.log('Could not find matching song in playlist, keeping index:', currentIndex);
        }
    }

    console.log('Mapped songList:', songList.length, 'songs. Current index:', currentIndex); // Debug log
    
    songList.forEach((song, index) => {
        const songElement = document.createElement('div');
        songElement.className = 'song-item';
        songElement.innerHTML = `
            <img src="${API_URL}/static/images/${song.image}" 
                 alt="${song.title}" 
                 class="song-thumbnail" 
                 onerror="this.src='default.jpg'">
            <div class="song-info">
                <div class="song-title">${splitNameTwoRows(song.title)}</div>
                <div class="song-artist">${song.artist}</div>
            </div>
            <div class="song-actions">
                <i class="fas fa-ellipsis-v"></i>
            </div>
            <div class="song-number">#${index + 1}</div>
        `;
        
        songElement.addEventListener('click', (e) => {
            if (!e.target.closest('.song-actions')) {
                playSong(index);
            }
        });
        
        songElement.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showPlaylistContextMenu(e, song);
        });
        
        const actionsBtn = songElement.querySelector('.song-actions');
        actionsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showPlaylistContextMenu(e, song);
        });

        playlistSongs.appendChild(songElement);
    });
    
    // Make sure the playlist view is visible
    playlistView.classList.add('open');
    
    // Keep hamburger menu visible in playlist view
    
    // After everything is loaded, refresh playing highlights
    if (typeof window.refreshPlayingHighlight === 'function') {
        setTimeout(window.refreshPlayingHighlight, 100);
    }
}

// Update now playing function
function updateNowPlaying(song) {
    document.getElementById('now-playing-title').textContent = song.title;
    document.getElementById('now-playing-artist').textContent = song.artist;
    document.getElementById('now-playing-img').src = song.thumbnail || 'default.jpg';
}

// Add horizontal scroll controls to the Last Session section
function initLastSessionScrollControls() {
    const sessionContainer = document.querySelector('.session-tracks');
    const sessionSection = document.querySelector('.last-session');
    
    if (!sessionContainer || !sessionSection) return;
    
    // Create scroll buttons
    const leftScrollBtn = document.createElement('button');
    const rightScrollBtn = document.createElement('button');
    
    leftScrollBtn.className = 'scroll-btn scroll-left';
    rightScrollBtn.className = 'scroll-btn scroll-right';
    
    leftScrollBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    rightScrollBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    
    // Add buttons to the last session section
    sessionSection.appendChild(leftScrollBtn);
    sessionSection.appendChild(rightScrollBtn);
    
    // Scroll functions - adjust for grid layout
    // Calculate column width dynamically
    const getColumnWidth = () => {
        // Get the computed column width from grid
        const gridStyle = window.getComputedStyle(sessionContainer);
        const gridTemplateColumns = gridStyle.getPropertyValue('grid-template-columns');
        
        // Find first column width from template
        if (gridTemplateColumns) {
            // Check if we can extract a pixel value
            const match = gridTemplateColumns.match(/(\d+)px/);
            if (match && match[1]) {
                return parseInt(match[1], 10) +  15; // Add the gap
            }
        }
        
        // Fallback to a reasonable column width if we can't determine it
        return 180; // Default column width + gap
    };
    
    leftScrollBtn.addEventListener('click', () => {
        // Scroll by one column width
        const scrollAmount = getColumnWidth();
        sessionContainer.scrollBy({
            left: -scrollAmount,
            behavior: 'smooth'
        });
    });
    
    rightScrollBtn.addEventListener('click', () => {
        // Scroll by one column width
        const scrollAmount = getColumnWidth();
        sessionContainer.scrollBy({
            left: scrollAmount,
            behavior: 'smooth'
        });
    });
    
    // Show/hide scroll buttons based on scroll position
    sessionContainer.addEventListener('scroll', () => {
        // Show left button only when scrolled
        leftScrollBtn.style.opacity = sessionContainer.scrollLeft > 20 ? '1' : '0.3';
        
        // Show right button only when more to scroll
        const maxScrollLeft = sessionContainer.scrollWidth - sessionContainer.clientWidth -  20;
        rightScrollBtn.style.opacity = sessionContainer.scrollLeft < maxScrollLeft ? '1' : '0.3';
    });
    
    // Trigger initial check
    setTimeout(() => {
        // Hide left button initially
        leftScrollBtn.style.opacity = '0.3';
        
        // Check if overflow exists to show right button
        const hasOverflow = sessionContainer.scrollWidth > sessionContainer.clientWidth;
        rightScrollBtn.style.opacity = hasOverflow ? '1' : '0.3';
    }, 500);
    
    // Add keyboard navigation
    document.addEventListener('keydown', (e) => {
        // Only if last session area is visible in viewport
        const rect = sessionSection.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
        
        if (isVisible) {
            const scrollAmount = getColumnWidth(); // Define scrollAmount here
            if (e.key === 'ArrowLeft' && e.altKey) {
                sessionContainer.scrollBy({
                    left: -scrollAmount,
                    behavior: 'smooth'
                });
                e.preventDefault();
            } else if (e.key === 'ArrowRight' && e.altKey) {
                sessionContainer.scrollBy({
                    left: scrollAmount,
                    behavior: 'smooth'
                });
                e.preventDefault();
            }
        }
    });
}

// Function to show custom confirmation modal
function showCustomConfirm(title, message, onConfirm, type = 'warning', confirmText = 'Yes', cancelText = 'Cancel') {
    const confirmModal = document.getElementById('custom-confirm-modal');
    const confirmTitle = document.getElementById('confirm-title');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmYesBtn = document.getElementById('confirm-yes-btn');
    const confirmNoBtn = document.getElementById('confirm-no-btn');
    const closeConfirmModalBtn = document.getElementById('close-confirm-modal');

    if (!confirmModal || !confirmTitle || !confirmMessage || !confirmYesBtn || !confirmNoBtn || !closeConfirmModalBtn) {
        console.error('Custom confirm modal elements not found');
        if (confirm(message)) {
            onConfirm();
        }
        return;
    }

    // Configure title with icon and color based on type
    const iconMap = {
        'warning': 'fa-exclamation-triangle',
        'danger': 'fa-exclamation-circle',
        'info': 'fa-question-circle',
        'success': 'fa-check-circle'
    };

    const colorMap = {
        'warning': 'var(--modal-warning)',
        'danger': 'var(--modal-danger)',
        'info': 'var(--modal-text)',
        'success': 'var(--modal-success)'
    };

    const icon = iconMap[type] || iconMap.warning;
    const color = colorMap[type] || colorMap.warning;

    confirmTitle.innerHTML = `<i class="fas ${icon}" style="margin-right: 10px; color: ${color};"></i><span>${title}</span>`;
    confirmMessage.innerHTML = message;
    
    // Remove previous event listeners to prevent multiple calls
    const newYesBtn = confirmYesBtn.cloneNode(true);
    confirmYesBtn.parentNode.replaceChild(newYesBtn, confirmYesBtn);
    
    const newNoBtn = confirmNoBtn.cloneNode(true);
    confirmNoBtn.parentNode.replaceChild(newNoBtn, confirmNoBtn);

    // Update button text and styling
    newYesBtn.querySelector('span').textContent = confirmText;
    newNoBtn.querySelector('span').textContent = cancelText;
    
    // Set appropriate button styling based on type
    newYesBtn.className = `btn btn-${type === 'danger' ? 'danger' : 'primary'}`;
    
    // Set appropriate button icons
    const yesIcon = type === 'danger' ? 'fa-trash-alt' : 'fa-check';
    newYesBtn.querySelector('i').className = `fas ${yesIcon}`;

    const closeModal = () => {
        confirmModal.style.display = 'none';
    };

    newYesBtn.onclick = () => {
        closeModal();
        onConfirm();
    };

    newNoBtn.onclick = closeModal;
    closeConfirmModalBtn.onclick = closeModal;
    
    // Handle Escape key to close modal
    const handleEscKey = (event) => {
        if (event.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleEscKey);
        }
    };
    document.addEventListener('keydown', handleEscKey);

    // Add key handler for Enter and Space
    const handleKeyPress = (event) => {
        if (event.key === 'Enter') {
            closeModal();
            onConfirm();
            document.removeEventListener('keydown', handleKeyPress);
        }
    };
    document.addEventListener('keydown', handleKeyPress);

    confirmModal.style.display = 'flex';
}

// Update showPlaylistContextMenu to use custom confirm modal
function showPlaylistContextMenu(e, contextObj) {
    e.preventDefault();

    // Remove existing context menu
    if (playlistContextMenu) hidePlaylistContextMenu();
    if (contextMenu) hideContextMenu();
    
    playlistContextMenu = document.createElement('div');
    playlistContextMenu.className = 'context-menu';

    // If contextObj is a playlist (has songs array or isCreateNewCard), show playlist options
    if (contextObj && (contextObj.songs || contextObj.isCreateNewCard)) {
        if (contextObj.isCreateNewCard) {
            playlistContextMenu.innerHTML = `
                <div class="context-menu-item">
                    <i class="fas fa-info-circle"></i>
                    Create a new playlist
                </div>
            `;
        } else {
            playlistContextMenu.innerHTML = `
                <div class="context-menu-item" id="remove-playlist">
                    <i class="fas fa-trash"></i>
                    Remove Playlist
                </div>
            `;
            const removePlaylistItem = playlistContextMenu.querySelector('#remove-playlist');
            if (removePlaylistItem) {
                removePlaylistItem.onclick = () => {
                    const personalizedMessage = `Are you sure you want to remove playlist <br><strong>\"${contextObj.name}\"</strong>? <br><br><small>This action cannot be undone.</small>`;
                    showCustomConfirm(
                        'Confirm Playlist Removal',
                        personalizedMessage,
                        () => removePlaylist(contextObj.name)
                    );
                    hidePlaylistContextMenu();
                };
            }
        }
    } else if (contextObj && (contextObj.name || contextObj.title)) {
        // Assume contextObj is a song
        // Get available playlists
        const playlistOptions = Object.keys(playlists || {});
        playlistContextMenu.innerHTML =
            playlistOptions.length > 0 ?
            `<div class="context-menu-item has-submenu">
                <i class="fas fa-plus"></i>
                Add to Playlist
                <div class="context-submenu">
                    ${playlistOptions.map(name => `
                        <div class="context-menu-item" data-playlist="${name}">
                            <i class="fas fa-list"></i>${name}
                        </div>
                    `).join('')}
                    <div class="context-menu-divider"></div>
                    <div class="context-menu-item" id="create-new-playlist-context">
                        <i class="fas fa-plus"></i>Create New Playlist
                    </div>
                </div>
            </div>`
            :
            `<div class="context-menu-item" id="create-new-playlist-context">
                <i class="fas fa-plus"></i>Create New Playlist
            </div>`;
        // Add click handlers for playlist items
        playlistContextMenu.querySelectorAll('.context-submenu .context-menu-item[data-playlist]').forEach(item => {
            item.onclick = () => {
                const playlistName = item.dataset.playlist;
                addSongToPlaylist(playlistName, contextObj);
                hidePlaylistContextMenu();
            };
        });
        // Add handler for creating a new playlist
        const createPlaylistItem = playlistContextMenu.querySelector('#create-new-playlist-context');
        if (createPlaylistItem) {
            createPlaylistItem.onclick = () => {
                hidePlaylistContextMenu();
                createPlaylistModal.style.display = 'flex';
                newPlaylistNameInput.focus();
                window.songToAddAfterCreate = contextObj;
                // Modify the save button click handler temporarily
                const originalSaveHandler = saveNewPlaylistBtn.onclick;
                saveNewPlaylistBtn.onclick = async () => {
                    await createNewPlaylist();
                    if (window.songToAddAfterCreate) {
                        const playlistName = newPlaylistNameInput.value.trim();
                        if (playlistName) {
                            addSongToPlaylist(playlistName, window.songToAddAfterCreate);
                        }
                        window.songToAddAfterCreate = null;
                    }
                    saveNewPlaylistBtn.onclick = originalSaveHandler;
                };
            };
        }
    }

    // Position and show menu
    document.body.appendChild(playlistContextMenu);
    
    // Get menu dimensions and window bounds
    const menuRect = playlistContextMenu.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Calculate if menu would overflow
    const overflowRight = e.clientX + menuRect.width > windowWidth;
    const overflowBottom = e.clientY + menuRect.height > windowHeight;
    
    // Position menu - if it would overflow, show it on the left/above instead
    playlistContextMenu.style.left = overflowRight ? 
        `${e.pageX - menuRect.width}px` : 
        `${e.pageX}px`;
    
    playlistContextMenu.style.top = overflowBottom ? 
        `${e.pageY - menuRect.height}px` : 
        `${e.pageY}px`;
    
    playlistContextMenu.style.zIndex = 9999;
    
    setTimeout(() => {
        playlistContextMenu.classList.add('active');
        playlistContextMenu.style.pointerEvents = 'all';
    }, 10);

    // Store current context
    if (contextObj && contextObj.songs && e.target.closest('.playlist-card')) {
        playlistContextMenu.targetElement = e.target.closest('.playlist-card');
        playlistContextMenu.targetElement.classList.add('showing-context');
    }
    currentContextPlaylist = contextObj;

    playlistContextMenu.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    const handleDocumentClick = (e) => {
        if (!playlistContextMenu.contains(e.target)) {
            hidePlaylistContextMenu();
        }
    };
    document.addEventListener('click', handleDocumentClick);
    playlistContextMenu.handleDocumentClick = handleDocumentClick;
}

// Function to remove a playlist
async function removePlaylist(playlistDisplayName) {
    // Extract the original playlist name (username) by removing "'s Collection"
    const originalPlaylistName = playlistDisplayName.replace(/\'s Collection$/, '');

    try {
        // First try the DELETE method using the original playlist name
        let response = await fetch(`${API_URL}/playlists/${encodeURIComponent(originalPlaylistName)}`, {
            method: 'DELETE'
        });
        
        // If that fails, try using POST to a /remove endpoint with original name
        if (!response.ok) {
            console.log('DELETE method failed, trying POST to /remove endpoint');
            
            response = await fetch(`${API_URL}/playlists/${encodeURIComponent(originalPlaylistName)}/remove`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'remove' })
            });
        }
        
        // If that also fails, try updating the playlist with empty songs array using original name
        if (!response.ok) {
            console.log('Second method failed, trying alternate approach with empty songs');
            
            response = await fetch(`${API_URL}/playlists/${encodeURIComponent(originalPlaylistName)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    songs: [],
                    delete: true  // Add a special flag that the backend might recognize
                })
            });
        }
        
        if (response.ok) {
            // Remove from local playlists object (using the display name for consistency)
            if (playlists[playlistDisplayName]) {
                delete playlists[playlistDisplayName];
            } else if (playlists[originalPlaylistName]) { // Fallback to original name
                delete playlists[originalPlaylistName];
            }
            
            // Show success message
            showNotification(`Playlist "${playlistDisplayName}" removed successfully`, 'success');
            
            // Refresh playlists display
            loadPlaylists();
            
            // If we're currently viewing this playlist, go back to home
            if (currentPlaylist && currentPlaylist.name === playlistDisplayName) {
                window.returnToHomeView();
            }
            
            console.log(`Playlist "${playlistDisplayName}" (original: "${originalPlaylistName}") removed successfully`);
        } else {
            // All methods failed - tell the user what's happening
            console.error('Failed to remove playlist. Server responded with:', response.status, response.statusText);
            
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || response.statusText || 'Unknown error';
            
            showNotification(`Could not remove playlist "${playlistDisplayName}": ${errorMessage}. Contact support.`, 'error');
        }
    } catch (error) {
        console.error('Error removing playlist:', error);
        showNotification('Network error while removing playlist', 'error');
    }
}

// Function to show custom alert modal
function showCustomAlert(title, message, type = 'info', onClose) {
    const alertModal = document.getElementById('custom-alert-modal');
    const alertTitle = document.getElementById('alert-title');
    const alertMessage = document.getElementById('alert-message');
    const alertOkBtn = document.getElementById('alert-ok-btn');
    const closeAlertModalBtn = document.getElementById('close-alert-modal');

    if (!alertModal || !alertTitle || !alertMessage || !alertOkBtn || !closeAlertModalBtn) {
        console.error('Custom alert modal elements not found');
        alert(message);
        if (onClose) onClose();
        return;
    }

    const iconMap = {
        'success': 'fa-check-circle',
        'error': 'fa-exclamation-circle',
        'warning': 'fa-exclamation-triangle',
        'info': 'fa-info-circle'
    };

    const colorMap = {
        'success': 'var(--modal-success)',
        'error': 'var(--modal-danger)',
        'warning': 'var(--modal-warning)',
        'info': 'var(--modal-text)'
    };

    const icon = iconMap[type] || iconMap.info;
    const color = colorMap[type] || colorMap.info;

    alertTitle.innerHTML = `<i class="fas ${icon}" style="margin-right: 10px; color: ${color};"></i><span>${title}</span>`;
    alertMessage.innerHTML = message;

    const newOkBtn = alertOkBtn.cloneNode(true);
    alertOkBtn.parentNode.replaceChild(newOkBtn, alertOkBtn);
    
    const newCloseBtn = closeAlertModalBtn.cloneNode(true);
    closeAlertModalBtn.parentNode.replaceChild(newCloseBtn, closeAlertModalBtn);

    const closeModal = () => {
        alertModal.style.display = 'none';
        if (onClose) onClose();
    };

    newOkBtn.onclick = closeModal;
    newCloseBtn.onclick = closeModal;

    const handleEscKey = (event) => {
        if (event.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleEscKey);
        }
    };
    document.addEventListener('keydown', handleEscKey);

    alertModal.style.display = 'flex';
}

// Enhanced notification function with more types and custom duration
function showNotification(message, type = 'info', duration = 3000) {
    // Remove any existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const iconMap = {
        'success': 'fa-check-circle',
        'error': 'fa-exclamation-circle',
        'warning': 'fa-exclamation-triangle',
        'info': 'fa-info-circle'
    };

    const icon = iconMap[type] || iconMap.info;
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        </div>
        <button class="close-notification" aria-label="Close notification">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Show with animation
    requestAnimationFrame(() => {
        notification.classList.add('show');
    });
    
    // Add close button functionality
    const closeBtn = notification.querySelector('.close-notification');
    const closeNotification = () => {
        notification.classList.remove('show');
        // Wait for animation to complete before removing
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    };

    if (closeBtn) {
        closeBtn.addEventListener('click', closeNotification);
    }
    
    // Auto hide after specified duration
    if (duration > 0) {
        setTimeout(closeNotification, duration);
    }

    // Add key handler for accessibility
    notification.setAttribute('role', 'alert');
    notification.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeNotification();
        }
    });
}

// Ensure clicking on the progress bar updates the playback position correctly

// Ensure play/pause button reflects the current state of the audio player
audioPlayer.addEventListener('play', () => {
    if (playPauseBtn) {
        playPauseBtn.classList.add('playing');
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    }
});

audioPlayer.addEventListener('pause', () => {
    if (playPauseBtn) {
        playPauseBtn.classList.remove('playing');
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
});

// Initialize the play/pause button state on page load
if (playPauseBtn) {
    if (!audioPlayer.paused) {
        playPauseBtn.classList.add('playing');
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    } else {
        playPauseBtn.classList.remove('playing');
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
}