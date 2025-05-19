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

// Add a context menu for playlists
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

// Global function to toggle the hamburger menu - DEFINE BEFORE USE
window.toggleHamburgerMenu = function(forceClose = false) {
    console.log('Global toggleHamburgerMenu function called', forceClose ? '(force close)' : '');
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const menuContent = document.querySelector('.menu-content');
    
    if (!hamburgerMenu || !menuContent) {
        console.error('Cannot toggle menu - elements not found');
        return;
    }
    
    // Toggle the active class
    if (forceClose) {
        hamburgerMenu.classList.remove('active');
        // Explicitly hide menu content
        menuContent.style.setProperty('visibility', 'hidden', 'important');
        menuContent.style.setProperty('opacity', '0', 'important');
        menuContent.style.setProperty('pointer-events', 'none', 'important');
        // Add display:none after a short delay to allow for transition
        setTimeout(() => {
            if (!hamburgerMenu.classList.contains('active')) {
                menuContent.style.setProperty('display', 'none', 'important');
            }
        }, 300);
    } else {
        const willBeActive = !hamburgerMenu.classList.contains('active');
        hamburgerMenu.classList.toggle('active');
        
        // Explicitly show/hide menu content based on active state
        if (willBeActive) {
            // First ensure display is set to block before other properties
            menuContent.style.setProperty('display', 'block', 'important');
            // Allow a short delay for display:block to take effect
            setTimeout(() => {
                menuContent.style.setProperty('visibility', 'visible', 'important');
                menuContent.style.setProperty('opacity', '1', 'important');
                menuContent.style.setProperty('transform', 'translateY(0)', 'important');
                menuContent.style.setProperty('pointer-events', 'auto', 'important');
            }, 10);
        } else {
            menuContent.style.setProperty('visibility', 'hidden', 'important');
            menuContent.style.setProperty('opacity', '0', 'important');
            menuContent.style.setProperty('pointer-events', 'none', 'important');
            // Add display:none after a short delay to allow for transition
            setTimeout(() => {
                if (!hamburgerMenu.classList.contains('active')) {
                    menuContent.style.setProperty('display', 'none', 'important');
                }
            }, 300);
        }
    }
    
    // Log the state
    console.log('Menu active class toggled. Is active:', hamburgerMenu.classList.contains('active'));
}

// Define a simple initialization function for the menu
window.initMenu = function() {
    console.log('Initializing menu - new simplified version');
    
    // Get menu elements
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const menuLines = document.querySelector('.menu-lines');
    const menuContent = document.querySelector('.menu-content');
    
    if (!hamburgerMenu || !menuLines || !menuContent) {
        console.error('Menu elements not found in initMenu');
        return;
    }
    
    // Make sure the hamburger menu itself is visible
    hamburgerMenu.style.display = 'block';
    hamburgerMenu.style.visibility = 'visible';
    hamburgerMenu.style.opacity = '1';
    
    // Click handler for menu lines (the hamburger icon itself)
    menuLines.onclick = function(e) {
        console.log('Menu lines (hamburger icon) clicked');
        e.stopPropagation();
        window.toggleHamburgerMenu(); // Toggle the menu
    };
    
    // Click handler for the "Show Playlists" menu item
    const showPlaylistsBtn = document.getElementById('show-playlists');
    if (showPlaylistsBtn) {
        showPlaylistsBtn.onclick = function(e) {
            console.log('Show playlists menu item clicked');
            e.preventDefault();
            e.stopPropagation();
            
            const drawer = document.getElementById('playlist-drawer');
            if (drawer) {
                drawer.classList.add('open');
                hamburgerMenu.style.display = 'none';
                if (typeof loadPlaylists === 'function') loadPlaylists();
            }
            window.toggleHamburgerMenu(true); // Force close the menu
        };
    }
    
    // Click handler for the "Download App" menu item
    const downloadLink = document.querySelector('.download-link');
    if (downloadLink) {
        downloadLink.onclick = function(e) {
            console.log('Download link menu item clicked');
            // Allow default link behavior but close the menu
            setTimeout(() => window.toggleHamburgerMenu(true), 100); // Force close after a short delay
        };
    }
    
    // Click handler for clicks outside the menu to close it
    document.addEventListener('click', function(e) {
        // If the menu is active and the click is outside the hamburger menu element
        if (hamburgerMenu.classList.contains('active') && !hamburgerMenu.contains(e.target)) {
            console.log('Clicked outside active menu, closing.');
            window.toggleHamburgerMenu(true); // Force close the menu
        }
    });

    // Prevent clicks inside the menu content from closing the menu (event propagation)
    menuContent.addEventListener('click', function(e) {
        e.stopPropagation();
    });

    console.log('Menu initialization complete.');
};

