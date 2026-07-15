(() => {
  const config = window.ODRP_CONFIG || {};
  const ready = (detail = {}) => {
    window.ODRP_CONTENT_READY = true;
    window.dispatchEvent(new CustomEvent('odrp:content-ready', { detail }));
  };

  async function load() {
    if (!config.SUPABASE_URL || config.SUPABASE_URL.includes('YOUR_PROJECT_ID') ||
        !config.SUPABASE_ANON_KEY || config.SUPABASE_ANON_KEY.includes('YOUR_SUPABASE')) {
      ready({ source: 'local', configured: false });
      return;
    }

    try {
      const id = encodeURIComponent(config.CONTENT_ID || 'main');
      const response = await fetch(`${config.SUPABASE_URL}/rest/v1/site_content?id=eq.${id}&select=content,custom_css,updated_at`, {
        headers: {
          apikey: config.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${config.SUPABASE_ANON_KEY}`
        },
        cache: 'no-store'
      });
      if (!response.ok) throw new Error(`content load failed: ${response.status}`);
      const rows = await response.json();
      const row = rows[0];
      if (row?.content) {
        if (typeof row.content.sidebar === 'string') {
          const sidebar = document.querySelector('#sidebar');
          if (sidebar) sidebar.innerHTML = row.content.sidebar;
        }
        if (typeof row.content.main === 'string') {
          const main = document.querySelector('main.main');
          if (main) main.innerHTML = row.content.main;
        }
      }
      if (row?.custom_css) {
        let style = document.querySelector('#odrp-live-custom-css');
        if (!style) {
          style = document.createElement('style');
          style.id = 'odrp-live-custom-css';
          document.head.appendChild(style);
        }
        style.textContent = row.custom_css;
      }
      ready({ source: 'supabase', updatedAt: row?.updated_at || null });
    } catch (error) {
      console.error('[ODRP] 公開データの取得に失敗しました。', error);
      ready({ source: 'local', error: true });
    }
  }

  load();
})();
