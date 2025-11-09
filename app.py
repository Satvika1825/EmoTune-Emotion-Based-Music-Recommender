import os
from flask import Flask, render_template, request, jsonify
import requests
import cv2
import base64
import tempfile
import shutil
import numpy as np

# Import DeepFace
try:
    from deepface import DeepFace
    print("✅ DeepFace loaded successfully!")
except ImportError as e:
    print(f"❌ DeepFace not available: {e}")
    print("\n📝 INSTALLATION INSTRUCTIONS:")
    print("   1. Make sure you're using Python 3.11 or lower")
    print("   2. Create a virtual environment: py -3.11 -m venv venv")
    print("   3. Activate it: venv\\Scripts\\activate")
    print("   4. Install: pip install tensorflow==2.15.0 deepface==0.0.92")
    raise ImportError("DeepFace is required. Please follow the installation instructions above.")

# -------------------- Flask setup --------------------
app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# -------------------- Emotion Labels --------------------
emotion_labels = ['angry', 'disgust', 'fear', 'happy', 'sad', 'surprise', 'neutral']

# -------------------- API Credentials --------------------
JAMENDO_CLIENT_ID = "0ecfada7"

# -------------------- DeepFace Emotion Mapping --------------------
def map_deepface_emotion(deepface_emotion):
    """Map DeepFace emotions to our emotion labels"""
    emotion_map = {
        'angry': 'angry',
        'disgust': 'disgust',
        'fear': 'fear',
        'happy': 'happy',
        'sad': 'sad',
        'surprise': 'surprise',
        'neutral': 'neutral'
    }
    return emotion_map.get(deepface_emotion.lower(), 'neutral')

# -------------------- Jamendo API --------------------
def get_jamendo_tracks(emotion, limit=5):
    """Fetch songs from Jamendo based on emotion with proper audio URLs"""
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

    print(f"\n🔍 Jamendo: searching for emotion '{emotion}' (tag: {search_term})")
    try:
        response = requests.get(url, params=params, timeout=15)
        print(f"🔍 Jamendo: status {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Jamendo API Error: Status {response.status_code}")
            return []
        
        data = response.json()
        
        if 'error' in data:
            print(f"❌ Jamendo API returned error: {data['error']}")
            return []
        
        results = data.get('results', [])
        print(f"🔍 Jamendo: found {len(results)} tracks")
        
        if not results:
            print("🔄 Jamendo: Trying fallback with popular tracks...")
            params_fallback = {
                'client_id': JAMENDO_CLIENT_ID,
                'format': 'json',
                'limit': limit * 2,
                'audioformat': 'mp32',
                'order': 'popularity_total'
            }
            response = requests.get(url, params=params_fallback, timeout=15)
            if response.status_code == 200:
                data = response.json()
                results = data.get('results', [])
                print(f"✅ Jamendo fallback: {len(results)} tracks")
        
        tracks = []
        for track in results:
            audio_url = track.get('audio', '')
            
            if not audio_url:
                continue
                
            musicinfo = track.get('musicinfo', {})
            tags = musicinfo.get('tags', {})
            genres = tags.get('genres', []) if isinstance(tags, dict) else []
            genre_str = ', '.join(genres[:3]) if genres else 'Various'
            
            track_info = {
                'name': track.get('name', 'Unknown'),
                'artist': track.get('artist_name', 'Unknown Artist'),
                'audio': audio_url,
                'image': track.get('album_image', ''),
                'genre': genre_str,
                'source': 'jamendo'
            }
            tracks.append(track_info)
            print(f"  ✅ Found track: {track_info['name']} by {track_info['artist']}")
            
            if len(tracks) >= limit:
                break
        
        print(f"🔢 Collected {len(tracks)} Jamendo tracks")
        return tracks
    
    except requests.exceptions.Timeout:
        print("❌ Jamendo API request timed out")
        return []
    except Exception as e:
        print(f"❌ Jamendo error: {e}")
        import traceback
        traceback.print_exc()
        return []

# -------------------- Image Processing --------------------
def download_image_from_url(image_url):
    """Download image from URL and save temporarily"""
    try:
        print(f"📥 Downloading image from: {image_url}")
        response = requests.get(image_url, timeout=10, headers={'User-Agent': 'Mozilla/5.0'})
        response.raise_for_status()
        
        # Create temp file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
        temp_file.write(response.content)
        temp_file.close()
        
        print(f"✅ Image downloaded to: {temp_file.name}")
        return temp_file.name
    except Exception as e:
        print(f"❌ Error downloading image: {e}")
        raise ValueError(f"Could not download image from URL: {str(e)}")

