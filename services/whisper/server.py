#!/usr/bin/env python3
import os
import tempfile
from flask import Flask, request, jsonify
from faster_whisper import WhisperModel

app = Flask(__name__)

# Initialize model
MODEL_SIZE = os.getenv('WHISPER_MODEL', 'small')
print(f"Loading Whisper model: {MODEL_SIZE}")
model = WhisperModel(MODEL_SIZE, device='cpu', compute_type='int8')
print("Model loaded successfully!")

@app.route('/', methods=['GET'])
def health():
    return jsonify({"status": "ok"})

@app.route('/inference', methods=['POST'])
def transcribe():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file"}), 400

        file = request.files['file']

        with tempfile.NamedTemporaryFile(delete=False, suffix='.ogg') as tmp:
            file.save(tmp.name)
            tmp_path = tmp.name

        try:
            segments, _ = model.transcribe(tmp_path, language='ru', beam_size=5)
            text = ' '.join([s.text for s in segments]).strip()
            return jsonify({"text": text})
        finally:
            os.unlink(tmp_path)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)