// Ensure initMenu is called only once after the DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initMenu);
} else {
    // DOM is already ready, or this script is deferred
    window.initMenu();
}

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
    threshold: 0.4, // Lower = more strict matching
    distance: 100, // How far to extend the fuzzy match
    minMatchCharLength: 2
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
    
    if (query === "") {
        if (window.navigationState && window.navigationState.currentView === 'playlist-view' && currentPlaylist && playlists[currentPlaylist] && Array.isArray(playlists[currentPlaylist].songs)) {
            songList = [...playlists[currentPlaylist].songs];
        } else {
            songList = [...allSongs];
        }
        filteredSongs = []; 
    } else {
        // Initialize Fuse with our song list
        const fuse = new Fuse(songList, fuseOptions);
        
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
        .then(data => {
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
            
            // Only call if the function is defined
            if (typeof window.refreshPlayingHighlight === 'function') {
                window.refreshPlayingHighlight();
            }
        })
        .catch(error => {
            console.error('Error fetching last session:', error);
        });
}

function playSong(index, forceList) {
    // Allow forcing a specific songList (useful for navigation scenarios)
    const targetSongList = forceList || songList;
    
    console.log(`playSong called with index ${index}, using ${forceList ? 'forced list' : 'current songList'}`);
    
    // Validate the index and song data
    if (
        !targetSongList ||
        !targetSongList[index] ||
        typeof targetSongList[index].name !== 'string' ||
        !targetSongList[index].name.trim()
    ) {
        console.error(`Invalid song data at index ${index}`);
        return;
    }

    const song = targetSongList[index];
    
    // Debug log for song selection
    console.log(`Playing song from ${window.navigationState?.currentView || 'unknown'} view:`, song.name);
    
    // Update all relevant state
    currentIndex = index;
    
    // Update navigation state
    if (window.navigationState) {
        window.navigationState.currentSongFilename = song.name;
        window.navigationState.currentPlayingSongIndex = index;
    }
    
    // Use originalName for audio source if available, fallback to name
    const audioName = song.originalName || song.name;
    if (!audioName) {
        console.error('Invalid song data: missing filename');
        return;
    }

    const audioSrc = `${API_URL}/stream/${encodeURIComponent(audioName)}`;
    console.log('Playing audio source:', audioSrc);

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

    // Remove playing-song class from all possible song elements
    document.querySelectorAll('.playing-song').forEach(el => {
        el.classList.remove('playing-song');
    });

    // Add playing-song class to current song in main song list
    if (typeof currentIndex === "number" && songListDiv?.children[currentIndex]) {
        currentButton = songListDiv.children[currentIndex];
        currentButton.classList.add('playing-song');
    }

    // Highlight song in recommendations if it exists
    const recommendationsItems = document.querySelectorAll('#recommendations-grid .recommendation-item');
    recommendationsItems.forEach(item => {
        const titleEl = item.querySelector('.recommendation-title');
        if (titleEl && titleEl.textContent === (song.title || song.name.replace(/\.(mp3|m4a)$/, ''))) {
            item.classList.add('playing-song');
        }
    });

    // Highlight song in last session if it exists
    const sessionItems = document.querySelectorAll('#last-session-tracks button');
    sessionItems.forEach(item => {
        const spanText = item.querySelector('span')?.textContent;
        if (spanText === song.name.replace(/\.(mp3|m4a)$/, '')) {
            item.classList.add('playing-song');
        }
    });

    // Highlight song in playlist view if it exists
    const playlistItems = document.querySelectorAll('#playlist-songs .song-item');
    playlistItems.forEach(item => {
        const titleEl = item.querySelector('.song-title');
        if (titleEl && titleEl.textContent === (song.title || song.name.replace(/\.(mp3|m4a)$/, ''))) {
            item.classList.add('playing-song');
        }
    });

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

    // Don't initialize hamburger menu here - it's already done in window.initMenu
    // This was causing duplicate event handlers!

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

        // Store the current view when rendering
        const currentView = window.navigationState?.currentView || 'home';
        console.log(`Rendering songs in ${currentView} view:`, songList?.length || 0);
        
        songListDiv.innerHTML = '';

        if (!Array.isArray(songList) || songList.length === 0) {
            songListDiv.innerHTML = '<p style="color: #b3b3b3;">No songs found</p>';
            return;
        }

        // Make a static copy of the current songList for the event handlers
        // This prevents issues with stale references if songList changes later
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

            // Store the song name as a data attribute for easier identification
            button.dataset.songName = song.name;
            span.textContent = song.name.replace(/\.(mp3|m4a)$/, '');
            
            actionsIcon.className = 'song-actions';
            actionsIcon.innerHTML = '<i class="fas fa-ellipsis-v"></i>';
            
            button.appendChild(img);
            button.appendChild(span);
            button.appendChild(actionsIcon);
            
            // Safe event binding for playing song - USE A CLOSURE to capture current index and song
            button.addEventListener('click', (function(capturedIndex, capturedSong) {
                return function(e) {
                    // Don't play if clicking on the actions button
                    if (e.target.closest('.song-actions')) return;
                    
                    console.log(`Song clicked: ${capturedSong.name} at index ${capturedIndex}`);
                    
                    // Force the current song list when playing from main view
                    if (currentView === 'home') {
                        songList = [...allSongs]; // Ensure we're using the full song list
                    }
                    
                    // Always pass the current index explicitly
                    playSong(capturedIndex, currentSongList);
                };
            })(index, song));
            
            // Add context menu for adding to playlist
            button.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                showContextMenu(e, song);
            });
            
            // Add click handler for the actions icon
            actionsIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                showContextMenu(e, song);
            });

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
                
                // Ensure hamburger menu is visible after songs load
                if (typeof window.showHamburgerMenu === 'function') {
                    window.showHamburgerMenu();
                } else {
                    const hamburgerMenu = document.querySelector('.hamburger-menu');
                    if (hamburgerMenu) {
                        hamburgerMenu.style.display = 'block';
                        hamburgerMenu.style.visibility = 'visible';
                        hamburgerMenu.style.opacity = '1';
                    }
                }
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
        
        // Ensure hamburger menu is visible
        if (typeof window.showHamburgerMenu === 'function') {
            window.showHamburgerMenu();
        } else {
            const hamburgerMenu = document.querySelector('.hamburger-menu');
            if (hamburgerMenu) hamburgerMenu.style.display = '';
        }
        
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
            
            // Highlight in playlist view
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

