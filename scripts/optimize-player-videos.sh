#!/usr/bin/env sh
set -eu

for file in website/assets/player-avatar-animations/*.mp4; do
  tmp="${file%.mp4}.mobile.mp4"
  echo "optimizing ${file}"

  ffmpeg \
    -y \
    -hide_banner \
    -loglevel error \
    -i "${file}" \
    -an \
    -vf "scale='min(540,iw)':-2" \
    -r 24 \
    -c:v libx264 \
    -profile:v baseline \
    -level 3.1 \
    -preset slow \
    -crf 30 \
    -maxrate 1400k \
    -bufsize 2800k \
    -pix_fmt yuv420p \
    -movflags +faststart \
    "${tmp}"

  mv "${tmp}" "${file}"
done
