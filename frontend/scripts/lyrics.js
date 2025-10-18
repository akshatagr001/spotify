// Function to clean song title for lyrics search
function cleanSongTitle(title) {
    if (!title) return '';
    
    // Store original title for logging
    const originalTitle = title;
    
    // Basic cleaning first
    title = title.replace(/\.(mp3|m4a)$/, '')
                 .replace(/(Official Video|Official Music Video|Official Audio|Lyrics|HD|HQ)/gi, '')
                 .replace(/\([^)]*\)/g, '')  // Remove parentheses content
                 .replace(/\[[^\]]*\]/g, '')  // Remove bracket content
                 .replace(/\b(ft\.?|feat\.?|with|x)\s+[^-]*/gi, '')  // Remove featuring
                 .trim();
    
    // For Hindi/Bollywood songs, keep special characters and handle movie names
    if (/[\u0900-\u097F]/.test(title)) { // If contains Hindi characters
        // Only remove specific problematic characters
        title = title.replace(/[""'']/g, '')
                     .replace(/\s+/g, ' ')
                     .trim();
    } else {
        // For English songs, more aggressive cleaning
        title = title.replace(/[^\w\s-]/g, '')
                     .replace(/\s+/g, ' ')
                     .trim();
    }
    
    console.log('Song title cleaning:', {
        original: originalTitle,
        cleaned: title,
        containsHindi: /[\u0900-\u097F]/.test(title)
    });
    
    return title;
}

// Function to generate alternative titles
function generateAlternativeTitles(title) {
    const alternatives = new Set();
    const isHindi = /[\u0900-\u097F]/.test(title);
    
    console.log('Generating alternatives for:', title, 'Is Hindi:', isHindi);
    
    // Add the original cleaned title
    const cleanedTitle = cleanSongTitle(title);
    alternatives.add(cleanedTitle);
    
    if (isHindi) {
        // Hindi/Bollywood specific handling
        // Add without movie name (common format: "Song Name - Movie Name")
        const songNameOnly = cleanedTitle.split('-')[0].trim();
        alternatives.add(songNameOnly);
        
        // Try without special characters but preserve spaces
        const withoutSpecial = songNameOnly.replace(/[^\u0900-\u097F\w\s]/g, '').trim();
        alternatives.add(withoutSpecial);
        
        // Add transliterated versions if title contains both Hindi and English
        if (/[a-zA-Z]/.test(title) && /[\u0900-\u097F]/.test(title)) {
            // Keep only English characters
            const englishOnly = title.replace(/[^\w\s]/g, '').trim();
            alternatives.add(englishOnly);
        }
    } else {
        // English/Other languages handling
        // Remove everything after hyphen or dash
        alternatives.add(cleanSongTitle(title.split('-')[0]));
        
        // Remove everything after 'from' or 'feat' or 'ft'
        alternatives.add(cleanSongTitle(title.split(/\s+(?:from|feat\.?|ft\.?)\s+/i)[0]));
        
        // Remove numbers and special characters completely
        alternatives.add(cleanedTitle.replace(/[^a-zA-Z\s]/g, ''));
        
        // Add version without articles (a, an, the)
        const withoutArticles = cleanedTitle.replace(/^(a|an|the)\s+/i, '');
        if (withoutArticles !== cleanedTitle) {
            alternatives.add(withoutArticles);
        }
    }
    
    // Filter out empty strings and duplicates
    const finalAlternatives = [...alternatives].filter(t => t && t.length > 0);
    
    console.log('Generated alternatives:', finalAlternatives);
    return finalAlternatives;
}

