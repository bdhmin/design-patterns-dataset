// Writes out/seed-draft.js and injects it into out/index.html (before the app module).
// The loader stores the project under the app's own draft key ('bead-grid-studio:draft:v2')
// if no draft exists yet, then clicks the app's own "Restore last unfinished pattern" button.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const [draftPath, outDir] = process.argv.slice(2);
const draft = JSON.parse(readFileSync(draftPath, 'utf8'));
const js = `(function(){
  var KEY='bead-grid-studio:draft:v2';
  var DRAFT=${JSON.stringify(draft)};
  try{ if(!localStorage.getItem(KEY)) localStorage.setItem(KEY, JSON.stringify(DRAFT)); }catch(e){}
  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){
      var actions=document.getElementById('recoveryActions'), btn=document.getElementById('restoreDraftBtn');
      if(btn && actions && !actions.hidden) btn.click();
    }, 0);
  });
})();
`;
writeFileSync(join(outDir, 'seed-draft.js'), js);
const indexPath = join(outDir, 'index.html');
let html = readFileSync(indexPath, 'utf8');
if (!html.includes('seed-draft.js')) {
  html = html.replace(/(<script type="module")/, '<script src="./seed-draft.js"></script>\n    $1');
  writeFileSync(indexPath, html);
}
