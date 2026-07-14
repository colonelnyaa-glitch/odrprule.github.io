const categories = [...document.querySelectorAll('.category')];
const navItems = [...document.querySelectorAll('.nav-item')];

const titles = {
  'basic-prohibited': '基本ルール・禁止事項', crime: '犯罪ルール', 'crime-details': '各種犯罪詳細ルール',
  police: '警察ルール', ems: 'EMSルール', jobs: '職業掛け持ち・開業について', restaurants: '飲食・嗜好品店ルール',
  mechanic: 'メカニックルール', doctor: '個人医ルール', 'vehicle-prices': 'ODRP 車両価格一覧',
  'police-safezone': '警察署襲撃範囲＆セーフゾーン', redzone: 'レッドゾーンについて', delivery: '配信ルール',
  support: '支援について', contact: 'お問い合わせ', 'gold-support': 'ゴールド支援車両', 'platinum-support': 'プラチナ支援車両'
};

const updates = Object.fromEntries(Object.keys(titles).map(key => [key, '2026-07-14：カテゴリー構成を公式サイト風に再編']));

const input = document.querySelector('#searchInput');
const status = document.querySelector('#searchStatus');
const clearButton = document.querySelector('#clearSearch');
const sidebar = document.querySelector('#sidebar');
const overlay = document.querySelector('#overlay');
let active = 'basic-prohibited';

function closeMenu() {
  sidebar?.classList.remove('open');
  overlay?.classList.remove('show');
}

function clearMarks(root) {
  if (!root) return;
  root.querySelectorAll('mark').forEach((mark) => {
    mark.replaceWith(document.createTextNode(mark.textContent || ''));
  });
  root.querySelectorAll('.hidden-by-search').forEach((element) => {
    element.classList.remove('hidden-by-search');
  });
}

function clearSearch() {
  if (input) input.value = '';
  clearMarks(document.querySelector(`.category[data-category="${active}"]`));
  if (status) status.hidden = true;
  if (clearButton) clearButton.hidden = true;
}

function selectCategory(key, updateHash = true) {
  if (!titles[key]) return;
  active = key;

  categories.forEach((section) => {
    section.classList.toggle('active', section.dataset.category === key);
  });

  navItems.forEach((button) => {
    const selected = button.dataset.category === key;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-current', selected ? 'page' : 'false');
  });

  const pageTitle = document.querySelector('#pageTitle');
  const updateText = document.querySelector('#updateText');
  if (pageTitle) pageTitle.textContent = titles[key];
  if (updateText) updateText.textContent = updates[key];

  clearSearch();
  closeMenu();

  if (updateHash) {
    history.replaceState(null, '', `#${key}`);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

navItems.forEach((button) => {
  button.addEventListener('click', () => selectCategory(button.dataset.category));
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function searchCurrentCategory() {
  if (!input) return;
  const query = input.value.trim();
  const root = document.querySelector(`.category[data-category="${active}"]`);
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
      if (['H3', 'H4', 'P', 'LI'].includes(element.tagName)) {
        element.classList.add('hidden-by-search');
      }
      return;
    }

    count += 1;
    element.innerHTML = element.innerHTML.replace(pattern, '<mark>$1</mark>');
  });

  if (status) {
    status.hidden = false;
    status.textContent = `「${query}」の一致：${count}件`;
  }
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
  const wideButton = document.querySelector('#wideBtn');
  if (!main || !wideButton) return;

  main.classList.toggle('wide');
  const isWide = main.classList.contains('wide');
  if (sidebar) sidebar.style.display = isWide ? 'none' : '';
  wideButton.textContent = isWide ? '元に戻す' : '最大化';
});

document.querySelector('#themeBtn')?.addEventListener('click', () => {
  document.body.classList.toggle('dark');
});

const year = document.querySelector('#year');
if (year) year.textContent = String(new Date().getFullYear());

window.addEventListener('hashchange', () => {
  const key = location.hash.slice(1);
  if (titles[key]) selectCategory(key, false);
});

const initialKey = location.hash.slice(1);
selectCategory(titles[initialKey] ? initialKey : 'basic-prohibited', false);

document.querySelectorAll('.nav-group-title').forEach((button) => {
  button.addEventListener('click', () => {
    const group = button.closest('.nav-group');
    group?.classList.toggle('open');
    button.setAttribute('aria-expanded', group?.classList.contains('open') ? 'true' : 'false');
  });
});

document.querySelectorAll('[data-jump]').forEach((button) => {
  button.addEventListener('click', () => selectCategory(button.dataset.jump));
});