// Function to ensure the hamburger menu is visible - make it globally accessible
window.showHamburgerMenu = function() {
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    if (hamburgerMenu) {
        console.log('Showing hamburger menu via global function with !important');
        hamburgerMenu.style.setProperty('display', 'block', 'important');
        hamburgerMenu.style.setProperty('visibility', 'visible', 'important');
        hamburgerMenu.style.setProperty('opacity', '1', 'important');
        
        const menuLines = hamburgerMenu.querySelector('.menu-lines');
        if (menuLines) {
            menuLines.style.setProperty('display', 'flex', 'important');
            menuLines.style.setProperty('visibility', 'visible', 'important');
            menuLines.style.setProperty('opacity', '1', 'important');
            
            const spans = menuLines.querySelectorAll('span');
            spans.forEach(span => {
                span.style.setProperty('visibility', 'visible', 'important');
                span.style.setProperty('opacity', '1', 'important');
            });
        }
    } else {
        console.error('CRITICAL: Hamburger menu element (.hamburger-menu) NOT FOUND by window.showHamburgerMenu. Menu cannot be shown.');
    }
}

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
                // Show hamburger menu and restore main song list
                const hamburgerMenu = document.querySelector('.hamburger-menu');
                if (hamburgerMenu) {
                    hamburgerMenu.style.display = '';
                }
                
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
                <div class="song-title">${song.title}</div>
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
            showContextMenu(e, song);
        });
        
        const actionsBtn = songElement.querySelector('.song-actions');
        actionsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showContextMenu(e, song);
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
                return parseInt(match[1], 10) + 15; // Add the gap
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
        const maxScrollLeft = sessionContainer.scrollWidth - sessionContainer.clientWidth - 20;
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
function showCustomConfirm(title, message, onConfirm) {
    const confirmModal = document.getElementById('custom-confirm-modal');
    const confirmTitle = document.getElementById('confirm-title');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmYesBtn = document.getElementById('confirm-yes-btn');
    const confirmNoBtn = document.getElementById('confirm-no-btn');
    const closeConfirmModalBtn = document.getElementById('close-confirm-modal');

    if (!confirmModal || !confirmTitle || !confirmMessage || !confirmYesBtn || !confirmNoBtn || !closeConfirmModalBtn) {
        console.error('Custom confirm modal elements not found');
        // Fallback to default confirm if modal is not found
        if (confirm(message)) {
            onConfirm();
        }
        return;
    }

    confirmTitle.textContent = title;
    confirmMessage.innerHTML = message; // Use innerHTML to allow for styled messages
    
    // Remove previous event listeners to prevent multiple calls
    const newYesBtn = confirmYesBtn.cloneNode(true);
    confirmYesBtn.parentNode.replaceChild(newYesBtn, confirmYesBtn);
    
    const newNoBtn = confirmNoBtn.cloneNode(true);
    confirmNoBtn.parentNode.replaceChild(newNoBtn, confirmNoBtn);

    newYesBtn.onclick = () => {
        confirmModal.style.display = 'none';
        onConfirm();
    };

    newNoBtn.onclick = () => {
        confirmModal.style.display = 'none';
    };
    
    closeConfirmModalBtn.onclick = () => {
        confirmModal.style.display = 'none';
    };
    
    // Handle Escape key to close modal
    const handleEscKey = (event) => {
        if (event.key === 'Escape') {
            confirmModal.style.display = 'none';
            document.removeEventListener('keydown', handleEscKey); // Clean up listener
        }
    };
    document.addEventListener('keydown', handleEscKey);

    confirmModal.style.display = 'flex';
}

