
        const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? 'http://127.0.0.1:3001/api'
            : '/.netlify/functions';

        async function searchProfile() {
            const username = document.getElementById('usernameInput').value.trim();
            
            if (!username) {
                showError('Please enter a username');
                return;
            }

            showLoading(true);
            hideError();
            hideProfile();

            try {
                // Get player data for all job types
                const jobTypes = ['police', 'medic', 'mechanic', 'civilian'];
                const profileData = {
                    username: username,
                    globalStats: null,
                    jobs: {},
                    achievements: null
                };

                // Fetch job ranks
                for (const jobType of jobTypes) {
                    try {
                        const response = await fetch(`${API_BASE}/player-rank/${username}/${jobType}`);
                        if (response.ok) {
                            const data = await response.json();
                            profileData.jobs[jobType] = data.rank;
                            profileData.globalStats = data.globalStats;
                        }
                    } catch (error) {
                        console.log(`No data for ${jobType} job`);
                    }
                }

                // Fetch achievements
                try {
                    const achResponse = await fetch(`${API_BASE}/player-achievements/${username}`);
                    if (achResponse.ok) {
                        const achData = await achResponse.json();
                        profileData.achievements = achData;
                    }
                } catch (error) {
                    console.log('No achievements data');
                }

                // Check if we have any data
                const hasData = Object.keys(profileData.jobs).length > 0 || profileData.achievements;
                
                if (hasData) {
                    displayProfile(profileData);
                } else {
                    showError(`No profile data found for username: ${username}`);
                }
            } catch (error) {
                showError('Failed to load profile data: ' + error.message);
            } finally {
                showLoading(false);
            }
        }

        function displayProfile(data) {
            // Update player info
            document.getElementById('playerName').textContent = data.username;
            document.getElementById('totalPlaytime').textContent = formatPlaytime(data.globalStats?.total_playtime || 0);
            document.getElementById('lastActive').textContent = formatDate(data.globalStats?.last_active);
            document.getElementById('achievementCount').textContent = 
                `${data.achievements?.unlockedAchievements || 0} / ${data.achievements?.totalAchievements || 25}`;
            document.getElementById('gtaLinked').textContent = '✓ Yes';

            // Display job ranks
            const jobRanksContainer = document.getElementById('jobRanks');
            jobRanksContainer.innerHTML = '';

            const jobIcons = {
                police: '🚔',
                medic: '🚑',
                mechanic: '🔧',
                civilian: '👤'
            };

            const jobNames = {
                police: 'Police Officer',
                medic: 'Medic',
                mechanic: 'Mechanic',
                civilian: 'Civilian'
            };

            for (const [jobType, jobData] of Object.entries(data.jobs)) {
                const jobCard = createJobCard(jobType, jobData, jobIcons[jobType], jobNames[jobType]);
                jobRanksContainer.appendChild(jobCard);
            }

            // Display achievements
            displayAchievements(data.achievements?.achievements || []);

            showProfile();
        }

        function createJobCard(jobType, jobData, icon, name) {
            const card = document.createElement('div');
            card.className = 'job-card';

            const experiencePercent = (jobData.experience / jobData.next_level_xp) * 100;

            card.innerHTML = `
                <div class="job-title">${icon} ${name}</div>
                <div class="rank-info">
                    <span class="level-badge">Level ${jobData.level}</span>
                    <span>${jobData.title}</span>
                </div>
                <div class="experience-bar">
                    <div class="experience-fill" style="width: ${experiencePercent}%"></div>
                </div>
                <div style="text-align: center; margin-bottom: 10px;">
                    ${jobData.experience} / ${jobData.next_level_xp} XP
                </div>
                <div class="job-stats">
                    ${Object.entries(jobData.stats).map(([stat, value]) => 
                        `<div class="job-stat">
                            <span>${formatStatName(stat)}:</span>
                            <span>${formatStatValue(stat, value)}</span>
                        </div>`
                    ).join('')}
                </div>
            `;

            return card;
        }

        function displayAchievements(achievements) {
            const grid = document.getElementById('achievementsGrid');
            grid.innerHTML = '';

            if (achievements.length === 0) {
                grid.innerHTML = '<div style="text-align: center; grid-column: 1/-1;">No achievements unlocked yet</div>';
                return;
            }

            achievements.forEach(achievement => {
                const card = document.createElement('div');
                card.className = 'achievement-card';

                const icon = getAchievementIcon(achievement.id);

                card.innerHTML = `
                    <div class="achievement-icon">${icon}</div>
                    <div class="achievement-name">${achievement.name}</div>
                    <div class="achievement-description">${achievement.description}</div>
                    <div class="achievement-date">${formatDate(achievement.unlocked_at)}</div>
                `;

                grid.appendChild(card);
            });
        }

        function getAchievementIcon(achievementId) {
            const icons = {
                'first_arrest': '🚔',
                'veteran_officer': '⭐',
                'pursuit_master': '🏁',
                'first_save': '🚑',
                'lifesaver': '💉',
                'first_repair': '🔧',
                'master_mechanic': '🏆',
                'first_mission': '📋',
                'property_owner': '🏠',
                'experienced_police': '👮',
                'experienced_medic': '🏥',
                'experienced_mechanic': '🔨',
                'experienced_civilian': '👥',
                'master_police': '🎖️',
                'master_medic': '🏥',
                'master_mechanic': '⚙️',
                'master_civilian': '👑'
            };
            return icons[achievementId] || '🏅';
        }

        function formatStatName(statName) {
            return statName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }

        function formatStatValue(statName, value) {
            if (statName.includes('time')) {
                return value.toFixed(1) + 'h';
            }
            if (statName.includes('wealth')) {
                return '$' + value.toLocaleString();
            }
            if (statName.includes('avg') || statName.includes('rate')) {
                return value.toFixed(1);
            }
            return value.toString();
        }

        function formatPlaytime(hours) {
            if (hours < 1) {
                return Math.floor(hours * 60) + ' minutes';
            }
            return hours.toFixed(1) + ' hours';
        }

        function formatDate(dateString) {
            if (!dateString) return 'Never';
            const date = new Date(dateString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
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

        function showProfile() {
            document.getElementById('profileContent').style.display = 'block';
        }

        function hideProfile() {
            document.getElementById('profileContent').style.display = 'none';
        }

        // Search on Enter key
        document.getElementById('usernameInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchProfile();
            }
        });

        // Profile page is ready for user input
        window.addEventListener('load', function() {
            console.log('Profile page loaded - ready for user input');
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
    
