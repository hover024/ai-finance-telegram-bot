#!/usr/bin/env python3

import sys
import json
from faster_whisper import WhisperModel

def transcribe(audio_path):
    try:
        model = WhisperModel("small", device="cpu", compute_type="int8")
        segments, info = model.transcribe(audio_path, language="ru")
        text = " ".join([segment.text for segment in segments])

        result = {
            "success": True,
            "text": text.strip(),
            "language": info.language,
            "duration": info.duration
        }

        print(json.dumps(result, ensure_ascii=False))

    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(error_result, ensure_ascii=False))
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python transcribe.py <audio_file_path>"
        }))
        sys.exit(1)

    transcribe(sys.argv[1])
