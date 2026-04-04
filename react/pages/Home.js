import React from 'react';
import './Home.css';

function Home() {
  const quotes = [
    "Emotions make us human. Every feeling is valid.",
    "Understanding emotions is the key to better communication.",
    "AI meets psychology to unveil human feelings.",
    "Your emotions matter. Let's understand them together.",
  ];

  return (
    <main>
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">AI-Powered Behavior & Intrusion Detection System</h1>
            <p className="hero-subtitle">
              FocusDetector uses live vision models to spot faces, flag distractions, and surface emotions in real time.
            </p>
            <div className="hero-buttons">
              <a href="/generator" className="btn btn-primary">Get Started</a>
              <a href="#how-it-works" className="btn btn-secondary">Learn More</a>
            </div>
          </div>
          <div className="hero-visual">
            <div className="emoji-display">😊</div>
          </div>
        </div>
      </section>

      {/* Quotes Section */}
      <section className="quotes-section">
        <div className="container">
          <h2>Why Emotions Matter</h2>
          <div className="quotes-grid">
            {quotes.map((quote, idx) => (
              <div key={idx} className="quote-card">
                <p>"{quote}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="how-it-works">
        <div className="container">
          <h2>How It Works</h2>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3>Upload Photo</h3>
              <p>Select a clear facial image from your device or capture one in real-time using your camera.</p>
            </div>

            <div className="step-card">
              <div className="step-number">2</div>
              <h3>AI Analysis</h3>
              <p>Our Vision Transformer model analyzes the image and identifies 7 different emotions instantly.</p>
            </div>

            <div className="step-card">
              <div className="step-number">3</div>
              <h3>Get Results</h3>
              <p>See detailed emotion breakdown with confidence scores and visual representations.</p>
            </div>

            <div className="step-card">
              <div className="step-number">4</div>
              <h3>Track History</h3>
              <p>Access your dashboard to view historical analysis and emotion trends over time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <h2>Powerful Features</h2>
          <div className="features-grid">
            <div className="feature-item">
              <span className="feature-icon">⚡</span>
              <h3>Real-Time Detection</h3>
              <p>Instant emotion analysis with live camera feed support</p>
            </div>

            <div className="feature-item">
              <span className="feature-icon">🎯</span>
              <h3>High Accuracy</h3>
              <p>ViT-Base model trained on diverse facial expressions</p>
            </div>

            <div className="feature-item">
              <span className="feature-icon">📊</span>
              <h3>Detailed Analytics</h3>
              <p>See confidence scores for all 7 emotion categories</p>
            </div>

            <div className="feature-item">
              <span className="feature-icon">🔒</span>
              <h3>Privacy First</h3>
              <p>Your images are processed securely and never stored</p>
            </div>

            <div className="feature-item">
              <span className="feature-icon">🎨</span>
              <h3>Beautiful UI</h3>
              <p>Modern, responsive design for all device sizes</p>
            </div>

            <div className="feature-item">
              <span className="feature-icon">🌙</span>
              <h3>Dark Mode</h3>
              <p>Easy on the eyes with complete dark theme support</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <p>&copy; 2026 FOCUSDETECTOR. All rights reserved.</p>
            <div className="footer-links">
              <a href="#about">About</a>
              <a href="#privacy">Privacy Policy</a>
              <a href="#terms">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

export default Home;
