# PPiP Website

Static website runtime for the PPiP Spring Edition page. Generated media lives in `website/public/assets/` (referenced as `/assets/...`); generation tooling lives in `imagegen/`.

## Development

Run the local development server:

```bash
docker compose -f website/compose.yaml up website
```

Open:

```text
http://localhost:8123
http://127.0.0.1:8123
```

The service serves the local `website/` directory through Nginx, so HTML, CSS, JS, and asset changes are reflected on refresh without rebuilding the image. Re-run with `--build` only after changing `Dockerfile` or `nginx.conf`.

## Build

The build is [Vite](https://vite.dev) (multi-page: `/`, `/raspored/`, `/bets/`) plus a media post-pass:

1. `vite build website` bundles, minifies, and content-hashes CSS/JS, and copies `public/` (assets, CNAME, favicons) verbatim.
2. `node scripts/optimize-media.mjs` generates group avatar thumbnails, converts images to WebP, recompresses videos with `ffmpeg`, and rewrites references.

## Deployment

GitHub Actions runs `npm ci && npm run build` and deploys `dist/website/` to GitHub Pages on pushes to `main`.
The `public/CNAME` file configures the custom domain:

```text
ppip.online
```

Player animation source files should also be optimized before committing. See
`imagegen/README.md` for the player video optimization workflow.

Run the same build locally:

```bash
npm run build
```

If `ffmpeg` is not installed and you only want to test the image pipeline:

```bash
npm run build:images
```

## Local Access

The Compose ports bind to `127.0.0.1`, so the site is only exposed on this machine.

Override ports when needed:

```bash
WEBSITE_PORT=9000 docker compose -f website/compose.yaml up --build website
```

## Cloudflare Tunnel

Start a temporary Cloudflare Quick Tunnel:

```bash
docker compose -f website/compose.yaml --profile tunnel up --build website tunnel
```

Watch the tunnel logs:

```bash
docker compose -f website/compose.yaml logs -f tunnel
```

Open the `https://...trycloudflare.com` URL printed in the logs. Quick Tunnel URLs are temporary and change when the tunnel restarts.

The tunnel forwards to the `website` container over Docker's internal network. The website port remains bound only to `127.0.0.1` on this machine.
