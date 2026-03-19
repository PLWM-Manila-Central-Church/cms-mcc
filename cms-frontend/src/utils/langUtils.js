// Shared language utilities — single source of truth across all layouts and pages.

export const LANG_KEY = 'plwm_lang';

export const LANGS = [
  { code:'en',  label:'English',            flag:'🇺🇸', searchText:'English'    },
  { code:'ko',  label:'Korean',             flag:'🇰🇷', searchText:'Korean'     },
  { code:'tl',  label:'Filipino (Tagalog)', flag:'🇵🇭', searchText:'Filipino'   },
  { code:'ceb', label:'Cebuano',            flag:'🇵🇭', searchText:'Cebuano'    },
  { code:'ilo', label:'Ilocano',            flag:'🇵🇭', searchText:'Ilocano'    },
  { code:'hil', label:'Hiligaynon',         flag:'🇵🇭', searchText:'Hiligaynon' },
  { code:'war', label:'Waray',              flag:'🇵🇭', searchText:'Waray'      },
  { code:'bcl', label:'Bikol',              flag:'🇵🇭', searchText:'Bikol'      },
];

export const getLangCode = () => localStorage.getItem(LANG_KEY) || 'en';

// Set the googtrans cookie so GT auto-translates on every page load without showing its banner.
// This is the key fix — without this, GT shows the banner popup and loses state across navigation.
export const setGTCookie = (code) => {
  const val = (code && code !== 'en') ? `/en/${code}` : '/en/en';
  // Set on root path
  document.cookie = `googtrans=${val}; path=/`;
  // Also set on the hostname in case GT checks the domain-scoped cookie
  try {
    document.cookie = `googtrans=${val}; path=/; domain=${window.location.hostname}`;
  } catch (_) {}
};

export const saveLangCode = (code) => {
  localStorage.setItem(LANG_KEY, code);
  setGTCookie(code);
  try {
    const p = JSON.parse(localStorage.getItem('plwm_prefs') || '{}');
    p.language = code;
    localStorage.setItem('plwm_prefs', JSON.stringify(p));
  } catch (_) {}
};

// Inject banner-suppression CSS into <head> immediately so GT never shifts the page.
// Called once on app startup. Safe to call multiple times (idempotent).
export const injectGTSuppressCSS = () => {
  if (document.getElementById('plwm-gt-suppress')) return;
  const style = document.createElement('style');
  style.id = 'plwm-gt-suppress';
  style.textContent = `
    .goog-te-banner-frame { display: none !important; }
    .skiptranslate         { display: none !important; }
    #goog-gt-tt            { display: none !important; }
    .goog-tooltip          { display: none !important; }
    .goog-text-highlight   { background: none !important; box-shadow: none !important; }
    body.translated-ltr,
    body.translated-rtl    { top: 0 !important; }
    html                   { margin-top: 0 !important; }
  `;
  document.head.appendChild(style);
};

// Apply language via the hidden GT select element.
// Falls back to a retry loop while GT widget initialises.
export function applyGTLang(lang) {
  if (!lang || lang.code === 'en') {
    try {
      const sel = document.querySelector('.goog-te-combo');
      if (sel) { sel.value = ''; sel.dispatchEvent(new Event('change')); }
    } catch (_) {}
    return;
  }
  const attempt = () => {
    try {
      const sel = document.querySelector('.goog-te-combo');
      if (!sel) return false;
      if (sel.querySelector(`option[value="${lang.code}"]`)) {
        sel.value = lang.code;
        sel.dispatchEvent(new Event('change'));
        return true;
      }
      const match = Array.from(sel.options).find(o =>
        o.text.toLowerCase().includes((lang.searchText || lang.label).toLowerCase())
      );
      if (match) { sel.value = match.value; sel.dispatchEvent(new Event('change')); return true; }
    } catch (_) {}
    return false;
  };
  if (!attempt()) {
    let tries = 0;
    const iv = setInterval(() => { tries++; if (attempt() || tries > 40) clearInterval(iv); }, 150);
  }
}

// Load the GT script once across the whole app (idempotent).
// Pass the elementId of the hidden widget div and a callback for when GT is ready.
export function loadGTScript(elementId, onReady) {
  injectGTSuppressCSS();
  if (document.getElementById('gt-script')) {
    // Script already injected — widget may already be up, just call onReady
    if (onReady) onReady();
    return;
  }
  window.googleTranslateElementInit = () => {
    try {
      // eslint-disable-next-line no-new
      new window.google.translate.TranslateElement(
        { pageLanguage: 'en', autoDisplay: false },
        elementId
      );
    } catch (_) {}
    if (onReady) onReady();
  };
  const s = document.createElement('script');
  s.id  = 'gt-script';
  s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  s.async = true;
  document.head.appendChild(s);
}

export const dispatchLangChange = (code) => {
  window.dispatchEvent(new CustomEvent('plwm-lang-change', { detail: { code } }));
};
