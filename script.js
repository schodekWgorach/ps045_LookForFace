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