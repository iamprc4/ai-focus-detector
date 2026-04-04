import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as faceDetection from '@tensorflow-models/face-detection';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';
import './FaceGuard.css';
import {
  DEFAULT_EMOTIONS,
  normalizeEmotionScores,
  pickDisplayDominant,
  requestEmotionPrediction,
  storeAnalysisResult,
} from '../utils/emotionDetection';

const GADGET_CLASSES = ['cell phone', 'laptop', 'tv', 'mouse', 'keyboard', 'remote'];

const EMOTION_META = {
  happy: { emoji: '\u{1F60A}', label: 'Happy', accent: '#f59e0b' },
  neutral: { emoji: '\u{1F610}', label: 'Neutral', accent: '#94a3b8' },
  surprise: { emoji: '\u{1F632}', label: 'Surprised', accent: '#f97316' },
  fear: { emoji: '\u{1F628}', label: 'Fearful', accent: '#8b5cf6' },
  disgust: { emoji: '\u{1F922}', label: 'Disgusted', accent: '#22c55e' },
  angry: { emoji: '\u{1F620}', label: 'Angry', accent: '#ef4444' },
  sad: { emoji: '\u{1F622}', label: 'Sad', accent: '#3b82f6' },
};

function FaceGuard() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(0);
  const rafRef = useRef(null);
  const audioContextRef = useRef(null);
  const beepIntervalRef = useRef(null);
  const lastObjectsRef = useRef([]);
  const lastEmotionRequestRef = useRef(0);
  const emotionRequestInFlightRef = useRef(false);
  const emotionAbortRef = useRef(null);
  const lastStoredResultRef = useRef({ emotion: null, timestamp: 0, confidence: 0 });
  const lookingAwayFramesRef = useRef(0);
  const lookingCenteredFramesRef = useRef(0);
  const isLookingAwayRef = useRef(false);
  const overlayEmotionLabelRef = useRef(null);

  const [faceDetector, setFaceDetector] = useState(null);
  const [objectDetector, setObjectDetector] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [error, setError] = useState('');
  const [faceCount, setFaceCount] = useState(null);
  const [detectedGadgets, setDetectedGadgets] = useState([]);
  const [isLookingAway, setIsLookingAway] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Start monitoring to scan posture and mood.');
  const [inferenceMs, setInferenceMs] = useState(null);
  const [facePatch, setFacePatch] = useState(null);
  const [dominantEmotion, setDominantEmotion] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [currentEmotion, setCurrentEmotion] = useState('!');
  const [noFaceDetected, setNoFaceDetected] = useState(false);
  const [emotions, setEmotions] = useState(DEFAULT_EMOTIONS);

  useEffect(() => {
    isLookingAwayRef.current = isLookingAway;
  }, [isLookingAway]);

  useEffect(() => {
    overlayEmotionLabelRef.current = dominantEmotion
      ? (EMOTION_META[dominantEmotion]?.label || dominantEmotion).toLowerCase()
      : null;
  }, [dominantEmotion]);

  useEffect(() => {
    let mounted = true;

    const initDetectors = async () => {
      try {
        await tf.ready();
        await tf.setBackend('webgl').catch(async () => {
          await tf.setBackend('cpu');
        });

        const faceModel = faceDetection.SupportedModels.MediaPipeFaceDetector;
        const faceConfig = { runtime: 'tfjs', maxFaces: 10 };
        const faceDetectorInstance = await faceDetection.createDetector(faceModel, faceConfig);
        const objectDetectorInstance = await cocoSsd.load();

        if (!mounted) return;
        setFaceDetector(faceDetectorInstance);
        setObjectDetector(objectDetectorInstance);
      } catch (err) {
        if (mounted) {
          setError('Failed to load models. Please refresh and allow camera access.');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initDetectors();
    return () => {
      mounted = false;
    };
  }, []);

  const playBeep = useCallback(async () => {
    // Beep disabled
    return;
  }, []);

  const startBeep = useCallback(() => {
    return;
  }, []);

  const stopBeep = useCallback(() => {
    if (beepIntervalRef.current) {
      window.clearInterval(beepIntervalRef.current);
      beepIntervalRef.current = null;
    }
  }, []);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (emotionAbortRef.current) {
      emotionAbortRef.current.abort();
      emotionAbortRef.current = null;
    }
    emotionRequestInFlightRef.current = false;
    stopBeep();
  }, [stopBeep]);

  const checkLookingAway = (face) => {
    if (!face?.keypoints || face.keypoints.length === 0) {
      console.log('No keypoints found');
      return true;
    }
    
    const rightEye = face.keypoints.find((kp) => kp.name === 'rightEye');
    const leftEye = face.keypoints.find((kp) => kp.name === 'leftEye');
    const noseTip = face.keypoints.find((kp) => kp.name === 'noseTip');
    
    if (!rightEye || !leftEye || !noseTip) {
      console.log('Missing keypoints - right:', !!rightEye, 'left:', !!leftEye, 'nose:', !!noseTip);
      return true;
    }

    const eyeMidX = (rightEye.x + leftEye.x) / 2;
    const eyeDistance = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);
    
    if (eyeDistance < 1) return true;

    const { yMin, width, height } = face.box || {};
    if (!width || !height) return true;

    const horizontalOffsetRatio = Math.abs(noseTip.x - eyeMidX) / eyeDistance;
    const noseHeightRatio = (noseTip.y - yMin) / height;

    const lookingSideways = horizontalOffsetRatio > 0.28;      // head turned
    const lookingUp = noseHeightRatio < 0.32;                  // head tilted up
    const lookingDown = noseHeightRatio > 0.70;                // head tilted down

    return lookingSideways || lookingUp || lookingDown;
  };

  const drawOverlay = (faces, objects, emotionLabel) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    faces.forEach((face) => {
      const { xMin, yMin, width: w, height: h } = face.box;
      ctx.strokeRect(xMin, yMin, w, h);

      if (emotionLabel) {
        const labelX = xMin;
        const labelY = yMin > 28 ? yMin - 10 : yMin + 24;
        ctx.font = 'bold 14px sans-serif';
        const textWidth = ctx.measureText(emotionLabel).width;
        ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
        ctx.fillRect(labelX - 4, labelY - 16, textWidth + 10, 22);
        ctx.fillStyle = '#ef4444';
        ctx.fillText(emotionLabel, labelX + 1, labelY);
      }
    });

    ctx.strokeStyle = '#ef4444';
    ctx.fillStyle = '#ef4444';
    ctx.setLineDash([6, 6]);
    objects.forEach((obj) => {
      const [x, y, w, h] = obj.bbox;
      ctx.strokeRect(x, y, w, h);
      ctx.font = '12px sans-serif';
      ctx.fillText(obj.class, x, y > 12 ? y - 5 : y + 14);
    });
    ctx.setLineDash([]);
  };

  const captureCurrentFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }

    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9);
  }, []);

  const resetEmotionState = useCallback((message) => {
    setFacePatch(null);
    setDominantEmotion(null);
    setConfidence(0);
    setCurrentEmotion('!');
    setNoFaceDetected(true);
    setEmotions(DEFAULT_EMOTIONS);
    setInferenceMs(null);
    setStatusMessage(message);
  }, []);

  const runEmotionCheck = useCallback(async () => {
    const frame = captureCurrentFrame();
    if (!frame) return;

    if (emotionAbortRef.current) {
      emotionAbortRef.current.abort();
    }

    const controller = new AbortController();
    emotionAbortRef.current = controller;
    emotionRequestInFlightRef.current = true;
    const timeoutId = window.setTimeout(() => controller.abort(), 20000);

    try {
      const data = await requestEmotionPrediction(frame, controller.signal);
      setEmotions(normalizeEmotionScores(data.emotions || []));
      setInferenceMs(data.inference_ms ?? null);
      setFacePatch(data.face_patch ?? null);

      if (data.dominant) {
        const displayDominant = pickDisplayDominant(data.emotions, data.dominant, EMOTION_META);
        const dominant = displayDominant.label;
        setDominantEmotion(dominant);
        setCurrentEmotion(displayDominant.emoji || EMOTION_META[dominant]?.emoji || '?');
        setConfidence(displayDominant.percentage || 0);
        setNoFaceDetected(Boolean(data.no_face));
        setStatusMessage(
          data.no_face
            ? 'Mood estimate used the full frame. Keep your face centered for a cleaner patch.'
            : `Mood check: ${displayDominant.display_label || dominant} at ${displayDominant.percentage}% confidence.`
        );
        storeAnalysisResult({
          emotion: dominant,
          score: displayDominant.percentage || 0,
          sourceMode: 'live',
          emotionMeta: EMOTION_META,
          lastStoredRef: lastStoredResultRef,
        });
      } else {
        resetEmotionState('No clear face found for emotion analysis.');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setStatusMessage('Could not reach the emotion backend on port 5000.');
      }
    } finally {
      window.clearTimeout(timeoutId);
      if (emotionAbortRef.current === controller) {
        emotionAbortRef.current = null;
      }
      emotionRequestInFlightRef.current = false;
    }
  }, [captureCurrentFrame, resetEmotionState]);

  const startMonitoring = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatusMessage('Monitoring live posture, gadgets, and mood.');
      setIsMonitoring(true);
    } catch (err) {
      setError('Camera access denied or unavailable.');
      setIsMonitoring(false);
    }
  };

  useEffect(() => {
    if (!isMonitoring || !faceDetector || !objectDetector) return undefined;
    let cancelled = false;

    const detect = async () => {
      if (cancelled || !videoRef.current || videoRef.current.readyState !== 4) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      const faces = await faceDetector.estimateFaces(videoRef.current);
      setFaceCount(faces.length);

      let rawLookingAway = false;
      
      if (faces.length === 1) {
        rawLookingAway = checkLookingAway(faces[0]);
      } else {
        lookingAwayFramesRef.current = 0;
        lookingCenteredFramesRef.current = 0;
      }

      let lookingAway = isLookingAwayRef.current;
      if (faces.length === 1) {
        if (rawLookingAway) {
          lookingAwayFramesRef.current += 1;
          lookingCenteredFramesRef.current = 0;
        } else {
          lookingCenteredFramesRef.current += 1;
          lookingAwayFramesRef.current = 0;
        }

        // IMMEDIATE: Beep as soon as looking away (2 frames debounce)
        if (lookingAwayFramesRef.current >= 2) {
          lookingAway = true;
        } else if (lookingCenteredFramesRef.current >= 3) {
          lookingAway = false;
        }
      } else {
        lookingAway = false;
      }

      setIsLookingAway(lookingAway);

      frameRef.current += 1;
      if (frameRef.current % 6 === 0) {
        const objects = await objectDetector.detect(videoRef.current);
        lastObjectsRef.current = objects.filter((obj) => GADGET_CLASSES.includes(obj.class));
      }

      const gadgetNames = [...new Set(lastObjectsRef.current.map((obj) => obj.class))];
      setDetectedGadgets(gadgetNames);
      drawOverlay(faces, lastObjectsRef.current, overlayEmotionLabelRef.current);

      const now = Date.now();
      if (
        faces.length === 1 &&
        !emotionRequestInFlightRef.current &&
        now - lastEmotionRequestRef.current >= 1400
      ) {
        lastEmotionRequestRef.current = now;
        runEmotionCheck();
      } else if (faces.length === 0) {
        resetEmotionState('No face visible. Mood analysis pauses until one face is centered.');
      } else if (faces.length > 1) {
        resetEmotionState(`${faces.length} faces detected. Mood analysis waits for exactly one face.`);
      }

      const shouldBeep =
        faces.length === 0 || faces.length > 1 || gadgetNames.length > 0 || lookingAway;

      if (shouldBeep) {
        startBeep();
      } else {
        stopBeep();
      }

      isLookingAwayRef.current = shouldBeep;

      rafRef.current = requestAnimationFrame(detect);
    };

    rafRef.current = requestAnimationFrame(detect);
    return () => {
      cancelled = true;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      stopBeep();
    };
  }, [isMonitoring, faceDetector, objectDetector, resetEmotionState, runEmotionCheck, startBeep, stopBeep]);

  useEffect(() => () => stopMonitoring(), [stopMonitoring]);

  const statusTone =
    faceCount === 1 && detectedGadgets.length === 0 && !isLookingAway ? 'ok' : 'error';
  const dominantMeta = dominantEmotion ? EMOTION_META[dominantEmotion] : null;
  const rankedEmotions = useMemo(
    () => Object.entries(emotions).sort((a, b) => b[1] - a[1]),
    [emotions]
  );

  return (
    <main className="guard-page">
      <div className="container">
        <section className="guard-card">
          <div className="guard-head">
            <div>
              <p className="guard-kicker">Proctoring</p>
              <h1>Face Guard Beep Monitor</h1>
              <p>Alerts on no face, multiple faces, looking away, or restricted gadgets.</p>
            </div>
            <div className={`guard-pill ${statusTone}`}>
              {faceCount === null ? 'Idle' : faceCount === 1 && !isLookingAway ? 'Focused' : 'Warning'}
            </div>
          </div>

          <div className="guard-stage">
            <video ref={videoRef} className="guard-video" autoPlay playsInline muted />
            <canvas ref={canvasRef} className="guard-canvas" />
            {!isMonitoring && (
              <div className="guard-overlay">
                {isLoading ? (
                  <div>Loading AI models...</div>
                ) : (
                  <button
                    className="guard-btn start"
                    onClick={startMonitoring}
                    disabled={Boolean(error) || !faceDetector || !objectDetector}
                  >
                    Start Monitoring
                  </button>
                )}
                {error && <div className="guard-error">{error}</div>}
              </div>
            )}
          </div>

          <div className="guard-actions">
            <button className="guard-btn stop" onClick={stopMonitoring} disabled={!isMonitoring}>
              Stop Monitoring
            </button>
          </div>

          <div className="guard-status-strip">
            <span>{statusMessage}</span>
            <span>{inferenceMs ? `Inference ${Math.round(inferenceMs)} ms` : 'Inference --'}</span>
          </div>

          <div className="guard-analysis">
            <div className="guard-analysis-card">
              <div className="guard-analysis-head">
                <div>
                  <p className="guard-kicker">Mood Detection</p>
                  <h2>Face patch and result</h2>
                </div>
                <div
                  className="guard-score-pill"
                  style={{ '--accent': dominantMeta?.accent || '#64748b' }}
                >
                  {confidence.toFixed(1)}%
                </div>
              </div>

              {dominantMeta ? (
                <div className="guard-emotion-display">
                  <div className="guard-emotion-copy">
                    <span className="guard-emotion-emoji">{currentEmotion}</span>
                    <div>
                      <p className="guard-emotion-name">{dominantMeta.label}</p>
                      <p className="guard-emotion-sub">
                        {noFaceDetected
                          ? 'Detected from the full frame without a reliable crop.'
                          : 'Live mood result from the same backend used in Generator.'}
                      </p>
                    </div>
                  </div>
                  {facePatch && (
                    <div className="guard-face-patch-wrap">
                      <img
                        src={`data:image/png;base64,${facePatch}`}
                        alt="Detected face patch"
                        className="guard-face-patch"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="guard-empty-analysis">
                  Keep exactly one face in frame to draw the face marker and emotion label live on the video.
                </div>
              )}
            </div>

            <div className="guard-analysis-card">
              <div className="guard-analysis-head">
                <div>
                  <p className="guard-kicker">Confidence Spread</p>
                  <h2>Emotion scores</h2>
                </div>
              </div>
              <div className="guard-live-bars">
                {rankedEmotions.map(([emotion, value]) => (
                  <div key={emotion} className="guard-live-bar">
                    <span className="guard-bar-name">{EMOTION_META[emotion]?.label || emotion}</span>
                    <div className="guard-bar-track">
                      <div
                        className="guard-bar-value"
                        style={{
                          width: `${value}%`,
                          background: `linear-gradient(90deg, ${EMOTION_META[emotion]?.accent || '#64748b'}, #22c55e)`,
                        }}
                      />
                    </div>
                    <span className="guard-bar-number">{value.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="guard-grid">
            <div className={`guard-item ${faceCount === 1 ? 'ok' : 'warn'}`}>
              <h3>Face Count</h3>
              <p>
                {faceCount === null
                  ? 'Waiting...'
                  : faceCount === 0
                    ? 'No face detected'
                    : faceCount === 1
                      ? 'Exactly 1 face detected'
                      : `${faceCount} faces detected`}
              </p>
            </div>
            <div className={`guard-item ${isLookingAway ? 'warn' : 'ok'}`}>
              <h3>Focus</h3>
              <p>{faceCount === 1 ? (isLookingAway ? 'Focus Lost ⚠️' : 'Looking into camera ✓') : 'N/A'}</p>
            </div>
            <div className={`guard-item ${detectedGadgets.length ? 'warn' : 'ok'}`}>
              <h3>Restricted Gadgets</h3>
              <p>{detectedGadgets.length ? detectedGadgets.join(', ') : 'None detected'}</p>
            </div>
          </div>
        </section>
      </div>
      <canvas ref={captureCanvasRef} style={{ display: 'none' }} />
    </main>
  );
}

export default FaceGuard;