// Update showPlaylistContextMenu to use custom confirm modal
function showPlaylistContextMenu(e, playlist) {
    e.preventDefault();

    // Remove existing context menu
    if (playlistContextMenu) hidePlaylistContextMenu();
    if (contextMenu) hideContextMenu();
    
    // Create context menu
    playlistContextMenu = document.createElement('div');
    playlistContextMenu.className = 'context-menu';
    
    // Skip adding remove option for the "Create New Playlist" card
    if (playlist && playlist.isCreateNewCard) {
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
        
        // Add handler for removing playlist
        const removePlaylistItem = playlistContextMenu.querySelector('#remove-playlist');
        if (removePlaylistItem) {
            removePlaylistItem.onclick = () => {
                const personalizedMessage = `Are you sure you want to remove playlist <br><strong>"${playlist.name}"</strong>? <br><br><small>This action cannot be undone.</small>`;
                showCustomConfirm(
                    'Confirm Playlist Removal',
                    personalizedMessage,
                    () => removePlaylist(playlist.name)
                );
                hidePlaylistContextMenu();
            };
        }
    }

    // Position and show menu
    playlistContextMenu.style.top = `${e.pageY}px`;
    playlistContextMenu.style.left = `${e.pageX}px`;
    document.body.appendChild(playlistContextMenu);
    setTimeout(() => playlistContextMenu.classList.add('active'), 10);

    // Store current context playlist
    currentContextPlaylist = playlist;
    
    // Add showing-context class to the target element (the playlist card)
    if (e.target.closest('.playlist-card')) {
        playlistContextMenu.targetElement = e.target.closest('.playlist-card');
        playlistContextMenu.targetElement.classList.add('showing-context');
    }

    // Stop immediate closing
    playlistContextMenu.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Hide on click outside
    const handleDocumentClick = (e) => {
        if (!playlistContextMenu.contains(e.target)) {
            hidePlaylistContextMenu();
        }
    };
    
    document.addEventListener('click', handleDocumentClick);
    
    // Store reference to the handler for removal later
    playlistContextMenu.handleDocumentClick = handleDocumentClick;
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

// Notification function
function showNotification(message, type = 'info') {
    // Remove any existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="close-notification"><i class="fas fa-times"></i></button>
    `;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Show with animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Add close button functionality
    const closeBtn = notification.querySelector('.close-notification');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        });
    }
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, 3000);
}

// Add event listeners for view toggle buttons
document.addEventListener('DOMContentLoaded', () => {
    const gridViewBtn = document.getElementById('grid-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');
    const playlistsContainer = document.getElementById('playlists-container');

    // Set default view from localStorage or use grid view
    const savedView = localStorage.getItem('playlistView') || 'grid';
    setPlaylistView(savedView);

    if (gridViewBtn && listViewBtn && playlistsContainer) {
        // Grid view button
        gridViewBtn.addEventListener('click', () => {
            setPlaylistView('grid');
        });

        // List view button
        listViewBtn.addEventListener('click', () => {
            setPlaylistView('list');
        });
    }

    // Function to set playlist view
    function setPlaylistView(view) {
        // Save to localStorage
        localStorage.setItem('playlistView', view);
        
        // Update container class
        if (playlistsContainer) {
            playlistsContainer.classList.remove('grid-view', 'list-view');
            playlistsContainer.classList.add(`${view}-view`);
        }
        
        // Update button active states
        if (gridViewBtn && listViewBtn) {
            gridViewBtn.classList.toggle('active', view === 'grid');
            listViewBtn.classList.toggle('active', view === 'list');
        }
    }
});

// Function to show custom alert modal
function showCustomAlert(title, message, onOk) {
    const alertModal = document.getElementById('custom-alert-modal');
    const alertTitle = document.getElementById('alert-title');
    const alertMessage = document.getElementById('alert-message');
    const alertOkBtn = document.getElementById('alert-ok-btn');
    const closeAlertModalBtn = document.getElementById('close-alert-modal');

    if (!alertModal || !alertTitle || !alertMessage || !alertOkBtn || !closeAlertModalBtn) {
        console.error('Custom alert modal elements not found');
        // Fallback to default alert if modal is not found
        alert(message); // Use the raw message for fallback
        if (onOk) onOk();
        return;
    }

    alertTitle.textContent = title;
    alertMessage.innerHTML = message; // Use innerHTML for styled messages

    // Remove previous event listeners to prevent multiple calls
    const newOkBtn = alertOkBtn.cloneNode(true);
    alertOkBtn.parentNode.replaceChild(newOkBtn, alertOkBtn);

    newOkBtn.onclick = () => {
        alertModal.style.display = 'none';
        if (onOk) onOk();
    };
    
    closeAlertModalBtn.onclick = () => {
        alertModal.style.display = 'none';
        if (onOk) onOk(); // Usually an alert's close implies an OK action
    };
    
    // Handle Escape key to close modal
    const handleEscKey = (event) => {
        if (event.key === 'Escape') {
            alertModal.style.display = 'none';
            if (onOk) onOk();
            document.removeEventListener('keydown', handleEscKey);
        }
    };
    document.addEventListener('keydown', handleEscKey);

    alertModal.style.display = 'flex';
}