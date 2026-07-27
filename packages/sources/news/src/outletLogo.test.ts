import { describe, expect, it } from "vitest";
import { extractOutletLogo } from "./outletLogo";

describe("extractOutletLogo", () => {
  it("prefers a JSON-LD Organization logo (string form)", () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
          {"@context":"https://schema.org","@type":"NewsMediaOrganization","logo":"https://example.com/logo.png"}
        </script>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta property="og:image" content="https://example.com/banner.jpg" />
      </head></html>
    `;
    expect(extractOutletLogo(html, "https://example.com/")).toBe("https://example.com/logo.png");
  });

  it("reads a JSON-LD logo given as an ImageObject", () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
          {"@type":"Organization","logo":{"@type":"ImageObject","url":"https://example.com/logo-object.png"}}
        </script>
      </head></html>
    `;
    expect(extractOutletLogo(html, "https://example.com/")).toBe("https://example.com/logo-object.png");
  });

  it("finds a logo nested under a NewsArticle's publisher field", () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
          {"@type":"NewsArticle","publisher":{"@type":"Organization","logo":"https://example.com/publisher-logo.png"}}
        </script>
      </head></html>
    `;
    expect(extractOutletLogo(html, "https://example.com/")).toBe(
      "https://example.com/publisher-logo.png"
    );
  });

  it("falls back to apple-touch-icon, resolved against the page URL, when there's no usable JSON-LD", () => {
    const html = `<html><head><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" /></head></html>`;
    expect(extractOutletLogo(html, "https://example.com/section/page")).toBe(
      "https://example.com/icons/apple-touch-icon.png"
    );
  });

  it("falls back to og:image as a last resort", () => {
    const html = `<html><head><meta property="og:image" content="https://example.com/banner.jpg" /></head></html>`;
    expect(extractOutletLogo(html, "https://example.com/")).toBe("https://example.com/banner.jpg");
  });

  it("returns null when nothing usable is present", () => {
    const html = `<html><head><title>No logo here</title></head></html>`;
    expect(extractOutletLogo(html, "https://example.com/")).toBeNull();
  });

  it("skips malformed JSON-LD instead of throwing", () => {
    const html = `
      <html><head>
        <script type="application/ld+json">{ not valid json </script>
        <meta property="og:image" content="https://example.com/banner.jpg" />
      </head></html>
    `;
    expect(extractOutletLogo(html, "https://example.com/")).toBe("https://example.com/banner.jpg");
  });
});
