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

from deepface import DeepFace

# -------------------- Emotion Detection (DeepFace) --------------------
def detect_emotion_deepface(img_path):
    """Detect emotion using DeepFace library"""
    try:
        print(f"\n🎭 Analyzing with DeepFace: {img_path}")
        
        # DeepFace.analyze returns a list of dicts, one for each face
        # By default, it uses a highly accurate face detector (retinaface)
        analysis = DeepFace.analyze(
            img_path=img_path,
            actions=['emotion'],
            enforce_detection=True, # Ensure a face is detected
            detector_backend='retinaface' # Fast and accurate
        )
        
        if not analysis or not isinstance(analysis, list) or 'dominant_emotion' not in analysis[0]:
            print("⚠️ DeepFace found no dominant emotion")
            return "neutral", 0.0, None

        # Use the first detected face's analysis
        first_face = analysis[0]
        emotion = first_face['dominant_emotion']
        confidence = first_face['emotion'][emotion]
        
        # Deepface provides emotions like: angry, disgust, fear, happy, sad, surprise, neutral
        # No mapping is needed as the names match the app's expectations
        
        all_emotions = {k: float(v) for k, v in first_face['emotion'].items()}
        
        print(f"✅ Detected: {emotion.capitalize()} ({confidence:.1f}%)")
        print(f"   Confidence scores: {all_emotions}")
        
        return emotion, confidence, all_emotions
        
    except ValueError as ve:
        # This exception is often raised by DeepFace if no face is found
        print(f"⚠️ No face detected by DeepFace in {img_path}: {ve}")
        return "neutral", 0.0, None
    except Exception as e:
        print(f"❌ DeepFace analysis error: {e}")
        import traceback
        traceback.print_exc()
        return "neutral", 0.0, None

