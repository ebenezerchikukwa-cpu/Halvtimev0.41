// public/js/heropiksler.js
// Et rutenett av røde "piksler" bak HALVTIME-logoen i heroen. De bølger
// svakt hele tiden, og løfter/lyser opp der musen er. Touch-vennlig:
// uten mus går den fine, rolige grunnbølgen videre.
(function () {
  const canvas = document.getElementById("pixelfelt");
  if (!canvas) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ctx = canvas.getContext("2d");
  const masthead = canvas.closest(".masthead");

  const SPACING = 22; // avstand mellom prikker (px)
  const DOT = 2.4; // grunnstørrelse på en prikk
  const RED = "217, 1, 1";

  let dots = [];
  let w = 0;
  let h = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let mouse = { x: -9999, y: -9999, inne: false };
  let t = 0;

  function bygg() {
    const rect = masthead.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    dots = [];
    const kolonner = Math.ceil(w / SPACING) + 1;
    const rader = Math.ceil(h / SPACING) + 1;
    for (let i = 0; i < kolonner; i++) {
      for (let j = 0; j < rader; j++) {
        dots.push({ x: i * SPACING, y: j * SPACING });
      }
    }
  }

  function tegn() {
    ctx.clearRect(0, 0, w, h);
    t += 0.02;

    for (const d of dots) {
      // Rolig grunnbølge over hele feltet.
      const bolge = Math.sin(d.x * 0.03 + d.y * 0.03 + t) * 0.5 + 0.5;

      let loft = 0;
      let naerhet = 0;
      if (mouse.inne) {
        const dx = d.x - mouse.x;
        const dy = d.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const radius = 130;
        if (dist < radius) {
          naerhet = 1 - dist / radius;
          // Bølge ut fra musen.
          loft = Math.sin(dist * 0.08 - t * 4) * naerhet * 6;
        }
      }

      const storrelse = DOT + bolge * 0.7 + naerhet * 2.4;
      const alpha = 0.18 + bolge * 0.12 + naerhet * 0.55;

      ctx.beginPath();
      ctx.fillStyle = `rgba(${RED}, ${alpha})`;
      ctx.arc(d.x, d.y - loft, storrelse, 0, Math.PI * 2);
      ctx.fill();
    }

    raf = requestAnimationFrame(tegn);
  }

  let raf = null;

  function start() {
    if (raf) cancelAnimationFrame(raf);
    bygg();
    if (reduced) {
      // Tegn ett stille bilde uten animasjon.
      tegnStille();
    } else {
      raf = requestAnimationFrame(tegn);
    }
  }

  function tegnStille() {
    ctx.clearRect(0, 0, w, h);
    for (const d of dots) {
      ctx.beginPath();
      ctx.fillStyle = `rgba(${RED}, 0.18)`;
      ctx.arc(d.x, d.y, DOT, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  masthead.addEventListener("mousemove", (e) => {
    const rect = masthead.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.inne = true;
  });
  masthead.addEventListener("mouseleave", () => {
    mouse.inne = false;
    mouse.x = -9999;
    mouse.y = -9999;
  });
  // La også berøring lage en liten bølge på mobil.
  masthead.addEventListener(
    "touchmove",
    (e) => {
      const rect = masthead.getBoundingClientRect();
      const tp = e.touches[0];
      if (!tp) return;
      mouse.x = tp.clientX - rect.left;
      mouse.y = tp.clientY - rect.top;
      mouse.inne = true;
    },
    { passive: true }
  );
  masthead.addEventListener("touchend", () => {
    mouse.inne = false;
  });

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(start, 150);
  });

  start();
})();
