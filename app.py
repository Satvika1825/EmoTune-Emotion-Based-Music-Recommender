import os
import shutil
import tempfile
import base64
import requests
import cv2
import numpy as np
from flask import Flask, request, jsonify
from supabase import create_client, Client
from flask_cors import CORS

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

# -------------------- ONNX Emotion Detection Setup --------------------
ONNX_MODEL_URL = "https://github.com/spmallick/learnopencv/raw/master/Facial-Emotion-Recognition/emotion-ferplus-8.onnx"
HAAR_CASCADE_URL = "https://raw.githubusercontent.com/opencv/opencv/master/data/haarcascades/haarcascade_frontalface_default.xml"

MODEL_DIR = "models"
os.makedirs(MODEL_DIR, exist_ok=True)

ONNX_MODEL_PATH = os.path.join(MODEL_DIR, "emotion-ferplus-8.onnx")
CASCADE_PATH = os.path.join(MODEL_DIR, "haarcascade_frontalface_default.xml")

# FER+ emotion labels (8 emotions)
FER_EMOTIONS = ['neutral', 'happiness', 'surprise', 'sadness', 'anger', 'disgust', 'fear', 'contempt']

# Map FER+ emotions to your app's 7 emotions
EMOTION_MAPPING = {
    'neutral': 'neutral',
    'happiness': 'happy',
    'surprise': 'surprise',
    'sadness': 'sad',
    'anger': 'angry',
    'disgust': 'disgust',
    'fear': 'fear',
    'contempt': 'angry'  # Map contempt to angry
}

JAMENDO_CLIENT_ID = "0ecfada7"

# Global model variables
face_cascade = None
emotion_net = None
MODEL_LOADED = False

def download_model_file(url, filepath):
    """Download model file if not exists"""
    if os.path.exists(filepath):
        print(f"✅ Model exists: {filepath}")
        return True
    
    print(f"📥 Downloading: {os.path.basename(filepath)}...")
    try:
        resp = requests.get(url, timeout=60)
        resp.raise_for_status()
        with open(filepath, 'wb') as f:
            f.write(resp.content)
        print(f"✅ Downloaded: {os.path.basename(filepath)}")
        return True
    except Exception as e:
        print(f"❌ Download failed: {e}")
        return False

def load_models():
    """Load face detection and emotion recognition models"""
    global face_cascade, emotion_net, MODEL_LOADED
    
    if MODEL_LOADED:
        return True
    
    print("\n" + "="*60)
    print("📦 Loading Emotion Detection Models")
    print("="*60)
    
    # Download models if needed
    if not download_model_file(HAAR_CASCADE_URL, CASCADE_PATH):
        return False
    if not download_model_file(ONNX_MODEL_URL, ONNX_MODEL_PATH):
        return False
    
    # Load models
    try:
        face_cascade = cv2.CascadeClassifier(CASCADE_PATH)
        if face_cascade.empty():
            print("❌ Failed to load Haar Cascade")
            return False
        print("✅ Haar Cascade loaded")
        
        emotion_net = cv2.dnn.readNetFromONNX(ONNX_MODEL_PATH)
        print("✅ ONNX Emotion model loaded")
        
        MODEL_LOADED = True
        print("="*60 + "\n")
        return True
        
    except Exception as e:
        print(f"❌ Model loading error: {e}")
        return False

def softmax(x):
    """Compute softmax values for scores"""
    e_x = np.exp(x - np.max(x))
    return e_x / e_x.sum()

