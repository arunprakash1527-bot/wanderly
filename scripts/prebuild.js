const fs = require('fs');
const path = require('path');

const APPS = {
  wanderly: {
    title: 'Trip With Me',
    themeColor: '#1B8F6A',
    description: 'Plan group trips together with AI-powered itineraries, expense splitting, and shared memories',
    manifest: '/manifest.json',
    icon: '/icons/icon-192.svg',
    appleTitle: 'TripWithMe',
    splashBg: '#FAF9F6',
    splashColor: '#1A1A18',
  },
  braindump: {
    title: 'Braindump',
    themeColor: '#3060D4',
    description: 'Dump it. AI sorts it. You clear it. A smart notes app with AI-powered categorization.',
    manifest: '/braindump-manifest.json',
    icon: '/icons/braindump-192.svg',
    appleTitle: 'Braindump',
    splashBg: '#F0F4FF',
    splashColor: '#1A1A2E',
  },
};

const appName = process.env.REACT_APP_NAME || 'wanderly';
const config = APPS[appName];

if (!config) {
  console.error(`\n  ERROR: Unknown REACT_APP_NAME="${appName}"\n  Valid options: ${Object.keys(APPS).join(', ')}\n`);
  process.exit(1);
}

console.log(`  Prebuild: configuring index.html for "${appName}" (${config.title})`);

const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
const template = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no" />
    <meta name="theme-color" content="${config.themeColor}" />
    <meta name="description" content="${config.description}" />

    <!-- PWA -->
    <link rel="manifest" href="${config.manifest}" />
    <link rel="icon" href="${config.icon}" type="image/svg+xml" />

    <!-- Apple PWA meta -->
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="${config.appleTitle}" />
    <link rel="apple-touch-icon" href="${config.icon}" />

    <!-- Splash screen colour while loading -->
    <style>
      html, body { margin: 0; padding: 0; background: ${config.splashBg}; }
      #splash { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 8px; background: ${config.splashBg}; z-index: 99999; transition: opacity .3s; }
      #splash h1 { font-family: Georgia, serif; font-size: 22px; font-weight: 400; color: ${config.splashColor}; }
      #splash p { font-size: 11px; color: #767570; }
    </style>

    <title>${config.title}</title>
  </head>
  <body>
    <div id="splash">
      <h1>${config.title}</h1>
      <p>Loading...</p>
    </div>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
    <script>
      // Remove splash once React mounts
      window.addEventListener('load', function() {
        setTimeout(function() {
          var splash = document.getElementById('splash');
          if (splash) { splash.style.opacity = '0'; setTimeout(function() { splash.remove(); }, 300); }
        }, 200);
      });
    </script>
  </body>
</html>
`;

fs.writeFileSync(htmlPath, template);
console.log(`  Prebuild: index.html updated for ${config.title}`);
