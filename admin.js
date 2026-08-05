(() => {
  'use strict';
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const state = { page:'index.html', doc:null, selected:null, original:'', undo:[], redo:[], dirty:false, zoom:1 };
  const els = {
    frame:$('#siteFrame'), frameWrap:$('#canvasFrame'), page:$('#pageSelect'), content:$('#contentPanel'), design:$('#designPanel'), settings:$('#elementSettingsPanel'), empty:$('#emptySelection'), layers:$('#layerTree'), save:$('#saveState'), toast:$('#toast')
  };

  const toast = (msg, error=false) => { els.toast.textContent=msg; els.toast.style.borderColor=error?'#ef4444':''; els.toast.classList.add('show'); setTimeout(()=>els.toast.classList.remove('show'),2600); };
  const esc = s => String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const snapshot = () => state.doc ? serializeDocument() : '';
  function pushHistory(){ const now=snapshot(); if(state.undo.at(-1)!==now) state.undo.push(now); if(state.undo.length>60)state.undo.shift(); state.redo=[]; updateHistoryButtons(); }
  function beginChange(){ if(!state.doc)return; pushHistory(); }
  function changed(){ state.dirty=true; els.save.textContent='未公開の変更'; els.save.style.color='#fbbf24'; rebuildLayers(); updateHistoryButtons(); }
  function updateHistoryButtons(){ $('#undoBtn').disabled=!state.undo.length; $('#redoBtn').disabled=!state.redo.length; }
  function cleanEditorArtifacts(doc){
    $$('[data-studio-selected]',doc).forEach(e=>e.removeAttribute('data-studio-selected'));
    $('#odrp-studio-style',doc)?.remove();
    doc.body?.removeAttribute('contenteditable');
    return doc;
  }
  function serializeDocument(){
    const clone=state.doc.documentElement.cloneNode(true); cleanEditorArtifacts({documentElement:clone,body:clone.querySelector('body'),querySelector:s=>clone.querySelector(s),querySelectorAll:s=>clone.querySelectorAll(s)});
    return '<!DOCTYPE html>\n'+clone.outerHTML;
  }
  function restore(html){
    const parser=new DOMParser(), parsed=parser.parseFromString(html,'text/html');
    state.doc.replaceChild(state.doc.importNode(parsed.documentElement,true),state.doc.documentElement);
    prepareFrame(); changed();
  }
  function undo(){ if(!state.undo.length)return; state.redo.push(snapshot()); restore(state.undo.pop()); updateHistoryButtons(); }
  function redo(){ if(!state.redo.length)return; state.undo.push(snapshot()); restore(state.redo.pop()); updateHistoryButtons(); }

  async function loadPage(){
    if(state.dirty && !confirm('未公開の変更があります。ページを再読み込みしますか？')) return;
    state.page=els.page.value; state.selected=null; state.undo=[]; state.redo=[]; state.dirty=false; els.save.textContent='未変更'; els.save.style.color='';
    els.frame.src=state.page+'?studio='+Date.now();
  }
  els.frame.addEventListener('load',()=>{ state.doc=els.frame.contentDocument; state.original=serializeDocument(); prepareFrame(); rebuildLayers(); updateHistoryButtons(); });

  function prepareFrame(){
    const doc=state.doc;if(!doc)return;
    let style=$('#odrp-studio-style',doc); if(!style){style=doc.createElement('style');style.id='odrp-studio-style';doc.head.appendChild(style)}
    style.textContent=`[data-studio-selected]{outline:3px solid #2563eb!important;outline-offset:2px!important;cursor:pointer!important} body *:hover{outline:1px dashed rgba(37,99,235,.55);outline-offset:1px}`;
    doc.addEventListener('click',frameClick,true); doc.addEventListener('dblclick',frameDblClick,true); doc.addEventListener('input',frameInput,true);
    selectElement(null);
  }
  function frameClick(e){
    if(!state.doc)return;
    const a=e.target.closest('a'); if(a)e.preventDefault();
    e.stopPropagation(); selectElement(e.target.nodeType===1?e.target:e.target.parentElement);
  }
  function frameDblClick(e){
    const el=e.target.closest('h1,h2,h3,h4,h5,h6,p,li,span,button,a,td,th,label,strong,small');
    if(!el)return; e.preventDefault(); el.contentEditable='true'; el.focus(); document.execCommand?.('selectAll',false,null); toast('文章を直接編集できます。完了後に外側をクリックしてください');
    const finish=()=>{el.contentEditable='false';el.removeEventListener('blur',finish);changed();renderProperties()}; el.addEventListener('blur',finish);
  }
  let directEditStarted=false;
  function frameInput(){ if(!directEditStarted){beginChange();directEditStarted=true;setTimeout(()=>directEditStarted=false,500)} changed(); }

  function selectElement(el){
    if(state.selected) state.selected.removeAttribute('data-studio-selected');
    state.selected=el;
    if(el){el.setAttribute('data-studio-selected','true');els.empty.style.display='none'} else els.empty.style.display='block';
    renderProperties(); markLayer();
  }
  function elementLabel(el){
    const text=(el.textContent||'').trim().replace(/\s+/g,' ').slice(0,28);
    return `${el.tagName.toLowerCase()}${el.id?'#'+el.id:''}${el.classList.length?'.'+[...el.classList].slice(0,2).join('.'):''}${text?' — '+text:''}`;
  }
  function rebuildLayers(){
    if(!state.doc)return; const q=$('#layerSearch').value.trim().toLowerCase(); els.layers.innerHTML='';
    const candidates=$$('body *',state.doc).filter(el=>!['SCRIPT','STYLE','SVG','PATH'].includes(el.tagName));
    candidates.filter(el=>{const l=elementLabel(el).toLowerCase();return !q||l.includes(q)}).slice(0,400).forEach(el=>{
      const b=document.createElement('button');b.className='layer-item';b.innerHTML=`<span class="tag">${el.tagName.toLowerCase()}</span><span>${esc((el.textContent||'').trim().replace(/\s+/g,' ').slice(0,24)||el.id||el.className||'要素')}</span>`;b.dataset.ref=candidates.indexOf(el); b.addEventListener('click',()=>{selectElement(el);el.scrollIntoView({behavior:'smooth',block:'center'})});els.layers.appendChild(b);
    }); markLayer();
  }
  function markLayer(){ $$('.layer-item',els.layers).forEach(b=>b.classList.remove('active')); }

  function renderProperties(){
    [els.content,els.design,els.settings].forEach(p=>p.innerHTML=''); const el=state.selected;if(!el)return;
    const tag=el.tagName.toLowerCase();
    els.content.innerHTML=`<div class="property-group"><h3>選択中</h3><div class="selected-tag">${esc(elementLabel(el))}</div></div>`;
    if(!['IMG','INPUT','SELECT','TEXTAREA','VIDEO','IFRAME'].includes(el.tagName)){
      const group=propGroup('テキスト'); const area=document.createElement('textarea');area.value=el.innerHTML;area.addEventListener('focus',beginChange,{once:true});area.addEventListener('input',()=>{el.innerHTML=area.value;changed()});group.append(labelWrap('内容（HTML可）',area));els.content.append(group);
    }
    if(el.tagName==='IMG') addInput(els.content,'画像URL','src',el.getAttribute('src')||'',v=>{el.setAttribute('src',v)}), addInput(els.content,'代替テキスト','alt',el.alt,v=>el.alt=v);
    if(el.tagName==='A') addInput(els.content,'リンク先','href',el.getAttribute('href')||'',v=>el.setAttribute('href',v));
    if(['INPUT','TEXTAREA'].includes(el.tagName)) addInput(els.content,'プレースホルダー','placeholder',el.getAttribute('placeholder')||'',v=>el.setAttribute('placeholder',v));

    const cs=state.doc.defaultView.getComputedStyle(el);
    const styleGroup=propGroup('サイズ・余白');
    const grid=document.createElement('div');grid.className='style-grid';
    [['幅','width'],['高さ','height'],['上余白','marginTop'],['右余白','marginRight'],['下余白','marginBottom'],['左余白','marginLeft'],['内側余白','padding']].forEach(([name,key])=>grid.append(makeStyleInput(name,key,el.style[key]||'')));
    styleGroup.append(grid);els.design.append(styleGroup);
    const typeGroup=propGroup('文字'); const typeGrid=document.createElement('div');typeGrid.className='style-grid';
    [['文字サイズ','fontSize'],['太さ','fontWeight'],['行間','lineHeight'],['字間','letterSpacing'],['揃え','textAlign']].forEach(([n,k])=>typeGrid.append(makeStyleInput(n,k,el.style[k]||'')));typeGroup.append(typeGrid);typeGroup.append(makeColor('文字色',cs.color,v=>el.style.color=v),makeColor('背景色',cs.backgroundColor,v=>el.style.backgroundColor=v));els.design.append(typeGroup);
    const border=propGroup('枠・表示');border.append(makeStyleInput('角丸','borderRadius',el.style.borderRadius||''),makeStyleInput('枠線','border',el.style.border||''),makeStyleInput('影','boxShadow',el.style.boxShadow||''),makeSelect('表示方式',el.style.display||'', ['', 'block','inline','inline-block','flex','grid','none'],v=>el.style.display=v));els.design.append(border);

    addInput(els.settings,'ID','id',el.id,v=>el.id=v);addInput(els.settings,'クラス','class',el.className||'',v=>el.className=v);
    const actions=propGroup('要素操作'); const row=document.createElement('div');row.className='inline-actions';
    const dup=button('複製','secondary',()=>{beginChange();const c=el.cloneNode(true);el.after(c);changed();selectElement(c)}); const del=button('削除','danger',()=>{if(confirm('この要素を削除しますか？')){beginChange();el.remove();changed();selectElement(null)}});row.append(dup,del);actions.append(row);els.settings.append(actions);
    const move=propGroup('並び順');const mr=document.createElement('div');mr.className='inline-actions';mr.append(button('上へ','secondary',()=>moveElement(-1)),button('下へ','secondary',()=>moveElement(1)));move.append(mr);els.settings.append(move);
  }
  function propGroup(title){const d=document.createElement('div');d.className='property-group';d.innerHTML=`<h3>${esc(title)}</h3>`;return d}
  function labelWrap(name,input){const l=document.createElement('label');l.textContent=name;l.append(input);return l}
  function button(text,cls,fn){const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=text;b.addEventListener('click',fn);return b}
  function addInput(parent,name,attr,value,apply){const i=document.createElement('input');i.value=value;i.addEventListener('focus',beginChange,{once:true});i.addEventListener('input',()=>{apply(i.value);changed()});parent.append(labelWrap(name,i));return i}
  function makeStyleInput(name,key,value){const i=document.createElement('input');i.placeholder='auto / 16px / 100%';i.value=value;i.addEventListener('focus',beginChange,{once:true});i.addEventListener('input',()=>{state.selected.style[key]=i.value;changed()});return labelWrap(name,i)}
  function makeColor(name,value,apply){const wrap=document.createElement('label');wrap.textContent=name;const d=document.createElement('div');d.className='color-control';const c=document.createElement('input');c.type='color';c.value=rgbToHex(value);const t=document.createElement('input');t.value=value;c.addEventListener('input',()=>{if(!state.dirty)beginChange();t.value=c.value;apply(c.value);changed()});t.addEventListener('focus',beginChange,{once:true});t.addEventListener('input',()=>{apply(t.value);changed()});d.append(c,t);wrap.append(d);return wrap}
  function makeSelect(name,value,options,apply){const s=document.createElement('select');options.forEach(o=>{const op=document.createElement('option');op.value=o;op.textContent=o||'既定';op.selected=o===value;s.append(op)});s.addEventListener('focus',beginChange,{once:true});s.addEventListener('change',()=>{apply(s.value);changed()});return labelWrap(name,s)}
  function rgbToHex(v){const m=String(v).match(/\d+/g);if(!m||m.length<3)return'#000000';return'#'+m.slice(0,3).map(n=>(+n).toString(16).padStart(2,'0')).join('')}
  function moveElement(dir){const el=state.selected;if(!el)return;beginChange();if(dir<0&&el.previousElementSibling)el.parentNode.insertBefore(el,el.previousElementSibling);else if(dir>0&&el.nextElementSibling)el.parentNode.insertBefore(el.nextElementSibling,el);changed();rebuildLayers()}

  function getConfig(){return{owner:sessionStorage.getItem('odrp_editor_owner')||$('#ghOwner').value.trim(),repo:sessionStorage.getItem('odrp_editor_repo')||$('#ghRepo').value.trim(),branch:sessionStorage.getItem('odrp_editor_branch')||$('#ghBranch').value.trim()||'main',token:sessionStorage.getItem('odrp_editor_token')||$('#ghToken').value.trim()}}
  function saveConfig(){sessionStorage.setItem('odrp_editor_owner',$('#ghOwner').value.trim());sessionStorage.setItem('odrp_editor_repo',$('#ghRepo').value.trim());sessionStorage.setItem('odrp_editor_branch',$('#ghBranch').value.trim());sessionStorage.setItem('odrp_editor_token',$('#ghToken').value.trim())}
  function loadConfig(){['owner','repo','branch','token'].forEach(k=>{const v=sessionStorage.getItem('odrp_editor_'+k);const id={owner:'#ghOwner',repo:'#ghRepo',branch:'#ghBranch',token:'#ghToken'}[k];if(v)$(id).value=v})}
  async function gh(path,opts={}){const c=getConfig();if(!c.owner||!c.repo||!c.token)throw new Error('GitHub設定を入力してください');const res=await fetch(`https://api.github.com/repos/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repo)}${path}`,{...opts,headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${c.token}`,'X-GitHub-Api-Version':'2022-11-28',...(opts.headers||{})}});if(!res.ok){const j=await res.json().catch(()=>({}));throw new Error(j.message||`GitHub API ${res.status}`)}return res.status===204?null:res.json()}
  const toB64=str=>{const bytes=new TextEncoder().encode(str);let bin='';bytes.forEach(b=>bin+=String.fromCharCode(b));return btoa(bin)};
  const fromB64=str=>{const bin=atob(str.replace(/\n/g,''));const bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));return new TextDecoder().decode(bytes)};
  async function publish(message,author){
    const c=getConfig(), content=serializeDocument();
    let existing=null;try{existing=await gh(`/contents/${encodeURIComponent(state.page)}?ref=${encodeURIComponent(c.branch)}`)}catch(e){if(!/404/.test(e.message))throw e}
    const body={message:author?`${message} (${author})`:message,content:toB64(content),branch:c.branch};if(existing?.sha)body.sha=existing.sha;
    await gh(`/contents/${encodeURIComponent(state.page)}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    state.original=content;state.dirty=false;state.undo=[];state.redo=[];els.save.textContent='公開済み';els.save.style.color='#4ade80';updateHistoryButtons();toast('GitHubへ公開しました。Pagesへの反映には少し時間がかかります。');
  }
  async function loadCommits(){
    const list=$('#commitList');list.innerHTML='<p>読み込み中...</p>';try{const c=getConfig();const commits=await gh(`/commits?sha=${encodeURIComponent(c.branch)}&per_page=30`);list.innerHTML='';commits.forEach(x=>{const d=document.createElement('article');d.className='commit-item';const date=new Date(x.commit.author.date).toLocaleString('ja-JP');d.innerHTML=`<div class="commit-title"><span class="commit-message">${esc(x.commit.message)}</span><code>${x.sha.slice(0,7)}</code></div><div class="commit-meta">${esc(x.commit.author.name)} ・ ${date}</div><div class="commit-actions"><button class="secondary view">この時点をプレビュー</button><button class="secondary restore">この時点へ戻す</button></div>`;$('.view',d).addEventListener('click',()=>previewCommit(x.sha));$('.restore',d).addEventListener('click',()=>restoreCommit(x.sha,x.commit.message));list.append(d)});if(!commits.length)list.innerHTML='<p>履歴はありません。</p>'}catch(e){list.innerHTML=`<p>${esc(e.message)}</p>`}
  }
  async function previewCommit(sha){try{const f=await gh(`/contents/${encodeURIComponent(state.page)}?ref=${sha}`);const blob=new Blob([fromB64(f.content)],{type:'text/html'});window.open(URL.createObjectURL(blob),'_blank')}catch(e){toast(e.message,true)}}
  async function restoreCommit(sha,msg){if(!confirm(`「${msg}」の時点へ戻しますか？\n現在の内容は新しいコミットとして履歴に残ります。`))return;try{const c=getConfig();const old=await gh(`/contents/${encodeURIComponent(state.page)}?ref=${sha}`);const cur=await gh(`/contents/${encodeURIComponent(state.page)}?ref=${encodeURIComponent(c.branch)}`);await gh(`/contents/${encodeURIComponent(state.page)}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:`履歴から復元: ${msg}`,content:old.content.replace(/\n/g,''),sha:cur.sha,branch:c.branch})});toast('復元しました。編集ページを再読み込みします。');setTimeout(loadPage,800)}catch(e){toast(e.message,true)}}

  $$('.panel-tab[data-left-tab]').forEach(b=>b.addEventListener('click',()=>{ $$('.panel-tab[data-left-tab]').forEach(x=>x.classList.toggle('active',x===b)); $$('.left-panel .panel-section').forEach(x=>x.classList.toggle('active',x.id===b.dataset.leftTab+'Panel')) }));
  $$('.panel-tab[data-right-tab]').forEach(b=>b.addEventListener('click',()=>{ $$('.panel-tab[data-right-tab]').forEach(x=>x.classList.toggle('active',x===b)); [els.content,els.design,els.settings].forEach((x,i)=>x.classList.toggle('active',['content','design','settings'][i]===b.dataset.rightTab)) }));
  $$('.viewport').forEach(b=>b.addEventListener('click',()=>{$$('.viewport').forEach(x=>x.classList.toggle('active',x===b));els.frameWrap.style.width=b.dataset.width}));
  function setZoom(v){state.zoom=Math.min(1.5,Math.max(.5,v));els.frameWrap.style.transform=`scale(${state.zoom})`;$('#zoomLabel').textContent=Math.round(state.zoom*100)+'%'}
  $('#zoomIn').addEventListener('click',()=>setZoom(state.zoom+.1));$('#zoomOut').addEventListener('click',()=>setZoom(state.zoom-.1));
  $('#undoBtn').addEventListener('click',undo);$('#redoBtn').addEventListener('click',redo);$('#pageSelect').addEventListener('change',loadPage);$('#reloadBtn').addEventListener('click',loadPage);$('#layerSearch').addEventListener('input',rebuildLayers);
  $('#settingsBtn').addEventListener('click',()=>{$('#githubDialog').showModal()});$('#githubForm').addEventListener('submit',e=>{e.preventDefault();saveConfig();$('#githubDialog').close();toast('GitHub設定を保存しました')});
  $('#testConnection').addEventListener('click',async()=>{saveConfig();const out=$('#connectionResult');out.textContent='確認中...';try{const c=getConfig();const r=await gh('');out.textContent=`接続成功：${r.full_name} / ${c.branch}`;out.style.color='#4ade80'}catch(e){out.textContent=e.message;out.style.color='#f87171'}});
  $('#historyBtn').addEventListener('click',()=>{$('#historyDialog').showModal();loadCommits()});$('#closeHistory').addEventListener('click',()=>$('#historyDialog').close());$('#refreshHistory').addEventListener('click',loadCommits);
  $('#previewBtn').addEventListener('click',()=>{const blob=new Blob([serializeDocument()],{type:'text/html'});window.open(URL.createObjectURL(blob),'_blank')});
  $('#publishBtn').addEventListener('click',()=>{if(!getConfig().token){$('#githubDialog').showModal();return}$('#publishSummary').textContent=`対象：${state.page} ／ ${state.dirty?'未公開の変更あり':'変更なし'}`;$('#publishDialog').showModal()});
  $('#publishForm').addEventListener('submit',async e=>{e.preventDefault();const m=$('#commitMessage').value.trim();if(!m)return;$('#publishDialog').close();try{await publish(m,$('#commitAuthor').value.trim());$('#commitMessage').value=''}catch(err){toast(err.message,true)}});
  window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo()}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();$('#publishBtn').click()}});
  window.addEventListener('beforeunload',e=>{if(state.dirty){e.preventDefault();e.returnValue=''}});
  loadConfig();loadPage();
})();
