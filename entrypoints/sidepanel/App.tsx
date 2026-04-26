import React, { useEffect, useState } from 'react';

type Tags = Record<string, string>;

const empty: Tags = {};

function renderJsonWithHighlight(rawJson: string) {
  const tokenRegex =
    /(\"(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\\"])*\"(?=\s*:))|(\"(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\\"])*\")|\b(true|false|null)\b|\b-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b|([{}\[\],:])/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = tokenRegex.exec(rawJson)) !== null) {
    if (match.index > lastIndex) {
      parts.push(rawJson.slice(lastIndex, match.index));
    }

    const [token, keyToken, stringToken, boolOrNullToken, punctuationToken] = match;
    let className = 'text-[#b7d6f8]';

    if (keyToken) {
      className = 'text-purple-300';
    } else if (stringToken) {
      className = 'text-emerald-300';
    } else if (boolOrNullToken) {
      className = 'text-amber-300';
    } else if (punctuationToken) {
      className = 'text-[#93b6d9]';
    } else {
      className = 'text-fuchsia-300';
    }

    parts.push(
      <span key={`json-token-${index}`} className={className}>
        {token}
      </span>,
    );

    index += 1;
    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < rawJson.length) {
    parts.push(rawJson.slice(lastIndex));
  }

  return parts;
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="grid gap-0.5">
      <span className="text-[11px] uppercase tracking-[0.08em] text-[#7fa3c8]">{label}</span>
      <span className="text-xs leading-relaxed break-all text-[#9db8d4]">{value || '-'}</span>
    </li>
  );
}

