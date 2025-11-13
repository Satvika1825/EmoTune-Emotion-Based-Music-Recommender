import os
import shutil
import tempfile
import base64
from io import BytesIO

from flask import Flask, render_template, request, jsonify
import requests
from flask_cors import CORS
import cv2
import numpy as np

# -------------------- Flask setup --------------------
app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Enable CORS
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:8080", "http://127.0.0.1:8080"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"],
        "supports_credentials": True
    }
})

# Try optional imports
DEEPFACE_AVAILABLE = False
MODEL_AVAILABLE = False
model = None

try:
    from deepface import DeepFace
    DEEPFACE_AVAILABLE = True
    print("✅ DeepFace loaded successfully")
except Exception as e:
    print(f"⚠️ DeepFace not available: {e}")
    DEEPFACE_AVAILABLE = False

# Try to import TensorFlow/Keras model if available and model file exists
try:
    import tensorflow as tf
    from tensorflow.keras.models import load_model
    MODEL_PATH = os.path.join(os.path.dirname(__file__), 'fer2013_vgg16.h5')
    if os.path.exists(MODEL_PATH):
        try:
            model = load_model(MODEL_PATH)
            MODEL_AVAILABLE = True
            print("✅ Keras model loaded from", MODEL_PATH)
        except Exception as e:
            print(f"⚠️ Failed loading Keras model: {e}")
            MODEL_AVAILABLE = False
    else:
        print("ℹ️ No Keras model file found at", MODEL_PATH)
        MODEL_AVAILABLE = False
except Exception as e:
    print(f"⚠️ TensorFlow/Keras not available: {e}")
    MODEL_AVAILABLE = False

# -------------------- Emotion labels --------------------
emotion_labels = ['angry', 'disgust', 'fear', 'happy', 'sad', 'surprise', 'neutral']

# -------------------- API Credentials --------------------
JAMENDO_CLIENT_ID = "0ecfada7"

# -------------------- Jamendo helper --------------------
def get_jamendo_tracks(emotion, limit=5):
    emotion_search_map = {
        "happy": "happy",
        "sad": "sad",
        "angry": "energetic",
        "fear": "calm",
        "surprise": "upbeat",
        "neutral": "relax",
        "disgust": "aggressive"
    }

    search_term = emotion_search_map.get(emotion.lower(), 'pop')
    url = "https://api.jamendo.com/v3.0/tracks/"
    params = {
        'client_id': JAMENDO_CLIENT_ID,
        'format': 'json',
        'limit': limit * 2,
        'tags': search_term,
        'include': 'musicinfo',
        'audioformat': 'mp32',
        'order': 'popularity_week'
    }

    try:
        resp = requests.get(url, params=params, timeout=10)
        if resp.status_code != 200:
            return []
        data = resp.json()
        results = data.get('results', [])
        tracks = []
        for t in results:
            audio = t.get('audio') or ''
            if not audio:
                continue
            musicinfo = t.get('musicinfo', {})
            tags = musicinfo.get('tags', {})
            genres = tags.get('genres', []) if isinstance(tags, dict) else []
            tracks.append({
                'name': t.get('name', 'Unknown'),
                'artist': t.get('artist_name', 'Unknown'),
                'audio': audio,
                'image': t.get('album_image', ''),
                'genre': ', '.join(genres[:3]) if genres else 'Various',
                'source': 'jamendo'
            })
            if len(tracks) >= limit:
                break
        return tracks
    except Exception as e:
        print("Jamendo error:", e)
        return []

# -------------------- Image helpers --------------------
def download_image_from_url(image_url):
    try:
        resp = requests.get(image_url, timeout=10, headers={'User-Agent': 'Mozilla/5.0'})
        resp.raise_for_status()
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
        tmp.write(resp.content)
        tmp.close()
        return tmp.name
    except Exception as e:
        raise ValueError(f"Could not download image: {e}")


def process_base64_image(base64_string):
    if ',' in base64_string:
        base64_string = base64_string.split(',')[1]
    data = base64.b64decode(base64_string)
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
    tmp.write(data)
    tmp.close()
    return tmp.name

# -------------------- Detection methods --------------------
def detect_with_model(img_path):
    """Use Keras model if available"""
    try:
        img = cv2.imread(img_path)
        if img is None:
            raise ValueError('Could not read image')
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img = cv2.resize(img, (96, 96))
        img = img / 255.0
        arr = np.expand_dims(img, 0)
        preds = model.predict(arr, verbose=0)
        idx = int(np.argmax(preds))
        emotion = emotion_labels[idx]
        confidence = float(np.max(preds)) * 100
        return emotion, confidence, {emotion: round(confidence, 2)}
    except Exception as e:
        print('Model detection failed:', e)
        raise


def detect_with_deepface(img_path):
    """Use DeepFace if available"""
    try:
        result = DeepFace.analyze(img_path, actions=['emotion'], enforce_detection=False, detector_backend='opencv')
        if isinstance(result, list):
            result = result[0]
        emotions = result.get('emotion', {})
        if not emotions:
            raise RuntimeError('No emotions returned by DeepFace')
        # Select dominant
        dominant = max(emotions.items(), key=lambda x: x[1])[0]
        mapped = dominant.lower()
        mapped = mapped if mapped in emotion_labels else 'neutral'
        confidence = emotions.get(dominant, 0)
        return mapped, confidence, emotions
    except Exception as e:
        print('DeepFace detection failed:', e)
        raise


