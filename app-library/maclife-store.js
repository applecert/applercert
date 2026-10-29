(() => {
 'use strict';
 const $ = (s,r=document) => r.querySelector(s), $$ = (s,r=document) => [...r.querySelectorAll(s)];
 const toast = message => {const t=$('#toast');if(!t)return;t.textContent=message;t.hidden=false;clearTimeout(t.hideTimer);t.hideTimer=setTimeout(()=>t.hidden=true,3500);};
 const themeMedia=matchMedia('(prefers-color-scheme: dark)'),themeKey='maclife_store_theme';
 const savedTheme=()=>{try{const value=localStorage.getItem(themeKey);return value==='light'||value==='dark'?value:'system';}catch{return 'system';}};
 let themeChoice=savedTheme();
 const setTheme = (choice,persist=true) => {
  if(!['system','light','dark'].includes(choice))return;
  themeChoice=choice;
  if(persist)try{if(choice==='system')localStorage.removeItem(themeKey);else localStorage.setItem(themeKey,choice);}catch{}
  document.documentElement.dataset.theme=choice==='system'?(themeMedia.matches?'dark':'light'):choice;
  $$('[data-theme-choice]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.themeChoice===choice)));
 };
 setTheme(themeChoice,false);
 $$('[data-theme-choice]').forEach(button=>button.addEventListener('click',()=>setTheme(button.dataset.themeChoice)));
 $$('[data-theme-toggle]').forEach(b=>b.addEventListener('click',()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark')));
 $$('[data-theme-system]').forEach(b=>b.addEventListener('click',()=>{setTheme('system');toast('Đã dùng giao diện theo hệ thống');}));
 themeMedia.addEventListener('change',()=>{if(themeChoice==='system')setTheme('system',false);});
 window.addEventListener('storage',event=>{if(event.key===themeKey||event.key===null)setTheme(savedTheme(),false);});
 const sidebar=$('#sidebar'),scrim=$('.menu-scrim');
 let menuOpener=null;const menu=open=>{sidebar?.classList.toggle('is-open',open);if(scrim)scrim.hidden=!open;$$('.store-main,.bottom-tabs').forEach(el=>el.inert=open);if(open){menuOpener=document.activeElement;$('a',sidebar)?.focus();}else if(menuOpener){menuOpener.focus();menuOpener=null;}};
 $$('[data-menu-open]').forEach(b=>b.addEventListener('click',()=>menu(true)));$$('[data-menu-close]').forEach(b=>b.addEventListener('click',()=>menu(false)));
 document.addEventListener('keydown',e=>{if(e.key==='Escape')menu(false);if(e.key==='Tab'&&sidebar?.classList.contains('is-open')){const focusable=$$('a,button,input,summary',sidebar).filter(el=>el.getClientRects().length);const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});matchMedia('(min-width: 768px)').addEventListener('change',e=>{if(e.matches)menu(false);});
 const motion = () => matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth';
 $$('[data-rail]').forEach(rail=>{
  const next=$('[data-rail-next]',rail.parentElement),prev=$('[data-rail-prev]',rail.parentElement);
  const update=()=>{const scrollable=rail.scrollWidth>rail.clientWidth+3;for(const [button,hidden] of [[prev,!scrollable||rail.scrollLeft<=4],[next,!scrollable||rail.scrollLeft+rail.clientWidth>=rail.scrollWidth-4]])if(button){if(hidden&&document.activeElement===button)rail.focus({preventScroll:true});button.hidden=hidden;}};
  const move=direction=>rail.scrollBy({left:direction*rail.clientWidth*.85,behavior:motion()});
  next?.addEventListener('click',()=>move(1));prev?.addEventListener('click',()=>move(-1));
  rail.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();move(e.key==='ArrowRight'?1:-1);}else if(e.target===rail&&(e.key==='Home'||e.key==='End')){e.preventDefault();rail.scrollTo({left:e.key==='Home'?0:rail.scrollWidth,behavior:motion()});}});
  rail.addEventListener('scroll',update,{passive:true});new ResizeObserver(update).observe(rail);update();
 });
 $$('img').forEach(img=>{const fail=()=>img.parentElement?.classList.add('image-failed');img.addEventListener('error',fail);if(img.complete&&!img.naturalWidth)fail();});
 $$('[data-back]').forEach(a=>{
  const fallback=new URL(a.href),base=fallback.pathname.slice(0,fallback.pathname.lastIndexOf('/')),key='maclife_back:'+location.pathname;
  const valid=u=>u.origin===location.origin&&(u.pathname===base+'/'||u.pathname.startsWith(base+'/'))&&!/\/(?:member\/action|auth|my\/login|admin|install)(?:\/|$)/.test(u.pathname)&&u.pathname+u.search!==location.pathname+location.search;
  let direct=false;
  try{const ref=new URL(document.referrer);if(valid(ref)){a.href=ref.href;direct=true;try{sessionStorage.setItem(key,JSON.stringify({url:ref.href,expires:Date.now()+1800000}));}catch{}}else{const saved=JSON.parse(sessionStorage.getItem(key)||'null');if(saved?.expires>Date.now()&&valid(new URL(saved.url)))a.href=saved.url;}}catch{}
  a.addEventListener('click',e=>{if(direct&&history.length>1){e.preventDefault();history.back();}});
 });
 const hero=$('[data-product-hero]'),top=$('.product-top');if(hero&&top)new IntersectionObserver(entries=>top.classList.toggle('is-sticky',!entries[0].isIntersecting),{rootMargin:'-64px 0px 0px 0px'}).observe(hero);
 const dialog=$('#image-dialog');$$('[data-image]').forEach(b=>b.addEventListener('click',event=>{if(!dialog)return;if(b.matches('.blog-prose img'))event.preventDefault();const img=$('img',dialog);img.src=b.dataset.image;img.alt=b.dataset.caption;$('p',dialog).textContent=b.dataset.caption;dialog.showModal();}));
 $$('[data-dialog-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog')?.close()));dialog?.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
 const shareDialog=$('#share-dialog'),shareInput=$('#share-url'),shareStatus=$('[data-share-status]'),shareCopy=$('[data-share-copy]'),shareNative=$('[data-share-native]');
 let shareData=null;
 const copyLink=async(value,field=null)=>{
  if(navigator.clipboard?.writeText){let timer;try{await Promise.race([navigator.clipboard.writeText(value),new Promise((_,reject)=>timer=setTimeout(()=>reject(new Error('Clipboard unavailable')),1500))]);return true;}catch{}finally{clearTimeout(timer);}}
  // execCommand can report success while the clipboard remains unchanged.
  // Select the visible URL and let the user copy when Clipboard API is unavailable.
  if(field){field.focus({preventScroll:true});field.select();field.setSelectionRange(0,field.value.length);}
  return false;
 };
 const openShare=(value,message='')=>{
  if(!shareDialog||!shareInput)return;
  let target;try{target=new URL(value,location.href);if(!['http:','https:'].includes(target.protocol))return;}catch{return;}
  shareData={title:document.title,url:target.href};shareInput.value=target.href;shareStatus.textContent=message;shareCopy.textContent='Sao chép liên kết';
  $('#share-title').textContent='Chia sẻ '+($('main h1')?.textContent.trim()||'MacLife');
  let supported=typeof navigator.share==='function';try{if(navigator.canShare)supported=supported&&navigator.canShare(shareData);}catch{supported=false;}
  shareNative.hidden=!supported;
  if(!shareDialog.open)shareDialog.showModal();
 };
 $$('[data-share]').forEach(b=>b.addEventListener('click',()=>openShare(b.dataset.url)));
 shareCopy?.addEventListener('click',async()=>{
  if(!shareData)return;const copied=await copyLink(shareData.url,shareInput);
  shareStatus.textContent=copied?'Đã sao chép liên kết.':'Liên kết đã được chọn. Nhấn ⌘C hoặc Ctrl+C để sao chép.';
  shareCopy.textContent=copied?'Đã sao chép':'Sao chép liên kết';
 });
 shareNative?.addEventListener('click',async()=>{
  if(!shareData)return;shareStatus.textContent='Đang mở chia sẻ. Nếu thiết bị không hiển thị, hãy sao chép liên kết.';try{await navigator.share(shareData);shareStatus.textContent='Đã chia sẻ liên kết.';}catch(e){shareStatus.textContent=e.name==='AbortError'?'Đã hủy chia sẻ. Bạn vẫn có thể sao chép liên kết.':'Thiết bị không mở được chia sẻ. Hãy dùng nút sao chép liên kết.';}
 });
 shareInput?.addEventListener('click',()=>shareInput.select());
 shareDialog?.addEventListener('click',e=>{if(e.target!==shareDialog)return;const r=shareDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)shareDialog.close();});
 $$('[data-copy]').forEach(b=>b.addEventListener('click',async()=>{if(await copyLink(b.dataset.url))toast('Đã sao chép liên kết');else openShare(b.dataset.url,'Chọn liên kết và nhấn ⌘C hoặc Ctrl+C để sao chép.');}));
 $$('[data-expandable]').forEach(box=>{
  const content=$('.expandable-content',box),button=$('[data-expand]',box);if(!content||!button)return;
  const syncButton=()=>{const expanded=box.classList.contains('expanded');button.textContent=expanded?'Thu gọn':'Xem thêm';button.setAttribute('aria-expanded',String(expanded));};
  const update=()=>{
   // Closed history sections have no measurable width. Recheck when opened.
   if(!content.getBoundingClientRect().width)return;
   const lines=Number(box.dataset.expandLines),limit=lines>0?lines*parseFloat(getComputedStyle(content).lineHeight):155;
   content.style.setProperty('--expandable-height',limit+'px');
   const long=content.scrollHeight>limit+1;
   box.classList.toggle('is-collapsible',long);button.hidden=!long;
   if(!long)box.classList.remove('expanded');syncButton();
  };
  new ResizeObserver(update).observe(content);box.closest('details')?.addEventListener('toggle',update);update();
  button.addEventListener('click',()=>{box.classList.toggle('expanded');syncButton();if(!box.classList.contains('expanded')&&box.getBoundingClientRect().top<80)box.scrollIntoView({behavior:motion(),block:'start'});});
 });
 $$('[data-scroll-to]').forEach(b=>b.addEventListener('click',()=>{const el=document.getElementById(b.dataset.scrollTo);if(el){el.open=true;el.scrollIntoView({behavior:motion()});}}));
 $$('[data-page-url]').forEach(a=>a.href=a.dataset.pageUrl);
 const blogTocs=$$('.blog-toc');
 if(blogTocs.length){
  const narrowReader=matchMedia('(max-width:1100px)');
  const locations=blogTocs.map(t=>({toc:t,aside:t.closest('.blog-aside'),main:t.closest('.blog-reading-layout')?.querySelector('.blog-article-main')}));
  const arrangeTocs=()=>locations.forEach(({toc,aside,main})=>{if(aside&&main)(narrowReader.matches?main:aside).prepend(toc);toc.open=!narrowReader.matches;});
  arrangeTocs();narrowReader.addEventListener('change',arrangeTocs);
  const links=blogTocs.flatMap(t=>$$('a[href^="#"]',t)),entries=links.map(a=>({link:a,heading:document.getElementById(a.hash.slice(1))})).filter(e=>e.heading);
  let readingFrame=false;
  const updateReading=()=>{readingFrame=false;if(!entries.length)return;let current=entries[0];const padding=parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)||0;
   for(const entry of entries){const margin=parseFloat(getComputedStyle(entry.heading).scrollMarginTop)||0;if(entry.heading.getBoundingClientRect().top<=Math.max(135,padding+margin+8))current=entry;}for(const entry of entries){if(entry===current)entry.link.setAttribute('aria-current','location');else entry.link.removeAttribute('aria-current');}};
  addEventListener('scroll',()=>{if(!readingFrame){readingFrame=true;requestAnimationFrame(updateReading);}},{passive:true});addEventListener('resize',updateReading);updateReading();
 }
 $$('[data-confirm]').forEach(el=>el.addEventListener('submit',e=>{if(!confirm(el.dataset.confirm))e.preventDefault();}));
 $$('[data-reorder]').forEach(list=>{
  list.addEventListener('click',e=>{const b=e.target.closest('[data-move]');if(!b)return;const row=b.closest('[data-sort-item]');if(b.dataset.move==='up'&&row.previousElementSibling)list.insertBefore(row,row.previousElementSibling);if(b.dataset.move==='down'&&row.nextElementSibling)list.insertBefore(row.nextElementSibling,row);b.focus({preventScroll:true});list.dispatchEvent(new Event('input',{bubbles:true}));});
 });
 const dirtyForms=$$('form[data-unsaved]');dirtyForms.forEach(f=>{let dirty=false;f.addEventListener('input',()=>dirty=true);f.addEventListener('submit',()=>dirty=false);addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});});
})();
document.addEventListener('keydown',e=>{if(e.target.matches('.blog-prose img[data-image]')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.target.click();}});