def detect_emotion_onnx(img_path):
    """Detect emotion using ONNX model"""
    if not MODEL_LOADED:
        if not load_models():
            print("❌ Models not loaded")
            return "neutral", 0.0, None
    
    try:
        print(f"\n🎭 Analyzing: {img_path}")
        
        # Load image
        img = cv2.imread(img_path)
        if img is None:
            print("❌ Could not read image")
            return "neutral", 0.0, None
        
        print(f"   Image size: {img.shape[1]}x{img.shape[0]}")
        
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Detect faces
        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30)
        )
        
        print(f"   Detected {len(faces)} face(s)")
        
        if len(faces) == 0:
            # Try with more lenient settings
            print("   Retrying with lenient settings...")
            faces = face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.05,
                minNeighbors=3,
                minSize=(20, 20)
            )
            print(f"   Detected {len(faces)} face(s) on retry")
        
        if len(faces) == 0:
            print("⚠️ No faces detected")
            return "neutral", 0.0, None
        
        # Use the largest face
        face = max(faces, key=lambda rect: rect[2] * rect[3])
        x, y, w, h = face
        
        print(f"   Analyzing face at ({x},{y}) size {w}x{h}")
        
        # Extract and preprocess face ROI
        roi_gray = gray[y:y+h, x:x+w]
        roi_resized = cv2.resize(roi_gray, (64, 64))
        
        # Create blob for ONNX model
        blob = cv2.dnn.blobFromImage(
            roi_resized,
            scalefactor=1.0,
            size=(64, 64),
            mean=(0, 0, 0),
            swapRB=False,
            crop=False
        )
        
        # Run inference
        emotion_net.setInput(blob)
        scores = emotion_net.forward()[0]
        probs = softmax(scores)
        
        # Get emotion
        pred_idx = np.argmax(probs)
        fer_emotion = FER_EMOTIONS[pred_idx]
        confidence = float(probs[pred_idx] * 100)
        
        # Map to app's emotion labels
        mapped_emotion = EMOTION_MAPPING.get(fer_emotion, fer_emotion)
        
        # Create all_emotions dict with mapped labels
        all_emotions = {}
        for i, fer_label in enumerate(FER_EMOTIONS):
            mapped_label = EMOTION_MAPPING.get(fer_label, fer_label)
            prob = float(probs[i] * 100)
            if mapped_label in all_emotions:
                all_emotions[mapped_label] += prob
            else:
                all_emotions[mapped_label] = prob
        
        print(f"✅ Detected: {mapped_emotion} ({confidence:.1f}%)")
        print(f"   Raw scores: {dict(zip(FER_EMOTIONS, [f'{p*100:.1f}%' for p in probs]))}")
        
        return mapped_emotion, confidence, all_emotions
        
    except Exception as e:
        print(f"❌ Detection error: {e}")
        import traceback
        traceback.print_exc()
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
        if ',' in image_data_str:
            image_data = base64.b64decode(image_data_str.split(',')[1])
        else:
            image_data = base64.b64decode(image_data_str)
            
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
        print("\n" + "="*60)
        print("🎭 EMOTION DETECTION REQUEST (ONNX)")
        print("="*60)
        
        input_type = request.form.get('input_type', 'file')
        
        # Handle different input types
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
            
        else:  # file upload
            if 'file' not in request.files:
                return jsonify({'error': 'No file uploaded', 'success': False}), 400
            file = request.files['file']
            if file.filename == '':
                return jsonify({'error': 'No file selected', 'success': False}), 400
            
            allowed = {'png', 'jpg', 'jpeg'}
            ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
            if ext not in allowed:
                return jsonify({'error': 'Invalid file type. Use png, jpg, or jpeg', 'success': False}), 400
            
            filename = f"upload_{int.from_bytes(os.urandom(4), 'big')}.{ext}"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)

        # Verify file
        if not os.path.exists(filepath):
            return jsonify({'error': 'File processing failed', 'success': False}), 400
        
        print(f"📸 File: {os.path.getsize(filepath)} bytes")
        
        # Detect emotion using ONNX
        emotion, confidence, all_emotions = detect_emotion_onnx(filepath)
        
        # Get music
        jamendo_tracks = get_jamendo_tracks(emotion, limit=5)

        # Copy temp file to uploads if needed
        if temp_filepath and temp_filepath != filepath:
            dest = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            try:
                shutil.copy(temp_filepath, dest)
                filepath = dest
            except Exception as e:
                print(f"Copy warning: {e}")
        
        image_path = f'uploads/{filename}'
        
        print(f"✅ Result: {emotion} ({confidence:.1f}%)")
        print("="*60 + "\n")

        return jsonify({
            'success': True,
            'emotion': emotion.capitalize(),
            'confidence': round(confidence, 2),
            'tracks': jamendo_tracks,
            'image_path': image_path,
            'all_emotions': all_emotions if all_emotions else {},
            'method': 'ONNX-FER+'
        })

    except Exception as e:
        print(f'\n❌ ERROR: {e}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e), 'success': False}), 500
        
    finally:
        if temp_filepath and os.path.exists(temp_filepath) and temp_filepath != filepath:
            try:
                os.unlink(temp_filepath)
            except:
                pass

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
        emotion_labels = ['angry', 'disgust', 'fear', 'happy', 'sad', 'surprise', 'neutral']
        if new_emotion not in emotion_labels:
            return jsonify({'error': 'Invalid emotion', 'success': False}), 400
        tracks = get_jamendo_tracks(new_emotion, limit=5)
        return jsonify({'success': True, 'emotion': new_emotion.capitalize(), 'tracks': tracks})
    except Exception as e:
        print('Change emotion error:', e)
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/jamendo/all-moods', methods=['GET'])
def get_all_mood_songs():
    try:
        emotion_labels = ['angry', 'disgust', 'fear', 'happy', 'sad', 'surprise', 'neutral']
        all_moods_data = {}
        songs_per_mood = 6 
        
        for emotion in emotion_labels:
            tracks = get_jamendo_tracks(emotion, limit=songs_per_mood)
            all_moods_data[emotion] = tracks
            
        return jsonify({
            'success': True,
            'data': all_moods_data
        })
    except Exception as e:
        print(f"Error fetching all moods: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    print('\n' + '='*60)
    print('🎭 EmoTune Server - ONNX Edition')
    print('='*60)
    
    # Pre-load models
    load_models()
    
    print('='*60)
    print('🚀 Server: http://0.0.0.0:5000')
    print('='*60 + '\n')
    
    app.run(debug=True, host='0.0.0.0', port=5000)