def process_base64_image(base64_string):
    """Process base64 image from camera and save temporarily"""
    try:
        # Remove data URL prefix if present
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        # Decode base64
        img_data = base64.b64decode(base64_string)
        
        # Create temp file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
        temp_file.write(img_data)
        temp_file.close()
        
        print(f"✅ Camera image saved to: {temp_file.name}")
        return temp_file.name
    except Exception as e:
        print(f"❌ Error processing camera image: {e}")
        raise ValueError(f"Could not process camera image: {str(e)}")

def enhance_image_for_emotion(img_path):
    """
    Enhanced image preprocessing for better emotion detection
    Especially helps with sad and disgust emotions
    """
    try:
        # Read image
        img = cv2.imread(img_path)
        if img is None:
            return img_path
        
        # Convert to grayscale for face detection
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Detect face
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(50, 50))
        
        if len(faces) > 0:
            # Get the largest face
            (x, y, w, h) = max(faces, key=lambda f: f[2] * f[3])
            
            # Add padding around face for context
            padding = int(0.2 * max(w, h))
            x = max(0, x - padding)
            y = max(0, y - padding)
            w = min(img.shape[1] - x, w + 2 * padding)
            h = min(img.shape[0] - y, h + 2 * padding)
            
            # Crop to face region
            face_img = img[y:y+h, x:x+w]
        else:
            face_img = img
        
        # Apply CLAHE for better contrast (helps with subtle expressions)
        lab = cv2.cvtColor(face_img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        l = clahe.apply(l)
        enhanced = cv2.merge([l, a, b])
        enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)
        
        # Slight sharpening to enhance facial features
        kernel = np.array([[-1,-1,-1],
                          [-1, 9,-1],
                          [-1,-1,-1]])
        sharpened = cv2.filter2D(enhanced, -1, kernel)
        
        # Blend original and sharpened (70% sharpened, 30% enhanced)
        final = cv2.addWeighted(sharpened, 0.7, enhanced, 0.3, 0)
        
        # Save enhanced image
        enhanced_path = img_path.replace('.jpg', '_enhanced.jpg')
        cv2.imwrite(enhanced_path, final)
        
        print(f"✅ Image enhanced and saved to: {enhanced_path}")
        return enhanced_path
        
    except Exception as e:
        print(f"⚠️ Image enhancement failed: {e}")
        return img_path