# -------------------- Jamendo Helpers --------------------
def get_jamendo_tracks(emotion, limit=10):
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
        'client_id': "0ecfada7",
        'format': 'json',
        'limit': limit * 2, # Request more from API to filter later
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
        'client_id': "0ecfada7",
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
        resp = requests.get(image_url, timeout=10, headers={'User-Agent': 'Mozilla.5.0'})
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
        print("🎭 EMOTION DETECTION REQUEST (DeepFace)")
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
        emotion, confidence, all_emotions = detect_emotion_deepface(filepath)
        
        # Get music
        jamendo_tracks = get_jamendo_tracks(emotion, limit=10)

        # Copy temp file to uploads if needed
        if temp_filepath and temp_filepath != filepath:
            dest = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            try:
                shutil.copy(temp_filepath, dest)
                filepath = dest
            except Exception as e:
                print(f"Copy warning: {e}")
        
        image_path = f'uploads/{filename}'
        
        print(f"✅ Result: {emotion.capitalize()} ({confidence:.1f}%)")
        print("="*60 + "\n")

        return jsonify({
            'success': True,
            'emotion': emotion.capitalize(),
            'confidence': float(round(confidence, 2)), # Ensure float type
            'tracks': jamendo_tracks,
            'image_path': image_path,
            'all_emotions': {k: float(v) for k, v in all_emotions.items()} if all_emotions else {},
            'method': 'DeepFace'
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
        tracks = get_jamendo_tracks(new_emotion, limit=10)
        return jsonify({'success': True, 'emotion': new_emotion.capitalize(), 'tracks': tracks})
    except Exception as e:
        print('Change emotion error:', e)
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/jamendo/all-moods', methods=['GET'])
def get_all_mood_songs():
    try:
        emotion_labels = ['angry', 'disgust', 'fear', 'happy', 'sad', 'surprise', 'neutral']
        all_moods_data = {}
        songs_per_mood = 10 
        
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
# Add these routes to your existing Flask app (app.py)

# -------------------- Profile Routes --------------------
@app.route("/profile", methods=["GET"])
def get_profile():
    """Get user profile information"""
    try:
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Unauthorized"}), 401
        
        token = auth_header.split(" ")[1]
        
        # Get user from token
        try:
            user = supabase.auth.get_user(token)
            if not user or not user.user:
                return jsonify({"error": "Invalid token"}), 401
            
            user_id = user.user.id
            
            # Fetch profile from profiles table
            profile_response = supabase.table("profiles").select("*").eq("id", user_id).execute()
            
            if profile_response.data and len(profile_response.data) > 0:
                profile = profile_response.data[0]
                
                # Get listening history count
                history_response = supabase.table("listening_history").select("id", count="exact").eq("user_id", user_id).execute()
                listening_count = history_response.count if history_response.count else 0
                
                # Get favorites count
                favorites_response = supabase.table("favorites").select("id", count="exact").eq("user_id", user_id).execute()
                favorites_count = favorites_response.count if favorites_response.count else 0
                
                return jsonify({
                    "success": True,
                    "profile": {
                        "id": profile.get("id"),
                        "email": profile.get("email"),
                        "username": profile.get("username", "User"),
                        "avatar_url": profile.get("avatar_url"),
                        "bio": profile.get("bio", ""),
                        "created_at": profile.get("created_at"),
                        "listening_count": listening_count,
                        "favorites_count": favorites_count
                    }
                }), 200
            else:
                # Profile doesn't exist, create one
                new_profile = {
                    "id": user_id,
                    "email": user.user.email,
                    "username": user.user.email.split('@')[0]
                }
                supabase.table("profiles").insert(new_profile).execute()
                
                return jsonify({
                    "success": True,
                    "profile": {
                        "id": user_id,
                        "email": user.user.email,
                        "username": user.user.email.split('@')[0],
                        "avatar_url": None,
                        "bio": "",
                        "listening_count": 0,
                        "favorites_count": 0
                    }
                }), 200
                
        except Exception as auth_err:
            return jsonify({"error": f"Authentication error: {str(auth_err)}"}), 401
            
    except Exception as err:
        return jsonify({"error": f"Server error: {str(err)}"}), 500


@app.route("/profile", methods=["PUT"])
def update_profile():
    """Update user profile information"""
    try:
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Unauthorized"}), 401
        
        token = auth_header.split(" ")[1]
        
        # Get user from token
        try:
            user = supabase.auth.get_user(token)
            if not user or not user.user:
                return jsonify({"error": "Invalid token"}), 401
            
            user_id = user.user.id
            data = request.json or {}
            
            # Prepare update data
            update_data = {}
            if "username" in data:
                username = data["username"].strip()
                if len(username) < 3:
                    return jsonify({"error": "Username must be at least 3 characters"}), 400
                update_data["username"] = username
            
            if "bio" in data:
                update_data["bio"] = data["bio"].strip()
            
            if "avatar_url" in data:
                update_data["avatar_url"] = data["avatar_url"].strip()
            
            if not update_data:
                return jsonify({"error": "No valid fields to update"}), 400
            
            # Update profile
            response = supabase.table("profiles").update(update_data).eq("id", user_id).execute()
            
            if response.data:
                return jsonify({
                    "success": True,
                    "message": "Profile updated successfully",
                    "profile": response.data[0]
                }), 200
            else:
                return jsonify({"error": "Failed to update profile"}), 400
                
        except Exception as auth_err:
            return jsonify({"error": f"Authentication error: {str(auth_err)}"}), 401
            
    except Exception as err:
        return jsonify({"error": f"Server error: {str(err)}"}), 500


@app.route("/profile/stats", methods=["GET"])
def get_profile_stats():
    """Get user listening statistics"""
    try:
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Unauthorized"}), 401
        
        token = auth_header.split(" ")[1]
        
        try:
            user = supabase.auth.get_user(token)
            if not user or not user.user:
                return jsonify({"error": "Invalid token"}), 401
            
            user_id = user.user.id
            
            # Get listening history with emotion breakdown
            history_response = supabase.table("listening_history").select("*").eq("user_id", user_id).execute()
            
            emotion_counts = {}
            total_listening_time = 0
            
            if history_response.data:
                for entry in history_response.data:
                    emotion = entry.get("emotion", "neutral")
                    emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
                    total_listening_time += entry.get("duration", 180)  # Default 3 min
            
            # Get top emotions
            top_emotions = sorted(emotion_counts.items(), key=lambda x: x[1], reverse=True)[:3]
            
            return jsonify({
                "success": True,
                "stats": {
                    "total_songs_played": len(history_response.data) if history_response.data else 0,
                    "total_listening_time": total_listening_time,
                    "emotion_breakdown": emotion_counts,
                    "top_emotions": [{"emotion": e[0], "count": e[1]} for e in top_emotions]
                }
            }), 200
            
        except Exception as auth_err:
            return jsonify({"error": f"Authentication error: {str(auth_err)}"}), 401
            
    except Exception as err:
        return jsonify({"error": f"Server error: {str(err)}"}), 500


@app.route("/profile/avatar", methods=["POST"])
def upload_avatar():
    """Upload user avatar image"""
    try:
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Unauthorized"}), 401
        
        token = auth_header.split(" ")[1]
        
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        allowed = {'png', 'jpg', 'jpeg', 'gif'}
        ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
        if ext not in allowed:
            return jsonify({"error": "Invalid file type"}), 400
        
        try:
            user = supabase.auth.get_user(token)
            if not user or not user.user:
                return jsonify({"error": "Invalid token"}), 401
            
            user_id = user.user.id
            
            # Save file locally
            filename = f"avatar_{user_id}_{int.from_bytes(os.urandom(4), 'big')}.{ext}"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            
            avatar_url = f"/static/uploads/{filename}"
            
            # Update profile with avatar URL
            supabase.table("profiles").update({"avatar_url": avatar_url}).eq("id", user_id).execute()
            
            return jsonify({
                "success": True,
                "message": "Avatar uploaded successfully",
                "avatar_url": avatar_url
            }), 200
            
        except Exception as auth_err:
            return jsonify({"error": f"Authentication error: {str(auth_err)}"}), 401
            
    except Exception as err:
        return jsonify({"error": f"Server error: {str(err)}"}), 500
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)