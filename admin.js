(() => {
  const config = window.ODRP_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const frame = $('siteFrame');
  const shell = $('previewShell');
  const message = $('message');
  let selected = null;
  let accessToken = sessionStorage.getItem('odrpAdminToken') || '';
  let undoStack = [];

  const show = (text, error = false) => {
    message.textContent = text;
    message.style.color = error ? '#b91c1c' : '#15803d';
  };
  const loginShow = (text, error = true) => {
    $('loginMessage').textContent = text;
    $('loginMessage').style.color = error ? '#b91c1c' : '#15803d';
  };
  const configured = () => config.SUPABASE_URL && !config.SUPABASE_URL.includes('YOUR_PROJECT_ID') && config.SUPABASE_ANON_KEY && !config.SUPABASE_ANON_KEY.includes('YOUR_SUPABASE');

  async function login(id, password) {
    if (!configured()) throw new Error('config.jsへSupabase URLとAnon Keyを設定してください。');
    const email = id.includes('@') ? id : `${id}@${config.ADMIN_EMAIL_DOMAIN || 'odrp-admin.local'}`;
    const response = await fetch(`${config.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: config.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (!response.ok || !data.access_token) throw new Error(data.error_description || data.msg || 'IDまたはパスワードが違います。');
    accessToken = data.access_token;
    sessionStorage.setItem('odrpAdminToken', accessToken);
  }

  function enterEditor() {
    $('loginScreen').hidden = true;
    $('editorApp').hidden = false;
  }

  $('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    loginShow('確認中です…', false);
    try {
      await login($('loginId').value.trim(), $('loginPassword').value);
      enterEditor();
    } catch (error) { loginShow(error.message); }
  });

  $('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('odrpAdminToken');
    accessToken = '';
    location.reload();
  });

  if (accessToken && configured()) enterEditor();

  function pushUndo() {
    const doc = frame.contentDocument;
    if (!doc) return;
    undoStack.push({ sidebar: doc.querySelector('#sidebar')?.innerHTML || '', main: doc.querySelector('main.main')?.innerHTML || '' });
    if (undoStack.length > 20) undoStack.shift();
  }

  function prepareFrame() {
    const doc = frame.contentDocument;
    if (!doc) return;
    const style = doc.createElement('style');
    style.id = 'odrp-admin-helper-style';
    style.textContent = `[contenteditable=true]:hover{outline:2px dashed #f97316!important;outline-offset:2px;cursor:text!important}.odrp-admin-selected{outline:3px solid #2563eb!important;outline-offset:3px!important}`;
    doc.head.appendChild(style);
    doc.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,blockquote,strong,small,figcaption,td,th,span:not(.nav-icon):not(.chevron),.notice').forEach((el) => {
      if (!el.closest('script,style')) { el.contentEditable = 'true'; el.spellcheck = true; }
    });
    doc.addEventListener('click', (event) => {
      const candidate = event.target.closest('img,a,li,p,h1,h2,h3,h4,td,th,article,div,section,button,span') || event.target;
      if (candidate.closest('a')) event.preventDefault();
      selectElement(candidate);
    }, true);
    $('customCss').value = doc.querySelector('#odrp-live-custom-css')?.textContent || '';
    show('プレビュー内をクリックして編集できます。');
  }

  function selectElement(el) {
    const doc = frame.contentDocument;
    doc.querySelectorAll('.odrp-admin-selected').forEach((node) => node.classList.remove('odrp-admin-selected'));
    selected = el;
    selected.classList.add('odrp-admin-selected');
    $('selectedInfo').textContent = `<${selected.tagName.toLowerCase()}> ${(selected.textContent || selected.getAttribute('alt') || '要素').trim().slice(0,70)}`;
    const link = selected.matches('a') ? selected : selected.closest('a');
    const image = selected.matches('img') ? selected : selected.querySelector?.('img');
    $('linkInput').value = link?.getAttribute('href') || '';
    $('imageInput').value = image?.getAttribute('src') || '';
    $('altInput').value = image?.getAttribute('alt') || '';
    const style = selected.style;
    $('backgroundInput').value = style.background || style.backgroundColor || '';
    $('colorInput').value = style.color || '';
    $('borderInput').value = style.border || '';
    $('radiusInput').value = style.borderRadius || '';
    $('paddingInput').value = style.padding || '';
    $('marginInput').value = style.margin || '';
  }

  $('applyElementBtn').addEventListener('click', () => {
    if (!selected) return show('先に要素を選択してください。', true);
    pushUndo();
    const link = selected.matches('a') ? selected : selected.closest('a');
    const image = selected.matches('img') ? selected : selected.querySelector?.('img');
    if (link && $('linkInput').value.trim()) link.href = $('linkInput').value.trim();
    if (image && $('imageInput').value.trim()) image.src = $('imageInput').value.trim();
    if (image) image.alt = $('altInput').value.trim();
    show('リンク・画像設定を反映しました。');
  });

  $('applyStyleBtn').addEventListener('click', () => {
    if (!selected) return show('先に要素を選択してください。', true);
    pushUndo();
    Object.assign(selected.style, {
      background: $('backgroundInput').value.trim(), color: $('colorInput').value.trim(), border: $('borderInput').value.trim(),
      borderRadius: $('radiusInput').value.trim(), padding: $('paddingInput').value.trim(), margin: $('marginInput').value.trim()
    });
    show('選択要素のCSSを反映しました。');
  });

  $('clearStyleBtn').addEventListener('click', () => {
    if (!selected) return show('先に要素を選択してください。', true);
    pushUndo(); selected.removeAttribute('style'); show('選択要素の個別CSSを解除しました。');
  });

  $('addListBtn').addEventListener('click', () => {
    if (!selected) return show('箇条書きまたは箇条書きの枠を選択してください。', true);
    const list = selected.closest('ul,ol') || selected.querySelector?.('ul,ol');
    if (!list) return show('ulまたはol内の要素を選択してください。', true);
    pushUndo();
    const li = frame.contentDocument.createElement('li'); li.textContent = '新しい項目'; li.contentEditable = 'true'; list.appendChild(li); selectElement(li);
  });

  $('duplicateBtn').addEventListener('click', () => {
    if (!selected || !selected.parentElement) return show('複製する要素を選択してください。', true);
    pushUndo(); const clone = selected.cloneNode(true); clone.classList.remove('odrp-admin-selected'); selected.after(clone); selectElement(clone);
  });
  $('deleteBtn').addEventListener('click', () => {
    if (!selected || !selected.parentElement) return show('削除する要素を選択してください。', true);
    pushUndo(); selected.remove(); selected = null; $('selectedInfo').textContent = '要素を選択してください'; show('要素を削除しました。');
  });
  $('undoBtn').addEventListener('click', () => {
    const state = undoStack.pop(); if (!state) return show('戻せる変更がありません。', true);
    const doc = frame.contentDocument; doc.querySelector('#sidebar').innerHTML = state.sidebar; doc.querySelector('main.main').innerHTML = state.main; prepareFrame(); show('1つ前の状態へ戻しました。');
  });

  $('applyCssPreviewBtn').addEventListener('click', () => {
    const doc = frame.contentDocument; let style = doc.querySelector('#odrp-live-custom-css');
    if (!style) { style = doc.createElement('style'); style.id = 'odrp-live-custom-css'; doc.head.appendChild(style); }
    style.textContent = $('customCss').value; show('追加CSSをプレビューへ反映しました。');
  });

  function cleanClone(selector) {
    const node = frame.contentDocument.querySelector(selector).cloneNode(true);
    node.querySelectorAll('[contenteditable]').forEach((el) => el.removeAttribute('contenteditable'));
    node.querySelectorAll('[spellcheck]').forEach((el) => el.removeAttribute('spellcheck'));
    node.querySelectorAll('.odrp-admin-selected').forEach((el) => el.classList.remove('odrp-admin-selected'));
    return node.innerHTML;
  }

  $('saveBtn').addEventListener('click', async () => {
    if (!accessToken) return show('ログインし直してください。', true);
    show('保存中です…');
    try {
      const payload = {
        id: config.CONTENT_ID || 'main',
        content: { sidebar: cleanClone('#sidebar'), main: cleanClone('main.main') },
        custom_css: $('customCss').value,
        updated_at: new Date().toISOString()
      };
      const response = await fetch(`${config.SUPABASE_URL}/rest/v1/site_content?on_conflict=id`, {
        method: 'POST',
        headers: {
          apikey: config.SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(await response.text() || `保存失敗: ${response.status}`);
      show('保存しました。公開ページへ即時反映されます。');
    } catch (error) { show(error.message, true); }
  });

  $('desktopBtn').addEventListener('click', (event) => { shell.classList.remove('mobile'); $('mobileBtn').classList.remove('active'); event.currentTarget.classList.add('active'); });
  $('mobileBtn').addEventListener('click', (event) => { shell.classList.add('mobile'); $('desktopBtn').classList.remove('active'); event.currentTarget.classList.add('active'); });
  frame.addEventListener('load', () => setTimeout(prepareFrame, 500));
})();
