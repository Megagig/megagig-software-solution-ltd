import "@testing-library/jest-dom";

// jsdom doesn't implement matchMedia — ThemeToggle (and anything else
// checking prefers-color-scheme) needs a stub or it throws in tests.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList;
}
