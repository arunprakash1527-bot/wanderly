import React from 'react';
import ReactDOM from 'react-dom/client';
import TripWithMeApp from './wanderly-app';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <TripWithMeApp />
  </React.StrictMode>
);

// Register service worker for PWA (offline caching, install prompt)
serviceWorkerRegistration.register({
  onUpdate: (registration) => {
    // When a new version is available, auto-activate it
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  },
  onSuccess: () => {
    console.log('Trip With Me is ready for offline use');
  },
});
