import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes/AppRoute';
import { useEffect } from 'react';

const GOOGLE_FONTS = ['DM Sans','Inter','Open Sans','Lato','Roboto','Space Grotesk','Figtree','Work Sans'];
const FONTSHARE    = ['Satoshi'];

// Read plwm_prefs and apply font-family + zoom to document.body so every CMS page
// automatically reflects the user's personal settings saved in MemberPortalSettings
// or MySettingsPage — without any extra props or context needed.
function GlobalPrefsApplicator() {
  const applyPrefs = () => {
    try {
      const raw   = localStorage.getItem('plwm_prefs');
      const prefs = raw ? JSON.parse(raw) : {};

      const fontFamily = prefs.fontFamily || 'DM Sans';
      const zoom       = prefs.resolution || 1;

      // Inject font link if needed
      const fontId = 'plwm-global-font';
      if (GOOGLE_FONTS.includes(fontFamily)) {
        let el = document.getElementById(fontId);
        if (!el) {
          el = document.createElement('link');
          el.id  = fontId;
          el.rel = 'stylesheet';
          document.head.appendChild(el);
        }
        el.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;500;600;700;800&display=swap`;
      } else if (FONTSHARE.includes(fontFamily)) {
        let el = document.getElementById(fontId);
        if (!el) {
          el = document.createElement('link');
          el.id  = fontId;
          el.rel = 'stylesheet';
          document.head.appendChild(el);
        }
        el.href = `https://api.fontshare.com/v2/css?f[]=${fontFamily.toLowerCase()}@400,500,700&display=swap`;
      }

      // Apply to body so all CMS pages inherit it
      document.body.style.fontFamily = `'${fontFamily}', 'Inter', system-ui, sans-serif`;

      // Apply zoom/scale (CSS zoom is the cleanest cross-browser approach)
      document.body.style.zoom = String(zoom);
    } catch (_) {}
  };

  useEffect(() => {
    applyPrefs();

    // Re-apply whenever MySettingsPage or MemberPortalSettings saves new prefs
    const handler = () => applyPrefs();
    window.addEventListener('plwm-prefs-change', handler);
    window.addEventListener('storage', handler); // cross-tab support
    return () => {
      window.removeEventListener('plwm-prefs-change', handler);
      window.removeEventListener('storage', handler);
    };
  }, []); // eslint-disable-line

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <GlobalPrefsApplicator />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
