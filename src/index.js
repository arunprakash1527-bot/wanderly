import React, { lazy, Suspense, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

// ─── Multi-App Registry ─────────────────────────────────────────────────────────
// Set REACT_APP_NAME in your Vercel project env to pick which app to build.
// Defaults to 'wanderly' so existing deployments are untouched.
//
// To add a new app:
//   1. Create src/<app-name>-app.jsx with a default export
//   2. Add an entry to APPS below
//   3. Create public/<app-name>-manifest.json + icons
//   4. Deploy a new Vercel project with REACT_APP_NAME=<app-name>

const APPS = {
  wanderly: {
    load: () => import('./wanderly-app'),
    title: 'Trip With Me',
    themeColor: '#1B8F6A',
    manifest: '/manifest.json',
    icon: '/icons/icon-192.svg',
    appleTitle: 'TripWithMe',
  },
  braindump: {
    load: () => import('./braindump-app'),
    title: 'Braindump',
    themeColor: '#3060D4',
    manifest: '/braindump-manifest.json',
    icon: '/icons/braindump-192.svg',
    appleTitle: 'Braindump',
  },
};

const APP_NAME = process.env.REACT_APP_NAME || 'wanderly';
const config = APPS[APP_NAME] || APPS.wanderly;
const LazyApp = lazy(config.load);

function AppShell() {
  useEffect(() => {
    document.title = config.title;

    const setMeta = (selector, attr, value) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute(attr, value);
    };

    setMeta('meta[name="theme-color"]', 'content', config.themeColor);
    setMeta('meta[name="apple-mobile-web-app-title"]', 'content', config.appleTitle);
    setMeta('link[rel="manifest"]', 'href', config.manifest);
    setMeta('link[rel="icon"]', 'href', config.icon);
    setMeta('link[rel="apple-touch-icon"]', 'href', config.icon);
  }, []);

  return (
    <Suspense fallback={null}>
      <LazyApp />
    </Suspense>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AppShell />
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
    console.log(`${config.title} is ready for offline use`);
  },
});
