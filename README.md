# Metavision

Metavision is an open-source browser extension that lets you preview social metadata (Open Graph + X/Twitter cards) directly from local development URLs like `http://localhost:3000`.

No deploy needed. Edit your `<head>`, save, and see updates live.

## Why Metavision?

When building websites, social preview tools usually require a public URL. Metavision removes that step:

- Works on localhost and other local/staging URLs
- Reads `<title>`, `description`, `og:*`, and `twitter:*` tags from the current tab
- Updates in real time using `MutationObserver` when metadata changes
- Shows structured Open Graph / X fields and raw JSON tags

## Features

- Real-time metadata extraction from the active page
- Live update stream while you edit your app
- Side panel UI (Chrome) and popup fallback (Firefox)
- Raw tags viewer with copy-to-clipboard
- Built with WXT + React + TypeScript + Tailwind CSS v4

## Tech Stack

- [WXT](https://wxt.dev/) (Web Extension framework)
- React + TypeScript
- Tailwind CSS v4
- Chrome Extensions (Manifest V3)

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+

### Install

```bash
pnpm install
```

## Development

### Chrome

```bash
pnpm dev
```

This starts WXT dev mode and launches a Chromium profile with the extension loaded.

### Firefox

```bash
pnpm dev:firefox
```

If Firefox fails to open with a profile error on your machine, build first and load manually (instructions below).

## Build

### Production build (Chrome)

```bash
pnpm build
```

Output directory:

`/.output/chrome-mv3`

### Production build (Firefox)

```bash
pnpm build:firefox
```

Output directory:

`/.output/firefox-mv2`

## Load Extension Manually

### Chrome (from build output)

1. Run `pnpm build`
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select `.output/chrome-mv3`

### Firefox (from build output)

1. Run `pnpm build:firefox`
2. Open `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on...**
4. Select `.output/firefox-mv2/manifest.json`

## How to Use

1. Start your local web app (for example `localhost:3000`)
2. Open that page in the browser
3. Open Metavision:
   - Chrome: click extension icon to open Side Panel
   - Firefox: click extension icon to open popup UI
4. Edit metadata in your app and watch Metavision update instantly

## Supported Tags

- `<title>`
- `<meta name="description" ...>`
- `<meta property="og:*" ...>`
- `<meta name="twitter:*" ...>` (still the standard key prefix used by platforms)

<!-- Available scripts intentionally removed -->

## Contributing

Contributions are welcome.

If you want to help:

1. Fork the repo
2. Create a feature branch
3. Commit your changes with clear messages
4. Open a pull request with screenshots or short videos for UI updates

## License

If you intend to open source this project publicly, add a license file (for example `MIT`) before publishing.
