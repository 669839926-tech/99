
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { injectSpeedInsights } from '@vercel/speed-insights';

// Inject Vercel Speed Insights (client-side only)
injectSpeedInsights();

// Polyfill process for browser environment to avoid ReferenceError with libraries expecting Node globals
if (typeof window !== 'undefined' && typeof (window as any).process === 'undefined') {
  (window as any).process = { env: {} };
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
