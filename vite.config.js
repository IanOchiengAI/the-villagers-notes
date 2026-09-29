import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

// Vercel serves dist/404.html (with a real 404 status) for any path vercel.json doesn't
// rewrite. Making it a copy of the app shell means the app still boots there and the
// router shows the themed "not found" page (src/pages/not-found.js).
const notFoundShell = {
  name: 'not-found-shell',
  closeBundle() {
    const dist = path.resolve('dist');
    const index = path.join(dist, 'index.html');
    if (fs.existsSync(index)) fs.copyFileSync(index, path.join(dist, '404.html'));
  },
};

export default defineConfig({
  plugins: [notFoundShell],
  build: {
    rollupOptions: {
      input: { main: './index.html' },
    },
  },
});
