import {
  extractDomain,
  isExcludedUrl,
  normalizeUrl,
  getDomainColor,
  GROUP_COLORS,
} from "../src/utils/domain-utils";

describe("extractDomain", () => {
  it("extracts domain from a standard HTTPS URL", () => {
    expect(extractDomain("https://www.google.com/search?q=test")).toBe(
      "www.google.com"
    );
  });

  it("extracts domain from HTTP URL", () => {
    expect(extractDomain("http://example.com/page")).toBe("example.com");
  });

  it("extracts domain with port number", () => {
    expect(extractDomain("https://localhost:3000/app")).toBe("localhost");
  });

  it("extracts IP address as domain", () => {
    expect(extractDomain("http://192.168.1.1:8080/admin")).toBe("192.168.1.1");
  });

  it("returns empty string for chrome:// URLs", () => {
    expect(extractDomain("chrome://extensions")).toBe("");
  });

  it("returns empty string for edge:// URLs", () => {
    expect(extractDomain("edge://settings")).toBe("");
  });

  it("returns empty string for about: URLs", () => {
    expect(extractDomain("about:blank")).toBe("");
  });

  it("returns empty string for empty input", () => {
    expect(extractDomain("")).toBe("");
  });

  it("returns empty string for invalid URL", () => {
    expect(extractDomain("not-a-url")).toBe("");
  });
});

describe("isExcludedUrl", () => {
  it("excludes chrome:// URLs", () => {
    expect(isExcludedUrl("chrome://newtab")).toBe(true);
  });

  it("excludes edge:// URLs", () => {
    expect(isExcludedUrl("edge://flags")).toBe(true);
  });

  it("excludes about: URLs", () => {
    expect(isExcludedUrl("about:blank")).toBe(true);
  });

  it("excludes chrome-extension:// URLs", () => {
    expect(isExcludedUrl("chrome-extension://abc123/popup.html")).toBe(true);
  });

  it("excludes devtools: URLs", () => {
    expect(isExcludedUrl("devtools://devtools/bundled/inspector.html")).toBe(true);
  });

  it("does not exclude standard HTTP URLs", () => {
    expect(isExcludedUrl("https://www.example.com")).toBe(false);
  });

  it("returns true for empty string", () => {
    expect(isExcludedUrl("")).toBe(true);
  });
});

describe("normalizeUrl", () => {
  it("removes trailing slash from path", () => {
    expect(normalizeUrl("https://example.com/page/")).toBe(
      "https://example.com/page"
    );
  });

  it("preserves query parameters", () => {
    expect(normalizeUrl("https://example.com/page?a=1&b=2")).toBe(
      "https://example.com/page?a=1&b=2"
    );
  });

  it("preserves hash fragments", () => {
    expect(normalizeUrl("https://example.com/page#section")).toBe(
      "https://example.com/page#section"
    );
  });

  it("returns root path for bare domain", () => {
    expect(normalizeUrl("https://example.com")).toBe("https://example.com/");
  });

  it("preserves port numbers", () => {
    expect(normalizeUrl("https://localhost:3000/app")).toBe(
      "https://localhost:3000/app"
    );
  });

  it("returns invalid URL as-is", () => {
    expect(normalizeUrl("not-a-url")).toBe("not-a-url");
  });

  it("returns excluded URL as-is", () => {
    expect(normalizeUrl("chrome://extensions")).toBe("chrome://extensions");
  });
});

describe("getDomainColor", () => {
  it("returns a valid chrome tab group color", () => {
    const color = getDomainColor("google.com");
    expect(GROUP_COLORS).toContain(color);
  });

  it("returns consistent color for the same domain", () => {
    const color1 = getDomainColor("github.com");
    const color2 = getDomainColor("github.com");
    expect(color1).toBe(color2);
  });

  it("handles empty domain", () => {
    const color = getDomainColor("");
    expect(GROUP_COLORS).toContain(color);
  });
});
