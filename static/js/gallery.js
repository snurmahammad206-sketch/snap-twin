// Gallery functionality
const galleryGrid = document.getElementById('galleryGrid');
const galleryEmpty = document.getElementById('galleryEmpty');
const imageCount = document.getElementById('imageCount');
const clearAllBtn = document.getElementById('clearAllBtn');
const imageModal = document.getElementById('imageModal');
const modalImage = document.getElementById('modalImage');
const modalTitle = document.getElementById('modalTitle');
const modalDetails = document.getElementById('modalDetails');
const modalClose = document.getElementById('modalClose');

// Delete modal
const deleteModal = document.getElementById('deleteModal');
const cancelDelete = document.getElementById('cancelDelete');
const confirmDelete = document.getElementById('confirmDelete');
let imageToDelete = null;

// Clear all modal
const clearAllModal = document.getElementById('clearAllModal');
const cancelClearAll = document.getElementById('cancelClearAll');
const confirmClearAll = document.getElementById('confirmClearAll');

let images = [];

// Load images on page load
document.addEventListener('DOMContentLoaded', loadImages);

async function loadImages() {
    try {
        const response = await fetch('/api/images');
        images = await response.json();
        
        updateGallery();
    } catch (error) {
        showToast('Failed to load images', 'error');
    }
}

function updateGallery() {
    imageCount.innerHTML = `<i class="fas fa-images"></i> ${images.length} image${images.length !== 1 ? 's' : ''}`;
    
    if (images.length === 0) {
        galleryEmpty.style.display = 'block';
        galleryGrid.style.display = 'none';
        return;
    }
    
    galleryEmpty.style.display = 'none';
    galleryGrid.style.display = 'grid';
    galleryGrid.innerHTML = '';
    
    images.forEach(image => {
        const galleryItem = document.createElement('div');
        galleryItem.className = 'gallery-item';
        
        const fileSize = formatFileSize(image.file_size);
        const dimensions = image.width && image.height ? `${image.width}x${image.height}` : '';
        
        galleryItem.innerHTML = `
            <div class="gallery-image" data-id="${image.id}">
                <img src="${image.url}" alt="${image.original_name}" loading="lazy">
            </div>
            <div class="gallery-info">
                <h4 title="${image.original_name}">${image.original_name}</h4>
                <p>${dimensions} • ${fileSize}</p>
            </div>
            <div class="gallery-actions-overlay">
                <button class="gallery-btn view" data-id="${image.id}" title="View">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="gallery-btn delete" data-id="${image.id}" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        galleryGrid.appendChild(galleryItem);
        
        // Add event listeners
        galleryItem.querySelector('.gallery-image').addEventListener('click', () => openModal(image));
        galleryItem.querySelector('.gallery-btn.view').addEventListener('click', () => openModal(image));
        galleryItem.querySelector('.gallery-btn.delete').addEventListener('click', () => confirmDeleteImage(image.id));
    });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function openModal(image) {
    modalImage.src = image.url;
    modalTitle.textContent = image.original_name;
    
    const fileSize = formatFileSize(image.file_size);
    const dimensions = image.width && image.height ? `${image.width}x${image.height}px` : '';
    modalDetails.innerHTML = `
        <strong>Uploaded:</strong> ${image.upload_time}<br>
        <strong>Size:</strong> ${fileSize}<br>
        ${dimensions ? `<strong>Dimensions:</strong> ${dimensions}` : ''}
    `;
    
    imageModal.classList.add('active');
}

function closeModal() {
    imageModal.classList.remove('active');
}

modalClose.addEventListener('click', closeModal);
imageModal.addEventListener('click', (e) => {
    if (e.target === imageModal) closeModal();
});

// Delete functionality
function confirmDeleteImage(id) {
    imageToDelete = id;
    deleteModal.classList.add('active');
}

cancelDelete.addEventListener('click', () => {
    deleteModal.classList.remove('active');
    imageToDelete = null;
});

confirmDelete.addEventListener('click', async () => {
    if (!imageToDelete) return;
    
    try {
        const response = await fetch(`/api/delete/${imageToDelete}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            images = images.filter(img => img.id !== imageToDelete);
            updateGallery();
            showToast('Image deleted successfully', 'success');
        } else {
            showToast('Failed to delete image', 'error');
        }
    } catch (error) {
        showToast('Error deleting image', 'error');
    }
    
    deleteModal.classList.remove('active');
    imageToDelete = null;
});

// Clear all functionality
clearAllBtn.addEventListener('click', () => {
    if (images.length === 0) {
        showToast('No images to delete', 'warning');
        return;
    }
    clearAllModal.classList.add('active');
});

cancelClearAll.addEventListener('click', () => {
    clearAllModal.classList.remove('active');
});

confirmClearAll.addEventListener('click', async () => {
    try {
        const response = await fetch('/api/clear-all', {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            images = [];
            updateGallery();
            showToast('All images cleared', 'success');
        } else {
            showToast('Failed to clear images', 'error');
        }
    } catch (error) {
        showToast('Error clearing images', 'error');
    }
    
    clearAllModal.classList.remove('active');
});

// Close modals on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
        deleteModal.classList.remove('active');
        clearAllModal.classList.remove('active');
    }
});

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
