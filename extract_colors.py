from PIL import Image
import numpy as np

def get_hex(rgb):
    return '#{:02x}{:02x}{:02x}'.format(rgb[0], rgb[1], rgb[2])

def extract_colors(image_path):
    try:
        img = Image.open(image_path)
        img = img.convert('RGB')
        width, height = img.size
        
        # Sample 5 points vertically along the center
        colors = []
        steps = 5
        for i in range(steps):
            y = int((i + 0.5) * (height / steps))
            x = width // 2
            pixel = img.getpixel((x, y))
            colors.append(get_hex(pixel))
            
        print("Extracted Colors (Top to Bottom):")
        for idx, color in enumerate(colors):
            print(f"{idx + 1}: {color}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    image_path = r"C:/Users/HP/.gemini/antigravity/brain/d02c8e09-b930-4e20-b6d3-0eb9dc98f978/uploaded_image_1764001940836.png"
    extract_colors(image_path)
