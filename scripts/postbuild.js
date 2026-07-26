const { execSync } = require('child_process');
const path = require('path');

const htmlPath = path.join('public', 'index.html');

try {
  execSync(`git checkout -- ${htmlPath}`, { stdio: 'inherit' });
  console.log('  Postbuild: restored index.html to git state');
} catch {
  console.log('  Postbuild: could not restore index.html (not in git or no changes)');
}
