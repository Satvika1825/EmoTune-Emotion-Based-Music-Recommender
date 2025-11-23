import os
import requests
import tempfile
import cv2
import numpy as np

# URLs
ONNX_MODEL_URL = "https://github.com/spmallick/learnopencv/raw/master/Facial-Emotion-Recognition/emotion-ferplus-8.onnx"
HAAR_CASCADE_URL = "https://raw.githubusercontent.com/opencv/opencv/master/data/haarcascades/haarcascade_frontalface_default.xml"

def download_file(url, filename):
    if os.path.exists(filename):
        print(f"File {filename} already exists.")
        return filename
    print(f"Downloading {filename}...")
    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        with open(filename, 'wb') as f:
            f.write(resp.content)
        print("Download complete.")
        return filename
    except Exception as e:
        print(f"Failed to download {filename}: {e}")
        return None

def download_sample_image():
    url = "https://img.freepik.com/free-photo/portrait-white-man-isolated_53876-40306.jpg" # Happy face
    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
        tmp.write(resp.content)
        tmp.close()
        return tmp.name
    except Exception as e:
        print(f"Failed to download image: {e}")
        return None

def softmax(x):
    e_x = np.exp(x - np.max(x))
    return e_x / e_x.sum()

def test_opencv_onnx(img_path):
    print("\n--- Testing OpenCV + ONNX ---")
    
    # Download models
    model_path = download_file(ONNX_MODEL_URL, "emotion-ferplus-8.onnx")
    cascade_path = download_file(HAAR_CASCADE_URL, "haarcascade_frontalface_default.xml")
    
    if not model_path or not cascade_path:
        print("Failed to download models.")
        return

    # Load models
    try:
        face_cascade = cv2.CascadeClassifier(cascade_path)
        net = cv2.dnn.readNetFromONNX(model_path)
    except Exception as e:
        print(f"Error loading models: {e}")
        return

    # Load image
    img = cv2.imread(img_path)
    if img is None:
        print("Failed to load image.")
        return
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(30, 30))
    
    print(f"Found {len(faces)} faces.")
    
    emotion_labels = ['neutral', 'happiness', 'surprise', 'sadness', 'anger', 'disgust', 'fear', 'contempt']
    
    for (x, y, w, h) in faces:
        roi_gray = gray[y:y+h, x:x+w]
        roi_resized = cv2.resize(roi_gray, (64, 64))
        
        # Preprocess for FER+
        blob = cv2.dnn.blobFromImage(roi_resized, 1.0, (64, 64), (0, 0, 0), swapRB=False, crop=False)
        
        net.setInput(blob)
        scores = net.forward()[0]
        probs = softmax(scores)
        
        # Get top emotion
        pred_idx = np.argmax(probs)
        emotion = emotion_labels[pred_idx]
        confidence = probs[pred_idx]
        
        print(f"Face at {x},{y}: {emotion} ({confidence:.2f})")
        print(f"Scores: {dict(zip(emotion_labels, probs))}")

if __name__ == "__main__":
    print("Downloading sample image...")
    img_path = download_sample_image()
    
    if img_path:
        print(f"Image saved to {img_path}")
        test_opencv_onnx(img_path)
        
        # Cleanup
        try:
            os.unlink(img_path)
        except:
            pass
    else:
        print("Could not proceed without image.")
