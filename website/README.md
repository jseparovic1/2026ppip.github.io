# PPiP Website

Static website runtime for the PPiP Spring Edition page. Generated media lives in `website/assets/`; generation tooling lives in `imagegen/`.

## Development

Run the local development server:

```bash
docker compose -f website/compose.yaml up --build website
```

Open:

```text
http://localhost:8123
http://127.0.0.1:8123
```

The service builds a static Nginx image from the multi-stage `Dockerfile`. Re-run with `--build` after changing site files.

## Deployment

GitHub Actions builds an optimized `dist/website/` artifact from this `website/` directory and deploys that artifact to GitHub Pages on pushes to `main`.
The `CNAME` file configures the custom domain:

```text
ppip.online
```

The build keeps source media unchanged, strips dotfiles from deployable assets, converts deploy images to WebP, and recompresses deploy videos with `ffmpeg`.

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
