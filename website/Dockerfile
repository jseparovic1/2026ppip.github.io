FROM alpine:3.20 AS site

WORKDIR /site

COPY index.html bets.html raspored.html app.js odds.js player-animations.js player-data.js schedule-data.js schedule.js styles.css ./
COPY public ./public
COPY bets ./bets
COPY raspored ./raspored

RUN test -f index.html && test -d public/assets

FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=site /site/ /usr/share/nginx/html/
