
        // Tab switching functionality
        function switchTab(tabName, buttonElement) {
            // Remove active class from all tabs and buttons
            document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('active');
            });
            document.querySelectorAll('.tab-button').forEach(button => {
                button.classList.remove('active');
            });

            // Add active class to selected tab and button
            const tabPane = document.getElementById(tabName);
            if (tabPane) {
                tabPane.classList.add('active');
            }
            
            // Use provided button element or event.target
            const targetButton = buttonElement || (event && event.target);
            if (targetButton) {
                targetButton.classList.add('active');
            }

            // Wait a bit for the tab to become visible, then load files
            setTimeout(() => {
                loadFiles(tabName);
            }, 50);
        }

        // Load files from API
        async function loadFiles(category) {
            console.log(`Loading files for category: ${category}`);
            
            // Wait a bit for DOM to be ready
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Map category to correct element IDs
            const idMap = {
                'downloadable-files': 'downloadable',
                'misc': 'misc'
            };
            
            const elementPrefix = idMap[category];
            if (!elementPrefix) {
                console.error(`Unknown category: ${category}`);
                return;
            }
            
            // Find tab pane first, then search within it
            const tabPane = document.getElementById(category);
            let loadingElement, gridElement, emptyElement;
            
            if (tabPane) {
                // Search within tab pane
                loadingElement = tabPane.querySelector('.loading');
                gridElement = tabPane.querySelector('.file-grid');
                emptyElement = tabPane.querySelector('.empty-state');
            } else {
                // Fallback to global search with correct IDs
                loadingElement = document.querySelector(`#${elementPrefix}-loading`);
                gridElement = document.querySelector(`#${elementPrefix}-grid`);
                emptyElement = document.querySelector(`#${elementPrefix}-empty`);
            }

            console.log(`Elements found:`, {
                loading: !!loadingElement,
                grid: !!gridElement,
                empty: !!emptyElement,
                category: category,
                tabPane: !!tabPane
            });

            // Check if elements exist
            if (!loadingElement || !gridElement || !emptyElement) {
                console.error(`Elements not found for category: ${category}`);
                console.log('Available elements:', document.querySelectorAll('[id$="-loading"], [id$="-grid"], [id$="-empty"]'));
                return;
            }

            // Show loading state
            loadingElement.style.display = 'block';
            gridElement.style.display = 'none';
            emptyElement.style.display = 'none';

            try {
                const response = await fetch(`http://localhost:3001/api/downloads/${category}`);
                const files = await response.json();

                // Hide loading state
                loadingElement.style.display = 'none';

                if (files.length === 0) {
                    emptyElement.style.display = 'block';
                } else {
                    gridElement.style.display = 'grid';
                    renderFiles(files, gridElement);
                }
            } catch (error) {
                console.error('Error loading files:', error);
                loadingElement.style.display = 'none';
                emptyElement.style.display = 'block';
                
                // Update empty state message
                emptyElement.innerHTML = `
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error loading files</h3>
                    <p>Please try again later</p>
                `;
            }
        }

        // Render files in the grid
        function renderFiles(files, gridElement) {
            gridElement.innerHTML = files.map(file => `
                <div class="file-item">
                    <div class="file-icon">
                        <i class="fas ${getFileIcon(file.name)}"></i>
                    </div>
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${formatFileSize(file.size)}</div>
                    <div class="file-description">${file.description || 'No description available'}</div>
                    <div class="file-actions">
                        ${file.name.toLowerCase().endsWith('.zip') ? 
                            `<button class="preview-btn" onclick="showZipPreview('${file.category}', '${file.name}')">
                                <i class="fas fa-eye"></i> Preview
                            </button>` : ''
                        }
                        <a href="http://localhost:3001/downloads/${file.category}/${file.name}" class="download-btn" download>
                            <i class="fas fa-download"></i> Download
                        </a>
                    </div>
                </div>
            `).join('');
        }

        // Get file icon based on extension
        function getFileIcon(filename) {
            const extension = filename.split('.').pop().toLowerCase();
            const iconMap = {
                'zip': 'fa-file-archive',
                'rar': 'fa-file-archive',
                '7z': 'fa-file-archive',
                'tar': 'fa-file-archive',
                'gz': 'fa-file-archive',
                'pdf': 'fa-file-pdf',
                'txt': 'fa-file-alt',
                'doc': 'fa-file-word',
                'docx': 'fa-file-word',
                'xls': 'fa-file-excel',
                'xlsx': 'fa-file-excel',
                'jpg': 'fa-file-image',
                'jpeg': 'fa-file-image',
                'png': 'fa-file-image',
                'gif': 'fa-file-image',
                'mp4': 'fa-file-video',
                'avi': 'fa-file-video',
                'mkv': 'fa-file-video',
                'mp3': 'fa-file-audio',
                'wav': 'fa-file-audio',
                'exe': 'fa-file-code',
                'msi': 'fa-file-code',
                'js': 'fa-file-code',
                'html': 'fa-file-code',
                'css': 'fa-file-code'
            };
            return iconMap[extension] || 'fa-file';
        }

        // Format file size
        function formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        // Initialize the page
        document.addEventListener('DOMContentLoaded', function() {
            // Load initial tab content
            loadFiles('downloadable-files');
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
                // If we're trying to play same track that's already playing, just sync time
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
                        audio.currentTime = currentTime; // Set saved time
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

        // ZIP Preview Functions
        let currentZipData = null;
        let selectedFiles = new Set();

        async function showZipPreview(category, filename) {
            const modal = document.getElementById('zipPreviewModal');
            const archiveName = document.getElementById('archiveName');
            const archiveStats = document.getElementById('archiveStats');
            const fileList = document.getElementById('fileList');

            modal.style.display = 'block';
            archiveName.textContent = filename;
            archiveStats.textContent = 'Loading archive contents...';
            fileList.innerHTML = '<div class="loading">Loading archive contents...</div>';

            try {
                const encodedFilename = encodeURIComponent(filename);
                const response = await fetch(`http://localhost:3001/api/downloads/${category}/${encodedFilename}/preview`);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error('Invalid response format from server');
                }

                const data = await response.json();
                const previewSize = data.totalSize || data.size || 0;

                currentZipData = data;
                selectedFiles.clear();

                archiveStats.innerHTML = `
                    <strong>Total Files:</strong> ${data.totalFiles || 1}<br>
                    <strong>Total Size:</strong> ${formatFileSize(previewSize)}<br>
                    <strong>Archive:</strong> ${data.filename}<br>
                    <em style="color: #ffaa00;">Note: Basic preview - ZIP extraction not available</em>
                `;

                fileList.innerHTML = `
                    <div style="color: #888888; text-align: center; padding: 20px;">
                        <i class="fas fa-file-archive" style="font-size: 3rem; margin-bottom: 10px;"></i><br>
                        <span>File information only available</span><br>
                        <button class="download-full-btn" onclick="downloadFullArchive()" style="margin-top: 15px;">
                            <i class="fas fa-download"></i> Download Full Archive
                        </button>
                    </div>
                `;

                updateSelectionInfo();
            } catch (error) {
                console.error('Error loading ZIP preview:', error);
                archiveStats.innerHTML = `<span style="color: #ff4444;">Error: ${error.message}</span>`;
                fileList.innerHTML = '<span style="color: #ff4444;">Failed to load archive contents</span>';
            }
        }

        function renderZipFileList(files, allowSelection = true) {
            const fileList = document.getElementById('fileList');

            if (!files || files.length === 0) {
                fileList.innerHTML = '<div style="color: #888888; text-align: center; padding: 20px;">No files found in archive</div>';
                return;
            }

            fileList.innerHTML = files.map((file, index) => `
                <div class="file-list-item" data-index="${index}">
                    ${allowSelection ? `
                        <input type="checkbox" class="file-checkbox"
                               id="file-${index}"
                               value="${file.name}"
                               onchange="toggleFileSelection('${file.name}', this.checked)">
                    ` : ''}
                    <div class="file-info">
                        <div class="file-type-icon">
                            <i class="fas ${getFileTypeIcon(file.type)}"></i>
                        </div>
                        <div class="file-details">
                            <div class="file-list-name">${file.name}</div>
                            <div class="file-list-size">${file.formattedSize || formatFileSize(file.size || 0)}</div>
                            <div class="file-list-date">${file.date || '-'}</div>
                            ${allowSelection ? `
                                <button class="download-selected-btn" onclick="downloadSelectedFile('${file.name}')" style="margin-left: auto;">
                                    <i class="fas fa-download"></i> Download
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `).join('');
        }

        function getFileTypeIcon(type) {
            const iconMap = {
                text: 'fa-file-alt',
                document: 'fa-file-pdf',
                image: 'fa-file-image',
                audio: 'fa-file-audio',
                video: 'fa-file-video',
                executable: 'fa-file-code',
                archive: 'fa-file-archive',
                code: 'fa-file-code',
                data: 'fa-file-alt',
                unknown: 'fa-file'
            };
            return iconMap[type] || 'fa-file';
        }

        function toggleFileSelection(filename, isSelected) {
            if (isSelected) {
                selectedFiles.add(filename);
            } else {
                selectedFiles.delete(filename);
            }
            updateSelectionInfo();
        }

        function selectAllFiles(select) {
            const checkboxes = document.querySelectorAll('.file-checkbox');
            checkboxes.forEach((checkbox) => {
                checkbox.checked = select;
                if (select) {
                    selectedFiles.add(checkbox.value);
                } else {
                    selectedFiles.delete(checkbox.value);
                }
            });
            updateSelectionInfo();
        }

        function updateSelectionInfo() {
            const selectedCount = document.getElementById('selectedCount');
            const selectedSize = document.getElementById('selectedSize');
            const downloadBtn = document.getElementById('downloadSelectedBtn');

            const count = selectedFiles.size;
            let totalSize = 0;

            if (currentZipData && Array.isArray(currentZipData.files)) {
                totalSize = currentZipData.files
                    .filter((file) => selectedFiles.has(file.name))
                    .reduce((sum, file) => sum + (file.size || 0), 0);
            }

            if (selectedCount) selectedCount.textContent = `${count} files selected`;
            if (selectedSize) selectedSize.textContent = formatFileSize(totalSize);
            if (downloadBtn) downloadBtn.disabled = count === 0;
        }

        function closeZipPreview() {
            const modal = document.getElementById('zipPreviewModal');
            if (modal) modal.style.display = 'none';
            currentZipData = null;
            selectedFiles.clear();
        }

        async function downloadSelected() {
            if (!currentZipData || selectedFiles.size === 0) return;
            alert('Partial download feature coming soon! For now, please download the full archive.');
        }

        function downloadFullArchive() {
            if (!currentZipData) return;
            const downloadUrl = `http://localhost:3001/downloads/${currentZipData.category}/${encodeURIComponent(currentZipData.filename)}`;
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = currentZipData.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        document.addEventListener('click', (e) => {
            const modal = document.getElementById('zipPreviewModal');
            if (modal && modal.style.display === 'block' && e.target === modal) {
                closeZipPreview();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeZipPreview();
            }
        });

        async function downloadSelectedFile(filename) {
            console.log('Individual file download is not yet implemented for:', filename);
        }

        // Ensure inline onclick handlers can always resolve these functions.
        window.switchTab = switchTab;
        window.showZipPreview = showZipPreview;
        window.closeZipPreview = closeZipPreview;
        window.selectAllFiles = selectAllFiles;
        window.downloadSelected = downloadSelected;
        window.downloadFullArchive = downloadFullArchive;
        window.toggleFileSelection = toggleFileSelection;
        window.downloadSelectedFile = downloadSelectedFile;
    
