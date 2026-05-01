export default defineContentScript({
  // Run on all pages so developers can inspect localhost and local dev servers
  matches: ['<all_urls>'],
  main() {
    const chromeApi = (globalThis as any).chrome;

    type Tags = Record<string, string>;

    const urlMetaKeys = new Set(['og:image', 'twitter:image', 'og:url', 'twitter:url']);

    const toAbsoluteUrl = (value: string) => {
      try {
        return new URL(value, document.baseURI).toString();
      } catch {
        return value;
      }
    };

    // Lightweight metadata extractor for title and meta tags
    const extractMetadata = () => {
      const tags: Tags = {};

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
          if (name) tags[name] = urlMetaKeys.has(name) ? toAbsoluteUrl(content) : content;
          if (prop) tags[prop] = urlMetaKeys.has(prop) ? toAbsoluteUrl(content) : content;
        }
      } catch (e) {
        // ignore
      }

      return tags;
    };

    const readBlobAsDataUrl = (blob: Blob) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(reader.error || new Error('Failed to read image blob'));
        reader.readAsDataURL(blob);
      });

    const imageDataUrlCache = new Map<string, string | null>();

    const resolveImageDataUrl = async (imageUrl: string) => {
      if (!imageUrl) return '';
      if (imageUrl.startsWith('data:')) return imageUrl;

      let parsed: URL;
      try {
        parsed = new URL(imageUrl);
      } catch {
        return '';
      }

      if (!['http:', 'https:'].includes(parsed.protocol)) return '';

      if (imageDataUrlCache.has(imageUrl)) {
        return imageDataUrlCache.get(imageUrl) || '';
      }

      try {
        const response = await fetch(imageUrl, { credentials: 'include' });
        if (!response.ok) throw new Error(`Image request failed (${response.status})`);

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.startsWith('image/')) throw new Error('Response is not an image');

        const blob = await response.blob();
        // Runtime message payload size is limited; avoid forwarding very large images.
        if (blob.size > 2_500_000) throw new Error('Image too large for preview relay');

        const dataUrl = await readBlobAsDataUrl(blob);
        imageDataUrlCache.set(imageUrl, dataUrl);
        return dataUrl;
      } catch {
        imageDataUrlCache.set(imageUrl, null);
        return '';
      }
    };

    const getPrimaryImageUrl = (tags: Tags) => tags['og:image'] || tags['twitter:image'] || '';

    let lastTags = extractMetadata();
    let lastImageUrl = '';
    let lastImageDataUrl = '';

    const sendTags = (tags: Tags, imageDataUrl?: string) => {
      if (!chromeApi?.runtime) return;
      try {
        // fire-and-forget message to any extension page (side panel will listen)
        chromeApi.runtime.sendMessage({ action: 'METADATA_UPDATED', payload: tags, imageDataUrl });
      } catch (e) {
        // chrome may be undefined in some envs - ignore
      }
    };

    const publishMetadata = async (tags: Tags) => {
      const imageUrl = getPrimaryImageUrl(tags);

      if (!imageUrl) {
        lastImageUrl = '';
        lastImageDataUrl = '';
        sendTags(tags);
        return;
      }

      if (imageUrl === lastImageUrl && lastImageDataUrl) {
        sendTags(tags, lastImageDataUrl);
        return;
      }

      lastImageUrl = imageUrl;
      // Send metadata immediately, then stream an image preview update if we can relay it.
      sendTags(tags);

      const imageDataUrl = await resolveImageDataUrl(imageUrl);
      if (imageUrl !== lastImageUrl) return;

      lastImageDataUrl = imageDataUrl;
      if (imageDataUrl) {
        sendTags(tags, imageDataUrl);
      }
    };

    // Send initial metadata immediately
    void publishMetadata(lastTags);

    // Respond to explicit requests from the side panel for the current metadata
    try {
      if (!chromeApi?.runtime) return;
      chromeApi.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
        if (!message || !message.action) return;
        if (message.action === 'REQUEST_METADATA') {
          sendResponse({ payload: lastTags, imageDataUrl: lastImageDataUrl || undefined });
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
            void publishMetadata(tags);
          }
        } catch (e) {
          // if stringify fails for any reason, still send tags
          lastTags = tags;
          void publishMetadata(tags);
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
