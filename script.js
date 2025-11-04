const API_BASE = 'http://localhost:5000/api';
let songs = [];
let currentSongIndex = -1;
let isPlaying = false;
let adminMode = false;
let currentSection = 'home';
const ADMIN_PASSCODE = "EUSTASS6";
const audioElement = document.getElementById('audioElement');

// ==================== LOAD SONGS FROM BACKEND ====================
async function loadSongs() {
    try {
        const response = await fetch(`${API_BASE}/songs`);
        songs = await response.json();
        return songs;
    } catch (error) {
        console.error('Failed to load songs:', error);
        return [];
    }
}

// ==================== SECTOR SWITCHING ====================
function initSectorSwitching() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            const section = this.textContent.includes('All Songs') ? 'home' :
                          this.textContent.includes('Liked Songs') ? 'liked' : 'rated';
            currentSection = section;
            loadSection(section);
        });
    });
}

function loadSection(section) {
    let songsToShow = [];
    
    switch(section) {
        case 'home':
            songsToShow = songs;
            break;
        case 'liked':
            songsToShow = songs.filter(song => song.likes > 0);
            break;
        case 'rated':
            songsToShow = songs.filter(song => song.rating > 0);
            break;
    }
    
    displaySongs(songsToShow);
}

// ==================== DISPLAY SONGS ====================
function displaySongs(songsToShow) {
    const songsGrid = document.getElementById('songsGrid');
    
    if (songsToShow.length === 0) {
        const message = currentSection === 'liked' ? 'No liked songs yet' : 
                      currentSection === 'rated' ? 'No rated songs yet' : 
                      'No songs yet. Upload some music!';
        songsGrid.innerHTML = `<div style="color: #888; text-align: center; padding: 40px; grid-column: 1 / -1;">${message}</div>`;
    } else {
        songsGrid.innerHTML = songsToShow.map((song, index) => `
            <div class="music-card">
                <div class="album-art">
                    <i class="fas fa-music"></i>
                </div>
                <div class="song-title">${song.title}</div>
                <div class="song-artist">${song.artist}</div>
                <div class="song-controls">
                    <button class="play-btn" onclick="playSong(${songs.findIndex(s => s.id === song.id)})">
                        <i class="fas fa-play"></i>
                    </button>
                    <div class="rating" onclick="rateSong(${song.id})">
                        ${'⭐'.repeat(song.rating || 0)}${song.rating ? '' : '☆'}
                    </div>
                    <div class="likes" onclick="likeSong(${song.id})">
                        ❤️ ${song.likes || 0}
                    </div>
                    <button class="delete-btn" onclick="deleteSong(${song.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
}

// ==================== ADMIN MODE FUNCTIONS ====================
function openAdminModal() {
    document.getElementById('adminModal').style.display = 'block';
}

function closeAdminModal() {
    document.getElementById('adminModal').style.display = 'none';
    document.getElementById('adminPassword').value = '';
}

function checkAdminPassword() {
    const password = document.getElementById('adminPassword').value;
    if (password === ADMIN_PASSCODE) {
        adminMode = true;
        closeAdminModal();
        alert('🔓 ADMIN MODE ACTIVATED! You can now spam likes and ratings!');
        document.querySelector('.admin-btn').style.background = '#ffff00';
        document.querySelector('.admin-btn').style.color = 'black';
        refreshSongs(); // Refresh to show delete buttons
    } else {
        alert('❌ Wrong passcode!');
    }
}

// ==================== SONG ACTIONS ====================
async function likeSong(songId) {
    if (!adminMode) {
        alert('Only admin can like songs!');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/songs/${songId}/like`, {
            method: 'POST'
        });
        await refreshSongs();
    } catch (error) {
        alert('Error liking song: ' + error.message);
    }
}

