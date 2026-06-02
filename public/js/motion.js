/* =============================================================
   BYD Salma · motion.js
   Micro-interacciones y movimiento con propósito (estilo Emil Kowalski).
   - Scroll reveal con stagger (IntersectionObserver)
   - Sombra del nav al hacer scroll
   - Toaster minimalista (window.dsToast)
   Aditivo: no interfiere con la mini-calculadora ni los scripts de la página.
   Respeta prefers-reduced-motion.
   ============================================================= */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    /* ---------- 1. Auto-marcar elementos para revelar ---------- */
    // Secciones de primer nivel + tarjetas comunes. No tocamos el hero
    // (se anima por su cuenta) ni nada que ya tenga data-reveal.
    if (!reduce) {
      var autoSelectors = [
        ".section > .section-head",
        ".reasons > .reason",
        ".cases > .case-card",
        ".models-strip > .model-pill",
        ".faq-grid > .faq-item",
        ".compare-grid > .compare-card",
        ".compare-timeline > .timeline-item"
      ];
      document.querySelectorAll(autoSelectors.join(",")).forEach(function (el) {
        if (!el.hasAttribute("data-reveal")) el.setAttribute("data-reveal", "");
      });

      // Stagger dentro de cada grupo de hermanos
      var groups = new Map();
      document.querySelectorAll("[data-reveal]").forEach(function (el) {
        var parent = el.parentNode;
        var arr = groups.get(parent);
        if (!arr) { arr = []; groups.set(parent, arr); }
        arr.push(el);
      });
      groups.forEach(function (arr) {
        arr.forEach(function (el, i) {
          el.style.setProperty("--reveal-delay", Math.min(i, 6) * 70 + "ms");
        });
      });

      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

      document.querySelectorAll("[data-reveal]").forEach(function (el) { io.observe(el); });
    }

    /* ---------- 2. Sombra del nav al hacer scroll ---------- */
    var nav = document.querySelector(".nav");
    if (nav) {
      var onScroll = function () {
        if (window.scrollY > 8) nav.classList.add("is-stuck");
        else nav.classList.remove("is-stuck");
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }
  });

  /* ---------- 3. Toaster minimalista ---------- */
  function ensureToaster() {
    var t = document.getElementById("ds-toaster");
    if (!t) {
      t = document.createElement("div");
      t.id = "ds-toaster";
      document.body.appendChild(t);
    }
    return t;
  }
  window.dsToast = function (message, opts) {
    opts = opts || {};
    var host = ensureToaster();
    var el = document.createElement("div");
    el.className = "ds-toast";
    var icon = opts.icon || "fa-check-circle";
    el.innerHTML = '<i class="fas ' + icon + '"></i><span></span>';
    el.querySelector("span").textContent = message;
    host.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("is-in"); });
    setTimeout(function () {
      el.classList.remove("is-in");
      setTimeout(function () { el.remove(); }, 300);
    }, opts.duration || 3200);
  };
})();
