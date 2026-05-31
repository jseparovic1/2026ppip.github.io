To generate the esports-style player promo images from this workspace:

1. Set `OPENAI_API_KEY` in your shell.
2. Install the `openai` package in the active environment if needed.
3. Run the bundled image generation CLI once per player, or use the JSON file here as the prompt source.

Recommended output directory:

`website/assets/player-promos/`

Avatar prompt source:

`imagegen/avatar_promos.json`

Avatar/video promo source:

`imagegen/avatar_video_promos.json`

Generate every avatar from the manifest:

```bash
python imagegen/generate_avatar_batch.py
```

Generate a single avatar by slug, name, or output filename:

```bash
python imagegen/generate_avatar_batch.py --only mario-soco
```

Generate from the avatar/video promo manifest:

```bash
python imagegen/generate_avatar_batch.py --manifest imagegen/avatar_video_promos.json --only mario-soco
```

Original player photos live in the root `players/` directory. Do not copy
source photos into `website/assets/`; website runtime media should stay in
`website/assets/player-promos/`.

Bundled CLI path:

`/Users/juricaseparovic/.codex/skills/.system/imagegen/scripts/image_gen.py`

## Player idle animations

The website can overlay generated player videos on top of the static avatar PNGs.
Static images remain the fallback, so it is safe to generate these gradually.

Replicate model:

`kwaivgi/kling-v3-video`

Kling v3 video uses the player image as `start_image`, so no reference video is required. Keep `--generate-audio` off for website idle loops.

Generated files are written to:

`website/assets/player-avatar-animations/`

The script updates:

`website/player-animations.js`

### Docker Compose

Store secrets in the project root `.env` file:

```bash
REPLICATE_API_TOKEN=your_token_here
```

The default Compose run regenerates Ivan Tomić with the parameters that worked for the first generated player video:

```bash
docker compose -f imagegen/compose.yaml run --rm animations
```

Defaults:

- `PLAYER_SLUG=ivan-tomic`
- `MODE=standard`
- `DURATION=5`
- no audio

Useful runs:

```bash
PLAYER_SLUG=ivan-tomic MODE=standard DURATION=5 docker compose -f imagegen/compose.yaml run --rm animations
PLAYER_SLUG=zeljko-bilic MODE=pro DURATION=5 EXTRA_ARGS=--force docker compose -f imagegen/compose.yaml run --rm animations
PLAYER_SLUG=ivan-tomic MODE=standard DURATION=5 EXTRA_ARGS=--no-data-update docker compose -f imagegen/compose.yaml run --rm animations
```

Use `MODE=standard` for reliable drafts and `MODE=pro` for final-quality retries. If Replicate disconnects during a long render, the generator submits a prediction and polls it by ID, so rerunning the same Compose command is safe.

### Local Python

If you are not using Docker, set `REPLICATE_API_TOKEN`, install `replicate`, then run:

```bash
python imagegen/generate_player_animations.py --slug ivan-tomic --mode standard --duration 5
```