async function rateSong(songId) {
    if (!adminMode) {
        alert('Only admin can rate songs!');
        return;
    }
    
    const rating = prompt('Rate this song (1-6 stars):');
    if (rating && rating >= 1 && rating <= 6) {
        try {
            const response = await fetch(`${API_BASE}/songs/${songId}/rate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ rating: parseInt(rating) })
            });
            await refreshSongs();
        } catch (error) {
            alert('Error rating song: ' + error.message);
        }
    } else if (rating) {
        alert('Please enter a rating between 1-6 stars!');
    }
}

async function deleteSong(songId) {
    if (!adminMode) {
        alert('Only admin can delete songs!');
        return;
    }
    
    if (confirm('Are you sure you want to delete this song?')) {
        try {
            const response = await fetch(`${API_BASE}/songs/${songId}`, {
                method: 'DELETE'
            });
            await refreshSongs();
            alert('Song deleted successfully!');
        } catch (error) {
            alert('Error deleting song: ' + error.message);
        }
    }
}

// ==================== MUSIC PLAYER FUNCTIONS ====================
function playSong(index) {
    const song = songs[index];
    
    if (!song) {
        alert("No song data found!");
        return;
    }
    
    currentSongIndex = index;
    
    document.getElementById('nowPlayingTitle').textContent = song.title;
    document.getElementById('nowPlayingArtist').textContent = song.artist;
    
    document.getElementById('musicPlayer').style.display = 'block';
    
    if (audioElement.src !== song.audioUrl) {
        audioElement.src = song.audioUrl;
        audioElement.load();
    }
    
    const playPromise = audioElement.play();
    
    if (playPromise !== undefined) {
        playPromise.then(() => {
            isPlaying = true;
            document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-pause"></i>';
        }).catch(error => {
            console.error("Play failed:", error);
            if (error.name === 'NotAllowedError') {
                alert("Click the play button in the music player to start playback.");
            } else {
                alert("Could not play audio. The audio file may be unavailable.");
            }
            isPlaying = false;
            document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-play"></i>';
        });
    }
    
    audioElement.ontimeupdate = function() {
        if (audioElement.duration && !isNaN(audioElement.duration)) {
            const progress = (audioElement.currentTime / audioElement.duration) * 100;
            document.getElementById('progress').style.width = progress + '%';
            
            const currentTime = formatTime(audioElement.currentTime);
            const duration = formatTime(audioElement.duration);
            document.getElementById('timeDisplay').textContent = `${currentTime} / ${duration}`;
        }
    };
    
    audioElement.onended = function() {
        isPlaying = false;
        document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-play"></i>';
        nextSong();
    };
    
    audioElement.onerror = function() {
        console.error("Audio loading error");
        alert("Error loading audio file. Please try another song.");
        isPlaying = false;
        document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-play"></i>';
    };
}

function togglePlay() {
    if (currentSongIndex === -1) return;
    
    if (isPlaying) {
        audioElement.pause();
        document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-play"></i>';
    } else {
        audioElement.play();
        document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-pause"></i>';
    }
    isPlaying = !isPlaying;
}

function nextSong() {
    if (songs.length === 0) return;
    const nextIndex = (currentSongIndex + 1) % songs.length;
    playSong(nextIndex);
}

function previousSong() {
    if (songs.length === 0) return;
    const prevIndex = (currentSongIndex - 1 + songs.length) % songs.length;
    playSong(prevIndex);
}

function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ==================== UPLOAD FUNCTIONS ====================
function openUploadModal() {
    document.getElementById('uploadModal').style.display = 'block';
}

function closeUploadModal() {
    document.getElementById('uploadModal').style.display = 'none';
    document.getElementById('uploadForm').reset();
}

async function uploadSong(title, artist, audioFile) {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('artist', artist);
    formData.append('audioFile', audioFile);

    const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData
    });
    return await response.json();
}

document.getElementById('uploadForm').onsubmit = async function(e) {
    e.preventDefault();
    
    const title = document.getElementById('songTitle').value;
    const artist = document.getElementById('songArtist').value;
    const audioFile = document.getElementById('audioFile').files[0];
    
    if (audioFile) {
        try {
            const newSong = await uploadSong(title, artist, audioFile);
            if (newSong.error) {
                alert('Upload failed: ' + newSong.error);
            } else {
                closeUploadModal();
                await refreshSongs();
                alert('Song uploaded successfully!');
            }
        } catch (error) {
            alert('Upload failed: ' + error.message);
        }
    }
};

// ==================== REFRESH SONGS ====================
async function refreshSongs() {
    await loadSongs();
    loadSection(currentSection);
}

// ==================== INITIALIZE WEBSITE ====================
async function initWebsite() {
    await refreshSongs();
    initSectorSwitching();
    
    window.onclick = function(event) {
        const uploadModal = document.getElementById('uploadModal');
        const adminModal = document.getElementById('adminModal');
        if (event.target === uploadModal) closeUploadModal();
        if (event.target === adminModal) closeAdminModal();
    }
}

// Start the website when page loads
initWebsite();