// lyrics.js - Handles fetching lyrics from backend and displaying the lyrics tab

let lyricsTab = null;
let lyricsContent = null;
let lyricsCloseBtn = null;

function createLyricsTab() {
    if (document.getElementById('lyrics-tab')) return;
    lyricsTab = document.createElement('div');
    lyricsTab.id = 'lyrics-tab';
    lyricsTab.innerHTML = `
        <div class="lyrics-header">
            <span>Lyrics</span>
            <button id="close-lyrics-btn">&times;</button>
        </div>
        <div id="lyrics-content">Loading...</div>
    `;
    document.body.appendChild(lyricsTab);
    lyricsContent = document.getElementById('lyrics-content');
    lyricsCloseBtn = document.getElementById('close-lyrics-btn');
    lyricsCloseBtn.onclick = hideLyricsTab;
}

function showLyricsTab() {
    createLyricsTab();
    lyricsTab.classList.add('open');
}

function hideLyricsTab() {
    if (lyricsTab) lyricsTab.classList.remove('open');
}

async function fetchLyrics(songTitle) {
    showLyricsTab();
    lyricsContent.textContent = 'Fetching lyrics...';
    try {
        const res = await fetch(`/api/lyrics?song=${encodeURIComponent(songTitle)}`);
        if (!res.ok) throw new Error('Failed to fetch lyrics');
        const data = await res.json();
        if (data.lyrics) {
            lyricsContent.textContent = data.lyrics;
        } else {
            lyricsContent.textContent = 'Lyrics not found.';
        }
    } catch (e) {
        lyricsContent.textContent = 'Error fetching lyrics.';
    }
}

window.showLyricsForCurrentSong = function(songTitle) {
    fetchLyrics(songTitle);
};

// Add CSS for sliding tab if not present
(function addLyricsTabStyles() {
    if (document.getElementById('lyrics-tab-style')) return;
    const style = document.createElement('style');
    style.id = 'lyrics-tab-style';
    style.textContent = `
        #lyrics-tab {
            position: fixed;
            top: 0;
            right: -420px;
            width: 400px;
            height: 100vh;
            background: #181818;
            color: #fff;
            z-index: 9999;
            box-shadow: -2px 0 16px rgba(0,0,0,0.4);
            transition: right 0.4s cubic-bezier(0.4,0,0.2,1);
            display: flex;
            flex-direction: column;
        }
        #lyrics-tab.open {
            right: 0;
        }
        .lyrics-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 18px 20px 10px 20px;
            font-size: 1.2em;
            font-weight: bold;
            border-bottom: 1px solid #333;
        }
        #lyrics-content {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            white-space: pre-line;
            font-size: 1.05em;
            line-height: 1.6;
        }
        #close-lyrics-btn {
            background: none;
            border: none;
            color: #fff;
            font-size: 1.5em;
            cursor: pointer;
        }
    `;
    document.head.appendChild(style);
})();
