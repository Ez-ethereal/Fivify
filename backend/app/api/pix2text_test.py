from pix2text import Pix2Text

# Initialize the model
p2t = Pix2Text.from_config()

# Recognize formula from image
img_path = '/Users/ericzhou/eli5y/test_images/regression2.jpg'
result = p2t.recognize_formula(img_path, return_text=False)

# Returns dict: {'text': '...latex...', 'score': 0.98...}
print(f"Result: {result}")
print(f"LaTeX: {result['text']}")
print(f"Confidence: {result['score']:.4f}")