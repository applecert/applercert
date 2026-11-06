/**
 * IPAVIET VIP Auto-Sign
 * Ký & cài app ngầm cho thành viên VIP bằng chứng chỉ riêng (lưu ở repo GitHub private
 * thông qua Apps Script - xem gas-vip-cert.js). Người dùng chỉ bấm 1 lần, hệ thống
 * tự tải IPA → ký → hiện nút "Cài Đặt".
 */
(function () {
  'use strict';

  const SIGN_URL = 'https://ipa.ipasign.cc/sign';
  const STATUS_URL = 'https://ipa.ipasign.cc/status/';
  const DOWNLOAD_URL = 'https://ipa.ipasign.cc/download/';
  const INSTALLER = 'https://ipaviet-installer.clonene121212.workers.dev/';
  const PROXY = 'https://tight-water-fabbipa-proxy.tlvdzreal.workers.dev/?url=';
  const MAX_FILE = 300 * 1024;
  const DAY = 86400000;

  let cfg = null;
  let busy = false;
  let ready = null;           // { key, itms, web }
  let pendingAfterSave = null;

  const $ = (id) => document.getElementById(id);
  const isIos = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const haptic = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
  const toast = (m) => (cfg && cfg.toast ? cfg.toast(m) : alert(m));

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ───────────────────────── Backend ─────────────────────────
  async function api(action, payload) {
    const user = cfg.getUser();
    if (!user) throw Object.assign(new Error('Bạn cần đăng nhập.'), { code: 'AUTH' });
    const idToken = await user.getIdToken();
    const res = await fetch(cfg.gsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ action, idToken }, payload || {}))
    });
    const data = await res.json();
    if (!data.success) throw Object.assign(new Error(data.error || 'Lỗi máy chủ.'), { code: data.code, meta: data.meta });
    return data;
  }

  // ───────────────────────── Helpers ─────────────────────────
  function fileToB64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(',')[1] || '');
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  async function profileExpiry(file) {
    try {
      const text = await new Promise((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.readAsText(file, 'ISO-8859-1');
      });
      const m = text.match(/<key>ExpirationDate<\/key>\s*<date>([^<]+)<\/date>/);
      const n = text.match(/<key>TeamName<\/key>\s*<string>([^<]*)<\/string>/);
      return m ? { expiresAt: new Date(m[1]).getTime(), teamName: n ? n[1] : '' } : null;
    } catch (e) { return null; }
  }

  function loadJsZip() {
    if (window.JSZip) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      s.onload = resolve;
      s.onerror = () => reject(new Error('Không tải được bộ đọc ZIP.'));
      document.head.appendChild(s);
    });
  }

  function daysLeft(ms) { return Math.floor((ms - Date.now()) / DAY); }

  // ───────────────────────── Row UI ─────────────────────────
  function setBtn(label, pct) {
    const btn = $('btnVipSign');
    if (!btn) return;
    if (pct == null) {
      btn.classList.remove('vs-busy');
      btn.innerHTML = '<span class="vs-label"></span>';
      btn.querySelector('.vs-label').textContent = label;
      return;
    }
    btn.classList.add('vs-busy');
    btn.innerHTML = '<span class="vs-fill"></span><span class="vs-label"></span>';
    btn.querySelector('.vs-fill').style.width = Math.max(2, Math.min(100, pct)) + '%';
    btn.querySelector('.vs-label').textContent = label;
  }

  function setDesc(text, tone) {
    const el = $('vipSignDesc');
    if (!el) return;
    el.textContent = text;
    el.dataset.tone = tone || '';
  }

  function refresh() {
    if (!cfg || busy) return;
    const user = cfg.getUser();
    const vip = cfg.isVip();
    const meta = cfg.getMeta();
    const certBtn = $('btnVipCert');
    if (certBtn) certBtn.hidden = !(user && vip);

    if (!user) { setBtn('Đăng nhập'); setDesc('Đăng nhập tài khoản VIP để ký & cài app tự động.'); return; }
    if (!vip) { setBtn('Nâng VIP'); setDesc('Dành cho thành viên VIP · ký ngầm bằng chứng chỉ riêng của bạn.'); return; }
    if (!meta) { setBtn('Thêm Cert'); setDesc('Thêm chứng chỉ của bạn một lần, các app sau chỉ cần 1 chạm.', 'info'); return; }

    const exp = meta.expiresAt && (meta.expiresAt.toMillis ? meta.expiresAt.toMillis() : new Date(meta.expiresAt).getTime());
    const d = exp ? daysLeft(exp) : 0;
    if (d < 0) { setBtn('Thay Cert'); setDesc('Chứng chỉ "' + (meta.name || '') + '" đã hết hạn · bấm để thay mới.', 'bad'); return; }
    if (ready && ready.key === currentKey()) { setBtn('Cài Đặt'); setDesc('Đã ký xong · bấm Cài Đặt để cài lên thiết bị.', 'ok'); return; }
    setBtn('Ký & Cài');
    setDesc('Chứng chỉ: ' + (meta.name || 'Cert') + ' · còn ' + d + ' ngày' + (d <= 7 ? ' (sắp hết hạn)' : ''), d <= 7 ? 'warn' : 'ok');
  }

  function currentKey() {
    const app = cfg.getApp();
    const meta = cfg.getMeta();
    const stamp = meta && meta.updatedAt ? (meta.updatedAt.toMillis ? meta.updatedAt.toMillis() : String(meta.updatedAt)) : '';
    return app ? (app._id || app.bundleId || app.name) + '|' + stamp : '';
  }

  // ───────────────────────── Cert modal ─────────────────────────
  function closeModal() {
    const m = $('vsModal');
    if (m) { m.classList.remove('show'); setTimeout(() => m.remove(), 220); }
  }

  function openCertModal(opts) {
    opts = opts || {};
    closeModal();
    const meta = cfg.getMeta();
    const state = { p12: null, mp: null };
    const wrap = document.createElement('div');
    wrap.id = 'vsModal';
    wrap.className = 'vs-modal';
    wrap.innerHTML = `
      <div class="vs-backdrop" data-close></div>
      <div class="vs-sheet" role="dialog" aria-modal="true" aria-label="Chứng chỉ ký của bạn">
        <div class="vs-grab"></div>
        <h3>Chứng chỉ ký của bạn</h3>
        <p class="vs-sub">${opts.reason ? esc(opts.reason) : 'Tải lên một lần. Cert được lưu riêng tư trên kho bảo mật và dùng để ký ngầm mọi app bạn cài.'}</p>
        ${meta ? `<div class="vs-current"><b>${esc(meta.name)}</b><span>${esc(meta.teamName || '')}</span></div>` : ''}
        <div class="vs-files">
          <button type="button" class="vs-file" data-pick="zip"><b>File ZIP</b><span id="vsZipTxt">.p12 + .mobileprovision</span></button>
          <button type="button" class="vs-file" data-pick="p12"><b>.p12</b><span id="vsP12Txt">Chọn file</span></button>
          <button type="button" class="vs-file" data-pick="mp"><b>.mobileprovision</b><span id="vsMpTxt">Chọn file</span></button>
        </div>
        <input type="file" id="vsZipIn" accept=".zip" hidden>
        <input type="file" id="vsP12In" accept=".p12" hidden>
        <input type="file" id="vsMpIn" accept=".mobileprovision" hidden>
        <input type="password" id="vsPass" class="vs-input" placeholder="Mật khẩu .p12 (nếu có)" autocomplete="off">
        <div class="vs-info" id="vsInfo"></div>
        <div class="vs-err" id="vsErr" role="alert"></div>
        <div class="vs-actions">
          ${meta ? '<button type="button" class="vs-btn vs-danger" id="vsDel">Xoá cert</button>' : ''}
          <button type="button" class="vs-btn" data-close>Đóng</button>
          <button type="button" class="vs-btn vs-primary" id="vsSave">Lưu chứng chỉ</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('show'));

    const err = (m) => { wrap.querySelector('#vsErr').textContent = m || ''; };
    const refreshSel = async () => {
      wrap.querySelector('#vsP12Txt').textContent = state.p12 ? state.p12.name : 'Chọn file';
      wrap.querySelector('#vsMpTxt').textContent = state.mp ? state.mp.name : 'Chọn file';
      const info = wrap.querySelector('#vsInfo');
      info.textContent = '';
      if (state.mp) {
        const p = await profileExpiry(state.mp);
        if (p && p.expiresAt) {
          const d = daysLeft(p.expiresAt);
          info.textContent = (p.teamName ? p.teamName + ' · ' : '') + (d >= 0 ? 'còn ' + d + ' ngày' : 'ĐÃ HẾT HẠN');
          info.dataset.tone = d >= 0 ? 'ok' : 'bad';
        }
      }
    };

    wrap.addEventListener('click', (ev) => {
      if (ev.target.closest('[data-close]')) { closeModal(); return; }
      const pick = ev.target.closest('[data-pick]');
      if (pick) wrap.querySelector({ zip: '#vsZipIn', p12: '#vsP12In', mp: '#vsMpIn' }[pick.dataset.pick]).click();
    });

    wrap.querySelector('#vsP12In').addEventListener('change', (e) => { state.p12 = e.target.files[0] || null; refreshSel(); });
    wrap.querySelector('#vsMpIn').addEventListener('change', (e) => { state.mp = e.target.files[0] || null; refreshSel(); });
    wrap.querySelector('#vsZipIn').addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      err('');
      try {
        await loadJsZip();
        const zip = await window.JSZip.loadAsync(f);
        let p12 = null, mp = null;
        for (const name of Object.keys(zip.files)) {
          const low = name.toLowerCase();
          if (zip.files[name].dir || low.indexOf('__macosx') !== -1) continue;
          if (low.endsWith('.p12') && !p12) p12 = new File([await zip.files[name].async('blob')], name.split('/').pop());
          if (low.endsWith('.mobileprovision') && !mp) mp = new File([await zip.files[name].async('blob')], name.split('/').pop());
        }
        if (!p12 || !mp) { err('ZIP cần chứa cả file .p12 và .mobileprovision.'); return; }
        state.p12 = p12; state.mp = mp;
        wrap.querySelector('#vsZipTxt').textContent = f.name;
        refreshSel();
      } catch (ex) { err(ex.message || 'Không đọc được ZIP.'); }
    });

    wrap.querySelector('#vsSave').addEventListener('click', async (ev) => {
      const btn = ev.currentTarget;
      err('');
      if (!state.p12 || !state.mp) { err('Cần chọn đủ file .p12 và .mobileprovision.'); return; }
      if (state.p12.size > MAX_FILE || state.mp.size > MAX_FILE) { err('File quá lớn (tối đa 300KB mỗi file).'); return; }
      btn.disabled = true; btn.textContent = 'Đang lưu...';
      try {
        const res = await api('vip_cert_save', {
          p12: await fileToB64(state.p12), mp: await fileToB64(state.mp),
          p12Name: state.p12.name, mpName: state.mp.name,
          name: state.p12.name.replace(/\.p12$/i, ''),
          password: wrap.querySelector('#vsPass').value
        });
        if (cfg.setMeta) cfg.setMeta(res.meta);
        haptic([15, 60, 20]);
        toast('✅ Đã lưu chứng chỉ. Sẵn sàng ký ngầm!');
        closeModal();
        ready = null;
        refresh();
        if (pendingAfterSave) { const fn = pendingAfterSave; pendingAfterSave = null; setTimeout(fn, 300); }
      } catch (ex) {
        err(ex.message);
        btn.disabled = false; btn.textContent = 'Lưu chứng chỉ';
      }
    });

    const del = wrap.querySelector('#vsDel');
    if (del) del.addEventListener('click', async () => {
      if (!confirm('Xoá chứng chỉ khỏi hệ thống?')) return;
      del.disabled = true;
      try {
        await api('vip_cert_delete');
        if (cfg.setMeta) cfg.setMeta(null);
        ready = null; closeModal(); refresh();
        toast('Đã xoá chứng chỉ.');
      } catch (ex) { err(ex.message); del.disabled = false; }
    });
  }

  // ───────────────────────── Sign pipeline ─────────────────────────
  async function fetchIpa(url, onProgress) {
    let res = null;
    try { res = await fetch(url); } catch (e) { res = null; }
    if (!res || !res.ok) res = await fetch(PROXY + encodeURIComponent(url));
    if (!res.ok) throw new Error('Không tải được file IPA (HTTP ' + res.status + ').');
    const total = parseInt(res.headers.get('content-length') || '0', 10);
    if (!res.body || !res.body.getReader) return res.blob();
    const reader = res.body.getReader();
    const chunks = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      got += value.length;
      onProgress(total ? got / total : 1 - Math.exp(-got / 80e6));
    }
    return new Blob(chunks, { type: 'application/octet-stream' });
  }

  function b64ToBlob(b64, type) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type });
  }

  function uploadForSign(fd, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', SIGN_URL);
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
      xhr.onload = () => {
        let d = null;
        try { d = JSON.parse(xhr.responseText); } catch (e) { d = xhr.responseText; }
        if (xhr.status >= 200 && xhr.status < 300) {
          const id = d && (d.task_id || d.job_id) || (typeof d === 'string' ? d.trim() : null);
          return id ? resolve(id) : reject(new Error('Máy chủ ký không trả về mã tác vụ.'));
        }
        reject(new Error((d && (d.error || d.msg)) || 'Máy chủ ký từ chối (HTTP ' + xhr.status + ').'));
      };
      xhr.onerror = () => reject(new Error('Mất kết nối tới máy chủ ký.'));
      xhr.send(fd);
    });
  }

  async function pollSign(jobId, onTick) {
    const OK = ['SUCCESS', 'ok', 'success', 'COMPLETED'];
    const BAD = ['FAILED', 'error', 'FAILURE'];
    const t0 = Date.now();
    while (Date.now() - t0 < 10 * 60 * 1000) {
      await new Promise((r) => setTimeout(r, 2000));
      let st = null;
      try { st = (await (await fetch(STATUS_URL + jobId)).json()); } catch (e) { continue; }
      if (!st) continue;
      if (OK.indexOf(st.status) !== -1) return st.download || st.url || DOWNLOAD_URL + jobId;
      if (BAD.indexOf(st.status) !== -1) throw new Error(st.log || st.msg || st.error || 'Chứng chỉ bị thu hồi hoặc không tương thích.');
      onTick(Math.min(0.95, (Date.now() - t0) / 90000));
    }
    throw new Error('Quá thời gian chờ máy chủ ký.');
  }

  function certProblem(msg) {
    return /revok|thu hồi|expire|hết hạn|password|mật khẩu|p12|certificate|provision/i.test(msg || '');
  }

  async function run() {
    if (busy) return;
    const user = cfg.getUser();
    if (!user) { toast('⚠️ Vui lòng đăng nhập tài khoản VIP.'); setTimeout(() => { location.href = '../account.html'; }, 900); return; }
    if (!cfg.isVip()) {
      if (confirm('⚡ Ký & cài tự động chỉ dành cho thành viên VIP.\n\nBạn có muốn nâng cấp VIP không?')) location.href = '../dichvu.html';
      return;
    }
    const meta = cfg.getMeta();
    const exp = meta && meta.expiresAt && (meta.expiresAt.toMillis ? meta.expiresAt.toMillis() : new Date(meta.expiresAt).getTime());
    if (!meta) { pendingAfterSave = run; openCertModal(); return; }
    if (exp && exp < Date.now()) { pendingAfterSave = run; openCertModal({ reason: 'Chứng chỉ cũ đã hết hạn. Hãy thêm chứng chỉ mới để tiếp tục.' }); return; }

    const app = cfg.getApp();
    const link = app && (app.fileLink || app.downloadUrl || app.link);
    if (!link) { toast('Không tìm thấy link IPA của ứng dụng này.'); return; }

    if (ready && ready.key === currentKey()) { install(ready); return; }

    busy = true;
    haptic(8);
    try {
      setBtn('Cert...', 3);
      setDesc('Đang lấy chứng chỉ bảo mật...');
      const cert = await api('vip_cert_get');

      setDesc('Đang tải IPA về máy chủ ký...');
      const ipa = await fetchIpa(link, (p) => setBtn('Tải ' + Math.round(p * 100) + '%', 5 + p * 40));

      const fd = new FormData();
      const appName = app.name || 'App';
      fd.append('ipa', ipa, appName.replace(/[^\w.-]+/g, '_') + '.ipa');
      fd.append('p12', b64ToBlob(cert.p12, 'application/x-pkcs12'), cert.p12Name || 'cert.p12');
      fd.append('mp', b64ToBlob(cert.mp, 'application/octet-stream'), cert.mpName || 'cert.mobileprovision');
      fd.append('password', cert.password || '');
      fd.append('app_name', appName);
      if (app.bundleId) fd.append('bundle_id', app.bundleId);

      setDesc('Đang gửi tới cụm ký...');
      const jobId = await uploadForSign(fd, (p) => setBtn('Gửi ' + Math.round(p * 100) + '%', 45 + p * 25));

      setDesc('Đang ký ứng dụng ngầm...');
      const download = await pollSign(jobId, (p) => setBtn('Đang ký', 70 + p * 28));

      const bundle = app.bundleId || 'com.ipaviet.app';
      const plist = INSTALLER + '?plist=true&ipa=' + encodeURIComponent(download) + '&name=' + encodeURIComponent(appName) + '&bundle=' + encodeURIComponent(bundle) + '&version=1.0';
      ready = {
        key: currentKey(),
        itms: 'itms-services://?action=download-manifest&url=' + encodeURIComponent(plist),
        web: INSTALLER + '?ipa=' + encodeURIComponent(download) + '&name=' + encodeURIComponent(appName)
      };
      haptic([15, 60, 20]);
      busy = false;
      refresh();
      toast('✅ Đã ký xong! Bấm "Cài Đặt" để cài lên thiết bị.');
      const btn = $('btnVipSign');
      if (btn) btn.classList.add('vs-ready');
    } catch (ex) {
      busy = false;
      refresh();
      const msg = ex && ex.message || 'Lỗi không xác định.';
      if (ex && (ex.code === 'EXPIRED' || ex.code === 'NO_CERT')) {
        pendingAfterSave = run;
        openCertModal({ reason: msg });
      } else if (certProblem(msg)) {
        pendingAfterSave = run;
        openCertModal({ reason: 'Ký thất bại: ' + msg + ' — hãy thay chứng chỉ mới.' });
      } else {
        toast('❌ ' + msg);
      }
    }
  }

  function install(r) {
    haptic(10);
    if (isIos()) { location.href = r.itms; return; }
    window.open(r.web, '_blank', 'noopener');
    toast('📱 Hãy mở link/QR này trên iPhone hoặc iPad để cài.');
  }

  // ───────────────────────── Public ─────────────────────────
  function init(options) {
    cfg = options;
    const btn = $('btnVipSign');
    if (btn) btn.addEventListener('click', run);
    const certBtn = $('btnVipCert');
    if (certBtn) certBtn.addEventListener('click', () => openCertModal());
    refresh();
  }

  window.IPAVIET_VIP_SIGN = { init, refresh, openCertModal };
})();

