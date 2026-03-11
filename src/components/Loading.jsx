import React, { useState, useEffect } from 'react';

const Loading = () => {
  // Changed the default state so "LOADING..." is the very first thing they see
  const [loadingText, setLoadingText] = useState('LOADING...');
  
  // Mixed explicit UX terms with the vampire theme
  const phrases = [
    "LOADING...", 
    "FETCHING DARK DATA...", 
    "AWAKENING SERVER...",
    "PLEASE WAIT...",
    "LOADING BLOODLINES..."
  ];

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % phrases.length;
      setLoadingText(phrases[index]);
    }, 3000);
    return () => clearInterval(interval);
  }, [phrases.length]);

  const advancedStyles = `
    .dracula-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 50px 20px 30px 20px;
      margin: 20px auto;
      background: linear-gradient(to bottom, #0a0101 0%, #2a0505 60%, #000000 100%);
      border: 1px solid #1f0000;
      border-radius: 8px;
      box-shadow: inset 0 0 50px rgba(0, 0, 0, 0.9), 0 0 20px rgba(100, 0, 0, 0.2);
      position: relative;
      min-height: 280px;
      width: 100%;
      max-width: 450px;
      overflow: hidden;
    }

    /* --- BLOOD MOON --- */
    .blood-moon {
      position: absolute;
      top: 60px; 
      left: 12%; 
      width: 110px;
      height: 110px;
      background: radial-gradient(circle, #cc0000 10%, #660000 60%, transparent 80%);
      border-radius: 50%;
      box-shadow: 0 0 50px #ff0000;
      opacity: 0.8;
      animation: pulse-moon 4s infinite alternate;
      z-index: 1;
    }

    @keyframes pulse-moon {
      0% { transform: scale(1); opacity: 0.7; box-shadow: 0 0 30px #cc0000; }
      100% { transform: scale(1.05); opacity: 1; box-shadow: 0 0 60px #ff1a1a; }
    }

    /* --- PURE CSS ACROPOLIS --- */
    .acropolis-silhouette {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 150px;
      z-index: 2; 
      pointer-events: none;
    }

    .acropolis-hill {
      position: absolute;
      bottom: 0;
      left: -10%;
      width: 120%;
      height: 60px; 
      background: #000000; 
      border-radius: 50% 50% 0 0 / 100% 100% 0 0;
    }

    .parthenon {
      position: absolute;
      bottom: 58px;
      left: 25%;
      transform: translateX(-50%) scale(1.3); 
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .parthenon-roof {
      width: 80px;
      height: 14px;
      background: #000000;
      clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
    }

    .parthenon-columns {
      width: 72px;
      height: 22px;
      background: repeating-linear-gradient(to right, #000000 0, #000000 6px, transparent 6px, transparent 10px);
      border-top: 2px solid #000000;
      border-bottom: 2px solid #000000;
    }

    .parthenon-base {
      width: 86px;
      height: 5px;
      background: #000000;
      border-radius: 1px;
    }

    /* --- THE COFFIN BASE --- */
    .coffin-wrapper {
      position: relative;
      width: 90px;
      height: 140px;
      z-index: 3; 
      margin-top: 20px;
    }

    .coffin-inside {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: #0a0505;
      clip-path: polygon(25% 0%, 75% 0%, 100% 25%, 75% 100%, 25% 100%, 0% 25%);
      box-shadow: inset 0 0 20px #000;
      border-left: 2px solid #330000;
      border-right: 2px solid #330000;
    }

    /* --- VAMPIRE FACE (Eyes + Fangs) --- */
    .vampire-face {
      position: absolute;
      top: 35px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      opacity: 0;
      animation: emerge 4s infinite;
    }

    @keyframes emerge {
      0%, 40% { opacity: 0; }
      45%, 80% { opacity: 1; }
      85%, 100% { opacity: 0; }
    }

    /* --- GLOWING EYES --- */
    .glowing-eyes {
      display: flex;
      gap: 14px;
    }

    .eye {
      width: 9px;
      height: 9px;
      background: #ff0000;
      border-radius: 50%;
      box-shadow: 0 0 10px #ff0000, 0 0 20px #ff0000;
      position: relative;
      animation: blink 4s infinite;
    }

    .eye::after {
      content: '';
      position: absolute;
      width: 2px;
      height: 7px;
      background: #000;
      left: 3.5px;
      top: 1px;
    }

    @keyframes blink {
      0%, 48% { transform: scaleY(1); }
      50% { transform: scaleY(0.1); } 
      52%, 100% { transform: scaleY(1); }
    }

    /* --- FANGS --- */
    .fangs-container {
      display: flex;
      gap: 12px;
      margin-top: 6px;
    }

    .small-fang {
      width: 0;
      height: 0;
      border-left: 4px solid transparent;
      border-right: 4px solid transparent;
      border-top: 14px solid #f2f2f2; 
      position: relative;
      filter: drop-shadow(0 0 2px rgba(255,255,255,0.3));
    }

    .small-fang::after {
      content: '';
      position: absolute;
      top: -14px;
      left: -1px;
      border-left: 1px solid transparent;
      border-right: 1px solid transparent;
      border-top: 5px solid #cc0000;
    }

    /* --- THE COFFIN LID --- */
    .coffin-lid {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: linear-gradient(135deg, #2a110e 0%, #120503 100%);
      clip-path: polygon(25% 0%, 75% 0%, 100% 25%, 75% 100%, 25% 100%, 0% 25%);
      border-top: 2px solid #4a0000;
      box-shadow: 0 0 15px rgba(0,0,0,0.8);
      transform-origin: center right;
      animation: open-coffin 4s infinite;
      
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* --- ANKH ICON --- */
    .ankh-icon {
      width: 35px;
      opacity: 0.85;
      filter: drop-shadow(0 0 4px rgba(255, 0, 0, 0.5));
      pointer-events: none; 
    }

    @keyframes open-coffin {
      0%, 15% { transform: translate(0, 0) rotate(0); }
      17% { transform: translate(2px, 0) rotate(1deg); }
      19% { transform: translate(-2px, 0) rotate(-1deg); }
      21% { transform: translate(2px, 0) rotate(1deg); }
      23% { transform: translate(-2px, 0) rotate(-1deg); }
      35% { transform: translate(35px, 0) rotate(5deg); } 
      80% { transform: translate(35px, 0) rotate(5deg); } 
      85% { transform: translate(0, 0) rotate(0); } 
      100% { transform: translate(0, 0) rotate(0); }
    }

    /* --- CREEPING MIST --- */
    .mist-container {
      position: absolute;
      bottom: 25px; 
      width: 100%;
      height: 40px;
      z-index: 4;
      pointer-events: none;
    }

    .mist {
      position: absolute;
      background: rgba(100, 100, 100, 0.15);
      border-radius: 50%;
      filter: blur(8px);
      animation: float-mist linear infinite;
    }

    .mist:nth-child(1) { width: 150px; height: 30px; bottom: 0; left: -50px; animation-duration: 6s; }
    .mist:nth-child(2) { width: 200px; height: 40px; bottom: -10px; right: -50px; animation-duration: 8s; animation-direction: reverse; }
    .mist:nth-child(3) { width: 120px; height: 25px; bottom: 10px; left: 30%; animation-duration: 5s; }

    @keyframes float-mist {
      0% { transform: translateX(-20px); opacity: 0; }
      50% { opacity: 1; }
      100% { transform: translateX(50px); opacity: 0; }
    }

    /* --- JITTERY TEXT --- */
    .gothic-text {
      margin-top: 35px;
      font-size: 1.25rem; /* Bumped up the font size for clarity */
      letter-spacing: 5px; /* Slightly wider spacing */
      text-transform: uppercase;
      font-family: 'Courier New', Courier, monospace;
      color: #990000;
      font-weight: bold;
      text-shadow: 0 0 5px #ff0000;
      z-index: 5;
      animation: text-jitter 4s infinite;
    }

    @keyframes text-jitter {
      0%, 84% { transform: translate(0, 0); opacity: 0.8; }
      85% { transform: translate(2px, -2px); opacity: 1; color: #ff1a1a; } 
      86% { transform: translate(-2px, 2px); }
      87% { transform: translate(0, 0); opacity: 0.8; color: #990000; }
      100% { transform: translate(0, 0); }
    }
  `;

  return (
    <div className="dracula-container">
      <style>{advancedStyles}</style>
      
      {/* Pure CSS Acropolis Background */}
      <div className="acropolis-silhouette">
        <div className="parthenon">
          <div className="parthenon-roof"></div>
          <div className="parthenon-columns"></div>
          <div className="parthenon-base"></div>
        </div>
        <div className="acropolis-hill"></div>
      </div>

      {/* Background Moon */}
      <div className="blood-moon"></div>

      {/* Main Coffin Element */}
      <div className="coffin-wrapper">
        <div className="coffin-inside">
          <div className="vampire-face">
            <div className="glowing-eyes">
              <div className="eye"></div>
              <div className="eye"></div>
            </div>
            <div className="fangs-container">
              <div className="small-fang"></div>
              <div className="small-fang"></div>
            </div>
          </div>
        </div>
        
        <div className="coffin-lid">
          <img 
            src="/img/dice/VtM_ankh_white.png" 
            alt="Ankh" 
            className="ankh-icon" 
            draggable="false" 
          />
        </div>
      </div>

      {/* Foreground Fog/Mist */}
      <div className="mist-container">
        <div className="mist"></div>
        <div className="mist"></div>
        <div className="mist"></div>
      </div>

      {/* Explicit Loading Text */}
      <div className="gothic-text">
        {loadingText}
      </div>
    </div>
  );
};

export default Loading;