/* Clean Air Litigation Database — client app */
(function () {
  "use strict";

  var state = { cases: [], world: null, isoA2: {}, search: "", status: "", juris: "", country: "" };

  /* bandiere: circle-flags (MIT) via jsDelivr; iso_n3 -> alpha-2 da data/iso-a2.json */
  var FLAG_CDN = "https://cdn.jsdelivr.net/gh/HatScripts/circle-flags@2.7.0/flags/";
  function flagImg(iso) {
    var a2 = state.isoA2[iso];
    if (!a2) return "";
    return '<img class="flag" src="' + FLAG_CDN + a2 + '.svg" alt="" width="16" height="16" loading="lazy">';
  }
  var ICON_LANDMARK = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 18v-7"/><path d="M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M3 22h18"/><path d="M6 18v-7"/></svg>';

  function statusGroup(s) {
    var t = (s || "").toLowerCase();
    if (t.indexOf("enforcement") !== -1 || t.indexOf("execution") !== -1) return "enforce";
    if (t.indexOf("pending") !== -1) return "pending";
    return "decided";
  }
  function statusClass(s) { return statusGroup(s); }
  function esc(x) {
    return String(x == null ? "" : x).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- data ---------- */
  Promise.all([
    fetch("data/cases.json").then(function (r) { return r.json(); }),
    fetch("data/countries-110m.json").then(function (r) { return r.json(); }),
    fetch("data/iso-a2.json").then(function (r) { return r.json(); }).catch(function () { return {}; })
  ]).then(function (res) {
    state.cases = res[0];
    state.world = res[1];
    state.isoA2 = res[2] || {};
    init();
  }).catch(function (e) {
    var el = document.getElementById("case-list");
    if (el) el.innerHTML = '<li class="no-results" style="display:block">Could not load the dataset (' + esc(e && e.message) + ").</li>";
  });

  function counts() {
    var byCountry = {}, byJuris = { CJEU: 0, ECtHR: 0, UN: 0, Domestic: 0 };
    state.cases.forEach(function (c) {
      var k = c.geography.iso_n3;
      byCountry[k] = (byCountry[k] || 0) + 1;
      byJuris[c.jurisdiction.type] = (byJuris[c.jurisdiction.type] || 0) + 1;
    });
    return { byCountry: byCountry, byJuris: byJuris };
  }
  function countryName(iso) {
    var c = state.cases.filter(function (x) { return x.geography.iso_n3 === iso; })[0];
    return c ? c.geography.country : iso;
  }

  /* ---------- init ---------- */
  function init() {
    var cn = counts();
    document.getElementById("stat-cases").textContent = state.cases.length;
    document.getElementById("stat-countries").textContent = Object.keys(cn.byCountry).length;
    document.getElementById("stat-intl").textContent = (cn.byJuris.CJEU || 0) + (cn.byJuris.ECtHR || 0) + (cn.byJuris.UN || 0);

    drawMap(cn.byCountry);
    drawCourts(cn.byJuris);
    drawCountryList(cn.byCountry);

    document.getElementById("f-search").addEventListener("input", function () { state.search = this.value; renderList(); });
    document.getElementById("f-status").addEventListener("change", function () { state.status = this.value; renderList(); });
    document.getElementById("f-juris").addEventListener("change", function () { state.juris = this.value; syncSide(); renderList(); });
    document.getElementById("f-country").addEventListener("click", function () { setCountry(""); });

    window.addEventListener("hashchange", route);
    route();
  }

  /* ---------- map ---------- */
  function drawMap(byCountry) {
    var svg = d3.select("#map");
    var W = 960, H = 500;
    var geo = topojson.feature(state.world, state.world.objects.countries);
    var proj = d3.geoNaturalEarth1().fitExtent([[8, 8], [W - 8, H - 8]], geo);
    var path = d3.geoPath(proj);
    // CSS variables, not computed values, so the map follows a theme change without redrawing
    var ramp = ["var(--map-1)", "var(--map-2)", "var(--map-3)", "var(--map-4)"];
    var zero = "var(--map-0)";
    // fixed thresholds: case counts are heavily skewed, equal-width bands would flatten all but the top country
    var BREAKS = [1, 2, 4, 10];
    var LABELS = ["1", "2–3", "4–9", "10+"];
    function bucket(n) {
      for (var i = BREAKS.length - 1; i >= 0; i--) { if (n >= BREAKS[i]) return i; }
      return -1;
    }
    function fill(n) {
      var b = bucket(n || 0);
      return b < 0 ? zero : ramp[b];
    }
    var tip = document.getElementById("map-tip");

    svg.selectAll("path.country")
      .data(geo.features)
      .join("path")
      .attr("class", function (d) { return "country" + (byCountry[d.id] ? " has-cases" : ""); })
      .attr("d", path)
      .style("fill", function (d) { return fill(byCountry[d.id]); })
      .on("mousemove", function (ev, d) {
        var n = byCountry[d.id] || 0;
        tip.hidden = false;
        tip.innerHTML = "<b>" + esc(d.properties.name) + "</b><br>" + n + (n === 1 ? " case" : " cases") + (n ? " — click to filter" : "");
        var x = Math.min(ev.clientX + 14, window.innerWidth - 200);
        tip.style.left = x + "px";
        tip.style.top = (ev.clientY + 14) + "px";
      })
      .on("mouseleave", function () { tip.hidden = true; })
      .on("click", function (ev, d) {
        if (byCountry[d.id]) setCountry(state.country === d.id ? "" : d.id);
      });

    var lg = document.getElementById("map-legend");
    var html = '<span class="cell"><span class="sw" style="background:' + zero + '"></span>0</span>';
    ramp.forEach(function (c, i) {
      html += '<span class="cell"><span class="sw" style="background:' + c + '"></span>' + LABELS[i] + "</span>";
    });
    lg.innerHTML = html + '<span style="margin-left:auto">cases per country</span>';
  }

  function highlightMap() {
    d3.selectAll("#map .country").classed("active", function (d) { return d.id === state.country; });
  }

  /* ---------- pannello laterale ---------- */
  function drawCourts(byJuris) {
    var box = document.getElementById("court-btns");
    var defs = [
      ["CJEU", "Court of Justice of the EU"],
      ["ECtHR", "European Court of Human Rights"],
      ["UN", "UN treaty bodies"]
    ].filter(function (d) { return byJuris[d[0]]; });
    box.innerHTML = defs.map(function (d) {
      return '<button type="button" class="court-btn" data-j="' + d[0] + '"><span class="lbl">' + ICON_LANDMARK + "<span>" + esc(d[1]) + '</span></span><span class="count-pill">' + (byJuris[d[0]] || 0) + "</span></button>";
    }).join("");
    box.querySelectorAll(".court-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        var j = this.dataset.j;
        state.juris = state.juris === j ? "" : j;
        document.getElementById("f-juris").value = state.juris;
        syncSide(); renderList(); location.hash = "";
      });
    });
  }

  function drawCountryList(byCountry) {
    var box = document.getElementById("country-list");
    var rows = Object.keys(byCountry).map(function (iso) {
      return { iso: iso, name: countryName(iso), n: byCountry[iso] };
    }).sort(function (a, b) { return b.n - a.n || a.name.localeCompare(b.name); });
    box.innerHTML = rows.map(function (r) {
      return '<button type="button" class="country-btn" data-iso="' + r.iso + '"><span class="lbl">' + flagImg(r.iso) + "<span>" + esc(r.name) + '</span></span><span class="count-pill">' + r.n + "</span></button>";
    }).join("");
    box.querySelectorAll(".country-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        var iso = this.dataset.iso;
        setCountry(state.country === iso ? "" : iso);
      });
    });
  }

  function setCountry(iso) {
    state.country = iso;
    var chip = document.getElementById("f-country");
    if (iso) {
      chip.hidden = false;
      chip.innerHTML = flagImg(iso) + esc(countryName(iso)) + ' <span class="x" aria-hidden="true">×</span><span class="sr-only"> — remove country filter</span>';
    } else {
      chip.hidden = true;
    }
    syncSide(); renderList(); location.hash = "";
  }

  function syncSide() {
    document.querySelectorAll(".country-btn").forEach(function (b) { b.classList.toggle("active", b.dataset.iso === state.country); });
    document.querySelectorAll(".court-btn").forEach(function (b) { b.classList.toggle("active", b.dataset.j === state.juris); });
    highlightMap();
  }

  /* ---------- lista ---------- */
  function filtered() {
    var q = state.search.trim().toLowerCase();
    return state.cases.filter(function (c) {
      if (state.country && c.geography.iso_n3 !== state.country) return false;
      if (state.juris && c.jurisdiction.type !== state.juris) return false;
      if (state.status && statusGroup(c.status) !== state.status) return false;
      if (q) {
        var hay = (c.name + " " + c.description + " " + c.outcome + " " + c.date + " " + c.docket + " " + c.jurisdiction.court + " " + c.geography.country + " " + c.topics.join(" ")).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    }).sort(function (a, b) { return b.year - a.year || a.name.localeCompare(b.name); });
  }

  var FORUM_LABEL = { Domestic: "Domestic courts", CJEU: "CJEU", ECtHR: "ECtHR", UN: "UN treaty body" };
  function excerpt(s, max) {
    s = String(s || "");
    if (s.length <= max) return s;
    var cut = s.slice(0, max);
    return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:.\s]+$/, "") + "…";
  }

  function renderList() {
    var list = document.getElementById("case-list");
    var rows = filtered();
    document.getElementById("result-count").textContent = rows.length + " of " + state.cases.length + " cases";
    document.getElementById("no-results").hidden = rows.length > 0;
    list.innerHTML = rows.map(function (c) {
      return '<li><a class="case-card" href="#case-' + esc(c.slug) + '">' +
        "<h3>" + esc(c.name) + "</h3>" +
        '<p class="issue">' + esc(excerpt(c.description, 230)) + "</p>" +
        '<div class="meta-row">' +
        '<span class="tag geo">' + flagImg(c.geography.iso_n3) + "<span>" + esc(c.geography.country) + "</span></span>" +
        '<span class="tag">' + esc(FORUM_LABEL[c.jurisdiction.type] || c.jurisdiction.type) + "</span>" +
        '<span class="tag year">' + esc(c.year) + "</span>" +
        '<span class="status ' + statusClass(c.status) + '">' + esc(c.status) + "</span>" +
        "</div></a></li>";
    }).join("");
  }

  /* ---------- dettaglio ---------- */
  function route() {
    var m = /^#case-([a-z0-9-]+)$/.exec(location.hash || "");
    var detail = document.getElementById("view-detail");
    var listView = document.getElementById("view-list");
    if (!m) {
      detail.hidden = true; listView.hidden = false;
      renderList();
      return;
    }
    var c = state.cases.filter(function (x) { return x.slug === m[1]; })[0];
    if (!c) { location.hash = ""; return; }
    listView.hidden = true;
    detail.hidden = false;
    detail.innerHTML = renderDetail(c);
    detail.querySelector(".back-link").focus();
    var y = document.getElementById("database").getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top: y, behavior: "auto" });
  }

  function renderDetail(c) {
    var srcs = c.sources.map(function (s) {
      return "<li>" + (s.url ? '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.label) + " ↗</a>" : esc(s.label)) + "</li>";
    }).join("");
    return '<a class="back-link" href="#database" onclick="location.hash=\'\';return false;">‹ Back to all cases</a>' +
      '<div class="detail-card">' +
      '<div class="detail-head">' +
      "<h2>" + esc(c.name) + "</h2>" +
      '<div class="meta-row">' +
      '<span class="tag geo">' + flagImg(c.geography.iso_n3) + "<span>" + esc(c.geography.country) + "</span></span>" +
      '<span class="tag">' + esc(FORUM_LABEL[c.jurisdiction.type] || c.jurisdiction.type) + "</span>" +
      '<span class="status ' + statusClass(c.status) + '">' + esc(c.status) + "</span>" +
      "</div></div>" +
      '<div class="detail-body">' +
      '<ul class="fact-grid">' +
      "<li class=\"fact\"><b>Court</b><span>" + esc(c.jurisdiction.court) + "</span></li>" +
      "<li class=\"fact\"><b>Date</b><span>" + esc(c.date) + "</span></li>" +
      "<li class=\"fact\"><b>Geography</b><span>" + flagImg(c.geography.iso_n3) + esc(c.geography.country) + "</span></li>" +
      (c.docket ? "<li class=\"fact\"><b>Docket</b><span>" + esc(c.docket) + "</span></li>" : "") +
      "</ul>" +
      "<h4>Description</h4><p class=\"abstract\">" + esc(c.description) + "</p>" +
      "<h4>Outcome</h4><p class=\"abstract\">" + esc(c.outcome) + "</p>" +
      (c.topics.length ? "<h4>Topics</h4><div class=\"topics\">" + c.topics.map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("") + "</div>" : "") +
      (srcs ? "<h4>Sources</h4><ul class=\"sources-list\">" + srcs + "</ul>" : "") +
      "<h4>How to cite this entry</h4><p class=\"cite-box\">R2CA — The Right to Clean Air, <i>Clean Air Litigation Database</i>, University of Turin, entry “" + esc(c.name) + "”.</p>" +
      "</div></div>";
  }
})();
