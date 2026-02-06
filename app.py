from flask import Flask, render_template, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
import os
import imagehash
from PIL import Image
import sqlite3
from datetime import datetime
import json

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['DATABASE'] = 'images.db'

# Ensure upload folder exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'}

# Database helper functions
def get_db():
    """Get database connection"""
    conn = sqlite3.connect(app.config['DATABASE'])
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize database with tables"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            original_name TEXT NOT NULL,
            upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            file_size INTEGER,
            image_hash TEXT,
            width INTEGER,
            height INTEGER
        )
    ''')
    
    conn.commit()
    conn.close()

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def calculate_image_hash(image_path):
    """Calculate perceptual hash for an image"""
    try:
        with Image.open(image_path) as img:
            # Convert to RGB if necessary
            if img.mode != 'RGB':
                img = img.convert('RGB')
            # Calculate average hash
            return str(imagehash.average_hash(img))
    except Exception as e:
        print(f"Error calculating hash: {e}")
        return None

def calculate_hash_difference(hash1, hash2):
    """Calculate hamming distance between two hashes"""
    if not hash1 or not hash2:
        return 64  # Maximum difference
    return imagehash.hex_to_hash(hash1) - imagehash.hex_to_hash(hash2)

def get_image_dimensions(image_path):
    """Get image dimensions"""
    try:
        with Image.open(image_path) as img:
            return img.width, img.height
    except Exception as e:
        print(f"Error getting dimensions: {e}")
        return None, None

def image_to_dict(row):
    """Convert database row to dictionary"""
    return {
        'id': row['id'],
        'filename': row['filename'],
        'original_name': row['original_name'],
        'upload_time': row['upload_time'],
        'file_size': row['file_size'],
        'width': row['width'],
        'height': row['height'],
        'url': f"/static/uploads/{row['filename']}"
    }

# Initialize database on startup
init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/gallery')
def gallery():
    return render_template('gallery.html')

@app.route('/compare')
def compare():
    return render_template('compare.html')

@app.route('/api/upload', methods=['POST'])
def upload_images():
    if 'images' not in request.files:
        return jsonify({'error': 'No files provided'}), 400
    
    files = request.files.getlist('images')
    uploaded_images = []
    errors = []
    
    conn = get_db()
    cursor = conn.cursor()
    
    for file in files:
        if file.filename == '':
            continue
            
        if file and allowed_file(file.filename):
            try:
                # Generate secure filename
                original_name = secure_filename(file.filename)
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
                filename = f"{timestamp}_{original_name}"
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                
                # Save file
                file.save(filepath)
                
                # Get file size
                file_size = os.path.getsize(filepath)
                
                # Get image dimensions
                width, height = get_image_dimensions(filepath)
                
                # Calculate image hash
                img_hash = calculate_image_hash(filepath)
                
                # Save to database
                cursor.execute('''
                    INSERT INTO images (filename, original_name, file_size, image_hash, width, height)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (filename, original_name, file_size, img_hash, width, height))
                
                conn.commit()
                
                # Get the inserted record
                image_id = cursor.lastrowid
                cursor.execute('SELECT * FROM images WHERE id = ?', (image_id,))
                row = cursor.fetchone()
                
                uploaded_images.append(image_to_dict(row))
                
            except Exception as e:
                errors.append(f"Error uploading {file.filename}: {str(e)}")
        else:
            errors.append(f"Invalid file type: {file.filename}")
    
    conn.close()
    
    return jsonify({
        'success': True,
        'uploaded': uploaded_images,
        'errors': errors,
        'count': len(uploaded_images)
    })

@app.route('/api/images', methods=['GET'])
def get_images():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM images ORDER BY upload_time DESC')
    rows = cursor.fetchall()
    
    images = [image_to_dict(row) for row in rows]
    
    conn.close()
    
    return jsonify(images)

@app.route('/api/image/<int:image_id>', methods=['GET'])
def get_image(image_id):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM images WHERE id = ?', (image_id,))
    row = cursor.fetchone()
    
    conn.close()
    
    if row is None:
        return jsonify({'error': 'Image not found'}), 404
    
    return jsonify(image_to_dict(row))

@app.route('/api/delete/<int:image_id>', methods=['DELETE'])
def delete_image(image_id):
    conn = get_db()
    cursor = conn.cursor()
    
    # Get image info
    cursor.execute('SELECT * FROM images WHERE id = ?', (image_id,))
    row = cursor.fetchone()
    
    if row is None:
        conn.close()
        return jsonify({'error': 'Image not found'}), 404
    
    # Delete file from filesystem
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], row['filename'])
    if os.path.exists(filepath):
        os.remove(filepath)
    
    # Delete from database
    cursor.execute('DELETE FROM images WHERE id = ?', (image_id,))
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': 'Image deleted successfully'})

@app.route('/api/compare', methods=['POST'])
def compare_images():
    data = request.get_json()
    image1_id = data.get('image1_id')
    image2_id = data.get('image2_id')
    
    if not image1_id or not image2_id:
        return jsonify({'error': 'Two image IDs are required'}), 400
    
    if image1_id == image2_id:
        return jsonify({'error': 'Please select two different images'}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM images WHERE id = ?', (image1_id,))
    row1 = cursor.fetchone()
    
    cursor.execute('SELECT * FROM images WHERE id = ?', (image2_id,))
    row2 = cursor.fetchone()
    
    conn.close()
    
    if row1 is None or row2 is None:
        return jsonify({'error': 'One or both images not found'}), 404
    
    # Calculate similarity using perceptual hash
    hash_diff = calculate_hash_difference(row1['image_hash'], row2['image_hash'])
    
    # Convert hash difference to similarity percentage
    # Maximum hash difference is 64 bits, so similarity = (64 - diff) / 64 * 100
    max_diff = 64
    # Convert numpy int64 to Python int for JSON serialization
    hash_diff = int(hash_diff)
    similarity_percentage = round(((max_diff - hash_diff) / max_diff) * 100, 2)
    
    # Determine similarity level
    if similarity_percentage >= 90:
        similarity_level = "Very Similar"
        color = "#22c55e"
    elif similarity_percentage >= 70:
        similarity_level = "Similar"
        color = "#84cc16"
    elif similarity_percentage >= 40:
        similarity_level = "Somewhat Similar"
        color = "#eab308"
    else:
        similarity_level = "Different"
        color = "#ef4444"
    
    return jsonify({
        'success': True,
        'image1': image_to_dict(row1),
        'image2': image_to_dict(row2),
        'similarity_percentage': similarity_percentage,
        'similarity_level': similarity_level,
        'color': color,
        'hash_difference': hash_diff
    })

@app.route('/api/clear-all', methods=['DELETE'])
def clear_all_images():
    """Delete all images from database and filesystem"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Get all images
        cursor.execute('SELECT * FROM images')
        rows = cursor.fetchall()
        
        # Delete all files
        for row in rows:
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], row['filename'])
            if os.path.exists(filepath):
                os.remove(filepath)
        
        # Delete all records from database
        cursor.execute('DELETE FROM images')
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'All images cleared successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5500)
