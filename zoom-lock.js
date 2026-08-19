// =============================================
// VINCI — ZOOM LOCK
// Bloqueia pinch zoom, duplo toque e atalhos de zoom.
// Mantém rolagem normal da página.
// =============================================
(() => {
  "use strict";

  // Safari/iOS: bloqueia os eventos proprietários de gesto.
  ["gesturestart", "gesturechange", "gestureend"].forEach((eventName) => {
    document.addEventListener(eventName, (event) => {
      event.preventDefault();
    }, { passive: false });
  });

  // Evita zoom por pinch em navegadores que expõem escala no TouchEvent.
  document.addEventListener("touchmove", (event) => {
    if (typeof event.scale === "number" && event.scale !== 1) {
      event.preventDefault();
    }
  }, { passive: false });

  // Evita zoom por duplo toque sem bloquear toques normais.
  let lastTouchEnd = 0;
  document.addEventListener("touchend", (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });

  // Desktop/trackpad: Ctrl/Cmd + roda do mouse.
  document.addEventListener("wheel", (event) => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
    }
  }, { passive: false });

  // Desktop: Ctrl/Cmd + +, -, = ou 0.
  document.addEventListener("keydown", (event) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    if (["+", "-", "=", "0"].includes(event.key)) {
      event.preventDefault();
    }
  });
})();
