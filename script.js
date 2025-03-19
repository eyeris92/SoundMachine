// Update this with your ngrok URL each time you restart Colab
const API_URL = 'https://2947-35-189-181-53.ngrok-free.app';


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
    const elementIntensitySliders = document.querySelectorAll('.element-intensity');
    const elementCheckboxes = document.querySelectorAll('.element-checkbox');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    
    let uploadedFile = null;
    let variations = [];
    let selectedVariation = null;
    
    // Theme toggle functionality
    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }
    
    // Check for saved theme preference or default to 'light'
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    
    // Add event listener to theme toggle button
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    });
    
    // Set up element checkbox handlers
    elementCheckboxes.forEach(checkbox => {
        // Initialize the element controls visibility based on checkbox state
        const elementControls = checkbox.closest('.element-controls');
        const slider = elementControls.querySelector('.element-intensity');
        
        if (!checkbox.checked) {
            slider.disabled = true;
            elementControls.classList.add('disabled');
        }
        
        // Add event listener for changes
        checkbox.addEventListener('change', function() {
            const elementControls = this.closest('.element-controls');
            const slider = elementControls.querySelector('.element-intensity');
            
            if (this.checked) {
                slider.disabled = false;
                elementControls.classList.remove('disabled');
            } else {
                slider.disabled = true;
                elementControls.classList.add('disabled');
            }
            
            // Enable generate button if at least one element is selected
            if (uploadedFile) {
                const anyElementSelected = document.querySelector('.element-checkbox:checked');
                generateBtn.disabled = !anyElementSelected;
            }
        });
    });
    
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
            
            // Enable generate button only if at least one element is selected
            const anyElementSelected = document.querySelector('.element-checkbox:checked');
            generateBtn.disabled = !anyElementSelected;
        }
    });
    
    // Handle generate button click
    generateBtn.addEventListener('click', function() {
        if (!uploadedFile) {
            showError('Please upload a track first');
            return;
        }
        
        // Get selected elements and their intensity values
        const elements = [];
        const elementIntensities = {};
        
        // Get all element checkboxes
        const elementControlsAll = document.querySelectorAll('.element-controls');
        
        elementControlsAll.forEach(control => {
            const element = control.dataset.element;
            const isChecked = control.querySelector('input[type="checkbox"]').checked;
            const intensity = control.querySelector('.element-intensity').value;
            
            if (isChecked) {
                elements.push(element);
                elementIntensities[element] = parseInt(intensity);
            }
        });
        
        if (elements.length === 0) {
            showError('Please select at least one element to modify');
            return;
        }
        
        // Get selected styles
        const styles = Array.from(document.querySelectorAll('.style-options input:checked'))
            .map(input => input.value);
            
        if (styles.length === 0) {
            showError('Please select at least one style');
            return;
        }
        
        // Generate the variations
        generateVariations(uploadedFile, elements, styles, elementIntensities, numberOfVariations);
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
    async function generateVariations(file, elements, styles, elementIntensities, count) {
        // Reset previous results
        variations = [];
        
        // Hide any previous errors and show loading
        errorMessage.style.display = 'none';
        
        // Create loading message with time tracking
        let startTime = Date.now();
        let elapsedSeconds = 0;
        loadingMessage.innerHTML = `
            <p>Processing your track - this involves several steps:</p>
            <ol>
                <li>Separating your track into stems (drums, bass, melody, harmony)</li>
                <li>Applying ${styles[0]} style to ${elements.join(', ')}</li>
                <li>Remixing the track</li>
            </ol>
            <div class="progress-container">
                <div class="progress-bar" id="generation-progress"></div>
            </div>
            <p id="time-indicator">Time elapsed: 0s (typically takes 30-60s)</p>
            <div class="spinner"></div>
        `;
        loadingMessage.style.display = 'block';
        
        // Start progress timer
        const progressBar = document.getElementById('generation-progress');
        const timeIndicator = document.getElementById('time-indicator');
        const progressTimer = setInterval(() => {
            elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
            timeIndicator.textContent = `Time elapsed: ${elapsedSeconds}s (typically takes 30-60s)`;
            
            // Update progress bar (approximate)
            const estimatedProgress = Math.min(elapsedSeconds / 60 * 100, 95); // Max at 95%
            progressBar.style.width = estimatedProgress + '%';
        }, 1000);
        
        generateBtn.disabled = true;
        resultSection.style.display = 'none';
        
        try {
            // Generate variations sequentially
            const generatedVariations = [];
            
            for (let i = 0; i < count; i++) {
                // For each variation, we'll use multiple elements with their specific intensities
                // Pick a different style for each variation
                const style = styles[Math.floor(Math.random() * styles.length)];
                
                // For each variation, randomly select 1-3 elements to modify
                const elementsToUse = [...elements];
                const shuffledElements = elementsToUse.sort(() => 0.5 - Math.random());
                const selectedElements = shuffledElements.slice(0, Math.min(Math.ceil(Math.random() * 3), elements.length));
                
                // Create a unique configuration
                const config = {
                    elements: selectedElements,
                    style,
                    elementIntensities: {}
                };
                
                // Apply the intensity for each selected element (with slight randomness)
                selectedElements.forEach(elem => {
                    config.elementIntensities[elem] = elementIntensities[elem] + (Math.random() * 1 - 0.5); // Add slight randomness
                });
                
                // Generate the variation
                const formData = new FormData();
                formData.append('file', file);
                formData.append('style', config.style);
                formData.append('elements', JSON.stringify(config.elements));
                formData.append('elementIntensities', JSON.stringify(config.elementIntensities));
                
                const response = await fetch(`${API_URL}/generate`, {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Server response:', errorText);
                    try {
                        const errorJson = JSON.parse(errorText);
                        throw new Error(errorJson.error || `Server error for variation ${i+1}: ${response.status}`);
                    } catch (jsonError) {
                        throw new Error(`Server error for variation ${i+1}: ${response.status} - ${errorText.substring(0, 100)}...`);
                    }
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
            // Clear the progress timer
            clearInterval(progressTimer);
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
                <div>Style: ${variation.config.style}</div>
                <div>Modified elements:</div>
                ${variation.config.elements.map(elem => {
                        const intensity = Math.round(variation.config.elementIntensities[elem]);
                        return `<div class="element-detail">${elem.charAt(0).toUpperCase() + elem.slice(1)}: <span class="intensity-badge intensity-${intensity <= 3 ? 'low' : intensity <= 7 ? 'medium' : 'high'}">${intensity}/10</span></div>`;
                    }).join('')}
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
        const elements = variation.config.elements.join('_');
        const style = variation.config.style;
        const downloadName = `${fileName}_${style}_${elements}_variation.wav`;
        
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
            console.log('Health check response:', response);
            if (!response.ok) {
                showError('API server is not responding. Please contact the administrator.');
            }
        })
        .catch((error) => {
            console.error('Health check error:', error);
            showError('Cannot connect to the AI service. Please try again later.');
        });
});
