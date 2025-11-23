import requests

url = 'http://127.0.0.1:5000/predict'
files = {'file': ('test.jpg', open('static/uploads/camera_capture.jpg', 'rb'), 'image/jpeg')}
data = {'input_type': 'file'}

try:
    response = requests.post(url, files=files, data=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
