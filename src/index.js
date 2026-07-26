import React from 'react';
import ReactDOM from 'react-dom/client';
import BraindumpApp from './braindump-app';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BraindumpApp />
  </React.StrictMode>
);

serviceWorkerRegistration.register({
  onUpdate: (registration) => {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  },
  onSuccess: () => {
    console.log('Braindump is ready for offline use');
  },
});