def detect_fallback_cv(img_path):
    """Simple fallback: smile detection -> happy, otherwise neutral"""
    try:
        img = cv2.imread(img_path)
        if img is None:
            raise ValueError('Could not read image')
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))
        if len(faces) == 0:
            return 'neutral', 50.0, {}
        # try smile cascade on the first face
        (x, y, w, h) = faces[0]
        roi = gray[y:y+h, x:x+w]
        smile_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_smile.xml')
        smiles = smile_cascade.detectMultiScale(roi, scaleFactor=1.7, minNeighbors=20)
        if len(smiles) > 0:
            return 'happy', 75.0, {'happy': 75.0}
        else:
            return 'neutral', 60.0, {'neutral': 60.0}
    except Exception as e:
        print('Fallback CV failed:', e)
        return 'neutral', 50.0, {}


def detect_emotion(img_path):
    """Unified detection that picks the best available method."""
    # Prefer model, then DeepFace, then fallback
    if MODEL_AVAILABLE and model is not None:
        try:
            return detect_with_model(img_path)
        except Exception:
            pass
    if DEEPFACE_AVAILABLE:
        try:
            return detect_with_deepface(img_path)
        except Exception:
            pass
    return detect_fallback_cv(img_path)

# -------------------- Flask routes --------------------
@app.route('/')
def home():
    return render_template('index.html', emotion=None, tracks=None, confidence=None)


@app.route('/predict', methods=['POST', 'OPTIONS'])
def predict():
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', request.headers.get('Origin', '*'))
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        return response, 200
    
    temp_filepath = None
    try:
        # Determine input type from form data
        input_type = request.form.get('input_type', 'file')
        
        if input_type == 'url':
            image_url = request.form.get('image_url', '').strip()
            if not image_url:
                return jsonify({'error': 'Please provide an image URL'}), 400
            temp_filepath = download_image_from_url(image_url)
            filepath = temp_filepath
            filename = 'url_image.jpg'
        elif input_type == 'camera':
            image_data = request.form.get('image_data')
            if not image_data:
                return jsonify({'error': 'No camera data received'}), 400
            temp_filepath = process_base64_image(image_data)
            filepath = temp_filepath
            filename = 'camera_capture.jpg'
        else:
            # File upload
            if 'file' not in request.files:
                return jsonify({'error': 'No file uploaded'}), 400
            file = request.files['file']
            if file.filename == '':
                return jsonify({'error': 'No file selected'}), 400
            allowed = {'png', 'jpg', 'jpeg'}
            ext = file.filename.rsplit('.', 1)[-1].lower()
            if ext not in allowed:
                return jsonify({'error': 'Invalid file type'}), 400
            filename = file.filename
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)

        emotion, confidence, all_emotions = detect_emotion(filepath)
        jamendo_tracks = get_jamendo_tracks(emotion, limit=5)

        # If temp file exists (from url or camera), copy to uploads for display
        if temp_filepath:
            dest = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            try:
                shutil.copy(temp_filepath, dest)
                image_path = f'uploads/{filename}'
            except Exception:
                image_path = None
        else:
            image_path = f'uploads/{filename}'

        # Always return JSON for API requests
        return jsonify({
            'success': True,
            'emotion': emotion.capitalize(),
            'confidence': round(confidence, 2),
            'tracks': jamendo_tracks,
            'image_path': image_path,
            'all_emotions': all_emotions if all_emotions else None
        })

    except Exception as e:
        print('Predict error:', e)
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e), 'success': False}), 500
    finally:
        if temp_filepath and os.path.exists(temp_filepath):
            try:
                os.unlink(temp_filepath)
            except Exception:
                pass


@app.route('/change-emotion', methods=['POST', 'OPTIONS'])
def change_emotion():
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', request.headers.get('Origin', '*'))
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        return response, 200
    
    try:
        data = request.get_json() or {}
        new_emotion = data.get('emotion', '').lower()
        if new_emotion not in emotion_labels:
            return jsonify({'error': 'Invalid emotion'}), 400
        tracks = get_jamendo_tracks(new_emotion, limit=5)
        return jsonify({'success': True, 'emotion': new_emotion.capitalize(), 'tracks': tracks})
    except Exception as e:
        print('Change emotion error:', e)
        return jsonify({'error': str(e)}), 500


# -------------------- Test helper --------------------
def test_jamendo():
    try:
        t = get_jamendo_tracks('happy', limit=1)
        print('Jamendo test tracks:', len(t))
    except Exception as e:
        print('Jamendo test failed:', e)


if __name__ == '__main__':
    print('\nStarting EmoTune server (robust mode)')
    print('DEEPFACE_AVAILABLE =', DEEPFACE_AVAILABLE)
    print('MODEL_AVAILABLE =', MODEL_AVAILABLE)
    test_jamendo()
    app.run(debug=True, host='0.0.0.0', port=5000)