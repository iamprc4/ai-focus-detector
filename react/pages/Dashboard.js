import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './Dashboard.css';
import {
  DEFAULT_EMOTIONS,
  normalizeEmotionScores,
  pickDisplayDominant,
  requestEmotionPrediction,
  storeAnalysisResult,
  subscribeToEmotionHistory,
} from '../utils/emotionDetection';

const EMOTION_META = {
  happy: { emoji: '\u{1F60A}', color: '#fbbf24', label: 'Happy' },
  neutral: { emoji: '\u{1F610}', color: '#94a3b8', label: 'Neutral' },
  surprise: { emoji: '\u{1F632}', color: '#fb923c', label: 'Surprised' },
  fear: { emoji: '\u{1F628}', color: '#a855f7', label: 'Fearful' },
  disgust: { emoji: '\u{1F922}', color: '#22c55e', label: 'Disgusted' },
  angry: { emoji: '\u{1F620}', color: '#ef4444', label: 'Angry' },
  sad: { emoji: '\u{1F622}', color: '#3b82f6', label: 'Sad' },
};

function formatRelativeTime(timestamp) {
  if (!timestamp) return 'No activity yet';
  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

function Dashboard({ username }) {
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Start the live mood feed to update this dashboard in real time.');
  const [dominantEmotion, setDominantEmotion] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [facePatch, setFacePatch] = useState(null);
  const [inferenceMs, setInferenceMs] = useState(null);
  const [noFaceDetected, setNoFaceDetected] = useState(false);
  const [emotions, setEmotions] = useState(DEFAULT_EMOTIONS);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const requestInFlightRef = useRef(false);
  const abortControllerRef = useRef(null);
  const lastStoredResultRef = useRef({ emotion: null, timestamp: 0, confidence: 0 });

  const loadHistory = useCallback((historyFromEvent) => {
    if (Array.isArray(historyFromEvent)) {
      setAnalysisHistory(historyFromEvent);
      return;
    }

    const storedHistory = localStorage.getItem('emotionHistory');
    if (!storedHistory) {
      setAnalysisHistory([]);
      return;
    }

    try {
      const parsed = JSON.parse(storedHistory);
      setAnalysisHistory(Array.isArray(parsed) ? parsed : []);
    } catch (err) {
      console.error('Error loading history:', err);
      setAnalysisHistory([]);
    }
  }, []);

  useEffect(() => {
    loadHistory();
    window.addEventListener('storage', loadHistory);
    window.addEventListener('focus', loadHistory);
    const unsubscribe = subscribeToEmotionHistory(loadHistory);

    return () => {
      window.removeEventListener('storage', loadHistory);
      window.removeEventListener('focus', loadHistory);
      unsubscribe();
    };
  }, [loadHistory]);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    requestInFlightRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startMonitoring = useCallback(async () => {
    try {
      stopMonitoring();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatusMessage('Camera ready. Live dashboard detection is running.');
      setIsMonitoring(true);
    } catch (err) {
      setStatusMessage('Unable to access the camera. Please allow permission and try again.');
    }
  }, [stopMonitoring]);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }

    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9);
  }, []);

  const runDetection = useCallback(async () => {
    const frame = captureFrame();
    if (!frame || requestInFlightRef.current) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    requestInFlightRef.current = true;
    const timeoutId = window.setTimeout(() => controller.abort(), 20000);

    try {
      const data = await requestEmotionPrediction(frame, controller.signal);
      setEmotions(normalizeEmotionScores(data.emotions || []));
      setFacePatch(data.face_patch ?? null);
      setInferenceMs(data.inference_ms ?? null);

      if (data.dominant) {
        const displayDominant = pickDisplayDominant(data.emotions, data.dominant, EMOTION_META);
        const dominant = displayDominant.label;
        setDominantEmotion(dominant);
        setConfidence(displayDominant.percentage || 0);
        setNoFaceDetected(Boolean(data.no_face));
        setStatusMessage(
          data.no_face
            ? 'Dashboard made a mood guess from the full frame. Center your face for a better crop.'
            : `Live mood: ${displayDominant.display_label || dominant} at ${displayDominant.percentage}% confidence.`
        );
        storeAnalysisResult({
          emotion: dominant,
          score: displayDominant.percentage || 0,
          sourceMode: 'live',
          emotionMeta: EMOTION_META,
          lastStoredRef: lastStoredResultRef,
        });
      } else {
        setDominantEmotion(null);
        setConfidence(0);
        setNoFaceDetected(true);
        setStatusMessage('No clear face found. Stay centered in the frame.');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setStatusMessage('Could not reach the emotion backend. Start the Flask server on port 5000.');
      }
    } finally {
      window.clearTimeout(timeoutId);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      requestInFlightRef.current = false;
    }
  }, [captureFrame]);

  useEffect(() => () => stopMonitoring(), [stopMonitoring]);

  useEffect(() => {
    if (!isMonitoring) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return undefined;
    }

    runDetection();
    intervalRef.current = window.setInterval(runDetection, 1800);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isMonitoring, runDetection]);

  const analytics = useMemo(() => {
    const counts = Object.keys(EMOTION_META).reduce((acc, key) => ({ ...acc, [key]: 0 }), {});

    analysisHistory.forEach((record) => {
      const key = record.emotion?.toLowerCase();
      if (key in counts) {
        counts[key] += 1;
      }
    });

    const total = analysisHistory.length;
    const ranked = Object.entries(counts)
      .map(([emotion, count]) => ({
        emotion,
        count,
        percentage: total ? Number(((count / total) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const top = ranked.find((item) => item.count > 0) || ranked[0];
    const latest = analysisHistory[0] || null;
    const thisWeek = analysisHistory.filter((record) => {
      if (!record.timestamp) return false;
      return Date.now() - record.timestamp <= 7 * 24 * 60 * 60 * 1000;
    }).length;

    const liveCount = analysisHistory.filter((record) => record.sourceMode === 'live').length;

    return {
      ranked,
      total,
      latest,
      thisWeek,
      liveCount,
      top,
    };
  }, [analysisHistory]);

  const topMeta = analytics.top ? EMOTION_META[analytics.top.emotion] : null;
  const liveMeta = dominantEmotion ? EMOTION_META[dominantEmotion] : null;
  const rankedLiveEmotions = useMemo(
    () => Object.entries(emotions).sort((a, b) => b[1] - a[1]),
    [emotions]
  );

  return (
    <main className="dashboard">
      <div className="container">
        <section className="dashboard-hero">
          <div className="hero-copy">
            <p className="hero-kicker">Live Session Analytics</p>
            <h1>{username}&apos;s emotion dashboard</h1>
            <p>
              This view now reflects your actual stored detections instead of placeholder values. Every new
              analysis updates the distribution, recent activity, and mood summary here.
            </p>
          </div>

          <div className="hero-spotlight">
            <div className="spotlight-label">Current dominant trend</div>
            <div className="spotlight-main">
              <span className="spotlight-emoji">{topMeta?.emoji || '\u{1F4CA}'}</span>
              <div>
                <div className="spotlight-title">{topMeta?.label || 'No data yet'}</div>
                <div className="spotlight-sub">
                  {analytics.total
                    ? `${analytics.top.percentage}% of saved detections`
                    : 'Run a few detections to populate your dashboard'}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="dashboard-live panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Live Mood Detection</p>
              <h2>Current face reading</h2>
            </div>
            <div className="panel-chip">{isMonitoring ? 'Camera on' : 'Camera off'}</div>
          </div>

          <div className="dashboard-live-grid">
            <div className="dashboard-live-stage">
              <div className="dashboard-video-shell">
                <video ref={videoRef} autoPlay playsInline muted className="dashboard-video-feed" />
                {!isMonitoring && (
                  <div className="dashboard-video-overlay">
                    <button className="dashboard-live-btn" onClick={startMonitoring}>
                      Start Live Detection
                    </button>
                  </div>
                )}
              </div>
              <div className="dashboard-live-actions">
                <button className="dashboard-live-btn" onClick={startMonitoring}>
                  Restart Camera
                </button>
                <button className="dashboard-live-btn ghost" onClick={stopMonitoring}>
                  Stop Camera
                </button>
              </div>
              <div className="dashboard-live-status">
                <span>{statusMessage}</span>
                <span>{inferenceMs ? `Inference ${Math.round(inferenceMs)} ms` : 'Inference --'}</span>
              </div>
            </div>

            <div className="dashboard-live-summary">
              <div className="dashboard-live-card">
                <div className="dashboard-live-card-head">
                  <div>
                    <p className="panel-kicker">Detected Mood</p>
                    <h3>Result</h3>
                  </div>
                  <div className="panel-chip">{confidence.toFixed(1)}%</div>
                </div>

                {liveMeta ? (
                  <div className="dashboard-live-result">
                    <div className="dashboard-live-meta">
                      <span className="dashboard-live-emoji">{liveMeta.emoji}</span>
                      <div>
                        <div className="dashboard-live-title">{liveMeta.label}</div>
                        <div className="dashboard-live-copy">
                          {noFaceDetected
                            ? 'Predicted from the full frame without a stable crop.'
                            : 'Live face mood from the same backend used across the app.'}
                        </div>
                      </div>
                    </div>
                    {facePatch && (
                      <img
                        src={`data:image/png;base64,${facePatch}`}
                        alt="Dashboard face patch"
                        className="dashboard-face-patch"
                      />
                    )}
                  </div>
                ) : (
                  <div className="empty-state">Start the camera and keep one face centered to populate this card.</div>
                )}
              </div>

              <div className="dashboard-live-card">
                <div className="dashboard-live-card-head">
                  <div>
                    <p className="panel-kicker">Confidence Spread</p>
                    <h3>Emotion scores</h3>
                  </div>
                </div>
                <div className="dashboard-live-bars">
                  {rankedLiveEmotions.map(([emotion, value]) => {
                    const meta = EMOTION_META[emotion];
                    return (
                      <div key={emotion} className="dashboard-live-bar">
                        <span className="dashboard-live-bar-label">{meta.label}</span>
                        <div className="dashboard-live-bar-track">
                          <div
                            className="dashboard-live-bar-fill"
                            style={{ width: `${value}%`, background: meta.color }}
                          />
                        </div>
                        <span className="dashboard-live-bar-value">{value.toFixed(1)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-eyebrow">Most Common</div>
            <div className="stat-value">{topMeta?.label || 'No data'}</div>
            <div className="stat-meta">{topMeta?.emoji || '\u{1F4A1}'} Top recurring mood</div>
          </div>

          <div className="stat-card">
            <div className="stat-eyebrow">Total Analyses</div>
            <div className="stat-value">{analytics.total}</div>
            <div className="stat-meta">Saved emotion checks</div>
          </div>

          <div className="stat-card">
            <div className="stat-eyebrow">Last 7 Days</div>
            <div className="stat-value">{analytics.thisWeek}</div>
            <div className="stat-meta">Recent detections this week</div>
          </div>

          <div className="stat-card">
            <div className="stat-eyebrow">Last Analysis</div>
            <div className="stat-value">{formatRelativeTime(analytics.latest?.timestamp)}</div>
            <div className="stat-meta">{analytics.latest?.emotion || 'No detections yet'}</div>
          </div>
        </section>

        <section className="dashboard-main">
          <div className="panel distribution-panel">
            <div className="panel-header">
              <div>
                <p className="panel-kicker">Distribution</p>
                <h2>Real emotion breakdown</h2>
              </div>
              <div className="panel-chip">{analytics.total} samples</div>
            </div>

            <div className="distribution-list">
              {analytics.ranked.map((item) => {
                const meta = EMOTION_META[item.emotion];
                return (
                  <div key={item.emotion} className="emotion-row">
                    <div className="emotion-row-label">
                      <span className="emotion-dot" style={{ backgroundColor: meta.color }} />
                      <span>{meta.emoji} {meta.label}</span>
                    </div>
                    <div className="emotion-row-track">
                      <div
                        className="emotion-row-fill"
                        style={{ width: `${item.percentage}%`, background: meta.color }}
                      />
                    </div>
                    <div className="emotion-row-value">{item.percentage}%</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="panel insights-panel">
            <div className="panel-header">
              <div>
                <p className="panel-kicker">Session Insights</p>
                <h2>Quick read</h2>
              </div>
            </div>

            <div className="insight-stack">
              <div className="insight-card">
                <div className="insight-title">Storage source</div>
                <div className="insight-value">{analytics.liveCount} live entries</div>
                <div className="insight-copy">Live detections are now throttled before they are saved.</div>
              </div>

              <div className="insight-card">
                <div className="insight-title">Latest mood</div>
                <div className="insight-value">
                  {analytics.latest ? `${analytics.latest.emoji} ${analytics.latest.emotion}` : 'No data'}
                </div>
                <div className="insight-copy">
                  {analytics.latest
                    ? `${analytics.latest.confidence}% confidence`
                    : 'Run detection from the generator page to start tracking.'}
                </div>
              </div>

              <div className="insight-card accent">
                <div className="insight-title">Best demo tip</div>
                <div className="insight-copy">
                  Use the live section above or the generator page for cleaner, more stable emotion history.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="panel history-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">History</p>
              <h2>Recent analyses</h2>
            </div>
            <div className="panel-chip">{analysisHistory.length ? 'Live data' : 'Empty'}</div>
          </div>

          {analysisHistory.length ? (
            <div className="history-list">
              {analysisHistory.map((record) => {
                const key = record.emotion?.toLowerCase();
                const meta = EMOTION_META[key] || { color: '#94a3b8', emoji: record.emoji || '?' };
                return (
                  <div key={record.id} className="history-item">
                    <div className="history-badge" style={{ backgroundColor: `${meta.color}22`, color: meta.color }}>
                      {record.emoji} {record.emotion}
                    </div>
                    <div className="history-confidence">
                      <span className="history-confidence-bar">
                        <span
                          className="history-confidence-fill"
                          style={{ width: `${record.confidence}%`, backgroundColor: meta.color }}
                        />
                      </span>
                      <span>{record.confidence}%</span>
                    </div>
                    <div className="history-time">{record.date}</div>
                    <div className="history-source">{record.sourceMode || 'capture'}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              No saved detections yet. Open the generator page, run a few checks, and this dashboard will fill in automatically.
            </div>
          )}
        </section>
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </main>
  );
}

export default Dashboard;
