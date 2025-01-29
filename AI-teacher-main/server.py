import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

# Constants
API_VERSION = 'v1beta'
MODEL_NAME = 'gemini-1.5-flash'
API_ENDPOINT = f"https://generativelanguage.googleapis.com/{API_VERSION}/models/{MODEL_NAME}:generateContent"

# Initialize Flask App
app = Flask(__name__)
CORS(app)  # Enable CORS for all origins

# Route to handle image processing
@app.route('/api/process-image', methods=['POST'])
def process_image():
    try:
        # Get image data from request
        data = request.get_json()
        image_data = data.get('image')
        
        if not image_data:
            return jsonify({'message': 'No image data provided'}), 400

        # Extract base64 data from image
        base64_data = image_data.split(',')[1]

        # Prepare the request body for Gemini API
        request_body = {
            "contents": [
                {
                    "parts": [
                        {"text": "Please solve this math problem and provide a step-by-step solution:"},
                        {"inlineData": {"mimeType": "image/jpeg", "data": base64_data}}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.4,
                "topK": 32,
                "topP": 1,
                "maxOutputTokens": 2048,
            }
        }

        # Make a request to Gemini API
        headers = {'Content-Type': 'application/json'}
        response = requests.post(
            f"{API_ENDPOINT}?key={os.getenv('API_KEY')}",
            json=request_body,
            headers=headers
        )

        # Check response status
        if response.status_code != 200:
            error_data = response.json()
            raise Exception(f"API Error: {error_data.get('error', {}).get('message', response.reason)}")

        response_data = response.json()

        # Extract solution from Gemini API response
        if (
            response_data.get('candidates') and 
            response_data['candidates'][0].get('content', {}).get('parts') and 
            response_data['candidates'][0]['content']['parts'][0].get('text')
        ):
            solution = response_data['candidates'][0]['content']['parts'][0]['text']
            return jsonify({'success': True, 'solution': solution})
        else:
            raise Exception('Invalid response format from Gemini API')

    except Exception as e:
        print(f"Server error: {e}")
        return jsonify({'success': False, 'message': 'Error processing image', 'error': str(e)}), 500


# Error handling for unhandled routes
@app.errorhandler(404)
def not_found(error):
    return jsonify({'success': False, 'message': 'Route not found'}), 404

# Error handling for server errors
@app.errorhandler(500)
def internal_error(error):
    return jsonify({'success': False, 'message': 'Something went wrong!', 'error': str(error)}), 500

# Run the Flask app
if __name__ == '__main__':
    port = int(os.getenv('PORT', 3000))
    app.run(host='0.0.0.0', port=port)
