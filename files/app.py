"""
Emotion detection backend using a Hugging Face ViT model.
"""

import base64
import binascii
import io
import logging
import time
import winsound
import threading

import cv2
import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS
from PIL import Image, ImageOps
from transformers import pipeline
from werkzeug.serving import WSGIRequestHandler

app = Flask(__name__)
CORS(app)

WSGIRequestHandler.timeout = 300

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL_NAME = "trpakov/vit-face-expression"
REQUEST_IMAGE_SIZE = (224, 224)
FACE_MARGIN_RATIO = 0.2
NEUTRAL_REBALANCE_FACTOR = 0.72
NEUTRAL_MARGIN_THRESHOLD = 0.18
NEUTRAL_SWAP_THRESHOLD = 0.08

EMOTION_META = {
    "happy": {"emoji": "\U0001F60A", "color": "#FFD700", "label": "Happy"},
    "sad": {"emoji": "\U0001F622", "color": "#2196F3", "label": "Sad"},
    "angry": {"emoji": "\U0001F620", "color": "#F44336", "label": "Angry"},
    "fear": {"emoji": "\U0001F628", "color": "#9C27B0", "label": "Fear"},
    "disgust": {"emoji": "\U0001F922", "color": "#4CAF50", "label": "Disgust"},
    "surprise": {"emoji": "\U0001F632", "color": "#FF9800", "label": "Surprise"},
    "neutral": {"emoji": "\U0001F610", "color": "#9E9E9E", "label": "Neutral"},
}

logger.info("Loading emotion model: %s", MODEL_NAME)
model_load_started = time.time()
emotion_pipeline = pipeline(
    "image-classification",
    model=MODEL_NAME,
    device=-1,
)
logger.info("Emotion model loaded in %.2fs", time.time() - model_load_started)

face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)
eye_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_eye.xml"
)
logger.info("Face and eye detection cascades loaded")

last_beep_time = 0
beep_cooldown = 0.5
last_looking_state = True  # Track previous state to detect changes


def decode_base64_image(b64_string: str) -> Image.Image:
    """Decode a base64 image string into a normalized RGB PIL image."""
    if not b64_string or not isinstance(b64_string, str):
        raise ValueError("Image payload must be a non-empty base64 string")

    if "," in b64_string:
        b64_string = b64_string.split(",", 1)[1]

    try:
        img_bytes = base64.b64decode(b64_string, validate=True)
    except binascii.Error as exc:
        raise ValueError("Invalid base64 image data") from exc

    img = Image.open(io.BytesIO(img_bytes))
    img = ImageOps.exif_transpose(img).convert("RGB")
    return img


def pil_to_cv(img: Image.Image) -> np.ndarray:
    return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)


def detect_faces_with_fallbacks(cv_img: np.ndarray) -> list[tuple[int, int, int, int]]:
    """Run Haar cascade across a few scales to improve small-face detection."""
    gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)

    candidates = []
    for scale in (1.0, 1.35, 1.7):
        resized = gray if scale == 1.0 else cv2.resize(
            gray,
            dsize=None,
            fx=scale,
            fy=scale,
            interpolation=cv2.INTER_CUBIC,
        )
        detected = face_cascade.detectMultiScale(
            resized,
            scaleFactor=1.08,
            minNeighbors=5,
            minSize=(36, 36),
        )
        for x, y, w, h in detected:
            if scale != 1.0:
                x = int(x / scale)
                y = int(y / scale)
                w = int(w / scale)
                h = int(h / scale)
            candidates.append((x, y, w, h))

    unique = []
    seen = set()
    for face in candidates:
        key = tuple(int(v / 4) for v in face)
        if key not in seen:
            seen.add(key)
            unique.append(face)
    return unique


