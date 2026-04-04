AI-Powered Behavior & Intrusion Detection System
 Problem Statement  

In online exams, workplaces, and secure environments, monitoring user behavior is critical to prevent malpractice, distraction, and unauthorized access. Traditional systems lack real-time intelligence to detect such activities.

---

Objective

To develop an AI-based system that:

* Detects intrusion (multiple persons)
* Identifies unauthorized device usage (mobile phones)
* Monitors user focus and attention
* Analyzes emotional state in real-time

---

 Features

*  Face Detection (Single vs Multiple Person)
*  Mobile Detection (YOLO-based object detection)
*  Emotion Detection (Vision Transformer model)
*  Focus Tracking (Head pose / gaze detection)
*  Real-time Alerts (Beep / warning system)

---

Technologies Used

* Python
* OpenCV
* Deep Learning Models:

   Haar Cascade / MTCNN (Face Detection)
  YOLO (Object Detection)
  ViT (Emotion Detection)
* NumPy

---

 System Architecture

Camera Input
→ Face Detection
→ Emotion Detection
→ Object Detection
→ Behavior Analysis
→ Alert System

---

Setup Instructions                                                                               
1. Clone Repository - git clone https://github.com/iamprc4/ai-focus-detector
2.Navigate to Folder - cd ai-focus-detector                                                                      
3. Install Dependencies - pip install -r requirements.txt                                                      
4. Run Project - python main.py

---

## Run locally
### Backend
```bash
cd "ai-project/files"
py -3.14 -m pip install -r requirements.txt
py -3.14 app.py
```
Server: http://localhost:5000 (downloads ~350 MB model on first run).

### Frontend (React)
```bash
cd "files/reaact"
$env:PORT=3001; npm install
$env:PORT=3001; npm start
```
Open http://localhost:3001.

---

## API
- `POST /predict` with body `{ "image": "<base64-jpeg>" }` → returns `dominant`, `emotions[]`, optional `face_patch`, timing.
- `GET /health` → `{ "status": "ok", "model": "trpakov/vit-face-expression" }`

---

## Model facts
- Model: `trpakov/vit-face-expression`
- Architecture: ViT-Base-Patch16-224
- Classes: happy, sad, angry, fear, disgust, surprise, neutral
- Input: 224x224 RGB

---
# Project Details

## Title:

AI-Powered Behavior & Intrusion Detection System

## Description:

This project integrates multiple AI models to monitor user behavior through a webcam. It detects intrusion, device misuse, emotional state, and attention level in real time.

## Modules:

1. Face Detection – identifies number of people
2. Emotion Detection – analyzes facial expressions
3. Object Detection – detects mobile phones
4. Focus Detection – checks attention level

## Outcome:

A real-time intelligent monitoring system that improves security and user engagement tracking.
---

 Use Cases

* Online Proctoring Systems
* Workplace Monitoring
* Security Surveillance
* Smart Classrooms

---

Limitations

* In low light or poor resolution, face and object detection may not perform optimally
* real-time processing requires good computational resources
* Depends on camera quality

---

 Future Scope

* Cloud-based monitoring dashboard
* Integrating this system with existing platforms like online exam portals or workplace tools can make it more practical and scalable.
* Multi-camera integration
* We can improve accuracy by using more advanced deep learning models and training on larger datasets
* Improved accuracy using custom-trained models

read Backend Framework.txt and Features.txt for Features, Limitations and Future Scope for more info
---

Point of Contact

Name: Pratithi Rani Chawla
Email: [pratithi04rani@gmail.com](mailto:pratithi04rani@gmail.com)
LinkedIn:  [https://www.linkedin.com/in/pratithi-chawla-90521a360/](https://www.linkedin.com/in/pratithi-chawla-90521a360/)

--- 

<img width="760" height="891" alt="image" src="https://github.com/user-attachments/assets/a6db972e-8145-48fe-9438-e10d29e1d1c4" />

---
