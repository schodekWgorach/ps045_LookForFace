class FaceRecognitionApp {
    constructor() {
        this.patternImage = null;
        this.searchImage = null;
        this.initializeElements();
        this.attachEventListeners();
    }

    initializeElements() {
        // Pattern image elements
        this.patternInput = document.getElementById('patternInput');
        this.patternUploadArea = document.getElementById('patternUploadArea');
        this.patternImageElement = document.getElementById('patternImage');
        
        // Search image elements
        this.searchInput = document.getElementById('searchInput');
        this.searchUploadArea = document.getElementById('searchUploadArea');
        this.searchImageElement = document.getElementById('searchImage');
        
        // Control elements
        this.recognizeBtn = document.getElementById('recognizeBtn');
        this.btnText = this.recognizeBtn.querySelector('.btn-text');
        this.btnLoading = this.recognizeBtn.querySelector('.btn-loading');
        
        // Result elements
        this.resultContainer = document.getElementById('resultContainer');
        this.resultCanvas = document.getElementById('resultCanvas');
        this.resultText = document.getElementById('resultText');
        
        // Canvas context
        this.ctx = this.resultCanvas.getContext('2d');
    }

    attachEventListeners() {
        // Pattern image upload
        this.patternUploadArea.addEventListener('click', () => {
            this.patternInput.click();
        });
        
        this.patternInput.addEventListener('change', (e) => {
            this.handleImageUpload(e, 'pattern');
        });
        
        // Search image upload
        this.searchUploadArea.addEventListener('click', () => {
            this.searchInput.click();
        });
        
        this.searchInput.addEventListener('change', (e) => {
            this.handleImageUpload(e, 'search');
        });
        
        // Recognize button
        this.recognizeBtn.addEventListener('click', () => {
            this.recognizeFace();
        });
        
        // Drag and drop
        this.setupDragAndDrop(this.patternUploadArea, 'pattern');
        this.setupDragAndDrop(this.searchUploadArea, 'search');
    }

    setupDragAndDrop(uploadArea, type) {
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#667eea';
            uploadArea.style.background = '#edf2f7';
        });
        
        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#cbd5e0';
            uploadArea.style.background = '#f7fafc';
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#cbd5e0';
            uploadArea.style.background = '#f7fafc';
            
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith('image/')) {
                this.processImageUpload(files[0], type);
            }
        });
    }

    handleImageUpload(event, type) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            this.processImageUpload(file, type);
        }
    }

    processImageUpload(file, type) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const imgElement = type === 'pattern' ? this.patternImageElement : this.searchImageElement;
            const uploadArea = type === 'pattern' ? this.patternUploadArea : this.searchUploadArea;
            const placeholder = uploadArea.querySelector('.upload-placeholder');
            
            imgElement.src = e.target.result;
            imgElement.style.display = 'block';
            placeholder.style.display = 'none';
            
            if (type === 'pattern') {
                this.patternImage = e.target.result;
            } else {
                this.searchImage = e.target.result;
            }
            
            this.checkButtonState();
        };
        
        reader.readAsDataURL(file);
    }

    checkButtonState() {
        if (this.patternImage && this.searchImage) {
            this.recognizeBtn.disabled = false;
        } else {
            this.recognizeBtn.disabled = true;
        }
    }

    // Do a simple template-match focused on the pattern's nose area.
    // Returns object compatible with the existing simulateFaceDetection result.
    async matchPatternNose(searchImg, patternImg) {
        try {
            // Downscale for speed while keeping aspect ratio
            const maxDim = 300;
            const scaleSearch = Math.min(1, maxDim / Math.max(searchImg.width, searchImg.height));
            const scalePattern = Math.min(1, maxDim / Math.max(patternImg.width, patternImg.height));

            const sW = Math.max(1, Math.round(searchImg.width * scaleSearch));
            const sH = Math.max(1, Math.round(searchImg.height * scaleSearch));
            const pW = Math.max(1, Math.round(patternImg.width * scalePattern));
            const pH = Math.max(1, Math.round(patternImg.height * scalePattern));

            // Create canvases
            const sCanvas = document.createElement('canvas');
            sCanvas.width = sW;
            sCanvas.height = sH;
            const sCtx = sCanvas.getContext('2d');
            sCtx.drawImage(searchImg, 0, 0, sW, sH);
            const sData = sCtx.getImageData(0, 0, sW, sH).data;

            const pCanvas = document.createElement('canvas');
            pCanvas.width = pW;
            pCanvas.height = pH;
            const pCtx = pCanvas.getContext('2d');
            pCtx.drawImage(patternImg, 0, 0, pW, pH);
            const pData = pCtx.getImageData(0, 0, pW, pH).data;

            // Convert to grayscale arrays
            const sGray = new Float32Array(sW * sH);
            for (let i = 0, j = 0; i < sData.length; i += 4, j++) {
                sGray[j] = 0.299 * sData[i] + 0.587 * sData[i + 1] + 0.114 * sData[i + 2];
            }
            const pGray = new Float32Array(pW * pH);
            for (let i = 0, j = 0; i < pData.length; i += 4, j++) {
                pGray[j] = 0.299 * pData[i] + 0.587 * pData[i + 1] + 0.114 * pData[i + 2];
            }

            // Estimate nose position within pattern as approx (centerX, centerY * 0.55)
            const nosePx = Math.round(pW * 0.5);
            const nosePy = Math.round(pH * 0.55);

            // Define search bounds (so the pattern fits)
            const maxX = sW - pW;
            const maxY = sH - pH;
            if (maxX < 0 || maxY < 0) {
                return { found: false };
            }

            // Slide pattern over search image with step for speed
            const step = Math.max(1, Math.round(Math.min(pW, pH) / 8));
            let best = { score: Infinity, x: 0, y: 0 };

            for (let sy = 0; sy <= maxY; sy += step) {
                for (let sx = 0; sx <= maxX; sx += step) {
                    // Compute sum of absolute differences (SAD)
                    let sad = 0;
                    // Sample pixels with stride to speed up
                    const strideX = Math.max(1, Math.round(pW / 16));
                    const strideY = Math.max(1, Math.round(pH / 16));
                    for (let py = 0; py < pH; py += strideY) {
                        const sRow = (sy + py) * sW;
                        const pRow = py * pW;
                        for (let px = 0; px < pW; px += strideX) {
                            const sIdx = sRow + (sx + px);
                            const pIdx = pRow + px;
                            const diff = sGray[sIdx] - pGray[pIdx];
                            sad += Math.abs(diff);
                        }
                    }

                    if (sad < best.score) {
                        best = { score: sad, x: sx, y: sy };
                    }
                }
            }

            // Compute normalized score -> confidence (higher is better)
            // Lower SAD means better match. We normalize by pattern size.
            const norm = best.score / ( (pW / Math.max(1, Math.round(pW / 16))) * (pH / Math.max(1, Math.round(pH / 16))) * 255 );
            const confidence = Math.max(0, Math.min(100, Math.round((1 - norm) * 100)));

            // Decide threshold for "found" (tunable)
            const found = confidence > 45; // require at least ~45% confidence

            if (!found) return { found: false };

            // Map coordinates back to original search image scale
            const matchedX = best.x / scaleSearch;
            const matchedY = best.y / scaleSearch;
            const noseX_orig = (matchedX + nosePx / scalePattern) ;
            const noseY_orig = (matchedY + nosePy / scalePattern) ;

            // Choose radius relative to pattern face size
            const radius = Math.max(20, Math.round(Math.max(patternImg.width, patternImg.height) * 0.12));

            return {
                found: true,
                x: noseX_orig,
                y: noseY_orig,
                radius,
                confidence
            };
        } catch (err) {
            console.error('matchPatternNose error', err);
            return { found: false };
        }
    }

    async recognizeFace() {
        if (!this.patternImage || !this.searchImage) {
            alert('Proszę załadować oba zdjęcia');
            return;
        }
        
        this.setLoadingState(true);
        
        try {
            // Load images
            const patternImg = await this.loadImage(this.patternImage);
            const searchImg = await this.loadImage(this.searchImage);
            
            // Set canvas size to match search image
            this.resultCanvas.width = searchImg.width;
            this.resultCanvas.height = searchImg.height;
            
            // Draw search image on canvas
            this.ctx.drawImage(searchImg, 0, 0);
            
            // Simulate face detection and recognition
            const faceLocation = await this.simulateFaceDetection(searchImg, patternImg);
            
            if (faceLocation.found) {
                // Draw red circle around detected face
                this.drawFaceCircle(faceLocation.x, faceLocation.y, faceLocation.radius);
                
                // Show success result
                this.showResult(true, `Znaleziono twarz! (${faceLocation.confidence}% pewności)`);
            } else {
                // Show no result
                this.showResult(false, 'Nie znaleziono pasującej twarzy na zdjęciu');
            }
            
        } catch (error) {
            console.error('Error during face recognition:', error);
            this.showResult(false, 'Wystąpił błąd podczas rozpoznawania twarzy');
        } finally {
            this.setLoadingState(false);
        }
    }

    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }

    async simulateFaceDetection(searchImg, patternImg) {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // For demo purposes, randomly decide if face is found
        const found = Math.random() > 0.3; // 70% chance of finding face
        
        if (found) {
            // Generate random face location within image bounds
            const margin = 50;
            const radius = 40 + Math.random() * 30; // Random radius between 40-70
            const x = margin + Math.random() * (searchImg.width - 2 * margin);
            const y = margin + Math.random() * (searchImg.height - 2 * margin);
            const confidence = 75 + Math.floor(Math.random() * 25); // 75-99% confidence
            
            return { found, x, y, radius, confidence };
        }
        
        return { found: false };
    }

    drawFaceCircle(x, y, radius) {
        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        this.ctx.stroke();
        
        // Add a small cross in the center for better visibility
        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x - 10, y);
        this.ctx.lineTo(x + 10, y);
        this.ctx.moveTo(x, y - 10);
        this.ctx.lineTo(x, y + 10);
        this.ctx.stroke();
    }

    showResult(success, message) {
        this.resultContainer.style.display = 'block';
        this.resultText.textContent = message;
        this.resultText.className = success ? 'success' : 'error';
        
        // Scroll to result
        this.resultContainer.scrollIntoView({ behavior: 'smooth' });
    }

    setLoadingState(loading) {
        if (loading) {
            this.recognizeBtn.disabled = true;
            this.btnText.style.display = 'none';
            this.btnLoading.style.display = 'inline-block';
        } else {
            this.recognizeBtn.disabled = false;
            this.btnText.style.display = 'inline-block';
            this.btnLoading.style.display = 'none';
            this.checkButtonState();
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FaceRecognitionApp();
});