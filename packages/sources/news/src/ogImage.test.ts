import { describe, expect, it } from "vitest";
import { extractOgImage } from "./ogImage";

describe("extractOgImage", () => {
  it("reads og:image when present", () => {
    const html = `
      <html><head>
        <meta property="og:image" content="https://example.com/og.jpg" />
        <meta name="twitter:image" content="https://example.com/twitter.jpg" />
      </head></html>
    `;
    expect(extractOgImage(html)).toBe("https://example.com/og.jpg");
  });

  it("falls back to twitter:image when og:image is absent", () => {
    const html = `
      <html><head>
        <meta name="twitter:image" content="https://example.com/twitter.jpg" />
      </head></html>
    `;
    expect(extractOgImage(html)).toBe("https://example.com/twitter.jpg");
  });

  it("returns null when neither tag is present", () => {
    const html = `<html><head><title>No preview image</title></head></html>`;
    expect(extractOgImage(html)).toBeNull();
  });

  it("returns null for an og:image tag with no content attribute", () => {
    const html = `<html><head><meta property="og:image" /></head></html>`;
    expect(extractOgImage(html)).toBeNull();
  });
});
