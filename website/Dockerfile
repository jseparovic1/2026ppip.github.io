FROM alpine:3.20 AS site

WORKDIR /site

COPY index.html bets.html app.js odds.js player-animations.js player-data.js styles.css ./
COPY assets ./assets
COPY bets ./bets

RUN test -f index.html && test -d assets

FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=site /site/ /usr/share/nginx/html/
