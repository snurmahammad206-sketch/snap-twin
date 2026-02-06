// Compare functionality
const preview1 = document.getElementById('preview1');
const preview2 = document.getElementById('preview2');
const imageId1 = document.getElementById('imageId1');
const imageId2 = document.getElementById('imageId2');
const selectButtons = document.querySelectorAll('.btn-select');
const compareBtn = document.getElementById('compareBtn');
const comparisonResult = document.getElementById('comparisonResult');
const selectionModal = document.getElementById('selectionModal');
const selectionGrid = document.getElementById('selectionGrid');
const modalClose = document.getElementById('modalClose');
const cancelSelection = document.getElementById('cancelSelection');
const noImagesModal = document.getElementById('noImagesModal');

let currentSelector = null;
let images = [];
let selectedImage1 = null;
let selectedImage2 = null;

// Load images on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadImages();
    
    // Check if images exist
    if (images.length < 2) {
        noImagesModal.classList.add('active');
    }
});

async function loadImages() {
    try {
        const response = await fetch('/api/images');
        images = await response.json();
    } catch (error) {
        showToast('Failed to load images', 'error');
    }
}

// Select button click handlers
selectButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const selector = btn.dataset.selector;
        openSelectionModal(selector);
    });
});

function openSelectionModal(selector) {
    if (images.length === 0) {
        showToast('No images available. Please upload images first.', 'error');
        return;
    }
    
    currentSelector = selector;
    selectionGrid.innerHTML = '';
    
    images.forEach(image => {
        const item = document.createElement('div');
        item.className = 'selection-item';
        item.innerHTML = `<img src="${image.url}" alt="${image.original_name}" loading="lazy">`;
        item.addEventListener('click', () => selectImage(image));
        selectionGrid.appendChild(item);
    });
    
    selectionModal.classList.add('active');
}

function selectImage(image) {
    if (currentSelector === '1') {
        selectedImage1 = image;
        imageId1.value = image.id;
        updatePreview(preview1, image);
    } else {
        selectedImage2 = image;
        imageId2.value = image.id;
        updatePreview(preview2, image);
    }
    
    selectionModal.classList.remove('active');
    updateCompareButton();
}

function updatePreview(previewElement, image) {
    previewElement.classList.add('has-image');
    previewElement.innerHTML = `<img src="${image.url}" alt="${image.original_name}">`;
}

function updateCompareButton() {
    const id1 = imageId1.value;
    const id2 = imageId2.value;
    
    compareBtn.disabled = !(id1 && id2);
}

// Close modal handlers
modalClose.addEventListener('click', () => {
    selectionModal.classList.remove('active');
});

cancelSelection.addEventListener('click', () => {
    selectionModal.classList.remove('active');
});

selectionModal.addEventListener('click', (e) => {
    if (e.target === selectionModal) {
        selectionModal.classList.remove('active');
    }
});

// Compare button handler
compareBtn.addEventListener('click', async () => {
    const id1 = imageId1.value;
    const id2 = imageId2.value;
    
    if (!id1 || !id2) {
        showToast('Please select two images', 'error');
        return;
    }
    
    if (id1 === id2) {
        showToast('Please select two different images', 'warning');
        return;
    }
    
    compareBtn.disabled = true;
    compareBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Comparing...';
    
    try {
        const response = await fetch('/api/compare', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image1_id: parseInt(id1),
                image2_id: parseInt(id2)
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showComparisonResult(data);
        } else {
            showToast(data.error || 'Comparison failed', 'error');
        }
    } catch (error) {
        showToast('Error comparing images', 'error');
    }
    
    compareBtn.disabled = false;
    compareBtn.innerHTML = '<i class="fas fa-balance-scale"></i> Compare Images';
});

function showComparisonResult(data) {
    comparisonResult.style.display = 'block';
    
    // Update score circle
    const scoreCircle = document.getElementById('scoreCircle');
    const scoreValue = document.getElementById('scoreValue');
    const similarityLevel = document.getElementById('similarityLevel');
    const similarityDescription = document.getElementById('similarityDescription');
    
    const percentage = data.similarity_percentage;
    const color = data.color;
    
    // Animate the score circle
    scoreCircle.style.background = `conic-gradient(${color} ${percentage}%, var(--border-color) ${percentage}%)`;
    scoreValue.style.color = color;
    
    // Animate the percentage number
    animateNumber(scoreValue, 0, percentage, 1000, '%');
    
    similarityLevel.textContent = data.similarity_level;
    similarityLevel.style.color = color;
    
    let description = '';
    if (percentage >= 90) {
        description = 'These images are nearly identical or very similar.';
    } else if (percentage >= 70) {
        description = 'These images share significant visual similarities.';
    } else if (percentage >= 40) {
        description = 'These images have some visual elements in common.';
    } else {
        description = 'These images are quite different from each other.';
    }
    similarityDescription.textContent = description;
    
    // Update details
    document.getElementById('hashDiff').textContent = data.hash_difference;
    document.getElementById('img1Name').textContent = data.image1.original_name;
    document.getElementById('img2Name').textContent = data.image2.original_name;
    
    // Update side by side images
    document.getElementById('compImg1').src = data.image1.url;
    document.getElementById('compImg2').src = data.image2.url;
    document.getElementById('compLabel1').textContent = data.image1.original_name;
    document.getElementById('compLabel2').textContent = data.image2.original_name;
    
    // Scroll to results
    comparisonResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function animateNumber(element, start, end, duration, suffix = '') {
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const current = Math.round(start + (end - start) * easeOutQuart);
        
        element.textContent = current + suffix;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

// Toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Close no images modal when clicking outside
noImagesModal.addEventListener('click', (e) => {
    if (e.target === noImagesModal) {
        noImagesModal.classList.remove('active');
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        selectionModal.classList.remove('active');
        noImagesModal.classList.remove('active');
    }
});
