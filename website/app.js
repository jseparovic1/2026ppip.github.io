(function () {
  function setupHeroNavReveal() {
    const hero = document.querySelector(".hero");
    const deferredNav = document.querySelector(".route-nav-after-hero");

    if (!hero || !deferredNav) {
      return;
    }

    function updateNavVisibility() {
      document.body.classList.toggle("is-past-hero", hero.getBoundingClientRect().bottom <= 0);
    }

    updateNavVisibility();
    window.addEventListener("scroll", updateNavVisibility, { passive: true });
    window.addEventListener("resize", updateNavVisibility);
  }

  function loadPlayerData(callback) {
    const existingScript = document.querySelector('script[src$="player-data.js"]');
    const script = existingScript || document.createElement("script");

    script.addEventListener("load", callback, { once: true });
    script.addEventListener(
      "error",
      function () {
        callback();
      },
      { once: true },
    );

    if (!existingScript) {
      script.src = "./player-data.js";
      document.head.appendChild(script);
    }
  }

  function startApp() {
  const players = (Array.isArray(window.PPIP_PLAYERS) ? window.PPIP_PLAYERS : []).filter(function (player) {
    return player.active !== false;
  });
  const playerShowcase = document.getElementById("player-showcase");
  const playerCount = document.getElementById("player-count");
  const playerAnimations = window.PPIP_PLAYER_ANIMATIONS || {};

  if (playerCount) {
    playerCount.textContent = String(players.length || 0);
  }

  if (!playerShowcase) {
    return;
  }

  if (!players.length) {
    playerShowcase.innerHTML = '<p class="empty-state">Podaci o igračima još nisu učitani.</p>';
    return;
  }

  function shuffleRoster(input) {
    const roster = input.slice();

    for (let index = roster.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      const current = roster[index];
      roster[index] = roster[swapIndex];
      roster[swapIndex] = current;
    }

    return roster;
  }

  const shuffledPlayers = shuffleRoster(players);
  let selectedIndex = 0;
  let previewIndex = null;
  let transitionToken = 0;
  let featuredVideoObserver = null;

  function getConnectionInfo() {
    return navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
  }

  function canAutoLoadFeaturedVideo() {
    const connection = getConnectionInfo();

    return !(connection && connection.saveData);
  }

  function shouldLazyLoadFeaturedVideo() {
    const connection = getConnectionInfo();
    const isTouchViewport = window.matchMedia && window.matchMedia("(hover: none), (pointer: coarse)").matches;
    const effectiveType = connection && connection.effectiveType ? connection.effectiveType : "";

    return isTouchViewport || effectiveType === "3g";
  }

  function slugifyPlayerName(name) {
    return name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function getInitials(name) {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(function (part) {
        return part.charAt(0);
      })
      .join("")
      .toUpperCase();
  }

  const playersWithSlugs = shuffledPlayers.map(function (player) {
    const slug = slugifyPlayerName(player.name);

    return Object.assign({}, player, {
      slug: slug,
      animation: player.animation || playerAnimations[slug] || null,
    });
  });
  const shouldScrollToInitialPlayer = /^#(?:igrac|player)=.+$/.test(window.location.hash || "");

  function getDisplayedIndex() {
    return previewIndex === null ? selectedIndex : previewIndex;
  }

  function updateUrlForPlayer(player) {
    const hash = "#igrac=" + player.slug;
    if (window.location.hash !== hash) {
      window.history.replaceState(null, "", hash);
    }
  }

  function getInitialSelectedIndex() {
    const hash = window.location.hash || "";
    const match = hash.match(/^#(?:igrac|player)=(.+)$/);
    if (!match) {
      return 0;
    }

    const slug = decodeURIComponent(match[1]);
    const foundIndex = playersWithSlugs.findIndex(function (player) {
      return player.slug === slug;
    });

    return foundIndex >= 0 ? foundIndex : 0;
  }

  selectedIndex = getInitialSelectedIndex();

  playerShowcase.innerHTML = [
    '<div class="player-sidebar player-sidebar-top" aria-label="Odabir igrača">',
    '  <button class="player-picker-control player-picker-control-prev" type="button" id="player-picker-prev">',
    '    <span class="sr-only" id="player-picker-prev-name"></span>',
    "  </button>",
    '  <div class="player-picker-current" aria-live="polite">',
    '    <span>Trenutni igrač</span>',
    '    <strong id="player-picker-current-name"></strong>',
    '    <small id="player-picker-current-meta"></small>',
    "  </div>",
    '  <button class="player-picker-control player-picker-control-next" type="button" id="player-picker-next">',
    '    <span class="sr-only" id="player-picker-next-name"></span>',
    "  </button>",
    "</div>",
    '<article class="featured-player is-visible" id="featured-player"></article>',
  ].join("");

  const featuredPlayer = document.getElementById("featured-player");
  const playerPickerPrev = document.getElementById("player-picker-prev");
  const playerPickerNext = document.getElementById("player-picker-next");
  const playerPickerPrevName = document.getElementById("player-picker-prev-name");
  const playerPickerNextName = document.getElementById("player-picker-next-name");
  const playerPickerCurrentName = document.getElementById("player-picker-current-name");
  const playerPickerCurrentMeta = document.getElementById("player-picker-current-meta");

  function renderFeaturedPlayer(player, index) {
    teardownFeaturedVideo();
    featuredPlayer.style.setProperty("--card-accent", "var(--gold)");
    featuredPlayer.style.setProperty("--focus", player.focus || "center top");
    featuredPlayer.style.setProperty("--image-fit", player.imageFit || "contain");
    featuredPlayer.style.setProperty("--image-scale", player.imageScale || "0.94");
    const playerWeapon = player.weapon || "Nije upisano";
    const playerWeakness = player.weakness || "Nije upisano";
    const playerQuote = player.quote
      ? '  <blockquote class="featured-quote">"' + player.quote + '"</blockquote>'
      : "";
    const playerMedia = player.animation && player.image
      ? [
          '    <img class="player-image featured-image player-image-fallback" src="' + player.image + '" alt="Portret igrača ' + player.name + '">',
          '    <video class="player-image featured-image player-video" muted loop playsinline webkit-playsinline preload="none" poster="' + player.image + '" data-video-src="' + player.animation + '" aria-hidden="true">',
          '      <source data-src="' + player.animation + '" type="video/mp4">',
          "    </video>",
        ].join("")
      : player.image
        ? '    <img class="player-image featured-image" src="' + player.image + '" alt="Portret igrača ' + player.name + '">'
        : '    <div class="player-image featured-image player-image-placeholder" role="img" aria-label="Igrač ' + player.name + '"><span>' + getInitials(player.name) + "</span></div>";

    featuredPlayer.innerHTML = [
      '<div class="featured-orbit" aria-hidden="true"></div>',
      '<div class="featured-image-panel">',
      '  <div class="racket-handle" aria-hidden="true"></div>',
      '  <div class="player-image-wrap featured-image-wrap">',
      playerMedia,
      "  </div>",
      "</div>",
      '<div class="featured-copy">',
      '  <h3 class="featured-name">' + player.nickname + "</h3>",
      '  <p class="player-nickname">' + player.name + "</p>",
      playerQuote,
      '  <div class="featured-detail-grid">',
      '    <div><span class="meta-label">Oružje</span><strong>' + playerWeapon + "</strong></div>",
      '    <div><span class="meta-label">Mana</span><strong>' + playerWeakness + "</strong></div>",
      "  </div>",
      "</div>",
    ].join("");

    prepareFeaturedVideo();
  }

  function prepareFeaturedVideo() {
    const video = featuredPlayer.querySelector(".player-video");
    if (!video) {
      return;
    }

    if (!canAutoLoadFeaturedVideo()) {
      video.classList.add("is-disabled");
      return;
    }

    const loadVideo = function () {
      const source = video.querySelector("source");
      if (!source || source.src) {
        return;
      }

      source.src = source.dataset.src || video.dataset.videoSrc || "";
      video.load();
    };

    const playVideo = function () {
      loadVideo();
      video.play().catch(function () {});
    };

    video.addEventListener("loadeddata", function () {
      video.classList.add("is-ready");
      video.play().catch(function () {});
    });

    video.addEventListener(
      "error",
      function () {
        video.classList.remove("is-ready");
      },
      true,
    );

    featuredVideoObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            playVideo();
          } else {
            video.pause();
          }
        });
      },
      {
        threshold: 0.24,
        rootMargin: shouldLazyLoadFeaturedVideo() ? "160px 0px" : "360px 0px",
      }
    );

    featuredVideoObserver.observe(video);

  }

  function teardownFeaturedVideo() {
    const video = featuredPlayer && featuredPlayer.querySelector(".player-video");

    if (featuredVideoObserver) {
      featuredVideoObserver.disconnect();
      featuredVideoObserver = null;
    }

    if (!video) {
      return;
    }

    video.pause();
    video.removeAttribute("src");
    video.querySelectorAll("source").forEach(function (source) {
      source.removeAttribute("src");
    });
    video.load();
  }

  function updateSelectorState() {
    const displayedIndex = getDisplayedIndex();
    const previousIndex = (displayedIndex - 1 + playersWithSlugs.length) % playersWithSlugs.length;
    const nextIndex = (displayedIndex + 1) % playersWithSlugs.length;
    const currentPlayer = playersWithSlugs[displayedIndex];
    playerPickerPrevName.textContent = playersWithSlugs[previousIndex].name;
    playerPickerNextName.textContent = playersWithSlugs[nextIndex].name;
    playerPickerCurrentName.textContent = currentPlayer.name;
    playerPickerCurrentMeta.textContent = currentPlayer.nickname || currentPlayer.name;
    playerPickerPrev.setAttribute("aria-label", "Prethodni igrač: " + playersWithSlugs[previousIndex].name);
    playerPickerNext.setAttribute("aria-label", "Sljedeći igrač: " + playersWithSlugs[nextIndex].name);
  }

  function getGroupPointsBySlug() {
    const schedule = window.PPIP_SCHEDULE;
    const pointsBySlug = {};

    if (!schedule || !Array.isArray(schedule.slots)) {
      return pointsBySlug;
    }

    schedule.slots.forEach(function (slot) {
      if (slot.phase !== "grupe" || !Array.isArray(slot.players) || !Array.isArray(slot.score) || slot.score.length !== 2) {
        return;
      }

      const winnerSlug = slot.score[0] > slot.score[1] ? slot.players[0] : slot.score[1] > slot.score[0] ? slot.players[1] : "";
      if (winnerSlug) {
        pointsBySlug[winnerSlug] = (pointsBySlug[winnerSlug] || 0) + 1;
      }
    });

    return pointsBySlug;
  }

  function hydrateGroupPoints() {
    const pointsBySlug = getGroupPointsBySlug();

    document.querySelectorAll(".group-player-link[data-player-slug]").forEach(function (link) {
      const slug = link.getAttribute("data-player-slug");

      if (!slug || link.querySelector(".group-player-points")) {
        return;
      }

      const points = document.createElement("span");
      points.className = "group-player-points";
      points.textContent = String(pointsBySlug[slug] || 0);
      points.setAttribute("aria-label", (pointsBySlug[slug] || 0) + " bodova");
      link.appendChild(points);
    });
  }

  function scrollSelectorToIndex(index) {
    updateSelectorState();
  }

  function scrollToPlayersSection(options) {
    const playersSection = document.getElementById("players");
    const target = playersSection || playerShowcase;
    const behavior = options && options.behavior ? options.behavior : "smooth";

    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: behavior, block: "start" });
  }

  function scheduleInitialPlayerScroll() {
    const scroll = function () {
      scrollToPlayersSection({ behavior: "auto" });
    };

    window.requestAnimationFrame(function () {
      scroll();
      window.setTimeout(scroll, 180);
    });
  }

  function restartAnimation(element, className, duration) {
    if (!element) {
      return;
    }

    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);

    window.setTimeout(function () {
      element.classList.remove(className);
    }, duration);
  }

  function triggerSelectionAnimation(index) {
    restartAnimation(playerPickerPrev, "is-clicked", 500);
    restartAnimation(playerPickerNext, "is-clicked", 500);
    restartAnimation(featuredPlayer, "is-player-switching", 880);
  }

  function transitionToPlayer(index, options) {
    const shouldForce = Boolean(options && options.force);
    if (!shouldForce && index === getDisplayedIndex()) {
      return;
    }

    transitionToken += 1;
    const currentToken = transitionToken;
    const player = playersWithSlugs[index];
    updateSelectorState();
    featuredPlayer.classList.add("is-transitioning");

    window.setTimeout(function () {
      if (currentToken !== transitionToken) {
        return;
      }

      renderFeaturedPlayer(player, index);

      window.requestAnimationFrame(function () {
        if (currentToken !== transitionToken) {
          return;
        }
        featuredPlayer.classList.remove("is-transitioning");
      });
    }, 150);
  }

  function buildSelector() {
    updateSelectorState();
  }

  function selectPlayerByOffset(offset) {
    const nextIndex = (selectedIndex + offset + playersWithSlugs.length) % playersWithSlugs.length;
    const player = playersWithSlugs[nextIndex];
    selectedIndex = nextIndex;
    previewIndex = null;
    updateUrlForPlayer(player);
    triggerSelectionAnimation(nextIndex);
    transitionToPlayer(nextIndex, { force: true });
    scrollSelectorToIndex(nextIndex);
  }

  function selectPlayerBySlug(slug) {
    const nextIndex = playersWithSlugs.findIndex(function (player) {
      return player.slug === slug;
    });

    if (nextIndex < 0) {
      return false;
    }

    selectedIndex = nextIndex;
    previewIndex = null;
    updateUrlForPlayer(playersWithSlugs[nextIndex]);
    triggerSelectionAnimation(nextIndex);
    transitionToPlayer(nextIndex, { force: true });
    scrollSelectorToIndex(nextIndex);
    scrollToPlayersSection({ behavior: "smooth" });
    return true;
  }

  playerPickerPrev.addEventListener("click", function () {
    selectPlayerByOffset(-1);
  });

  playerPickerNext.addEventListener("click", function () {
    selectPlayerByOffset(1);
  });

  hydrateGroupPoints();

  document.querySelectorAll("[data-player-slug]").forEach(function (link) {
    link.addEventListener("click", function (event) {
      const slug = link.getAttribute("data-player-slug");
      if (slug && selectPlayerBySlug(slug)) {
        event.preventDefault();
      }
    });
  });

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.18,
      rootMargin: "0px 0px -40px 0px",
    }
  );

  renderFeaturedPlayer(playersWithSlugs[selectedIndex], selectedIndex);
  buildSelector();
  observer.observe(featuredPlayer);

  if (shouldScrollToInitialPlayer) {
    scheduleInitialPlayerScroll();
  }

  }

  setupHeroNavReveal();

  if (Array.isArray(window.PPIP_PLAYERS)) {
    startApp();
    return;
  }

  loadPlayerData(startApp);
})();
