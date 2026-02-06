
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadPreview = document.getElementById('uploadPreview');
const previewGrid = document.getElementById('previewGrid');
const uploadCount = document.getElementById('uploadCount');
const clearSelection = document.getElementById('clearSelection');
const uploadButton = document.getElementById('uploadButton');
const uploadProgress = document.getElementById('uploadProgress');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const uploadResults = document.getElementById('uploadResults');
const resultsStats = document.getElementById('resultsStats');

let selectedFiles = [];



uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
  handleFiles(files);
});

uploadArea.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", (e) => {
  const files = Array.from(e.target.files);
  handleFiles(files);
});

function handleFiles(files) {
  if (files.length === 0) return;

  selectedFiles = [...selectedFiles, ...files];
  updatePreview();
}

function updatePreview() {
  if (selectedFiles.length === 0) {
    uploadPreview.style.display = "none";
    return;
  }

  uploadPreview.style.display = "block";
  previewGrid.innerHTML = "";
  uploadCount.textContent = selectedFiles.length;

  selectedFiles.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const previewItem = document.createElement("div");
      previewItem.className = "preview-item";
      previewItem.innerHTML = `
                <img src="${e.target.result}" alt="${file.name}">
                <button class="preview-remove" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            `;
      previewGrid.appendChild(previewItem);

      // Add remove event listener
      previewItem
        .querySelector(".preview-remove")
        .addEventListener("click", () => {
          selectedFiles.splice(index, 1);
          updatePreview();
        });
    };
    reader.readAsDataURL(file);
  });
}

clearSelection.addEventListener("click", () => {
  selectedFiles = [];
  fileInput.value = "";
  updatePreview();
});

uploadButton.addEventListener("click", async () => {
  if (selectedFiles.length === 0) return;

  const formData = new FormData();
  selectedFiles.forEach((file) => {
    formData.append("images", file);
  });

  // Show progress
  uploadPreview.style.display = "none";
  uploadProgress.style.display = "block";

  try {
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    // Simulate progress
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 10;
      progressBar.style.width = `${Math.min(progress, 90)}%`;
      if (progress >= 90) clearInterval(progressInterval);
    }, 100);

    const data = await response.json();

    clearInterval(progressInterval);
    progressBar.style.width = "100%";

    setTimeout(() => {
      uploadProgress.style.display = "none";
      showResults(data);
    }, 500);
  } catch (error) {
    showToast("Upload failed: " + error.message, "error");
    uploadProgress.style.display = "none";
    uploadPreview.style.display = "block";
  }
});

function showResults(data) {
  uploadResults.style.display = "block";

  const successCount = data.uploaded.length;
  const errorCount = data.errors.length;

  resultsStats.innerHTML = `
        <div class="stat-item">
            <div class="stat-value" style="color: var(--success-color);">${successCount}</div>
            <div class="stat-label">Uploaded Successfully</div>
        </div>
        ${
          errorCount > 0
            ? `
        <div class="stat-item">
            <div class="stat-value" style="color: var(--danger-color);">${errorCount}</div>
            <div class="stat-label">Failed</div>
        </div>
        `
            : ""
        }
    `;

  if (errorCount > 0) {
    data.errors.forEach((error) => {
      showToast(error, "error");
    });
  }

  // Clear selection after successful upload
  selectedFiles = [];
  fileInput.value = "";
}

// Toast notification
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}
