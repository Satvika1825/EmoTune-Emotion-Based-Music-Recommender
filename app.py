import os
import shutil
import tempfile
import base64
from io import BytesIO

from flask import Flask, render_template, request, jsonify
from supabase import create_client, Client
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
        "origins": ["http://localhost:8080", "http://127.0.0.1:8080", "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8081", "http://127.0.0.1:8081"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

SUPABASE_URL = "https://bjbyohwqvpamwvnvlnrb.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqYnlvaHdxdnBhbXd2bnZsbnJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMDkxMjksImV4cCI6MjA3ODc4NTEyOX0.6bXWQkmmpdI5NZ7WGgvvKgjf-g0LIdyYgBc_FoZXUE0"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# -------------------- Auth Routes --------------------
@app.route("/register", methods=["POST"])
def register():
    try:
        data = request.json or {}
        email = data.get("email", "").strip()
        password = data.get("password", "").strip()
        confirm_password = data.get("confirmPassword", "").strip()
        username = data.get("username", "").strip()

        if not email:
            return jsonify({"error": "Email required"}), 400
        if not password:
            return jsonify({"error": "Password required"}), 400
        if password != confirm_password:
            return jsonify({"error": "Passwords do not match"}), 400
        if len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400

        try:
            auth_response = supabase.auth.sign_up({
                "email": email,
                "password": password,
                "options": {
                    "data": {
                        "username": username if username else email.split('@')[0]
                    }
                }
            })
            
            if auth_response.user:
                try:
                    profile_data = {
                        "id": auth_response.user.id,
                        "email": auth_response.user.email,
                        "username": username if username else email.split('@')[0]
                    }
                    supabase.table("profiles").insert(profile_data).execute()
                except Exception as profile_err:
                    print(f"Profile creation warning: {profile_err}")
                
                return jsonify({
                    "message": "User registered successfully! Please check your email for verification.",
                    "user": {
                        "id": auth_response.user.id,
                        "email": auth_response.user.email,
                        "username": username if username else email.split('@')[0]
                    },
                    "session": {
                        "access_token": auth_response.session.access_token if auth_response.session else None,
                        "refresh_token": auth_response.session.refresh_token if auth_response.session else None
                    }
                }), 200
            else:
                return jsonify({"error": "Registration failed"}), 400
                
        except Exception as supabase_err:
            error_msg = str(supabase_err)
            if "already registered" in error_msg.lower() or "duplicate" in error_msg.lower():
                return jsonify({"error": "Email already registered"}), 400
            return jsonify({"error": error_msg}), 400
            
    except Exception as err:
        return jsonify({"error": f"Server error: {str(err)}"}), 500

@app.route("/login", methods=["POST"])
def login():
    try:
        data = request.json or {}
        email = data.get("email", "").strip()
        password = data.get("password", "").strip()

        if not email or not password:
            return jsonify({"error": "Email and password required"}), 400

        try:
            auth_response = supabase.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            
            if auth_response.user:
                return jsonify({
                    "message": "Login successful!",
                    "user": {
                        "id": auth_response.user.id,
                        "email": auth_response.user.email
                    },
                    "session": {
                        "access_token": auth_response.session.access_token,
                        "refresh_token": auth_response.session.refresh_token
                    }
                }), 200
            else:
                return jsonify({"error": "Invalid credentials"}), 401
                
        except Exception as supabase_err:
            error_msg = str(supabase_err)
            if "invalid" in error_msg.lower() or "credentials" in error_msg.lower():
                return jsonify({"error": "Invalid email or password"}), 401
            return jsonify({"error": f"Authentication error: {str(supabase_err)}"}), 500
            
    except Exception as err:
        return jsonify({"error": f"Server error: {str(err)}"}), 500

@app.route("/auth/google", methods=["POST"])
def google_auth():
    try:
        data = request.json or {}
        id_token = data.get("id_token", "").strip()
        
        if not id_token:
            return jsonify({"error": "ID token required"}), 400
        
        try:
            auth_response = supabase.auth.sign_in_with_id_token({
                "provider": "google",
                "token": id_token
            })
            
            if auth_response.user:
                return jsonify({
                    "message": "Google login successful!",
                    "user": {
                        "id": auth_response.user.id,
                        "email": auth_response.user.email,
                        "name": auth_response.user.user_metadata.get("full_name", "")
                    },
                    "session": {
                        "access_token": auth_response.session.access_token,
                        "refresh_token": auth_response.session.refresh_token
                    }
                }), 200
            else:
                return jsonify({"error": "Google authentication failed"}), 400
                
        except Exception as supabase_err:
            return jsonify({"error": f"Google auth error: {str(supabase_err)}"}), 500
            
    except Exception as err:
        return jsonify({"error": f"Server error: {str(err)}"}), 500

@app.route("/logout", methods=["POST"])
def logout():
    try:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            supabase.auth.sign_out()
        
        return jsonify({"message": "Logout successful"}), 200
    except Exception as err:
        return jsonify({"error": f"Logout error: {str(err)}"}), 500

# -------------------- ML/AI Setup --------------------
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

emotion_labels = ['angry', 'disgust', 'fear', 'happy', 'sad', 'surprise', 'neutral']
JAMENDO_CLIENT_ID = "0ecfada7"

def detect_emotion(img_path):
    """Detects emotion from an image using DeepFace with MTCNN backend."""
    if not DEEPFACE_AVAILABLE:
        print("⚠️ DeepFace not available, returning neutral.")
        return "neutral", 100.0, None

    try:
        # Using MTCNN for more robust face detection.
        # Also, not enforcing detection to avoid crashes on images with no faces.
        results = DeepFace.analyze(
            img_path=img_path,
            actions=['emotion'],
            detector_backend='mtcnn',
            enforce_detection=False
        )
        
        # DeepFace returns a list of dicts (one for each face). We'll use the first one.
        result = results[0] if isinstance(results, list) else results
        
        emotions = result.get('emotion', {})
        dominant_emotion = result.get('dominant_emotion', 'neutral')
        confidence = emotions.get(dominant_emotion, 0)
        
        return dominant_emotion, confidence, emotions

    except Exception as e:
        print(f"❌ DeepFace analysis failed for {img_path}: {e}")
        return "neutral", 0.0, None

# -------------------- Jamendo Helpers --------------------
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

def get_jamendo_browse_data():
    """Fetch trending/popular tracks from Jamendo for the dashboard"""
    url = "https://api.jamendo.com/v3.0/tracks/"
    params = {
        'client_id': JAMENDO_CLIENT_ID,
        'format': 'json',
        'limit': 10,
        'tags': 'pop+rock+electronic',
        'include': 'musicinfo',
        'audioformat': 'mp32',
        'order': 'popularity_week'
    }
    
    try:
        resp = requests.get(url, params=params, timeout=10)
        if resp.status_code != 200:
            return {'items': []}
            
        data = resp.json()
        results = data.get('results', [])
        formatted_data = []
        
        for item in results:
            formatted_data.append({
                'name': item['name'],
                'artist': item['artist_name'],
                'image': item['album_image'] or '',
                'url': item['shareurl'],
                'audio': item['audio'],
                'type': 'track'
            })
            
        return {'items': formatted_data}
    except Exception as e:
        print(f"Jamendo browse error: {e}")
        return {"error": str(e)}

# -------------------- Image Helpers --------------------
def download_image_from_url(image_url):
    try:
        resp = requests.get(image_url, timeout=10, headers={'User-Agent': 'Mozilla/5.0'})
        resp.raise_for_status()
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
        tmp.write(resp.content)
        tmp.close()
        return tmp.name
    except Exception as e:
        print(f"Error downloading image from {image_url}: {e}")
        return None

def process_base64_image(image_data_str):
    """Decodes a base64 image string and saves to a temporary file."""
    try:
        # Remove header e.g., "data:image/jpeg;base64,"
        image_data = base64.b64decode(image_data_str.split(',')[1])
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
        tmp.write(image_data)
        tmp.close()
        return tmp.name
    except Exception as e:
        print(f"Error processing base64 image: {e}")
        return None

# -------------------- API Routes --------------------
@app.route('/predict', methods=['POST', 'OPTIONS'])
def predict():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', request.headers.get('Origin', '*'))
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        return response, 200
    
    temp_filepath = None
    filepath = None
    try:
        input_type = request.form.get('input_type', 'file')
        
        if input_type == 'url':
            image_url = request.form.get('image_url', '').strip()
            if not image_url:
                return jsonify({'error': 'Please provide an image URL', 'success': False}), 400
            temp_filepath = download_image_from_url(image_url)
            if not temp_filepath:
                return jsonify({'error': 'Failed to download image from URL', 'success': False}), 400
            filepath = temp_filepath
            filename = 'url_image.jpg'
        elif input_type == 'camera':
            image_data = request.form.get('image_data')
            if not image_data:
                return jsonify({'error': 'No camera data received', 'success': False}), 400
            temp_filepath = process_base64_image(image_data)
            if not temp_filepath:
                return jsonify({'error': 'Failed to process camera image', 'success': False}), 400
            filepath = temp_filepath
            filename = 'camera_capture.jpg'
        else: # 'file'
            if 'file' not in request.files:
                return jsonify({'error': 'No file uploaded', 'success': False}), 400
            file = request.files['file']
            if file.filename == '':
                return jsonify({'error': 'No file selected', 'success': False}), 400
            allowed = {'png', 'jpg', 'jpeg'}
            ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
            if ext not in allowed:
                return jsonify({'error': 'Invalid file type. Use png, jpg, or jpeg', 'success': False}), 400
            
            filename = "uploaded_image." + ext
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)

        emotion, confidence, all_emotions = detect_emotion(filepath)
        jamendo_tracks = get_jamendo_tracks(emotion, limit=5)

        # Copy temp file to uploads so it can be served
        if temp_filepath:
            dest = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            try:
                shutil.copy(temp_filepath, dest)
            except Exception as copy_err:
                print(f"Could not copy temp file: {copy_err}")
        
        image_path = f'uploads/{filename}'

        return jsonify({
            'success': True,
            'emotion': emotion.capitalize(),
            'confidence': round(confidence, 2),
            'tracks': jamendo_tracks,
            'image_path': image_path,
            'all_emotions': all_emotions if all_emotions else {}
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
            except Exception as unlink_err:
                print(f"Error removing temp file: {unlink_err}")

@app.route('/change-emotion', methods=['POST', 'OPTIONS'])
def change_emotion():
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
            return jsonify({'error': 'Invalid emotion', 'success': False}), 400
        tracks = get_jamendo_tracks(new_emotion, limit=5)
        return jsonify({'success': True, 'emotion': new_emotion.capitalize(), 'tracks': tracks})
    except Exception as e:
        print('Change emotion error:', e)
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/songs/all', methods=['GET'])
def get_all_songs():
    try:
        tracks = get_jamendo_tracks('happy', limit=10)
        return jsonify({
            'success': True,
            'tracks': tracks
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/jamendo/browse', methods=['GET'])
def jamendo_browse():
    try:
        data = get_jamendo_browse_data()
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

def test_jamendo():
    print("\n🎵 Testing Jamendo API...")
    try:
        t = get_jamendo_tracks('happy', limit=1)
        print(f"✅ Jamendo working - found {len(t)} tracks")
    except Exception as e:
        print(f"❌ Jamendo test failed: {e}")

if __name__ == '__main__':
    print('\n' + '='*60)
    print('🎭 Starting EmoTune Server (Robust Mode)')
    print('='*60)
    print(f'DEEPFACE_AVAILABLE = {DEEPFACE_AVAILABLE}')
    print(f'MODEL_AVAILABLE = {MODEL_AVAILABLE}')
    print('='*60)
    test_jamendo()
    print('='*60)
    print('🚀 Server running on http://0.0.0.0:5000')
    print('='*60 + '\n')
    app.run(debug=True, host='0.0.0.0', port=5000)