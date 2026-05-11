
        const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? 'http://127.0.0.1:3001/api'
            : '/.netlify/functions';
        
        let currentJob = 'civilian';
        let currentPage = 1;
        let currentLimit = 25;
        let totalPages = 1;

        // Job tab selection
        document.querySelectorAll('.job-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                document.querySelectorAll('.job-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                currentJob = this.dataset.job;
                currentPage = 1;
                loadLeaderboard();
            });
        });

        async function loadLeaderboard() {
            showLoading(true);
            hideError();
            hideLeaderboard();

            try {
                const response = await fetch(`${API_BASE}/leaderboard/${currentJob}?limit=${currentLimit}&offset=${(currentPage - 1) * currentLimit}`);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                
                totalPages = data.totalPages;
                currentPage = data.currentPage;

                displayLeaderboard(data);
                updatePageControls();
                
            } catch (error) {
                showError('Failed to load leaderboard: ' + error.message);
            } finally {
                showLoading(false);
            }
        }

        function displayLeaderboard(data) {
            // Update stats summary
            displayStatsSummary(data);

            // Display leaderboard rows
            const rowsContainer = document.getElementById('leaderboardRows');
            rowsContainer.innerHTML = '';

            if (data.leaderboard.length === 0) {
                rowsContainer.innerHTML = '<div style="text-align: center; padding: 20px;">No players found for this job type</div>';
                showLeaderboard();
                return;
            }

            data.leaderboard.forEach((player, index) => {
                const row = createLeaderboardRow(player, (currentPage - 1) * currentLimit + index + 1);
                rowsContainer.appendChild(row);
            });

            showLeaderboard();
        }

        function displayStatsSummary(data) {
            const summaryContainer = document.getElementById('statsSummary');
            
            // Calculate some stats
            const totalPlayers = data.totalPlayers;
            const avgLevel = data.leaderboard.length > 0 
                ? (data.leaderboard.reduce((sum, p) => sum + p.level, 0) / data.leaderboard.length).toFixed(1)
                : 0;
            const avgExperience = data.leaderboard.length > 0
                ? Math.floor(data.leaderboard.reduce((sum, p) => sum + p.experience, 0) / data.leaderboard.length)
                : 0;
            
            const topPlayer = data.leaderboard[0];

            summaryContainer.innerHTML = `
                <div class="stat-card">
                    <div class="stat-value">${totalPlayers}</div>
                    <div class="stat-label">Total Players</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${avgLevel}</div>
                    <div class="stat-label">Average Level</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${avgExperience.toLocaleString()}</div>
                    <div class="stat-label">Average XP</div>
                </div>
                ${topPlayer ? `
                <div class="stat-card">
                    <div class="stat-value" style="font-size: 1.2em;">${topPlayer.player_name}</div>
                    <div class="stat-label">Top Player</div>
                </div>
                ` : ''}
            `;
        }

        function createLeaderboardRow(player, rank) {
            const row = document.createElement('div');
            row.className = 'leaderboard-row';

            const rankClass = rank <= 3 ? `top-${rank}` : '';
            const lastActive = formatDate(player.last_active);

            row.innerHTML = `
                <div class="rank ${rankClass}">#${rank}</div>
                <div class="player-name">${player.player_name}</div>
                <div class="level-badge">${player.level}</div>
                <div class="experience">${player.experience.toLocaleString()} XP</div>
                <div class="job-title">${player.title}</div>
                <div class="last-active">${lastActive}</div>
            `;

            return row;
        }

        function updatePageControls() {
            document.getElementById('currentPage').textContent = currentPage;
            document.getElementById('totalPages').textContent = totalPages;
            
            document.getElementById('prevButton').disabled = currentPage <= 1;
            document.getElementById('nextButton').disabled = currentPage >= totalPages;
        }

        function previousPage() {
            if (currentPage > 1) {
                currentPage--;
                loadLeaderboard();
            }
        }

        function nextPage() {
            if (currentPage < totalPages) {
                currentPage++;
                loadLeaderboard();
            }
        }

        function changeLimit() {
            currentLimit = parseInt(document.getElementById('limitSelect').value);
            currentPage = 1;
            loadLeaderboard();
        }

        function formatDate(dateString) {
            if (!dateString) return 'Never';
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            
            if (diffHours < 1) {
                return 'Just now';
            } else if (diffHours < 24) {
                return `${diffHours}h ago`;
            } else if (diffHours < 168) {
                return `${Math.floor(diffHours / 24)}d ago`;
            } else {
                return date.toLocaleDateString();
            }
        }

        function showLoading(show) {
            document.getElementById('loading').style.display = show ? 'block' : 'none';
        }

        function showError(message) {
            const errorElement = document.getElementById('error');
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }

        function hideError() {
            document.getElementById('error').style.display = 'none';
        }

        function showLeaderboard() {
            document.getElementById('leaderboardContent').style.display = 'block';
        }

        function hideLeaderboard() {
            document.getElementById('leaderboardContent').style.display = 'none';
        }

        // Auto-refresh every 30 seconds
        setInterval(() => {
            if (document.getElementById('leaderboardContent').style.display !== 'none') {
                loadLeaderboard();
            }
        }, 30000);

        // Load initial leaderboard
        window.addEventListener('load', function() {
            loadLeaderboard();
        });

        window.addEventListener('load', () => {
            // Add a click listener to start music after user interaction
            document.addEventListener('click', () => {
                if (!audioManager.isPlaying) {
                    audioManager.startRandom();
                }
            }, { once: true });
        });

        // Audio Manager for Background Music
        class AudioManager {
            constructor() {
                this.generalMusic = document.getElementById('generalMusic');
                this.easyMusic = document.getElementById('easyMusic');
                this.hardMusic = document.getElementById('hardMusic');
                this.hellMusic = document.getElementById('hellMusic');
                this.currentTrack = null;
                this.volume = 0.2; // Lower volume for background
                this.tracks = ['general', 'easy', 'hard', 'hell'];
                this.currentTrackIndex = 0;
                this.isPlaying = false;
                
                // Sync with other tabs
                this.setupStorageSync();
                this.loadSyncState();
            }
            
            setupStorageSync() {
                // Listen for storage events from other tabs
                window.addEventListener('storage', (e) => {
                    if (e.key === 'bgfMusicSync') {
                        this.loadSyncState();
                    }
                });
                
                // Notify other tabs when track changes
                window.addEventListener('beforeunload', () => {
                    this.saveSyncState();
                });
                
                // Continuous sync updates every 2 seconds
                this.syncInterval = setInterval(() => {
                    if (this.isPlaying) {
                        this.saveSyncState();
                    }
                }, 2000);
            }
            
            saveSyncState() {
                const currentAudio = this.currentTrack ? this[this.currentTrack + 'Music'] : null;
                const syncData = {
                    currentTrack: this.currentTrack,
                    trackIndex: this.currentTrackIndex,
                    isPlaying: this.isPlaying,
                    currentTime: currentAudio ? currentAudio.currentTime : 0,
                    timestamp: Date.now()
                };
                localStorage.setItem('bgfMusicSync', JSON.stringify(syncData));
            }
            
            loadSyncState() {
                try {
                    const saved = localStorage.getItem('bgfMusicSync');
                    if (saved) {
                        const syncData = JSON.parse(saved);
                        // Only sync if data is recent (within 5 seconds)
                        if (Date.now() - syncData.timestamp < 5000) {
                            this.currentTrackIndex = syncData.trackIndex || 0;
                            if (syncData.isPlaying && syncData.currentTrack) {
                                this.playTrack(syncData.currentTrack, true, syncData.currentTime); // pass current time
                            }
                        }
                    }
                } catch (e) {
                    console.log('Failed to load sync state:', e);
                }
            }
            
            stopAll() {
                [this.generalMusic, this.easyMusic, this.hardMusic, this.hellMusic].forEach(audio => {
                    audio.pause();
                    audio.currentTime = 0;
                });
                this.currentTrack = null;
                this.isPlaying = false;
                
                // Clear sync interval
                if (this.syncInterval) {
                    clearInterval(this.syncInterval);
                    this.syncInterval = null;
                }
                
                this.saveSyncState();
            }
            
            playTrack(trackName, silent = false, currentTime = 0) {
                // If we're trying to play the same track that's already playing, just sync the time
                if (this.currentTrack === trackName && this.isPlaying) {
                    const currentAudio = this[trackName + 'Music'];
                    if (currentAudio && Math.abs(currentAudio.currentTime - currentTime) > 0.5) {
                        currentAudio.currentTime = currentTime;
                    }
                    return;
                }
                
                this.stopAll();
                const audio = this[trackName + 'Music'];
                if (audio) {
                    setTimeout(() => {
                        audio.volume = this.volume;
                        audio.currentTime = currentTime; // Set the saved time
                        audio.play().catch(e => {
                            if (!silent) console.log(`${trackName} music play failed:`, e);
                        });
                        this.currentTrack = trackName;
                        this.isPlaying = true;
                        this.saveSyncState();
                        
                        // Set up track end listener
                        audio.onended = () => {
                            this.playNextRandomTrack();
                        };
                    }, 50);
                }
            }
            
            playNextRandomTrack() {
                // Generate random index different from current
                let randomIndex;
                do {
                    randomIndex = Math.floor(Math.random() * this.tracks.length);
                } while (randomIndex === this.currentTrackIndex);
                
                this.currentTrackIndex = randomIndex;
                const nextTrack = this.tracks[this.currentTrackIndex];
                this.playTrack(nextTrack);
                console.log(`Playing random track: ${nextTrack}`);
            }
            
            startRandom() {
                // Start with random track
                this.currentTrackIndex = Math.floor(Math.random() * this.tracks.length);
                const trackName = this.tracks[this.currentTrackIndex];
                this.playTrack(trackName);
                console.log(`Starting random playback with: ${trackName}`);
            }
            
            stopRandom() {
                this.stopAll();
            }
            
            setVolume(level) {
                this.volume = Math.max(0, Math.min(1, level));
                if (this.currentTrack && this[this.currentTrack + 'Music']) {
                    this[this.currentTrack + 'Music'].volume = this.volume;
                }
            }
        }

        // Initialize audio manager
        const audioManager = new AudioManager();
    
