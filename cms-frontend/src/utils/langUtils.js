// Shared language utilities used by MainLayout, Header, PublicLayout, MemberPortal, MemberPortalSettings.
// Single source of truth for the LANG_KEY and helpers so nothing is duplicated.

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

export const getLangCode  = () => localStorage.getItem(LANG_KEY) || 'en';

export const saveLangCode = (code) => {
  localStorage.setItem(LANG_KEY, code);
  try {
    const p = JSON.parse(localStorage.getItem('plwm_prefs') || '{}');
    p.language = code;
    localStorage.setItem('plwm_prefs', JSON.stringify(p));
  } catch (_) {}
};

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

export const dispatchLangChange = (code) => {
  window.dispatchEvent(new CustomEvent('plwm-lang-change', { detail: { code } }));
};
