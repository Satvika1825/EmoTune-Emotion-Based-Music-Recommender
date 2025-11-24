from deepface import DeepFace
import cv2
import os
import requests
import tempfile

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

def test_deepface():
    img_path = download_sample_image()
    if not img_path:
        return

    print(f"Testing DeepFace on {img_path}...")
    try:
        objs = DeepFace.analyze(img_path, actions=['emotion'], enforce_detection=False)
        print("DeepFace Result:")
        print(objs)
    except Exception as e:
        print(f"DeepFace error: {e}")
    
    try:
        os.unlink(img_path)
    except:
        pass

if __name__ == "__main__":
    test_deepface()
