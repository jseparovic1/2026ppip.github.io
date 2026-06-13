(function () {
  var OFFSET_STORAGE_KEY = "ppip-schedule-offset";
  var OFFSET_LIMIT = 120;
  var DEFAULT_OFFSET_MINUTES = 10;
  var STAGE_LABELS = { "1/4": "Četvrtfinale", "1/2": "Polufinale", F: "Finale" };
  var BRACKET_LABELS = { glavni: "Glavni ždrijeb", utjesni: "Utješni ždrijeb" };
  var FORMAT_LABELS = { "6": "1 set do 6", "2x4": "2 seta do 4" };

  function slugifyPlayerName(name) {
    return name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function parseTime(value) {
    var parts = value.split(":");
    return Number(parts[0]) * 60 + Number(parts[1]);
  }

  function formatTime(totalMinutes) {
    var minutes = ((totalMinutes % 1440) + 1440) % 1440;
    var hours = Math.floor(minutes / 60);
    var rest = minutes % 60;
    return (hours < 10 ? "0" + hours : String(hours)) + ":" + (rest < 10 ? "0" + rest : String(rest));
  }

  function formatOffset(offset) {
    return (offset > 0 ? "+" : "−") + Math.abs(offset) + " min";
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }

  function startScheduleApp() {
    var root = document.getElementById("schedule-app");
    var schedule = window.PPIP_SCHEDULE;
    var players = Array.isArray(window.PPIP_PLAYERS) ? window.PPIP_PLAYERS : [];

    if (!root || !schedule || !Array.isArray(schedule.slots)) {
      return;
    }

    var siteRoot = window.location.pathname.replace(/\/$/, "").endsWith("/raspored") ? "../" : "./";

    function resolveAsset(path) {
      return path ? path.replace(/^\.\//, siteRoot) : path;
    }

    var playersBySlug = {};
    players.forEach(function (player) {
      playersBySlug[slugifyPlayerName(player.name)] = player;
    });

    var surnameCounts = {};
    players.forEach(function (player) {
      var surname = player.name.split(/\s+/).pop();
      surnameCounts[surname] = (surnameCounts[surname] || 0) + 1;
    });

    function shortPlayerName(slug) {
      var player = playersBySlug[slug];
      if (!player) {
        return slug;
      }

      var parts = player.name.split(/\s+/);
      var surname = parts[parts.length - 1];
      if (surnameCounts[surname] > 1) {
        return parts[0].charAt(0) + ". " + surname;
      }
      return surname;
    }

    var filterSlug = "";
    var offsetMinutes = DEFAULT_OFFSET_MINUTES;

    try {
      var rawStoredOffset = window.localStorage.getItem(OFFSET_STORAGE_KEY);
      var storedOffset = Number(rawStoredOffset);
      if (rawStoredOffset !== null && Number.isFinite(storedOffset)) {
        offsetMinutes = Math.max(-OFFSET_LIMIT, Math.min(OFFSET_LIMIT, Math.round(storedOffset / 5) * 5));
      }
    } catch (error) {
      /* localStorage unavailable */
    }

    function persistOffset() {
      try {
        window.localStorage.setItem(OFFSET_STORAGE_KEY, String(offsetMinutes));
      } catch (error) {
        /* localStorage unavailable */
      }
    }

    var slotsWithMinutes = schedule.slots.map(function (slot, index) {
      return Object.assign({}, slot, {
        id: "schedule-slot-" + index,
        startMinutes: parseTime(slot.start),
        endMinutes: parseTime(slot.end),
      });
    });

    var filterableSlugs = [];
    players.forEach(function (player) {
      var slug = slugifyPlayerName(player.name);
      var playsInGroups = slotsWithMinutes.some(function (slot) {
        return slot.players && slot.players.indexOf(slug) !== -1;
      });
      if (playsInGroups) {
        filterableSlugs.push(slug);
      }
    });

    root.innerHTML = [
      '<div class="schedule-toolbar">',
      '  <label class="schedule-filter">',
      '    <span class="schedule-filter-label">Igrač</span>',
      '    <select class="schedule-filter-select" aria-label="Filtriraj raspored po igraču">',
      '      <option value="">Svi igrači</option>',
      filterableSlugs
        .map(function (slug) {
          var player = playersBySlug[slug];
          var label = player ? player.name + (player.nickname ? " · " + player.nickname : "") : slug;
          return '<option value="' + slug + '">' + escapeHtml(label) + "</option>";
        })
        .join(""),
      "    </select>",
      "  </label>",
      '  <div class="schedule-offset" role="group" aria-label="Pomakni raspored">',
      '    <span class="schedule-offset-label">Kasni se?</span>',
      '    <button class="schedule-offset-button" type="button" data-offset-step="-15">−15</button>',
      '    <button class="schedule-offset-button" type="button" data-offset-step="-5">−5</button>',
      '    <button class="schedule-offset-button schedule-offset-reset" type="button" data-offset-reset aria-label="Vrati raspored na original">0</button>',
      '    <button class="schedule-offset-button" type="button" data-offset-step="5">+5</button>',
      '    <button class="schedule-offset-button" type="button" data-offset-step="15">+15</button>',
      '    <span class="schedule-offset-badge" hidden></span>',
      "  </div>",
      "</div>",
      '<p class="schedule-summary" aria-live="polite" hidden></p>',
      '<div class="schedule-timeline"></div>',
      schedule.note ? '<p class="schedule-note">' + escapeHtml(schedule.note) + "</p>" : "",
    ].join("");

    var timeline = root.querySelector(".schedule-timeline");
    var summary = root.querySelector(".schedule-summary");
    var offsetBadge = root.querySelector(".schedule-offset-badge");
    var filterSelect = root.querySelector(".schedule-filter-select");

    filterSelect.addEventListener("change", function () {
      filterSlug = filterSelect.value;
      applyFilter();
    });

    function renderMatchup(slot) {
      return slot.players
        .map(function (slug) {
          var player = playersBySlug[slug];
          var thumb = player && player.image
            ? '<img class="schedule-player-thumb" src="' + resolveAsset(player.image) + '" alt="" loading="lazy">'
            : "";
          return [
            '<button class="schedule-player" type="button" data-filter-slug="' + slug + '"',
            player ? ' title="' + escapeHtml(player.name) + '"' : "",
            ">",
            thumb,
            "<span>" + escapeHtml(shortPlayerName(slug)) + "</span>",
            "</button>",
          ].join("");
        })
        .join('<span class="schedule-vs" aria-hidden="true">vs</span>');
    }

    function renderGroupScore(slot) {
      if (!Array.isArray(slot.score) || slot.score.length !== 2) {
        return "";
      }
      var tiebreak = Array.isArray(slot.tiebreak) && slot.tiebreak.length === 2
        ? ' <small>(' + slot.tiebreak[0] + ":" + slot.tiebreak[1] + ")</small>"
        : "";
      return '<span class="schedule-score">' + slot.score[0] + " : " + slot.score[1] + tiebreak + "</span>";
    }

    function renderSlot(slot) {
      return [
        '<li class="schedule-slot is-group" id="' + slot.id + '">',
        '  <div class="schedule-time">',
        '    <strong data-time-start="' + slot.startMinutes + '">' + formatTime(slot.startMinutes + offsetMinutes) + "</strong>",
        '    <span data-time-end="' + slot.endMinutes + '">' + formatTime(slot.endMinutes + offsetMinutes) + "</span>",
        "  </div>",
        '  <div class="schedule-card">',
        '    <span class="schedule-live-badge" hidden>Uživo</span>',
        '    <span class="schedule-group-badge">Grupa ' + slot.group + "</span>",
        '    <div class="schedule-matchup">' + renderMatchup(slot) + "</div>",
        renderGroupScore(slot),
        "  </div>",
        "</li>",
      ].join("");
    }

    function renderBracketSide(side, isWinner) {
      var player = side && side.player ? playersBySlug[side.player] : null;
      var name = player ? shortPlayerName(side.player) : side && side.label ? side.label : "TBD";
      var hasScore = side && typeof side.score === "number";
      var classes = ["bracket-side"];

      if (!player && !(side && side.label)) {
        classes.push("is-tbd");
      }
      if (isWinner) {
        classes.push("is-winner");
      }

      return [
        '<div class="' + classes.join(" ") + '">',
        '<span class="bracket-side-name">' + escapeHtml(name) + "</span>",
        '<span class="bracket-side-score">' + (hasScore ? side.score : "–") + "</span>",
        "</div>",
      ].join("");
    }

    function renderBracketMatch(slot) {
      var sides = Array.isArray(slot.sides) && slot.sides.length === 2 ? slot.sides : [null, null];
      var scoreA = sides[0] && typeof sides[0].score === "number" ? sides[0].score : null;
      var scoreB = sides[1] && typeof sides[1].score === "number" ? sides[1].score : null;
      var winnerIndex = scoreA !== null && scoreB !== null && scoreA !== scoreB ? (scoreA > scoreB ? 0 : 1) : -1;

      return [
        '<article class="bracket-match" id="' + slot.id + '">',
        '<div class="bracket-match-meta">',
        '<span class="bracket-match-time">',
        '<strong data-time-start="' + slot.startMinutes + '">' + formatTime(slot.startMinutes + offsetMinutes) + "</strong>",
        '<span class="bracket-time-sep" aria-hidden="true">–</span>',
        '<span data-time-end="' + slot.endMinutes + '">' + formatTime(slot.endMinutes + offsetMinutes) + "</span>",
        "</span>",
        '<span class="schedule-live-badge" hidden>Uživo</span>',
        slot.format ? '<span class="bracket-match-format">' + (FORMAT_LABELS[slot.format] || slot.format) + "</span>" : "",
        "</div>",
        renderBracketSide(sides[0], winnerIndex === 0),
        renderBracketSide(sides[1], winnerIndex === 1),
        "</article>",
      ].join("");
    }

    var ROUND_ORDER = ["1/4", "1/2", "F"];

    function renderBracket(bracketKey, slots) {
      var rounds = ROUND_ORDER.map(function (stage) {
        return slots.filter(function (slot) {
          return slot.stage === stage;
        });
      }).filter(function (round) {
        return round.length > 0;
      });

      var roundsHtml = rounds
        .map(function (roundSlots) {
          var pairs = [];
          for (var index = 0; index < roundSlots.length; index += 2) {
            pairs.push(roundSlots.slice(index, index + 2));
          }

          var pairsHtml = pairs
            .map(function (pair) {
              var pairClass = pair.length === 2 ? "bracket-pair bracket-pair-joined" : "bracket-pair";
              return '<div class="' + pairClass + '">' + pair.map(renderBracketMatch).join("") + "</div>";
            })
            .join("");

          return [
            '<div class="bracket-round">',
            '<h5 class="bracket-round-title">' + (STAGE_LABELS[roundSlots[0].stage] || roundSlots[0].stage) + "</h5>",
            '<div class="bracket-round-matches">' + pairsHtml + "</div>",
            "</div>",
          ].join("");
        })
        .join("");

      return [
        '<div class="schedule-bracket schedule-bracket-' + bracketKey + '">',
        '<h4 class="schedule-bracket-title">' + (BRACKET_LABELS[bracketKey] || bracketKey) + "</h4>",
        '<div class="bracket-grid">' + roundsHtml + "</div>",
        "</div>",
      ].join("");
    }

    function renderTimeline() {
      var groupSlots = slotsWithMinutes.filter(function (slot) {
        return slot.phase === "grupe";
      });
      var glavniSlots = slotsWithMinutes.filter(function (slot) {
        return slot.phase === "zavrsnica" && slot.bracket === "glavni";
      });
      var utjesniSlots = slotsWithMinutes.filter(function (slot) {
        return slot.phase === "zavrsnica" && slot.bracket === "utjesni";
      });

      timeline.innerHTML = [
        '<section class="schedule-phase" aria-label="Grupna faza">',
        '  <h3 class="schedule-phase-title"><span>Grupna faza</span><small>3 utakmice po igraču · 15 min</small></h3>',
        '  <ol class="schedule-list">' + groupSlots.map(renderSlot).join("") + "</ol>",
        "</section>",
        '<section class="schedule-phase" aria-label="Završnica">',
        '  <h3 class="schedule-phase-title"><span>Završnica</span><small class="schedule-phase-hint"></small></h3>',
        '  <div class="schedule-brackets">',
        renderBracket("glavni", glavniSlots),
        renderBracket("utjesni", utjesniSlots),
        "  </div>",
        "</section>",
      ].join("");
    }

    function applyFilter() {
      var matchCount = 0;
      var matchTimes = [];
      var matchGroup = "";

      slotsWithMinutes.forEach(function (slot) {
        var element = document.getElementById(slot.id);
        if (!element) {
          return;
        }

        if (slot.phase !== "grupe" || !filterSlug) {
          element.classList.remove("is-filtered-out");
          return;
        }

        var playsHere = slot.players.indexOf(filterSlug) !== -1;
        element.classList.toggle("is-filtered-out", !playsHere);

        if (playsHere) {
          matchCount += 1;
          matchTimes.push(formatTime(slot.startMinutes + offsetMinutes));
          matchGroup = slot.group;
        }
      });

      if (filterSelect.value !== filterSlug) {
        filterSelect.value = filterSlug;
      }

      var phaseHint = root.querySelector(".schedule-phase-hint");
      if (phaseHint) {
        phaseHint.textContent = filterSlug ? "Ovisi o plasmanu u grupi" : "Parovi se znaju nakon grupa";
      }

      if (!filterSlug) {
        summary.hidden = true;
        summary.textContent = "";
        return;
      }

      var player = playersBySlug[filterSlug];
      var displayName = player ? player.nickname || player.name : filterSlug;
      summary.hidden = false;
      summary.textContent =
        displayName + " igra " + matchCount + " utakmice u grupi " + matchGroup + " · " + matchTimes.join(" · ");
    }

    function applyOffset() {
      root.querySelectorAll("[data-time-start]").forEach(function (element) {
        element.textContent = formatTime(Number(element.getAttribute("data-time-start")) + offsetMinutes);
      });
      root.querySelectorAll("[data-time-end]").forEach(function (element) {
        element.textContent = formatTime(Number(element.getAttribute("data-time-end")) + offsetMinutes);
      });

      offsetBadge.hidden = offsetMinutes === 0;
      offsetBadge.textContent = offsetMinutes === 0 ? "" : formatOffset(offsetMinutes);
      root.classList.toggle("is-offset-active", offsetMinutes !== 0);

      var resetButton = root.querySelector("[data-offset-reset]");
      if (resetButton) {
        resetButton.classList.toggle("is-active", offsetMinutes === 0);
      }
    }

    function isTournamentDay(now) {
      if (!schedule.tournamentDate) {
        return false;
      }

      var pad = function (value) {
        return value < 10 ? "0" + value : String(value);
      };
      var today = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate());
      return today === schedule.tournamentDate;
    }

    function updateLiveStatuses() {
      var now = new Date();
      var liveDay = isTournamentDay(now);
      var nowMinutes = now.getHours() * 60 + now.getMinutes();

      slotsWithMinutes.forEach(function (slot) {
        var element = document.getElementById(slot.id);
        if (!element) {
          return;
        }

        var liveBadge = element.querySelector(".schedule-live-badge");
        var start = slot.startMinutes + offsetMinutes;
        var end = slot.endMinutes + offsetMinutes;
        var isDone = liveDay && nowMinutes >= end;
        var isLive = liveDay && nowMinutes >= start && nowMinutes < end;

        element.classList.toggle("is-done", isDone);
        element.classList.toggle("is-live", isLive);
        if (liveBadge) {
          liveBadge.hidden = !isLive;
        }
      });
    }

    root.addEventListener("click", function (event) {
      var chip = event.target.closest("[data-filter-slug]");
      if (chip) {
        var nextSlug = chip.getAttribute("data-filter-slug");
        filterSlug = filterSlug === nextSlug ? "" : nextSlug;
        applyFilter();
        return;
      }

      var stepButton = event.target.closest("[data-offset-step]");
      if (stepButton) {
        var step = Number(stepButton.getAttribute("data-offset-step"));
        offsetMinutes = Math.max(-OFFSET_LIMIT, Math.min(OFFSET_LIMIT, offsetMinutes + step));
        persistOffset();
        applyOffset();
        applyFilter();
        updateLiveStatuses();
        return;
      }

      if (event.target.closest("[data-offset-reset]")) {
        offsetMinutes = 0;
        persistOffset();
        applyOffset();
        applyFilter();
        updateLiveStatuses();
      }
    });

    renderTimeline();
    applyOffset();
    applyFilter();
    updateLiveStatuses();
    window.setInterval(updateLiveStatuses, 30000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startScheduleApp, { once: true });
  } else {
    startScheduleApp();
  }
})();
