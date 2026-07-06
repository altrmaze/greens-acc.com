(function () {
  'use strict';

  const LANG_KEY = 'gacc:lang';
  const THEME_KEY = 'gacc:theme';
  const RTL_LANGS = new Set(['ar']);
  const LANGS = ['en', 'ar', 'zh', 'es', 'hi', 'fr', 'de'];

  const I18N = {
    en: { title: 'Greens ACC', subtitle: 'Global B2B Trading Platform', dashboard: 'Dashboard', deals: 'Deal Room', market: 'Marketplace', meet: 'Meeting', announce: 'Announcements', theme: 'Theme', themeLight: 'Light', themeDark: 'Dark', language: 'Language', menu: 'Menu' },
    ar: { title: 'Greens ACC', subtitle: 'منصة التجارة العالمية بين الشركات', dashboard: 'لوحة التحكم', deals: 'غرفة الصفقات', market: 'السوق', meet: 'الاجتماعات', announce: 'الإعلانات', theme: 'المظهر', themeLight: 'فاتح', themeDark: 'داكن', language: 'اللغة', menu: 'القائمة' },
    zh: { title: 'Greens ACC', subtitle: '全球企业贸易平台', dashboard: '仪表盘', deals: '交易室', market: '市场', meet: '会议', announce: '公告', theme: '主题', themeLight: '浅色', themeDark: '深色', language: '语言', menu: '菜单' },
    es: { title: 'Greens ACC', subtitle: 'Plataforma global B2B', dashboard: 'Panel', deals: 'Sala de Tratos', market: 'Mercado', meet: 'Reuniones', announce: 'Anuncios', theme: 'Tema', themeLight: 'Claro', themeDark: 'Oscuro', language: 'Idioma', menu: 'Menú' },
    hi: { title: 'Greens ACC', subtitle: 'वैश्विक बी2बी ट्रेडिंग प्लेटफ़ॉर्म', dashboard: 'डैशबोर्ड', deals: 'डील रूम', market: 'मार्केटप्लेस', meet: 'मीटिंग', announce: 'घोषणाएँ', theme: 'थीम', themeLight: 'लाइट', themeDark: 'डार्क', language: 'भाषा', menu: 'मेनू' },
    fr: { title: 'Greens ACC', subtitle: 'Plateforme B2B mondiale', dashboard: 'Tableau de bord', deals: 'Salle des Deals', market: 'Marché', meet: 'Réunion', announce: 'Annonces', theme: 'Thème', themeLight: 'Clair', themeDark: 'Sombre', language: 'Langue', menu: 'Menu' },
    de: { title: 'Greens ACC', subtitle: 'Globale B2B-Handelsplattform', dashboard: 'Dashboard', deals: 'Deal-Raum', market: 'Marktplatz', meet: 'Meeting', announce: 'Ankündigungen', theme: 'Thema', themeLight: 'Hell', themeDark: 'Dunkel', language: 'Sprache', menu: 'Menü' }
  };

  const PAGES = [
    { href: '/', key: 'dashboard', match: /^\/$|^\/index\.html$/ },
    { href: '/deal-room.html', key: 'deals', match: /deal-room\.html$/ },
    { href: '/marketplace.html', key: 'market', match: /marketplace\.html$/ },
    { href: '/meeting.html', key: 'meet', match: /meeting\.html$/ },
    { href: '/announce.html', key: 'announce', match: /announce\.html$/ }
  ];

  function safeGet(key, fallback) {
    try {
      return localStorage.getItem(key) || fallback;
    } catch (_) {
      return fallback;
    }
  }

  function safeSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (_) {
      // ignore
    }
  }

  function getLang() {
    const existing = safeGet(LANG_KEY, document.documentElement.lang || 'en');
    return LANGS.includes(existing) ? existing : 'en';
  }

  function getTheme() {
    const explicit = safeGet(THEME_KEY, '');
    if (explicit === 'dark' || explicit === 'light') return explicit;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function t(lang, key) {
    const dict = I18N[lang] || I18N.en;
    return dict[key] || I18N.en[key] || key;
  }

  function createNode(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function setDirection(lang) {
    const rtl = RTL_LANGS.has(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    if (document.body) {
      document.body.classList.toggle('gacc-rtl', rtl);
    }
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    safeSet(THEME_KEY, theme);
  }

  function syncExistingLanguageSelectors(lang) {
    const ids = ['locale-lang', 'locale-user-lang', 'language-select', 'lang-select'];
    ids.forEach(function (id) {
      const input = document.getElementById(id);
      if (input && input.value !== lang) {
        input.value = lang;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }

  function buildShell(lang, theme) {
    const shell = createNode('div', null);
    shell.id = 'gacc-global-shell';

    const inner = createNode('div', 'gacc-shell-inner');

    const brand = createNode('a', 'gacc-shell-brand');
    brand.href = '/';
    brand.setAttribute('aria-label', t(lang, 'dashboard'));

    const badge = createNode('span', 'gacc-shell-badge', 'GA');
    const brandCopy = createNode('span', null);
    const title = createNode('span', 'gacc-shell-title', t(lang, 'title'));
    const subtitle = createNode('span', 'gacc-shell-subtitle', t(lang, 'subtitle'));
    brandCopy.appendChild(title);
    brandCopy.appendChild(subtitle);
    brand.appendChild(badge);
    brand.appendChild(brandCopy);

    const links = createNode('div', 'gacc-shell-links');
    const pathname = window.location.pathname || '/';

    PAGES.forEach(function (item) {
      const a = createNode('a', 'gacc-shell-link', t(lang, item.key));
      a.href = item.href;
      if (item.match.test(pathname)) a.setAttribute('aria-current', 'page');
      links.appendChild(a);
    });

    const controls = createNode('div', 'gacc-shell-controls');

    const menuLink = createNode('a', 'gacc-shell-link gacc-shell-mobile', t(lang, 'menu'));
    menuLink.href = '/';

    const langSelect = createNode('select', 'gacc-shell-select');
    langSelect.setAttribute('aria-label', t(lang, 'language'));
    LANGS.forEach(function (code) {
      const opt = createNode('option', null, code.toUpperCase());
      opt.value = code;
      if (code === lang) opt.selected = true;
      langSelect.appendChild(opt);
    });

    const themeBtn = createNode('button', 'gacc-shell-theme');
    themeBtn.type = 'button';
    themeBtn.textContent = t(lang, 'theme') + ': ' + (theme === 'dark' ? t(lang, 'themeDark') : t(lang, 'themeLight'));

    langSelect.addEventListener('change', function () {
      const next = LANGS.includes(langSelect.value) ? langSelect.value : 'en';
      safeSet(LANG_KEY, next);
      setDirection(next);
      syncExistingLanguageSelectors(next);
      window.location.reload();
    });

    themeBtn.addEventListener('click', function () {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      setTheme(next);
      themeBtn.textContent = t(lang, 'theme') + ': ' + (next === 'dark' ? t(lang, 'themeDark') : t(lang, 'themeLight'));
    });

    controls.appendChild(menuLink);
    controls.appendChild(langSelect);
    controls.appendChild(themeBtn);

    inner.appendChild(brand);
    inner.appendChild(links);
    inner.appendChild(controls);
    shell.appendChild(inner);
    return shell;
  }

  function init() {
    const lang = getLang();
    const theme = getTheme();

    setDirection(lang);
    setTheme(theme);

    if (!document.body) return;
    if (document.getElementById('gacc-global-shell')) return;

    const shell = buildShell(lang, theme);
    document.body.classList.add('gacc-shell-enabled');
    document.body.insertBefore(shell, document.body.firstChild);
    syncExistingLanguageSelectors(lang);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