# -------------------- Enhanced DeepFace Emotion Detection --------------------
def detect_emotion_deepface(img_path):
    """
    Enhanced emotion detection using DeepFace with improved accuracy for sad and disgust
    Returns: (emotion, confidence, all_emotions, enhanced_path)
    """
    
    print("\n" + "="*60)
    print("🔬 ENHANCED DEEPFACE EMOTION DETECTION")
    print("="*60)
    
    try:
        # First, enhance the image
        enhanced_path = enhance_image_for_emotion(img_path)
        
        # Try multiple DeepFace backends for better accuracy
        backends = ['retinaface', 'mtcnn', 'ssd', 'opencv']
        deepface_result = None
        backend_used = None
        
        for backend in backends:
            try:
                print(f"🔍 Trying DeepFace with {backend} backend...")
                result = DeepFace.analyze(
                    enhanced_path, 
                    actions=['emotion'],
                    enforce_detection=False,
                    detector_backend=backend,
                    silent=True
                )
                deepface_result = result
                backend_used = backend
                print(f"✅ Successfully analyzed with {backend}")
                break
            except Exception as e:
                print(f"⚠️ {backend} failed: {str(e)[:50]}")
                continue
        
        if deepface_result is None:
            raise RuntimeError("All DeepFace backends failed to process the image")
        
        # Handle both single result and list of results
        if isinstance(deepface_result, list):
            deepface_result = deepface_result[0]
        
        emotions = deepface_result.get('emotion', {})
        
        if not emotions:
            raise RuntimeError("No emotions detected by DeepFace")
        
        # Enhanced emotion selection logic for sad and disgust
        sorted_emotions = sorted(emotions.items(), key=lambda x: x[1], reverse=True)
        top_emotion = sorted_emotions[0][0]
        top_confidence = sorted_emotions[0][1]
        
        # Special handling for problematic emotions
        if len(sorted_emotions) > 1:
            second_emotion = sorted_emotions[1][0]
            second_confidence = sorted_emotions[1][1]
            
            # If sad or disgust is in top 2 with reasonable confidence, consider it
            confidence_gap = top_confidence - second_confidence
            
            # If confidence gap is small and second emotion is sad/disgust, choose it
            if confidence_gap < 15 and second_emotion.lower() in ['sad', 'disgust']:
                if second_confidence > 15:  # Minimum threshold
                    print(f"🔄 Adjusting: {second_emotion} ({second_confidence:.2f}%) selected over {top_emotion} ({top_confidence:.2f}%)")
                    top_emotion = second_emotion
                    top_confidence = second_confidence
        
        dominant_emotion = top_emotion.lower()
        mapped_emotion = map_deepface_emotion(dominant_emotion)
        confidence = top_confidence
        
        print(f"\n📊 DeepFace All Emotions:")
        for emotion, conf in sorted_emotions:
            marker = "🏆" if emotion.lower() == dominant_emotion else "  "
            print(f"{marker} {emotion}: {conf:.2f}%")
        
        print(f"\n🎯 Final Detected Emotion: {mapped_emotion.upper()} ({confidence:.2f}%)")
        print(f"🔧 Backend Used: {backend_used}")
        print("="*60 + "\n")
        
        return mapped_emotion, confidence, emotions, enhanced_path
        
    except Exception as e:
        print(f"\n❌ DeepFace detection failed: {e}")
        import traceback
        traceback.print_exc()
        print("="*60 + "\n")
        raise

# -------------------- Flask Routes --------------------
@app.route('/')
def home():
    return render_template('index.html', emotion=None, tracks=None, confidence=None)

@app.route('/predict', methods=['POST'])
def predict():
    temp_filepath = None
    enhanced_filepath = None
    
    try:
        # Check input type: file upload, URL, or camera
        input_type = request.form.get('input_type', 'file')
        
        if input_type == 'url':
            # Handle URL input
            image_url = request.form.get('image_url', '').strip()
            if not image_url:
                return render_template('index.html', emotion=None, tracks=None, confidence=None,
                                     error="Please enter an image URL")
            
            temp_filepath = download_image_from_url(image_url)
            filepath = temp_filepath
            filename = "url_image.jpg"
            
        elif input_type == 'camera':
            # Handle camera capture
            image_data = request.form.get('image_data')
            if not image_data:
                return jsonify({'error': 'No camera image data received'}), 400
            
            temp_filepath = process_base64_image(image_data)
            filepath = temp_filepath
            filename = "camera_capture.jpg"
            
        else:
            # Handle file upload
            if 'file' not in request.files:
                return render_template('index.html', emotion=None, tracks=None, confidence=None, 
                                     error="No file uploaded")

            file = request.files['file']
            if file.filename == '':
                return render_template('index.html', emotion=None, tracks=None, confidence=None,
                                     error="No file selected")

            allowed_extensions = {'png', 'jpg', 'jpeg'}
            ext = file.filename.rsplit('.', 1)[-1].lower()
            if ext not in allowed_extensions:
                return render_template('index.html', emotion=None, tracks=None, confidence=None,
                                     error="Invalid file type. Please upload PNG, JPG, or JPEG")

            filename = file.filename
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)

        # Detect emotion using Enhanced DeepFace
        emotion, confidence, all_emotions, enhanced_filepath = detect_emotion_deepface(filepath)
        
        print("\n" + "🎯"*30)
        print(f"✅ FINAL RESULT: {emotion.upper()} (confidence: {confidence:.2f}%)")
        print("🎯"*30 + "\n")

        # Fetch tracks based on detected emotion
        jamendo_tracks = get_jamendo_tracks(emotion, limit=5)
        print(f"\n✅ Retrieved {len(jamendo_tracks)} Jamendo tracks")

        # Save image to static folder for display
        if temp_filepath:
            display_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            shutil.copy(temp_filepath, display_path)
        elif not temp_filepath:
            # File was uploaded directly
            display_path = filepath
        
        image_path = f"uploads/{filename}"
        
        # Prepare emotion info with all emotions for manual selection
        emotion_info = {
            'all_emotions': {k: round(v, 2) for k, v in all_emotions.items()},
            'model_used': 'DeepFace (Enhanced)',
            'detected_emotion': emotion.capitalize()
        }
        
        # Clean up temp files
        if temp_filepath and os.path.exists(temp_filepath):
            try:
                os.unlink(temp_filepath)
            except:
                pass
        if enhanced_filepath and os.path.exists(enhanced_filepath):
            try:
                os.unlink(enhanced_filepath)
            except:
                pass
        
        # Return JSON for camera capture, HTML for others
        if input_type == 'camera':
            return jsonify({
                'success': True,
                'emotion': emotion.capitalize(),
                'confidence': round(confidence, 2),
                'tracks': jamendo_tracks,
                'emotion_info': emotion_info,
                'image_path': image_path
            })
        
        return render_template('index.html',
                             emotion=emotion.capitalize(),
                             tracks=jamendo_tracks,
                             confidence=round(confidence, 2),
                             image_path=image_path,
                             emotion_info=emotion_info)
                             
    except Exception as e:
        import traceback
        print(f"\n❌ ERROR in predict route: {e}")
        traceback.print_exc()
        
        # Clean up temp files on error
        if temp_filepath and os.path.exists(temp_filepath):
            try:
                os.unlink(temp_filepath)
            except:
                pass
        if enhanced_filepath and os.path.exists(enhanced_filepath):
            try:
                os.unlink(enhanced_filepath)
            except:
                pass
        
        if request.form.get('input_type') == 'camera':
            return jsonify({'error': f"Error processing image: {str(e)}"}), 500
        
        return render_template('index.html', emotion=None, tracks=None, confidence=None, 
                             error=f"Error processing image: {str(e)}")

