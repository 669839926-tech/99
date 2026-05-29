
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Polyfill process for browser environment to avoid ReferenceError with libraries expecting Node globals
if (typeof window !== 'undefined' && typeof (window as any).process === 'undefined') {
  (window as any).process = { env: {} };
}

// Sandbox safety polyfills to ensure deletes and alerts succeed within sandboxed cross-origin iframes
if (typeof window !== 'undefined') {
  try {
    const inIframe = window.self !== window.parent;
    if (inIframe) {
      window.confirm = function (message) {
        console.info("[Sandbox Polyfill] window.confirm bypassed and auto-confirmed for iframe sandbox compatibility:", message);
        return true;
      };
      window.alert = function (message) {
        console.info("[Sandbox Polyfill] window.alert bypassed for iframe sandbox compatibility:", message);
      };
    }
  } catch (e) {
    console.warn("Failed to apply sandbox polyfills:", e);
  }
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
