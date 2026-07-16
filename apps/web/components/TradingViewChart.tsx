"use client";

import { useEffect, useRef } from "react";

const WIDGET_SRC = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";

function currentTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/**
 * TradingView's free "Advanced Chart" embed — no API key or paid plan, just
 * a script tag with a JSON config dropped into a container div. Re-injected
 * (rather than updated in place) on symbol or theme change since the widget
 * has no public API for that once mounted; a MutationObserver on <html
 * data-theme> keeps it in sync with the site's own theme toggle.
 *
 * `symbol` must include the TradingView exchange prefix (e.g. "NASDAQ:AAPL")
 * — see ChartExplorer's doc comment for why PSE symbols don't work here.
 */
export function TradingViewChart({ symbol }: { symbol: string }) {
  // TradingView's script sets `style.height = "100%"` directly on the element
  // carrying the "tradingview-widget-container" class, and an inline style
  // always beats a Tailwind class — so the fixed height has to live on an
  // outer wrapper *div that TradingView never touches, with the widget's own
  // container nested inside resolving its 100% against that.
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    function render() {
      if (!wrapper) return;
      wrapper.innerHTML = "";

      const container = document.createElement("div");
      container.className = "tradingview-widget-container";
      container.style.height = "100%";
      container.style.width = "100%";
      wrapper.appendChild(container);

      const widgetDiv = document.createElement("div");
      widgetDiv.className = "tradingview-widget-container__widget";
      widgetDiv.style.height = "100%";
      widgetDiv.style.width = "100%";
      container.appendChild(widgetDiv);

      const script = document.createElement("script");
      script.type = "text/javascript";
      script.src = WIDGET_SRC;
      script.async = true;
      script.innerHTML = JSON.stringify({
        autosize: true,
        symbol,
        interval: "D",
        timezone: "Asia/Manila",
        theme: currentTheme(),
        style: "1",
        locale: "en",
        allow_symbol_change: true,
        support_host: "https://www.tradingview.com",
      });
      container.appendChild(script);
    }

    render();

    const observer = new MutationObserver(render);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, [symbol]);

  return (
    <div
      className="h-[600px] w-full overflow-hidden rounded-md border border-black/10 dark:border-white/10"
      ref={wrapperRef}
    />
  );
}
