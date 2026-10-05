import '@testing-library/jest-dom';

// jsdom doesn't implement matchMedia — polyfill it so ThemeContext (and anything
// else checking prefers-color-scheme) doesn't crash when rendered in tests.
// Defaults to "no preference matched" (light). Deliberately a plain function,
// not a jest.fn() — several test files call jest.clearAllMocks() in beforeEach,
// which resets mockImplementation on any jest.fn() and would silently break this.
// Individual tests can still override window.matchMedia directly if they need
// to simulate a specific OS preference.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
