import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Metavision',
    short_name: 'Metavision',
    description: 'Preview Open Graph and Twitter metadata on localhost in real time',
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