def is_looking_at_camera(cv_img: np.ndarray, face_box: tuple[int, int, int, int]) -> bool:
    """Detect if person is looking at camera using multiple methods."""
    x, y, w, h = face_box
    face_region = cv_img[y:y+h, x:x+w]
    gray_face = cv2.cvtColor(face_region, cv2.COLOR_BGR2GRAY)
    
    # Method 1: Try eye detection with very loose thresholds
    eyes = eye_cascade.detectMultiScale(
        gray_face,
        scaleFactor=1.3,  # More sensitive
        minNeighbors=2,   # Very loose
        minSize=(10, 10), # Tiny minimum
        maxSize=(int(w*0.6), int(h*0.6))
    )
    
    logger.info("Eyes detected: %d", len(eyes))
    
    # Method 2: Check face symmetry (frontal faces are more symmetric)
    # Split face in half left-right
    mid = w // 2
    left_half = gray_face[:, :mid]
    right_half = gray_face[:, mid:]
    
    # Make same size for comparison
    if right_half.shape[1] < left_half.shape[1]:
        left_half = left_half[:, :right_half.shape[1]]
    elif left_half.shape[1] < right_half.shape[1]:
        right_half = right_half[:, :left_half.shape[1]]
    
    # Calculate difference (frontal = lower difference)
    diff = cv2.absdiff(left_half, right_half)
    symmetry_score = np.mean(diff)
    is_frontal = symmetry_score < 25  # Threshold for frontal vs profile
    
    logger.info("Face symmetry score: %.1f (frontal: %s)", symmetry_score, is_frontal)
    
    # Person is looking at camera if:
    # - Eyes detected OR frontal face
    looking = len(eyes) >= 1 or is_frontal
    logger.info("Looking at camera: %s", looking)
    return looking


def play_beep_async():
    """Play beep sound in a separate thread to avoid blocking."""
    try:
        # Play a loud, long beep: frequency 800Hz, duration 800ms
        winsound.Beep(800, 800)
    except Exception as e:
        logger.error("Failed to play beep: %s", e)


def trigger_beep_if_not_looking():
    """Trigger a beep sound if not looking at camera (with cooldown)."""
    global last_beep_time
    current_time = time.time()
    if current_time - last_beep_time >= beep_cooldown:
        last_beep_time = current_time
        logger.warning("BEEP TRIGGERED - Person looking away from camera!")
        beep_thread = threading.Thread(target=play_beep_async, daemon=True)
        beep_thread.start()


def crop_face(cv_img: np.ndarray, face_box: tuple[int, int, int, int]) -> Image.Image:
    x, y, w, h = face_box
    margin = int(max(w, h) * FACE_MARGIN_RATIO)

    left = max(0, x - margin)
    top = max(0, y - margin)
    right = min(cv_img.shape[1], x + w + margin)
    bottom = min(cv_img.shape[0], y + h + margin)

    face_img = cv_img[top:bottom, left:right]
    face_rgb = cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB)
    face_pil = Image.fromarray(face_rgb)
    return ImageOps.fit(face_pil, REQUEST_IMAGE_SIZE, Image.Resampling.LANCZOS)


def preprocess_image(img: Image.Image) -> tuple[Image.Image, int, Image.Image | None]:
    """Detect a face, crop it when possible, and normalize for inference.
    
    Returns: (processed_img, face_count, face_patch)
    - processed_img: image for inference (either face crop or full image at 224x224)
    - face_count: number of faces detected
    - face_patch: the original cropped face for display, or None if no face
    """
    cv_img = pil_to_cv(img)
    faces = detect_faces_with_fallbacks(cv_img)

    if faces:
        largest_face = max(faces, key=lambda f: f[2] * f[3])
        cropped = crop_face(cv_img, largest_face)
        return cropped, len(faces), cropped

    return ImageOps.fit(img, REQUEST_IMAGE_SIZE, Image.Resampling.LANCZOS), 0, None


