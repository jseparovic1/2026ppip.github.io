/* global window */
(function () {
  // Rezultati se dodaju naknadno, izravno u podatke:
  //  - grupna utakmica:  score: [6, 3]  (gemovi, istim redoslijedom kao "players")
  //  - utakmica završnice:  sides: [
  //      { player: "jurica-separovic", score: 2 },
  //      { player: "mario-soco", score: 0 }
  //    ]
  //    "player" je slug igrača; dok igrač nije poznat može i { label: "1. Grupa A" }.
  var schedule = {
    tournamentDate: "2026-06-13",
    note: "Okvirni raspored — vremena su podložna promjenama.",
    slots: [
      { start: "10:00", end: "10:15", phase: "grupe", group: "A", players: ["antonio-rajkovic", "vanja-lopusinsky"], score: [3, 4], tiebreak: [1, 5] },
      { start: "10:15", end: "10:30", phase: "grupe", group: "B", players: ["marko-dragunic", "borna-katavic"], score: [3, 4], tiebreak: [1, 5] },
      { start: "10:30", end: "10:45", phase: "grupe", group: "D", players: ["filip-ivis", "zeljko-bilic"], score: [0, 4] },
      { start: "10:45", end: "11:00", phase: "grupe", group: "B", players: ["marko-dragunic", "ivan-martinac"], score: [4, 3], tiebreak: [5, 2] },
      { start: "11:00", end: "11:15", phase: "grupe", group: "D", players: ["filip-ivis", "ivan-tomic"], score: [0, 4] },
      { start: "11:15", end: "11:30", phase: "grupe", group: "B", players: ["marko-dragunic", "marko-martinovic"], score: [4, 0] },
      { start: "11:30", end: "11:45", phase: "grupe", group: "D", players: ["filip-ivis", "mario-soco"], score: [2, 4] },
      { start: "11:45", end: "12:00", phase: "grupe", group: "C", players: ["borna-mesin", "jurica-separovic"], score: [2, 4] },
      { start: "12:00", end: "12:15", phase: "grupe", group: "D", players: ["zeljko-bilic", "ivan-tomic"], score: [4, 1] },
      { start: "12:15", end: "12:30", phase: "grupe", group: "A", players: ["ian-miocic", "vanja-lopusinsky"], score: [4, 3] },
      { start: "12:30", end: "12:45", phase: "grupe", group: "C", players: ["mateo-gugic", "borna-mesin"], score: [4, 0] },
      { start: "12:45", end: "13:00", phase: "grupe", group: "B", players: ["ivan-martinac", "borna-katavic"], score: [0, 4] },
      { start: "13:00", end: "13:15", phase: "grupe", group: "D", players: ["mario-soco", "ivan-tomic"], score: [4, 0] },
      { start: "13:15", end: "13:30", phase: "grupe", group: "A", players: ["antonio-rajkovic", "ian-miocic"], score: [4, 0] },
      { start: "13:30", end: "13:45", phase: "grupe", group: "B", players: ["borna-katavic", "marko-martinovic"], score: [4, 3] },
      { start: "13:45", end: "14:00", phase: "grupe", group: "C", players: ["mateo-gugic", "jurica-separovic"], score: [2, 4] },
      { start: "14:00", end: "14:15", phase: "grupe", group: "B", players: ["ivan-martinac", "marko-martinovic"] },
      { start: "14:15", end: "14:30", phase: "grupe", group: "D", players: ["mario-soco", "zeljko-bilic"] },
      { start: "14:30", end: "14:45", phase: "grupe", group: "C", players: ["antonio-jonjic", "borna-mesin"] },
      { start: "14:45", end: "15:00", phase: "grupe", group: "C", players: ["antonio-jonjic", "mateo-gugic"] },
      { start: "15:00", end: "15:15", phase: "grupe", group: "A", players: ["franko-miocic", "ian-miocic"] },
      { start: "15:15", end: "15:30", phase: "grupe", group: "A", players: ["franko-miocic", "antonio-rajkovic"] },
      { start: "15:30", end: "15:45", phase: "grupe", group: "C", players: ["antonio-jonjic", "jurica-separovic"] },
      { start: "15:45", end: "16:00", phase: "grupe", group: "A", players: ["franko-miocic", "vanja-lopusinsky"] },
      { start: "16:00", end: "16:20", phase: "zavrsnica", stage: "1/4", bracket: "glavni", format: "6" },
      { start: "16:20", end: "16:40", phase: "zavrsnica", stage: "1/4", bracket: "glavni", format: "6" },
      { start: "16:40", end: "17:00", phase: "zavrsnica", stage: "1/4", bracket: "glavni", format: "6" },
      { start: "17:00", end: "17:20", phase: "zavrsnica", stage: "1/4", bracket: "glavni", format: "6" },
      { start: "17:20", end: "17:40", phase: "zavrsnica", stage: "1/2", bracket: "utjesni", format: "6" },
      { start: "17:40", end: "18:00", phase: "zavrsnica", stage: "1/2", bracket: "utjesni", format: "6" },
      { start: "18:00", end: "18:30", phase: "zavrsnica", stage: "1/2", bracket: "glavni", format: "2x4" },
      { start: "18:30", end: "19:00", phase: "zavrsnica", stage: "1/2", bracket: "glavni", format: "2x4" },
      { start: "19:00", end: "19:30", phase: "zavrsnica", stage: "F", bracket: "utjesni", format: "2x4" },
      { start: "19:30", end: "20:00", phase: "zavrsnica", stage: "F", bracket: "glavni", format: "2x4" }
    ]
  };

  window.PPIP_SCHEDULE = schedule;
})();
