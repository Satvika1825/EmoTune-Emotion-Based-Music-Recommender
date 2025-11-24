import cv2
import numpy as np
import os
import requests
import tempfile

# Constants
ONNX_MODEL_PATH = "models/emotion-ferplus-8.onnx"
FER_EMOTIONS = ['neutral', 'happiness', 'surprise', 'sadness', 'anger', 'disgust', 'fear', 'contempt']

def softmax(x):
    e_x = np.exp(x - np.max(x))
    return e_x / e_x.sum()

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

def test_scaling():
    if not os.path.exists(ONNX_MODEL_PATH):
        print(f"Model not found at {ONNX_MODEL_PATH}")
        return

    print("Loading model...")
    net = cv2.dnn.readNetFromONNX(ONNX_MODEL_PATH)
    
    img_path = download_sample_image()
    if not img_path:
        return

    img = cv2.imread(img_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Simple face detection (using hardcoded crop for this specific image to avoid dependency on cascade if possible, 
    # but let's use cascade if available or just center crop)
    # The sample image is a portrait, so center crop might work if cascade fails.
    # Let's try to load cascade too.
    cascade_path = "models/haarcascade_frontalface_default.xml"
    if os.path.exists(cascade_path):
        face_cascade = cv2.CascadeClassifier(cascade_path)
        faces = face_cascade.detectMultiScale(gray, 1.1, 5)
        if len(faces) > 0:
            x, y, w, h = faces[0]
            roi = gray[y:y+h, x:x+w]
        else:
            print("No face detected, using center crop")
            h, w = gray.shape
            roi = gray[h//4:3*h//4, w//4:3*w//4]
    else:
        print("Cascade not found, using center crop")
        h, w = gray.shape
        roi = gray[h//4:3*h//4, w//4:3*w//4]

    roi_resized = cv2.resize(roi, (64, 64))

    # Test Scale 1.0 (Current)
    blob_1 = cv2.dnn.blobFromImage(roi_resized, 1.0, (64, 64), (0, 0, 0), swapRB=False, crop=False)
    net.setInput(blob_1)
    probs_1 = softmax(net.forward()[0])
    pred_1 = FER_EMOTIONS[np.argmax(probs_1)]
    conf_1 = np.max(probs_1)

    # Test Scale 1/255.0 (Normalized)
    blob_2 = cv2.dnn.blobFromImage(roi_resized, 1.0/255.0, (64, 64), (0, 0, 0), swapRB=False, crop=False)
    net.setInput(blob_2)
    probs_2 = softmax(net.forward()[0])
    pred_2 = FER_EMOTIONS[np.argmax(probs_2)]
    conf_2 = np.max(probs_2)

    # Inspect model
    try:
        layers = net.getLayerNames()
        print(f"Model layers: {len(layers)}")
        # Try to get input details if possible (depends on cv2 version)
    except:
        pass

    variations = [
        ("Scale 1.0 (0-255), Gray", 1.0, (0,0,0), True),
        ("Scale 1/255 (0-1), Gray", 1.0/255.0, (0,0,0), True),
        ("Scale 1/127.5, Mean 127.5 ([-1, 1]), Gray", 1.0/127.5, (127.5,127.5,127.5), True),
        # ("Scale 1.0, RGB", 1.0, (0,0,0), False),
        # ("Scale 1/255, RGB", 1.0/255.0, (0,0,0), False),
        # ("Scale 1/127.5, Mean 127.5, RGB", 1.0/127.5, (127.5,127.5,127.5), False),
    ]

    for name, scale, mean, grayscale in variations:
        try:
            if grayscale:
                blob = cv2.dnn.blobFromImage(roi_resized, scale, (64, 64), mean, swapRB=False, crop=False)
            else:
                # Resize color image
                roi_color = cv2.resize(img[y:y+h, x:x+w], (64, 64))
                # Convert BGR to RGB? ONNX usually expects RGB or BGR depending on training.
                # Let's try both if needed, but start with default (BGR in OpenCV).
                # Actually, let's try swapping RB.
                blob = cv2.dnn.blobFromImage(roi_color, scale, (64, 64), mean, swapRB=True, crop=False)
            
            net.setInput(blob)
            scores = net.forward()[0]
            probs = softmax(scores)
            
            top_indices = np.argsort(probs)[::-1][:3]
            print(f"\n--- {name} ---")
            for i in top_indices:
                print(f"{FER_EMOTIONS[i]}: {probs[i]:.4f}")
        except Exception as e:
            print(f"\n--- {name} Error: {e} ---")

    # Cleanup
    try:
        os.unlink(img_path)
    except:
        pass

if __name__ == "__main__":
    test_scaling()