export default function App() {
  const [tags, setTags] = useState<Tags>(empty);
  const [status, setStatus] = useState('waiting');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const chromeApi = (globalThis as any).chrome;

    if (!chromeApi?.runtime) {
      setStatus('chrome_api_unavailable');
      return;
    }

    // Listen for live updates from the content script
    const onRuntimeMessage = (message: any) => {
      if (message?.action === 'METADATA_UPDATED') {
        setTags(message.payload || {});
        setStatus('updated');
      }
    };

    try {
      chromeApi.runtime.onMessage.addListener(onRuntimeMessage);
    } catch (e) {
      // ignore if chrome API unavailable
    }

    // Ask the active tab for the current metadata in case we opened after the initial message
    try {
      if (!chromeApi?.tabs) return;
      chromeApi.tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => {
        const tab = tabs && tabs[0];
        if (!tab || !tab.id) return;
        chromeApi.tabs.sendMessage(tab.id, { action: 'REQUEST_METADATA' }, (response: any) => {
          if (response && response.payload) {
            setTags(response.payload || {});
            setStatus('loaded');
          }
        });
      });
    } catch (e) {
      // ignore
    }

    return () => {
      try {
        chromeApi.runtime.onMessage.removeListener(onRuntimeMessage);
      } catch (e) {
        // ignore
      }
    };
  }, []);

  const title = tags.title || tags['og:title'] || tags['twitter:title'] || '';
  const description = tags.description || tags['og:description'] || tags['twitter:description'] || '';
  const image = tags['og:image'] || tags['twitter:image'] || '';
  const canonical = tags['og:url'] || tags['twitter:url'] || '';
  const rawTags = JSON.stringify(tags, null, 2);
  const highlightedRawTags = renderJsonWithHighlight(rawTags);

  const copyRawTags = async () => {
    try {
      await navigator.clipboard.writeText(rawTags);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      setCopied(false);
    }
  };

  const statusLabel =
    status === 'chrome_api_unavailable'
      ? 'Chrome API unavailable'
      : status === 'updated'
        ? 'Live updates'
        : status === 'loaded'
          ? 'Loaded from tab'
          : 'Waiting for page';

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_20%_0%,#0f2744_0%,#040a14_58%)] p-3 text-[#dbeaff]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(46,218,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(46,218,255,0.06)_1px,transparent_1px)] bg-[size:22px_22px] [mask-image:linear-gradient(180deg,rgba(0,0,0,0.45),rgba(0,0,0,0))]" />

      <header className="relative z-10 mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="m-0 text-xl leading-tight tracking-[0.02em]">Metavision</h1>
          <p className="mt-1 text-xs text-[#98b7d8]">Real-time social metadata preview</p>
        </div>
        <span
          className={`inline-flex w-fit rounded-full border px-3 py-1 text-[11px] leading-none ${
            status === 'updated' || status === 'loaded'
              ? 'border-emerald-300/35 bg-emerald-300/10 text-emerald-300'
              : status === 'waiting'
                ? 'border-amber-300/35 bg-amber-300/10 text-amber-200'
                : 'border-purple-300/35 bg-purple-300/10 text-purple-200'
          }`}
        >
          {statusLabel}
        </span>
      </header>

      <section className="relative z-10 mb-3 grid gap-3 rounded-2xl border border-purple-300/25 bg-[linear-gradient(160deg,rgba(20,36,60,.9),rgba(11,20,36,.88))] p-3 shadow-[0_0_0_1px_rgba(61,216,255,.08),0_16px_36px_rgba(2,8,23,.45)] sm:grid-cols-[160px_minmax(0,1fr)]">
        {image ? (
          <div
            className="aspect-[16/10] w-full rounded-xl border border-purple-200/30 bg-cover bg-center"
            style={{ backgroundImage: `url(${image})` }}
          />
        ) : (
          <div className="flex aspect-[16/10] w-full items-center justify-center rounded-xl border border-purple-200/30 bg-[#0a1527] text-xs text-[#7f9fbe]">
            No image
          </div>
        )}

        <div className="min-w-0">
          <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-purple-300">Social Preview</p>
          <h3 className="m-0 text-[1.08rem] leading-tight break-words">{title || 'No title found'}</h3>
          <p className="mt-2 text-[0.86rem] leading-relaxed break-words text-[#a9c2dc]">
            {description || 'No description found'}
          </p>
          <p className="mt-3 text-xs break-words text-purple-300">{canonical || 'No canonical URL found'}</p>
        </div>
      </section>

      <section className="relative z-10 mb-3 grid gap-3 rounded-2xl border border-purple-300/25 bg-[linear-gradient(160deg,rgba(20,36,60,.9),rgba(11,20,36,.88))] p-3 shadow-[0_0_0_1px_rgba(61,216,255,.08),0_16px_36px_rgba(2,8,23,.45)] lg:grid-cols-2">
        <div className="min-w-0">
          <h4 className="mb-2 text-xs uppercase tracking-[0.14em] text-purple-300">Open Graph</h4>
          <ul className="m-0 grid list-none gap-2 p-0">
            <MetaRow label="title" value={tags['og:title'] || '-'} />
            <MetaRow label="description" value={tags['og:description'] || '-'} />
            <MetaRow label="type" value={tags['og:type'] || '-'} />
            <MetaRow label="image" value={tags['og:image'] || '-'} />
          </ul>
        </div>
        <div className="min-w-0">
          <h4 className="mb-2 text-xs uppercase tracking-[0.14em] text-purple-300">X (twitter:*)</h4>
          <ul className="m-0 grid list-none gap-2 p-0">
            <MetaRow label="card" value={tags['twitter:card'] || '-'} />
            <MetaRow label="title" value={tags['twitter:title'] || '-'} />
            <MetaRow label="description" value={tags['twitter:description'] || '-'} />
            <MetaRow label="image" value={tags['twitter:image'] || '-'} />
          </ul>
        </div>
      </section>

      <section className="relative z-10 rounded-2xl border border-purple-300/25 bg-[linear-gradient(160deg,rgba(20,36,60,.9),rgba(11,20,36,.88))] p-3 shadow-[0_0_0_1px_rgba(61,216,255,.08),0_16px_36px_rgba(2,8,23,.45)]">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h4 className="m-0 text-xs uppercase tracking-[0.14em] text-purple-300">Raw Tags</h4>
          <button
            type="button"
            onClick={copyRawTags}
            className="inline-flex items-center gap-1 rounded-md border border-purple-300/30 bg-purple-300/10 px-2 py-1 text-[11px] text-purple-200 transition hover:bg-purple-300/20"
            aria-label="Copy raw tags"
            title="Copy raw tags"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
              <path d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1Zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H10V7h9v14Z" />
            </svg>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre className="m-0 max-h-72 overflow-auto rounded-xl border border-purple-200/15 bg-[#071226]/80 p-3 text-[11px] leading-[1.45]">
          <code>{highlightedRawTags}</code>
        </pre>
      </section>
    </div>
  );
}
