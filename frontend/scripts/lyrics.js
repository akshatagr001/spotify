// Function to fetch and display lyrics
async function fetchAndDisplayLyrics() {
    const nowPlayingTitle = document.getElementById('now-playing-title').textContent;
    if (!nowPlayingTitle || nowPlayingTitle === 'No track selected') {
        showNotification('No song is currently playing', 'info');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/lyrics/${encodeURIComponent(nowPlayingTitle)}`);
        const data = await response.json();

        if (data.error) {
            showNotification(data.error, 'error');
            return;
        }

        // Update the lyrics modal with the fetched lyrics
        const lyricsContent = document.getElementById('lyrics-content');
        if (lyricsContent) {
            lyricsContent.innerHTML = `
                <div class="lyrics-text">
                    <pre>${data.lyrics}</pre>
                </div>
                <div class="lyrics-source">
                    <a href="${data.source_url}" target="_blank" rel="noopener noreferrer">
                        Source: Genius
                    </a>
                </div>
            `;
        }

        // Show the lyrics modal
        const lyricsModal = document.getElementById('lyrics-modal');
        if (lyricsModal) {
            lyricsModal.style.display = 'flex';
        }
    } catch (error) {
        console.error('Error fetching lyrics:', error);
        showNotification('Failed to fetch lyrics', 'error');
    }
}

// Initialize lyrics functionality once DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const lyricsBtn = document.getElementById('lyrics-btn');
    const lyricsModal = document.getElementById('lyrics-modal');
    const closeLyricsBtn = document.querySelector('#lyrics-modal .close-modal');

    // Add lyrics button click handler
    if (lyricsBtn) {
        lyricsBtn.addEventListener('click', fetchAndDisplayLyrics);
    }

    // Add close button handler
    if (closeLyricsBtn) {
        closeLyricsBtn.addEventListener('click', () => {
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

    // Close modal on Escape key press
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lyricsModal && lyricsModal.style.display === 'flex') {
            lyricsModal.style.display = 'none';
        }
    });
});