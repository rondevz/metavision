import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Metavision',
    short_name: 'Metavision',
    description: 'Preview Open Graph and Twitter metadata on localhost in real time',
    // Declare explicit Gecko data collection permissions for Firefox AMO readiness.
    // If the extension collects no personal data, declare required: ['none'] to avoid AMO friction.
    browser_specific_settings: {
      gecko: {
        data_collection_permissions: {
          required: ['none'],
        },
      },
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
