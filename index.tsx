import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  // Signal to the index.html that the React app has successfully initialized
  (window as any).__REACT_MOUNTED__ = true;
} else {
  console.error("Critical: 'root' element not found in DOM.");
}