// Function to fetch lyrics
async function fetchLyrics(songTitle) {
    try {
        const alternatives = generateAlternativeTitles(songTitle);
        let lastError = null;
        let attempts = [];
        
        console.group(`Fetching lyrics for: ${songTitle}`);
        console.log('Generated alternatives:', alternatives);
        
        // Try each alternative title
        for (const title of alternatives) {
            try {
                const encodedTitle = encodeURIComponent(title);
                const url = `/api/lyrics?title=${encodedTitle}`;
                console.group(`Attempt: ${title}`);
                console.log('Request URL:', url);
                
                const startTime = performance.now();
                const response = await fetch(url);
                const endTime = performance.now();
                const responseTime = endTime - startTime;
                
                const statusText = response.statusText;
                const contentType = response.headers.get('content-type');
                const responseHeaders = Object.fromEntries([...response.headers]);
                
                console.log('Response Time:', Math.round(responseTime), 'ms');
                console.log('Status:', response.status, statusText);
                console.log('Headers:', responseHeaders);
                
                attempts.push({
                    title,
                    url,
                    status: response.status,
                    statusText,
                    contentType,
                    responseTime,
                    headers: responseHeaders
                });
                
                if (response.ok) {
                    const data = await response.json();
                    
                    if (data.lyrics && data.lyrics.trim()) {
                        console.log('✅ Lyrics found!', {
                            length: data.lyrics.length,
                            preview: data.lyrics.slice(0, 50) + '...',
                            hasSource: !!data.source_url
                        });
                        console.groupEnd();
                        console.groupEnd();
                        return {
                            ...data,
                            success: true,
                            title: songTitle
                        };
                    } else {
                        console.log('❌ Empty lyrics received');
                    }
                } else {
                    let data;
                    try {
                        data = await response.json();
                    } catch {
                        data = { message: 'Could not read error response' };
                    }
                    console.log('❌ Request failed:', {
                        status: response.status,
                        statusText: statusText,
                        error: data.message
                    });
                }
                
                console.groupEnd();
                
            } catch (err) {
                lastError = err;
                console.error('❌ Network error:', err);
                attempts.push({
                    title,
                    error: err.message
                });
                console.groupEnd();
                continue; // Try next alternative
            }
        }
        
        console.log('⚠️ All attempts failed:', attempts);
        console.groupEnd();
        
        // Return failure response
        return {
            success: false,
            title: songTitle,
            message: 'Could not find lyrics for any version of the song title',
            attempts: attempts
        };
        
    } catch (error) {
        console.error('Error fetching lyrics:', error);
        return {
            success: false,
            title: songTitle,
            message: error.message || 'An unexpected error occurred',
            error: error
        };
    }
}

