(() => {
  let initialized = false;

  function init() {
    if (initialized) return;
    initialized = true;

    const categories = [...document.querySelectorAll('.category')];
    const navItems = [...document.querySelectorAll('.nav-item')];
    const titles = {};
    navItems.forEach((item) => {
      const key = item.dataset.category;
      if (!key) return;
      const label = item.textContent.trim();
      titles[key] = label;
    });
    categories.forEach((section) => {
      const key = section.dataset.category;
      if (!key || titles[key]) return;
      titles[key] = section.querySelector('h1,h2')?.textContent.trim() || key;
    });

    const input = document.querySelector('#searchInput');
    const status = document.querySelector('#searchStatus');
    const clearButton = document.querySelector('#clearSearch');
    const sidebar = document.querySelector('#sidebar');
    const overlay = document.querySelector('#overlay');
    let active = location.hash.slice(1);
    if (!titles[active]) active = navItems.find((item) => item.classList.contains('active'))?.dataset.category || Object.keys(titles)[0];

    const closeMenu = () => {
      sidebar?.classList.remove('open');
      overlay?.classList.remove('show');
    };

    function clearMarks(root) {
      if (!root) return;
      root.querySelectorAll('mark').forEach((mark) => mark.replaceWith(document.createTextNode(mark.textContent || '')));
      root.querySelectorAll('.hidden-by-search').forEach((element) => element.classList.remove('hidden-by-search'));
    }

    function clearSearch() {
      if (input) input.value = '';
      clearMarks(document.querySelector(`.category[data-category="${CSS.escape(active)}"]`));
      if (status) status.hidden = true;
      if (clearButton) clearButton.hidden = true;
    }

    function selectCategory(key, updateHash = true) {
      if (!titles[key]) return;
      active = key;
      categories.forEach((section) => section.classList.toggle('active', section.dataset.category === key));
      navItems.forEach((button) => {
        const selected = button.dataset.category === key;
        button.classList.toggle('active', selected);
        button.setAttribute('aria-current', selected ? 'page' : 'false');
      });
      const pageTitle = document.querySelector('#pageTitle');
      if (pageTitle) pageTitle.textContent = titles[key];
      clearSearch();
      closeMenu();
      if (updateHash) history.replaceState(null, '', `#${key}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    navItems.forEach((button) => button.addEventListener('click', () => selectCategory(button.dataset.category)));

    function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
    function searchCurrentCategory() {
      if (!input) return;
      const query = input.value.trim();
      const root = document.querySelector(`.category[data-category="${CSS.escape(active)}"]`);
      clearMarks(root);
      if (!query) {
        if (status) status.hidden = true;
        if (clearButton) clearButton.hidden = true;
        return;
      }
      let count = 0;
      const pattern = new RegExp(`(${escapeRegExp(query)})`, 'gi');
      root?.querySelectorAll('h2,h3,h4,p,li,td,th').forEach((element) => {
        const text = element.textContent || '';
        if (!text.toLowerCase().includes(query.toLowerCase())) {
          if (['H3','H4','P','LI'].includes(element.tagName)) element.classList.add('hidden-by-search');
          return;
        }
        count += 1;
        element.innerHTML = element.innerHTML.replace(pattern, '<mark>$1</mark>');
      });
      if (status) { status.hidden = false; status.textContent = `「${query}」の一致：${count}件`; }
      if (clearButton) clearButton.hidden = false;
    }

    input?.addEventListener('input', searchCurrentCategory);
    clearButton?.addEventListener('click', clearSearch);
    document.querySelector('#menuBtn')?.addEventListener('click', () => {
      sidebar?.classList.toggle('open');
      overlay?.classList.toggle('show');
    });
    overlay?.addEventListener('click', closeMenu);
    document.querySelector('#wideBtn')?.addEventListener('click', () => {
      const main = document.querySelector('.main');
      const button = document.querySelector('#wideBtn');
      if (!main || !button) return;
      main.classList.toggle('wide');
      const wide = main.classList.contains('wide');
      if (sidebar) sidebar.style.display = wide ? 'none' : '';
      button.textContent = wide ? '元に戻す' : '最大化';
    });
    document.querySelector('#themeBtn')?.addEventListener('click', () => document.body.classList.toggle('dark'));
    const year = document.querySelector('#year');
    if (year) year.textContent = String(new Date().getFullYear());
    window.addEventListener('hashchange', () => {
      const key = location.hash.slice(1);
      if (titles[key]) selectCategory(key, false);
    });
    document.querySelectorAll('.nav-group-title').forEach((button) => button.addEventListener('click', () => {
      const group = button.closest('.nav-group');
      group?.classList.toggle('open');
      button.setAttribute('aria-expanded', group?.classList.contains('open') ? 'true' : 'false');
    }));
    document.querySelectorAll('[data-jump]').forEach((button) => button.addEventListener('click', () => selectCategory(button.dataset.jump)));
    selectCategory(active, false);
  }

  // Supabase版では odrp:content-ready を待っていましたが、
  // 静的サイト版では通常のDOM読み込み完了時にも初期化します。
  window.addEventListener('odrp:content-ready', init, { once: true });
  if (window.ODRP_CONTENT_READY) {
    init();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
