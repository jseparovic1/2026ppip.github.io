/* global window, document */
(function () {
  const oddsList = document.getElementById("standalone-odds-list");
  const siteRoot = window.location.pathname.replace(/\/$/, "").endsWith("/bets") ? "../" : "./";
  const oddsOrder = [
    "mario-soco",
    "franko-miocic",
    "filip-ivis",
    "antonio-jonjic",
    "jurica-separovic",
    "vanja-lopusinsky",
    "ivan-tomic",
    "ian-miocic",
    "marko-dragunic",
    "mateo-gugic",
    "borna-katavic",
    "ivan-martinac",
    "zeljko-bilic",
    "antonio-rajkovic",
    "marko-martinovic",
    "borna-mesin",
  ];

  function slugifyPlayerName(name) {
    return name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function getOddsSortValue(odds) {
    if (odds === "∞") {
      return Number.POSITIVE_INFINITY;
    }

    const value = Number(String(odds || "").replace(",", "."));
    return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
  }

  function resolveSitePath(path) {
    if (!path || !path.startsWith("./")) {
      return path || "";
    }

    return siteRoot + path.slice(2);
  }

  function renderOdds() {
    if (!oddsList) {
      return;
    }

    const players = (Array.isArray(window.PPIP_PLAYERS) ? window.PPIP_PLAYERS : [])
      .filter(function (player) {
        return player.active !== false;
      })
      .map(function (player, index) {
        return Object.assign({}, player, {
          rosterIndex: index,
          slug: slugifyPlayerName(player.name),
        });
      })
      .sort(function (first, second) {
        return getOddsSortValue(first.odds) - getOddsSortValue(second.odds) || oddsOrder.indexOf(first.slug) - oddsOrder.indexOf(second.slug);
      });

    if (!players.length) {
      oddsList.innerHTML = '<li class="standalone-odds-empty">Koeficijenti još nisu učitani.</li>';
      return;
    }

    oddsList.innerHTML = players
      .map(function (player) {
        return [
          '<li class="standalone-odds-row">',
          '  <a href="' + siteRoot + '#igrac=' + player.slug + '" class="standalone-odds-link">',
          player.image
            ? '    <img src="' + resolveSitePath(player.image) + '" alt="" class="standalone-odds-avatar">'
            : '    <span class="standalone-odds-avatar"></span>',
          '    <span class="standalone-odds-name">' + player.name + "</span>",
          '    <strong class="standalone-odds-value">' + (player.odds || "-") + "</strong>",
          "  </a>",
          "</li>",
        ].join("");
      })
      .join("");
  }

  renderOdds();
})();