// Function to manually search for lyrics
window.searchLyricsManually = function(encodedTitle) {
    const title = decodeURIComponent(encodedTitle);
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(title + ' lyrics')}`;
    window.open(searchUrl, '_blank');
};

// Update lyrics content
function updateLyricsContent(container, data) {
    if (!container) return;

    // Store the current song title for the manual search button
    const currentTitle = container.dataset.currentTitle || '';

    // Check if we have a successful lyrics fetch
    if (!data.success || !data.lyrics) {
        container.innerHTML = `
            <div class="lyrics-error">
                <h3>No Lyrics Found</h3>
                <p class="lyrics-error-details">
                    We couldn't find lyrics for "${data.title || currentTitle}"
                </p>
                <div class="lyrics-search-tips">
                    <h4>Tips:</h4>
                    <ul>
                        <li>Check if the song title is correct</li>
                        <li>Try searching with a simpler version of the title</li>
                        <li>Remove any special characters or version info</li>
                        <li>Some songs might not have lyrics in our database</li>
                    </ul>
                </div>
                <button onclick="searchLyricsManually('${encodeURIComponent(currentTitle)}')" 
                        class="search-lyrics-btn">
                    <i class="fas fa-search"></i> Search Online
                </button>
            </div>
        `;
        return;
    }

    // We have lyrics, display them with the source if available
    container.innerHTML = `
        <div class="lyrics-text">
            <pre>${data.lyrics}</pre>
        </div>
        ${data.source_url ? `
            <div class="lyrics-source">
                <a href="${data.source_url}" target="_blank" rel="noopener noreferrer">
                    <i class="fas fa-external-link-alt"></i> View on Genius
                </a>
            </div>
        ` : ''}
    `;
}

// Function to update current song info in lyrics drawer
function updateCurrentSongInfo() {
    const imgElement = document.getElementById('lyrics-song-img');
    const titleElement = document.getElementById('lyrics-song-title');
    const artistElement = document.getElementById('lyrics-song-artist');

    if (imgElement) {
        imgElement.src = document.getElementById('now-playing-img').src;
    }
    if (titleElement) {
        titleElement.textContent = document.getElementById('now-playing-title').textContent;
    }
    if (artistElement) {
        artistElement.textContent = document.getElementById('now-playing-artist').textContent;
    }
}

// Function to show lyrics in drawer
async function showLyricsDrawer() {
    const drawer = document.getElementById('lyrics-drawer');
    const nowPlayingTitle = document.getElementById('now-playing-title').textContent;

    if (!nowPlayingTitle || nowPlayingTitle === 'No track selected') {
        showNotification('No song is currently playing', 'info');
        return;
    }

    updateCurrentSongInfo();
    drawer.classList.add('open');

    const lyricsContainer = document.getElementById('lyrics-content-drawer');
    if (!lyricsContainer) return;

    lyricsContainer.innerHTML = `
        <div class="lyrics-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading lyrics...</p>
        </div>
    `;

    try {
        const data = await fetchLyrics(nowPlayingTitle);
        updateLyricsContent(lyricsContainer, data);
    } catch (error) {
        lyricsContainer.innerHTML = `
            <div class="lyrics-error">
                <p>${error.message || 'Failed to load lyrics'}</p>
            </div>
        `;
    }
}

// Function to show lyrics in modal
async function showLyricsModal() {
    const modal = document.getElementById('lyrics-modal');
    const nowPlayingTitle = document.getElementById('now-playing-title').textContent;

    if (!nowPlayingTitle || nowPlayingTitle === 'No track selected') {
        showNotification('No song is currently playing', 'info');
        return;
    }

    modal.style.display = 'flex';
    const lyricsContent = document.getElementById('lyrics-content');
    if (!lyricsContent) return;

    lyricsContent.innerHTML = `
        <div class="lyrics-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading lyrics...</p>
        </div>
    `;

    try {
        const data = await fetchLyrics(nowPlayingTitle);
        updateLyricsContent(lyricsContent, data);
    } catch (error) {
        lyricsContent.innerHTML = `
            <div class="lyrics-error">
                <p>${error.message || 'Failed to load lyrics'}</p>
            </div>
        `;
    }
}

// Test function to verify lyrics backend
async function testLyricsBackend() {
    const testCases = [
        'Shape of You',
        'Hello',
        'Apna Time Aayega'
    ];
    
    console.group('Lyrics Backend Test');
    console.log('Testing lyrics backend endpoints...');
    
    for (const title of testCases) {
        try {
            console.group(`Testing: ${title}`);
            const encodedTitle = encodeURIComponent(title);
            const url = `${API_URL}/lyrics/${encodedTitle}`;
            console.log('Request URL:', url);
            
            const response = await fetch(url);
            console.log('Response Status:', response.status);
            console.log('Response Headers:', Object.fromEntries([...response.headers]));
            
            if (response.ok) {
                const data = await response.json();
                console.log('Response received', {
                    hasLyrics: !!data.lyrics,
                    lyricLength: data.lyrics ? data.lyrics.length : 0,
                    hasSource: !!data.source_url
                });
            } else {
                console.log('Error Response:', await response.text());
            }
        } catch (error) {
            console.error('Test failed:', error);
        }
        console.groupEnd();
    }
    console.groupEnd();
}

// Add test button to page
function addTestButton() {
    const testButton = document.createElement('button');
    testButton.textContent = 'Test Lyrics Backend';
    testButton.style.cssText = 'position: fixed; bottom: 10px; right: 10px; z-index: 9999; padding: 10px; background: #333; color: white; border: none; border-radius: 5px; cursor: pointer;';
    testButton.onclick = testLyricsBackend;
    document.body.appendChild(testButton);
}

// Initialize lyrics functionality once DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add the test button in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        addTestButton();
    }
    const lyricsBtn = document.getElementById('lyrics-btn');
    const lyricsDrawer = document.getElementById('lyrics-drawer');
    const closeLyricsDrawer = document.getElementById('close-lyrics-drawer');
    const lyricsModal = document.getElementById('lyrics-modal');
    const closeLyricsModal = document.querySelector('#lyrics-modal .close-modal');

    // Add header button for lyrics
    const headerNav = document.querySelector('.header-nav .header-left');
    if (headerNav) {
        const lyricsHeaderBtn = document.createElement('button');
        lyricsHeaderBtn.className = 'header-btn';
        lyricsHeaderBtn.id = 'lyrics-header-btn';
        lyricsHeaderBtn.title = 'Lyrics';
        lyricsHeaderBtn.innerHTML = '<i class="fas fa-microphone-alt"></i>';
        headerNav.appendChild(lyricsHeaderBtn);

        lyricsHeaderBtn.addEventListener('click', showLyricsDrawer);
    }

    // Player lyrics button opens modal
    if (lyricsBtn) {
        lyricsBtn.addEventListener('click', showLyricsModal);
    }

    // Close drawer button
    if (closeLyricsDrawer) {
        closeLyricsDrawer.addEventListener('click', () => {
            if (lyricsDrawer) {
                lyricsDrawer.classList.remove('open');
            }
        });
    }

    // Close modal button
    if (closeLyricsModal) {
        closeLyricsModal.addEventListener('click', () => {
            if (lyricsModal) {
                lyricsModal.style.display = 'none';
            }
        });
    }

    // Close modal on outside click
    if (lyricsModal) {
        lyricsModal.addEventListener('click', (e) => {
            if (e.target === lyricsModal) {
                lyricsModal.style.display = 'none';
            }
        });
    }

    // Handle Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Close modal if open
            if (lyricsModal && lyricsModal.style.display === 'flex') {
                lyricsModal.style.display = 'none';
            }
            // Close drawer if open
            if (lyricsDrawer && lyricsDrawer.classList.contains('open')) {
                lyricsDrawer.classList.remove('open');
            }
        }
    });

    // Update lyrics when song changes
    const audioPlayer = document.querySelector('audio');
    if (audioPlayer) {
        audioPlayer.addEventListener('play', () => {
            if (lyricsDrawer && lyricsDrawer.classList.contains('open')) {
                updateCurrentSongInfo();
                showLyricsDrawer();
            }
            if (lyricsModal && lyricsModal.style.display === 'flex') {
                showLyricsModal();
            }
        });
    }
});