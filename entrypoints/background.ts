export default defineBackground(() => {
  console.log('Metavision background loaded', { id: browser.runtime.id });

  const chromeApi = (globalThis as any).chrome;
  if (!chromeApi?.sidePanel) return;

  // Open the extension side panel when the toolbar icon is clicked.
  // This makes the side panel the primary UI instead of a popup.
  chromeApi.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error: unknown) => {
      console.error('Failed to set side panel behavior', error);
    });
});
