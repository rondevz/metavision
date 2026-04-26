import React, { useEffect, useState } from 'react';

type Tags = Record<string, string>;

const empty: Tags = {};

export default function App() {
  const [tags, setTags] = useState<Tags>(empty);
  const [status, setStatus] = useState('waiting');

  useEffect(() => {
    // Listen for live updates from the content script
    try {
      chrome.runtime.onMessage.addListener((message: any) => {
        if (message?.action === 'METADATA_UPDATED') {
          setTags(message.payload || {});
          setStatus('updated');
        }
      });
    } catch (e) {
      // ignore if chrome API unavailable
    }

    // Ask the active tab for the current metadata in case we opened after the initial message
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => {
        const tab = tabs && tabs[0];
        if (!tab || !tab.id) return;
        chrome.tabs.sendMessage(tab.id, { action: 'REQUEST_METADATA' }, (response: any) => {
          if (response && response.payload) {
            setTags(response.payload || {});
            setStatus('loaded');
          }
        });
      });
    } catch (e) {
      // ignore
    }
  }, []);

  const title = tags.title || tags['og:title'] || tags['twitter:title'] || '';
  const description = tags.description || tags['og:description'] || tags['twitter:description'] || '';
  const image = tags['og:image'] || tags['twitter:image'] || '';

  return (
    <div className="mv-root">
      <header className="mv-header">Metavision</header>
      <div className="mv-status">Status: {status}</div>

      <div className="mv-preview">
        {image ? (
          <div className="mv-image" style={{ backgroundImage: `url(${image})` }} />
        ) : (
          <div className="mv-image mv-image--placeholder">No image</div>
        )}

        <div className="mv-body">
          <h3 className="mv-title">{title || 'No title found'}</h3>
          <p className="mv-desc">{description || 'No description found'}</p>
          <div className="mv-meta">
            <h4>Raw tags</h4>
            <pre>{JSON.stringify(tags, null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
