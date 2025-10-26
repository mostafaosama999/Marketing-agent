import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Log environment info on startup
const usingEmulator = process.env.REACT_APP_USE_EMULATOR === 'true';
console.log(
  `%c${usingEmulator ? '🧪 EMULATOR MODE' : '🌐 PRODUCTION MODE'}`,
  `font-size: 20px; font-weight: bold; color: ${usingEmulator ? '#4CAF50' : '#FF9800'}`
);

if (usingEmulator) {
  console.log(
    '%cUsing Firebase Emulators - Safe to test!\n' +
    'Firestore: localhost:8081 | Auth: localhost:9099 | Functions: localhost:5001\n' +
    'Emulator UI: http://localhost:4001',
    'color: #4CAF50; font-size: 12px;'
  );
} else {
  console.log(
    '%c⚠️ Connected to PRODUCTION Firebase\n' +
    'All changes will affect live data. Be careful!\n' +
    'To use emulators instead, set REACT_APP_USE_EMULATOR=true in .env',
    'color: #FF9800; font-size: 12px; font-weight: bold;'
  );
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals( ))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
