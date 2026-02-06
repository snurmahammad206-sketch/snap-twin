# Image Similarity Comparator

A web application built with Flask that allows users to upload images, store them in a database, view them in a gallery, and compare the similarity between any two images using perceptual hashing.

## Features

- **Upload Multiple Images**: Drag and drop or select multiple images at once
- **Secure Storage**: Images are stored locally in a SQLite database
- **Gallery View**: Browse all uploaded images with details
- **Smart Comparison**: Uses perceptual hashing (average hash) to detect similar images
- **Similarity Score**: Get a percentage-based similarity score with visual feedback
- **Responsive Design**: Works on desktop and mobile devices

## Supported Image Formats

- JPG/JPEG
- PNG
- GIF
- BMP
- WebP

## Installation

1. Clone or download this repository
2. Navigate to the project directory:
   ```bash
   cd image-similarity-app
   ```

3. Create a virtual environment (recommended):
   ```bash
   python -m venv venv
   ```

4. Activate the virtual environment:
   - Windows:
     ```bash
     venv\Scripts\activate
     ```
   - macOS/Linux:
     ```bash
     source venv/bin/activate
     ```

5. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

1. Run the Flask application:
   ```bash
   python app.py
   ```

2. Open your web browser and navigate to:
   ```
   http://localhost:5000
   ```

3. **Upload Images**:
   - Go to the Upload page
   - Drag and drop images or click to select files
   - Click "Upload" to store images

4. **View Gallery**:
   - Go to the Gallery page to see all uploaded images
   - Click on an image to view it in full size
   - Delete individual images or clear all images

5. **Compare Images**:
   - Go to the Compare page
   - Select two different images
   - Click "Compare Images" to see the similarity score
   - View side-by-side comparison and detailed results

## How Similarity Works

The application uses **perceptual hashing** to compare images:

1. Each image is converted to a 64-bit hash using the average hash algorithm
2. The hash difference (Hamming distance) is calculated between two images
3. The difference is converted to a similarity percentage (0-100%)

**Similarity Levels:**
- **90-100%**: Very Similar - Images are nearly identical
- **70-89%**: Similar - Images share significant visual elements
- **40-69%**: Somewhat Similar - Some common visual elements
- **0-39%**: Different - Images are quite different

## Project Structure

```
image-similarity-app/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── README.md             # This file
├── static/
│   ├── css/
│   │   └── style.css     # Application styles
│   ├── js/
│   │   ├── upload.js     # Upload page functionality
│   │   ├── gallery.js    # Gallery page functionality
│   │   └── compare.js    # Compare page functionality
│   └── uploads/          # Uploaded images storage
└── templates/
    ├── base.html         # Base template
    ├── index.html        # Upload page
    ├── gallery.html      # Gallery page
    └── compare.html      # Compare page
```

## Database

The application uses SQLite with SQLAlchemy ORM. The database file (`images.db`) is created automatically when you first run the application.

**Image Model:**
- `id`: Unique identifier
- `filename`: Stored filename
- `original_name`: Original filename
- `upload_time`: Timestamp
- `file_size`: File size in bytes
- `image_hash`: Perceptual hash for comparison
- `width`: Image width
- `height`: Image height

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Upload page |
| `/gallery` | GET | Gallery page |
| `/compare` | GET | Compare page |
| `/api/upload` | POST | Upload images |
| `/api/images` | GET | Get all images |
| `/api/image/<id>` | GET | Get single image |
| `/api/delete/<id>` | DELETE | Delete an image |
| `/api/clear-all` | DELETE | Delete all images |
| `/api/compare` | POST | Compare two images |

## Customization

You can modify the following in `app.py`:

- `UPLOAD_FOLDER`: Change the upload directory
- `MAX_CONTENT_LENGTH`: Change maximum file size (default: 16MB)
- Database URI: Change to use PostgreSQL, MySQL, etc.

## License

This project is open source and available under the MIT License.
