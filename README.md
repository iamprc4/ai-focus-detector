# AI-Powered Behavior & Intrusion Detection System - EmoSense — Live Facial Emotion Detection
### ViT (Vision Transformer) · Trpakov Model · HuggingFace

---

## Architecture

```
Browser (index.html)
  │  webcam frame (base64 JPEG, every 400ms)
  ▼
Flask Backend (app.py)
  │  trpakov/vit-face-expression via HuggingFace pipeline
  ▼
Returns JSON: { emotions: [...], dominant: {...} }
```

---

## Quick Start

### 1. Install dependencies
```bash
pip install flask flask-cors transformers torch torchvision Pillow
```

### 2. Run the backend
```bash
python app.py
```
The model (~350MB) will download automatically on first run.  
Server starts at **http://localhost:5000**

### 3. Open the frontend
Open `index.html` in your browser (or serve it with any static server).

> Tip: If you get CORS issues, use:
> ```bash
> python -m http.server 8080
> ```
> Then visit `http://localhost:8080`

### 4. Connect
- In the dashboard, the backend URL defaults to `http://localhost:5000`
- Click **Test Connection** to verify
- Click **▶ Start Detection** to begin live analysis

---

## Model Details

| Property     | Value                                               |
| ------------ | --------------------------------------------------- |
| Model        | `trpakov/vit-face-expression`                       |
| Architecture | Vision Transformer (ViT-Base-Patch16-224)           |
| Task         | Image Classification (7 emotions)                   |
| Input        | 224×224 RGB image patches (16×16 patches)           |
| Emotions     | Happy, Sad, Angry, Fear, Disgust, Surprise, Neutral |
| HuggingFace  | https://huggingface.co/trpakov/vit-face-expression  |

---

## API

### POST `/predict`
**Request:**
```json
{ "image": "<base64 jpeg string>" }
```
**Response:**
```json
{
  "dominant": { "label": "happy", "percentage": 94.2, "emoji": "😊", "color": "#FFD700" },
  "emotions": [
    { "label": "happy", "percentage": 94.2, "score": 0.942, "emoji": "😊", "color": "#FFD700" },
    { "label": "neutral", "percentage": 3.1, ... },
    ...
  ]
}
```

### GET `/health`
Returns `{ "status": "ok", "model": "trpakov/vit-face-expression" }`

---

## GPU Acceleration (optional)
In `app.py`, change `device=-1` to `device=0` to use CUDA.

---

## Project Structure
```
emotion_backend/
├── app.py          ← Flask backend + ViT model
├── index.html      ← Live dashboard frontend
├── requirements.txt
└── README.md
```