@app.route('/change-emotion', methods=['POST'])
def change_emotion():
    """Allow user to manually change the detected emotion and get new songs"""
    try:
        data = request.get_json()
        new_emotion = data.get('emotion', '').lower()
        
        if new_emotion not in emotion_labels:
            return jsonify({'error': 'Invalid emotion'}), 400
        
        print(f"\n🔄 User changed emotion to: {new_emotion.upper()}")
        
        # Fetch new tracks based on selected emotion
        jamendo_tracks = get_jamendo_tracks(new_emotion, limit=5)
        
        return jsonify({
            'success': True,
            'emotion': new_emotion.capitalize(),
            'tracks': jamendo_tracks
        })
        
    except Exception as e:
        print(f"❌ Error changing emotion: {e}")
        return jsonify({'error': str(e)}), 500

# -------------------- Test Functions --------------------
def test_jamendo():
    """Test Jamendo connection"""
    print("\n" + "="*60)
    print("🧪 TESTING JAMENDO API CONNECTION")
    print("="*60)
    
    url = "https://api.jamendo.com/v3.0/tracks/"
    params = {
        'client_id': JAMENDO_CLIENT_ID,
        'format': 'json',
        'limit': 1,
        'audioformat': 'mp32'
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('results'):
                track = data['results'][0]
                print("✅ JAMENDO API CONNECTION SUCCESSFUL!")
                print(f"   Test track: {track.get('name')} by {track.get('artist_name')}")
                print(f"   Audio URL: {track.get('audio', 'N/A')}")
            else:
                print("⚠️ API responded but returned no tracks")
        else:
            print(f"❌ API CONNECTION FAILED")
            print(f"   Response: {response.text[:200]}")
    except Exception as e:
        print(f"❌ CONNECTION ERROR: {e}")
    
    print("="*60 + "\n")

# -------------------- Run Flask App --------------------
if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    print("\n" + "🎵" * 30)
    print("🎧 EMOTION-BASED MUSIC RECOMMENDER (Enhanced DeepFace)")
    print("   ✅ Improved accuracy for sad and disgust emotions")
    print("   ✅ Manual emotion selection available")
    print("🎵" * 30)
    print(f"\nJamendo Client ID: {JAMENDO_CLIENT_ID}")
    print("📷 Features: File Upload | Camera Capture | URL Input | Manual Override")

    test_jamendo()

    print("🚀 Starting Flask server...")
    print("📍 Open http://localhost:5000 in your browser")
    print("📝 Using Enhanced DeepFace with manual emotion selection\n")

    app.run(debug=True, host='0.0.0.0', port=5000)