// Applies the dark class before React mounts, so there's no flash of the
// wrong theme on first paint. ThemeProvider (src/contexts/ThemeContext.tsx)
// owns the actual state afterward and keeps this in sync. It's a separate
// file, not inline in index.html, because the Content-Security-Policy in
// netlify.toml only runs scripts served from the site itself.
(function () {
  try {
    var stored = localStorage.getItem('achieveup-theme');
    var isDark =
      stored === 'dark' ||
      (stored !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {
    /* localStorage/matchMedia unavailable — default to light, no-op */
  }
})();
