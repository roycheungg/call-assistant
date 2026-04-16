(function () {
  "use strict";

  // Guard against duplicate loads
  if (window.__doaiWidgetLoaded) return;
  window.__doaiWidgetLoaded = true;

  var script = document.currentScript;
  var siteId = script && script.getAttribute("data-site-id");
  if (!siteId) {
    console.error("[DOAI Widget] data-site-id attribute is required");
    return;
  }

  var origin = new URL(script.src).origin;
  var iframe = document.createElement("iframe");
  iframe.src = origin + "/embed?siteId=" + encodeURIComponent(siteId);
  iframe.title = "Chat";
  iframe.setAttribute("allow", "clipboard-write");

  // Start collapsed (bubble size)
  iframe.style.cssText = [
    "position: fixed",
    "bottom: 20px",
    "right: 20px",
    "width: 72px",
    "height: 72px",
    "max-width: calc(100vw - 20px)",
    "max-height: calc(100vh - 20px)",
    "border: 0",
    "border-radius: 9999px",
    "z-index: 2147483647",
    "box-shadow: 0 10px 30px rgba(0,0,0,0.15)",
    "background: transparent",
    "color-scheme: normal",
    "transition: width 0.2s ease, height 0.2s ease, border-radius 0.2s ease",
  ].join(";");

  function mount() {
    document.body.appendChild(iframe);
  }

  if (document.body) {
    mount();
  } else {
    document.addEventListener("DOMContentLoaded", mount);
  }

  // Resize iframe in response to messages from the embed page
  window.addEventListener("message", function (e) {
    if (!iframe.contentWindow || e.source !== iframe.contentWindow) return;
    if (!e.data || e.data.type !== "doai:resize") return;

    var w = Number(e.data.width) || 72;
    var h = Number(e.data.height) || 72;
    iframe.style.width = w + "px";
    iframe.style.height = h + "px";
    iframe.style.borderRadius = w > 100 ? "16px" : "9999px";
  });
})();
