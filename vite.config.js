import { defineConfig } from 'vite';

// 山口さんの指示でブラウザはChrome固定
process.env.BROWSER = 'chrome';

export default defineConfig({
  server: {
    open: true,
  },
});
