export default defineContentScript({
  // Run on all pages so developers can inspect localhost and local dev servers
  matches: ['<all_urls>'],
  main() {
    const chromeApi = (globalThis as any).chrome;

    // Lightweight metadata extractor for title and meta tags
    const extractMetadata = () => {
      const tags: Record<string, string> = {};

      // Title
      try {
        const titleEl = document.querySelector('title');
        tags.title = (titleEl ? titleEl.innerText : document.title) || '';
      } catch (e) {
        tags.title = '';
      }

      // Meta tags
      try {
        const metas = Array.from(document.head.querySelectorAll('meta'));
        for (const m of metas) {
          const name = m.getAttribute('name');
          const prop = m.getAttribute('property');
          const content = m.getAttribute('content') || '';
          if (name) tags[name] = content;
          if (prop) tags[prop] = content;
        }
      } catch (e) {
        // ignore
      }

      return tags;
    };

    let lastTags = extractMetadata();

    const sendTags = (tags: Record<string, string>) => {
      if (!chromeApi?.runtime) return;
      try {
        // fire-and-forget message to any extension page (side panel will listen)
        chromeApi.runtime.sendMessage({ action: 'METADATA_UPDATED', payload: tags });
      } catch (e) {
        // chrome may be undefined in some envs - ignore
      }
    };

    // Send initial metadata immediately
    sendTags(lastTags);

    // Respond to explicit requests from the side panel for the current metadata
    try {
      if (!chromeApi?.runtime) return;
      chromeApi.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
        if (!message || !message.action) return;
        if (message.action === 'REQUEST_METADATA') {
          sendResponse({ payload: lastTags });
        }
      });
    } catch (e) {
      // ignore if runtime messaging isn't available
    }

    // Observe head for changes so we can push updates when dev server HMR updates meta tags
    try {
      const observer = new MutationObserver(() => {
        const tags = extractMetadata();
        // naive deep-compare via JSON stringify (sufficient for small objects)
        try {
          if (JSON.stringify(tags) !== JSON.stringify(lastTags)) {
            lastTags = tags;
            sendTags(tags);
          }
        } catch (e) {
          // if stringify fails for any reason, still send tags
          lastTags = tags;
          sendTags(tags);
        }
      });

      observer.observe(document.head || document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      });
    } catch (e) {
      // ignore observer errors
    }
  },
});
