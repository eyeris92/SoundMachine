// Update this with your ngrok URL each time you restart Colab
const API_URL = 'https://xxxx-xx-xx-xxx-xx.ngrok.io';

document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const trackUpload = document.getElementById('track-upload');
    const fileLabel = document.getElementById('file-label');
    const originalAudio = document.getElementById('original-audio');
    const originalAudioContainer = document.getElementById('original-audio-container');
    const generateBtn = document.getElementById('generate-btn');
    const finalizeBtn = document.getElementById('finalize-btn');
    const errorMessage = document.getElementById('error-message');
    const loadingMessage = document.getElementById('loading-message');
    const resultSection = document.getElementById('result-section');
    const variationsContainer = document.getElementById('variations-container');
    const ratingContainer = document.getElementById('rating-container');
    const intensitySlider = document.getElementById('intensity-slider');
    
    let uploadedFile = null;
    let variations = [];
    let selectedVariation = null;
    
    // Set up number buttons
    const numberBtns = document.querySelectorAll('.number-btn');
    let numberOfVariations = 3; // Default
    
    numberBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            numberBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            numberOfVariations = parseInt(btn.dataset.value);
        });
    });
    
    // Handle file upload
    trackUpload.addEventListener('change', function(e) {
        if (this.files && this.files[0]) {
            uploadedFile = this.files[0];
            fileLabel.textContent = uploadedFile.name;
            
            // Preview original audio
            const objectUrl = URL.createObjectURL(uploadedFile);
            originalAudio.src = objectUrl;
            originalAudioContainer.style.display = 'block';
            
            // Enable generate button
            generateBtn.disabled = false;
        }
    });
    
    // Handle generate button click
    generateBtn.addEventListener('click', function() {
        if (!uploadedFile) {
            showError('Please upload a track first');
            return;
        }
        
        // Get selected elements to modify
        const elements = Array.from(document.querySelectorAll('.option-group:nth-child(1) input:checked'))
            .map(input => input.value);
            
        if (elements.length === 0) {
            showError('Please select at least one element to modify');
            return;
        }
        
        // Get selected styles
        const styles = Array.from(document.querySelectorAll('.option-group:nth-child(2) input:checked'))
            .map(input => input.value);
            
        if (styles.length === 0) {
            showError('Please select at least one style');
            return;
        }
        
        // Get intensity value
        const intensity = intensitySlider.value;
        
        // Generate the variations
        generateVariations(uploadedFile, elements, styles, intensity, numberOfVariations);
    });
    
    // Handle finalize button click
    finalizeBtn.addEventListener('click', function() {
        if (selectedVariation) {
            downloadVariation(selectedVariation);
        } else {
            showError('Please select a variation first');
        }
    });
    
    // Function to generate variations
    async function generateVariations(file, elements, styles, intensity, count) {
        // Reset previous results
        variations = [];
        
        // Hide any previous errors and show loading
        errorMessage.style.display = 'none';
        loadingMessage.style.display = 'block';
        generateBtn.disabled = true;
        resultSection.style.display = 'none';
        
        try {
            // Generate variations sequentially
            const generatedVariations = [];
            
            for (let i = 0; i < count; i++) {
                // Pick a random element and style for variety
                const element = elements[Math.floor(Math.random() * elements.length)];
                const style = styles[Math.floor(Math.random() * styles.length)];
                
                // Create a unique configuration
                const config = {
                    element,
                    style,
                    intensity: parseInt(intensity) + (Math.random() * 2 - 1) // Add some randomness
                };
                
                // Generate the variation
                const formData = new FormData();
                formData.append('file', file);
                formData.append('element', config.element);
                formData.append('style', config.style);
                
                const response = await fetch(`${API_URL}/generate`, {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    throw new Error(`Server error for variation ${i+1}`);
                }
                
                const data = await response.json();
                
                if (data.success) {
                    // Convert base64 to blob and create URL
                    const base64 = data.variation_b64;
                    const blob = base64ToBlob(base64, 'audio/wav');
                    const audioUrl = URL.createObjectURL(blob);
                    
                    // Save variation data
                    generatedVariations.push({
                        id: i,
                        config,
                        audioUrl,
                        blob
                    });
                } else {
                    throw new Error(data.error || `Generation failed for variation ${i+1}`);
                }
            }
            
            // Save all variations
            variations = generatedVariations;
            
            // Display variations
            displayVariations(variations);
            
            // Show results
            resultSection.style.display = 'block';
            resultSection.scrollIntoView({ behavior: 'smooth' });
            
        } catch (err) {
            showError(`Error: ${err.message}`);
            console.error(err);
        } finally {
            loadingMessage.style.display = 'none';
            generateBtn.disabled = false;
        }
    }
    
    // Function to display variations
    function displayVariations(variationsList) {
        // Clear previous
        variationsContainer.innerHTML = '';
        ratingContainer.innerHTML = '';
        
        // Add variation cards
        variationsList.forEach(variation => {
            const card = document.createElement('div');
            card.className = 'variation-card';
            card.dataset.id = variation.id;
            
            card.innerHTML = `
                <h3 class="variation-title">Variation ${variation.id + 1}</h3>
                <div class="variation-details">
                    <div>Element: ${variation.config.element}</div>
                    <div>Style: ${variation.config.style}</div>
                    <div>Intensity: ${Math.round(variation.config.intensity)}/10</div>
                </div>
                <audio controls src="${variation.audioUrl}"></audio>
            `;
            
            // Add click handler for selection
            card.addEventListener('click', () => {
                document.querySelectorAll('.variation-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                selectedVariation = variation;
            });
            
            variationsContainer.appendChild(card);
            
            // Add rating option
            const ratingOption = document.createElement('div');
            ratingOption.className = 'rating-option';
            ratingOption.dataset.id = variation.id;
            
            ratingOption.innerHTML = `
                <div class="rating-circle">${variation.id + 1}</div>
                <div class="rating-label">Variation ${variation.id + 1}</div>
            `;
            
            ratingOption.addEventListener('click', () => {
                document.querySelectorAll('.rating-option').forEach(o => o.classList.remove('selected'));
                ratingOption.classList.add('selected');
                
                // Also select the corresponding card
                document.querySelectorAll('.variation-card').forEach(c => c.classList.remove('selected'));
                document.querySelector(`.variation-card[data-id="${variation.id}"]`).classList.add('selected');
                
                selectedVariation = variation;
            });
            
            ratingContainer.appendChild(ratingOption);
        });
    }
    
    // Function to download a variation
    function downloadVariation(variation) {
        const fileName = uploadedFile.name.split('.')[0];
        const element = variation.config.element;
        const style = variation.config.style;
        const downloadName = `${fileName}_${element}_${style}_variation.wav`;
        
        const a = document.createElement('a');
        a.href = URL.createObjectURL(variation.blob);
        a.download = downloadName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
    
    // Helper function to convert base64 to blob
    function base64ToBlob(base64, type) {
        const binaryString = window.atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return new Blob([bytes], { type });
    }
    
    // Helper function to show errors
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }
    
    // Check if API is available on load
    fetch(`${API_URL}/health`)
        .then(response => {
            if (!response.ok) {
                showError('API server is not responding. Please contact the administrator.');
            }
        })
        .catch(() => {
            showError('Cannot connect to the AI service. Please try again later.');
        });
});