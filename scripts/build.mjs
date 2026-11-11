import { mkdir, copyFile, rm } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
for (const file of ['index.html', 'style.css', 'app.js', 'model.mjs', 'favicon.svg']) await copyFile(file, `dist/${file}`);
console.log('Built city-life-systems → dist (no external dependencies)');