def rebalance_neutral_scores(raw_results: list[dict]) -> list[dict]:
    """
    Slightly reduce the model's bias toward neutral when another emotion is close.
    This keeps clear neutral faces neutral, but helps borderline cases surface.
    """
    adjusted = [
        {"label": item["label"], "score": float(item["score"])}
        for item in raw_results
    ]
    adjusted.sort(key=lambda item: item["score"], reverse=True)

    if len(adjusted) < 2:
        return adjusted

    top_result = adjusted[0]
    runner_up = adjusted[1]

    if (
        top_result["label"].lower() == "neutral"
        and (top_result["score"] - runner_up["score"]) <= NEUTRAL_MARGIN_THRESHOLD
    ):
        top_result["score"] *= NEUTRAL_REBALANCE_FACTOR
        total = sum(item["score"] for item in adjusted)
        if total > 0:
            for item in adjusted:
                item["score"] /= total
        adjusted.sort(key=lambda item: item["score"], reverse=True)

    if (
        len(adjusted) >= 2
        and adjusted[0]["label"].lower() == "neutral"
        and adjusted[1]["label"].lower() != "neutral"
        and (adjusted[0]["score"] - adjusted[1]["score"]) <= NEUTRAL_SWAP_THRESHOLD
    ):
        adjusted[0]["score"], adjusted[1]["score"] = adjusted[1]["score"], adjusted[0]["score"]
        adjusted[0]["label"], adjusted[1]["label"] = adjusted[1]["label"], adjusted[0]["label"]

    return adjusted


@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json(force=True, silent=True)
    if not data or "image" not in data:
        return jsonify({"error": "No image provided"}), 400

    try:
        img = decode_base64_image(data["image"])
    except Exception as exc:
        logger.error("Failed to decode image: %s", exc)
        return jsonify({"error": f"Failed to decode image: {exc}"}), 400

    try:
        processed_img, face_count, face_patch = preprocess_image(img)
    except Exception as exc:
        logger.exception("Image preprocessing failed")
        return jsonify({"error": f"Image preprocessing failed: {exc}"}), 500

    cv_img = pil_to_cv(img)
    faces = detect_faces_with_fallbacks(cv_img)
    looking_at_camera = False
    
    logger.info("Faces found: %d", len(faces))
    
    if faces:
        largest_face = max(faces, key=lambda f: f[2] * f[3])
        looking_at_camera = is_looking_at_camera(cv_img, largest_face)
        logger.info("Looking at camera: %s", looking_at_camera)
        
        # Only beep when person is looking AWAY (not looking at camera)
        if not looking_at_camera:
            logger.warning("NOT looking at camera - triggering beep")
            trigger_beep_if_not_looking()
        else:
            logger.info("Looking at camera - no beep")
    else:
        logger.warning("No face detected")
        looking_at_camera = False

    # If no face detected, return early without running emotion analysis
    if face_count == 0:
        return jsonify(
            {
                "emotions": [],
                "dominant": None,
                "no_face": True,
                "face_count": 0,
                "inference_ms": 0,
                "model": MODEL_NAME,
                "face_patch": None,
                "looking_at_camera": False,
            }
        )

    try:
        inference_started = time.time()
        raw_results = emotion_pipeline(processed_img, top_k=7)
        raw_results = rebalance_neutral_scores(raw_results)
        inference_ms = round((time.time() - inference_started) * 1000, 1)
        logger.info("Inference completed in %.1fms", inference_ms)
    except Exception as exc:
        logger.exception("Model inference failed")
        return jsonify({"error": f"Model inference failed: {exc}"}), 500

    enriched = []
    for result in raw_results:
        key = result["label"].lower()
        meta = EMOTION_META.get(
            key,
            {"emoji": "?", "color": "#888888", "label": key.capitalize()},
        )
        enriched.append(
            {
                "label": key,
                "display_label": meta["label"],
                "score": round(float(result["score"]), 4),
                "percentage": round(float(result["score"]) * 100, 1),
                "emoji": meta["emoji"],
                "color": meta["color"],
            }
        )

    enriched.sort(key=lambda item: item["score"], reverse=True)
    dominant = enriched[0] if enriched else None
    no_face = face_count == 0

    # Encode face patch as base64 for display
    face_patch_b64 = None
    if face_patch:
        patch_buffer = io.BytesIO()
        face_patch.save(patch_buffer, format='PNG')
        face_patch_b64 = base64.b64encode(patch_buffer.getvalue()).decode('utf-8')

    return jsonify(
        {
            "emotions": enriched,
            "dominant": dominant,
            "no_face": no_face,
            "face_count": face_count,
            "inference_ms": inference_ms,
            "model": MODEL_NAME,
            "face_patch": face_patch_b64,
            "looking_at_camera": looking_at_camera,
        }
    )


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": MODEL_NAME})


if __name__ == "__main__":
    logger.info("Starting Flask server on http://0.0.0.0:5000")
    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)
