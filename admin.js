(() => {
  const frame = document.getElementById('siteFrame');
  const shell = document.getElementById('previewShell');
  const selectedInfo = document.getElementById('selectedInfo');
  const linkInput = document.getElementById('linkInput');
  const imageInput = document.getElementById('imageInput');
  const altInput = document.getElementById('altInput');
  const applyBtn = document.getElementById('applyElementBtn');
  const message = document.getElementById('message');
  let selected = null;
  let originalHtml = '';

  const show = (text, error = false) => {
    message.textContent = text;
    message.style.color = error ? '#b91c1c' : '#15803d';
  };

  const editableSelector = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,strong,small,figcaption,td,th,span:not(.nav-icon):not(.chevron)';

  function prepareFrame() {
    const doc = frame.contentDocument;
    if (!doc) return;
    originalHtml = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;

    const helperStyle = doc.createElement('style');
    helperStyle.id = 'odrp-admin-helper-style';
    helperStyle.textContent = `
      [contenteditable="true"]:hover{outline:2px dashed #f97316!important;outline-offset:3px;cursor:text!important}
      .odrp-admin-selected{outline:3px solid #2563eb!important;outline-offset:3px!important}
      a,img,button{cursor:pointer}
    `;
    doc.head.appendChild(helperStyle);

    doc.querySelectorAll(editableSelector).forEach(el => {
      if (el.closest('script,style')) return;
      el.contentEditable = 'true';
      el.spellcheck = true;
    });

    doc.addEventListener('click', event => {
      const target = event.target;
      const link = target.closest('a');
      const image = target.closest('img');
      const candidate = image || link || target;
      if (link) event.preventDefault();
      selectElement(candidate);
    }, true);

    show('管理画面を読み込みました。プレビュー内をクリックして編集できます。');
  }

  function selectElement(el) {
    const doc = frame.contentDocument;
    doc.querySelectorAll('.odrp-admin-selected').forEach(node => node.classList.remove('odrp-admin-selected'));
    selected = el;
    selected.classList.add('odrp-admin-selected');

    const tag = selected.tagName.toLowerCase();
    const link = selected.tagName === 'A' ? selected : selected.closest('a');
    const image = selected.tagName === 'IMG' ? selected : selected.querySelector?.('img');
    selectedInfo.textContent = `<${tag}> ${selected.textContent.trim().slice(0, 70) || selected.getAttribute('alt') || '要素'}`;

    linkInput.disabled = !link;
    linkInput.value = link?.getAttribute('href') || '';
    imageInput.disabled = !image;
    altInput.disabled = !image;
    imageInput.value = image?.getAttribute('src') || '';
    altInput.value = image?.getAttribute('alt') || '';
    applyBtn.disabled = !(link || image);
  }

  applyBtn.addEventListener('click', () => {
    if (!selected) return;
    const link = selected.tagName === 'A' ? selected : selected.closest('a');
    const image = selected.tagName === 'IMG' ? selected : selected.querySelector?.('img');
    if (link && linkInput.value.trim()) link.setAttribute('href', linkInput.value.trim());
    if (image && imageInput.value.trim()) image.setAttribute('src', imageInput.value.trim());
    if (image) image.setAttribute('alt', altInput.value.trim());
    show('選択した要素へ反映しました。');
  });

  document.getElementById('desktopBtn').addEventListener('click', event => {
    shell.classList.remove('mobile');
    document.getElementById('mobileBtn').classList.remove('active');
    event.currentTarget.classList.add('active');
  });
  document.getElementById('mobileBtn').addEventListener('click', event => {
    shell.classList.add('mobile');
    document.getElementById('desktopBtn').classList.remove('active');
    event.currentTarget.classList.add('active');
  });

  function cleanHtml() {
    const clone = frame.contentDocument.documentElement.cloneNode(true);
    clone.querySelector('#odrp-admin-helper-style')?.remove();
    clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    clone.querySelectorAll('[spellcheck]').forEach(el => el.removeAttribute('spellcheck'));
    clone.querySelectorAll('.odrp-admin-selected').forEach(el => el.classList.remove('odrp-admin-selected'));
    return '<!DOCTYPE html>\n' + clone.outerHTML;
  }

  document.getElementById('saveDraftBtn').addEventListener('click', () => {
    localStorage.setItem('odrpAdminDraft', cleanHtml());
    show('このブラウザへ一時保存しました。');
  });

  document.getElementById('loadDraftBtn').addEventListener('click', () => {
    const saved = localStorage.getItem('odrpAdminDraft');
    if (!saved) return show('一時保存データがありません。', true);
    frame.srcdoc = saved;
    frame.onload = prepareFrame;
    show('一時保存を復元しました。');
  });

  document.getElementById('resetBtn').addEventListener('click', () => {
    if (!confirm('管理画面で行った変更をすべて元に戻しますか？')) return;
    frame.srcdoc = originalHtml;
    frame.onload = prepareFrame;
  });

  document.getElementById('downloadBtn').addEventListener('click', () => {
    const blob = new Blob([cleanHtml()], {type: 'text/html;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    a.click();
    URL.revokeObjectURL(url);
    show('更新済みの index.html を書き出しました。');
  });

  document.getElementById('uploadInput').addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!selected) return show('先に置き換える画像をプレビュー内で選択してください。', true);
    const image = selected.tagName === 'IMG' ? selected : selected.querySelector?.('img');
    if (!image) return show('画像要素を選択してください。', true);
    const reader = new FileReader();
    reader.onload = () => {
      image.src = reader.result;
      imageInput.value = reader.result;
      show('画像をプレビューへ反映しました。公開用はassetsフォルダへ保存する方法がおすすめです。');
    };
    reader.readAsDataURL(file);
  });

  frame.addEventListener('load', prepareFrame);
})();
