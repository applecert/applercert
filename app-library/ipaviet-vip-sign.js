/**
 * IPAVIET VIP Auto-Sign
 * Ký & cài app ngầm cho thành viên VIP bằng chứng chỉ riêng.
 * - Tự động bóc tách ZIP, đọc hồ sơ .mobileprovision và tự động dò/điền mật khẩu .p12.
 * - Lưu chứng chỉ bảo mật vào Firestore (users/{uid}.vipCert) + LocalStorage Vault
 *   + đồng bộ nền lên GitHub / Apps Script (không bao giờ chặn hay lỗi khi GAS chưa redeploy).
 */
(function () {
  'use strict';

  const SIGN_URL = 'https://ipa.ipasign.cc/sign';
  const STATUS_URL = 'https://ipa.ipasign.cc/status/';
  const DOWNLOAD_URL = 'https://ipa.ipasign.cc/download/';
  const INSTALLER = 'https://ipaviet-installer.clonene121212.workers.dev/';
  const GH_MIRRORS = [
    'https://gh-proxy.org/',
    'https://hk.gh-proxy.org/',
    'https://cdn.gh-proxy.org/',
    'https://edgeone.gh-proxy.org/',
    'https://gh-proxy.com/'
  ];
  const GITHUB_REPO_OWNER = 'applecert';
  const GITHUB_REPO_NAME = 'applercert';
  const GITHUB_REPO_BRANCH = 'main';
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

  function getDb() {
    if (cfg && cfg.db) return cfg.db;
    if (window.firebase && typeof window.firebase.firestore === 'function') {
      try { return window.firebase.firestore(); } catch (e) {}
    }
    return null;
  }

  // ───────────────────────── Storage & Sync ─────────────────────────
  function getLocalCert(uid) {
    try {
      if (uid) {
        const rawUid = localStorage.getItem('ipaviet_vip_cert_' + uid);
        if (rawUid) {
          const parsed = JSON.parse(rawUid);
          if (parsed && parsed.p12Data && parsed.mpData) return parsed;
        }
      }
      const rawSaved = localStorage.getItem('ipaviet_saved_cert');
      if (rawSaved) {
        const s = JSON.parse(rawSaved);
        if (s && s.p12Data && s.mpData) {
          return {
            name: s.name || 'Cert',
            teamName: s.teamName || '',
            teamId: s.teamId || '',
            devices: s.devices || 0,
            expiresAt: s.expiresAt || (Date.now() + 240 * DAY),
            updatedAt: s.updatedAt || Date.now(),
            p12Name: s.p12Name || 'cert.p12',
            mpName: s.mpName || 'cert.mobileprovision',
            p12Data: s.p12Data,
            mpData: s.mpData,
            password: s.password || '1'
          };
        }
      }
    } catch (e) {}
    return null;
  }

  function saveLocalCert(uid, record) {
    try {
      if (uid && record) {
        localStorage.setItem('ipaviet_vip_cert_' + uid, JSON.stringify(record));
      } else if (uid && !record) {
        localStorage.removeItem('ipaviet_vip_cert_' + uid);
      }
      if (record) {
        localStorage.setItem('ipaviet_saved_cert', JSON.stringify({
          name: record.name || 'Cert',
          teamName: record.teamName || '',
          teamId: record.teamId || '',
          devices: record.devices || 0,
          expiresAt: record.expiresAt,
          updatedAt: record.updatedAt,
          savedAt: new Date().toLocaleDateString('vi-VN'),
          p12Name: record.p12Name || 'cert.p12',
          mpName: record.mpName || 'cert.mobileprovision',
          p12Data: record.p12Data,
          mpData: record.mpData,
          password: record.password || ''
        }));
      } else {
        localStorage.removeItem('ipaviet_saved_cert');
      }
    } catch (e) {}
  }

  /** Đồng bộ nền lên GitHub (nếu có token auto-up) và Apps Script (nếu đã deploy) — không chặn UI */
  async function syncBackupInBackground(uid, record, zipBlob) {
    // 1. Nếu có GitHub token auto-up (như kho cert), đẩy bản zip lên GitHub
    try {
      const ghToken = (localStorage.getItem('ipaviet_github_token') || '').trim();
      if (ghToken && zipBlob) {
        const targetPath = `downloads/certs/vip_${uid}_cert.zip`;
        const b64 = await fileToB64(zipBlob);
        const apiUrl = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${targetPath}`;
        let sha = null;
        try {
          const chk = await fetch(apiUrl, {
            headers: { Authorization: `Bearer ${ghToken}`, Accept: 'application/vnd.github.v3+json' }
          });
          if (chk.ok) {
            const d = await chk.json();
            if (d && d.sha) sha = d.sha;
          }
        } catch (e) {}
        const body = { message: `Auto upload VIP cert for ${uid}`, content: b64, branch: GITHUB_REPO_BRANCH };
        if (sha) body.sha = sha;
        await fetch(apiUrl, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${ghToken}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      }
    } catch (e) {}

    // 2. Đồng bộ phụ qua Apps Script nếu có
    try {
      const user = cfg && cfg.getUser && cfg.getUser();
      if (user && cfg && cfg.gsUrl) {
        const idToken = await user.getIdToken();
        await fetch(cfg.gsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'vip_cert_save',
            idToken,
            p12: record.p12Data,
            mp: record.mpData,
            p12Name: record.p12Name,
            mpName: record.mpName,
            name: record.name,
            password: record.password
          })
        });
      }
    } catch (e) {}
  }

  async function saveCertVault(record, zipBlob) {
    const user = cfg && cfg.getUser && cfg.getUser();
    if (!user) throw new Error('Bạn cần đăng nhập tài khoản VIP.');

    // 1. Lưu ngay vào LocalStorage (0ms)
    saveLocalCert(user.uid, record);

    // 2. Lưu vào Firestore users/{uid}.vipCert (đồng bộ đám mây bảo mật theo tài khoản)
    const db = getDb();
    if (db) {
      await db.collection('users').doc(user.uid).set({ vipCert: record }, { merge: true });
    }

    // 3. Đồng bộ nền GitHub / GAS không chặn luồng
    syncBackupInBackground(user.uid, record, zipBlob);
    return record;
  }

  async function loadCertVault() {
    const user = cfg && cfg.getUser && cfg.getUser();
    if (!user) throw Object.assign(new Error('Bạn cần đăng nhập.'), { code: 'AUTH' });

    // 1. Kiểm tra trong state hiện tại (từ Firestore onSnapshot)
    const meta = cfg && cfg.getMeta && cfg.getMeta();
    if (meta && meta.p12Data && meta.mpData) {
      return {
        p12: meta.p12Data,
        mp: meta.mpData,
        password: meta.password || '',
        p12Name: meta.p12Name || 'cert.p12',
        mpName: meta.mpName || 'cert.mobileprovision',
        meta
      };
    }

    // 2. Kiểm tra LocalStorage
    const local = getLocalCert(user.uid);
    if (local && local.p12Data && local.mpData) {
      return {
        p12: local.p12Data,
        mp: local.mpData,
        password: local.password || '',
        p12Name: local.p12Name || 'cert.p12',
        mpName: local.mpName || 'cert.mobileprovision',
        meta: local
      };
    }

    // 3. Đọc trực tiếp từ Firestore users/{uid}
    const db = getDb();
    if (db) {
      try {
        const doc = await db.collection('users').doc(user.uid).get();
        if (doc && doc.exists) {
          const data = doc.data();
          if (data && data.vipCert && data.vipCert.p12Data && data.vipCert.mpData) {
            const vc = data.vipCert;
            saveLocalCert(user.uid, vc);
            if (cfg.setMeta) cfg.setMeta(vc);
            return {
              p12: vc.p12Data,
              mp: vc.mpData,
              password: vc.password || '',
              p12Name: vc.p12Name || 'cert.p12',
              mpName: vc.mpName || 'cert.mobileprovision',
              meta: vc
            };
          }
        }
      } catch (e) {}
    }

    throw Object.assign(new Error('Bạn chưa thêm chứng chỉ trên thiết bị này. Hãy nạp lại file chứng chỉ 1 lần.'), { code: 'NO_CERT' });
  }

  async function deleteCertVault() {
    const user = cfg && cfg.getUser && cfg.getUser();
    if (!user) return;
    saveLocalCert(user.uid, null);
    const db = getDb();
    if (db) {
      try {
        const fv = window.firebase && window.firebase.firestore && window.firebase.firestore.FieldValue;
        await db.collection('users').doc(user.uid).set({
          vipCert: fv && fv.delete ? fv.delete() : null
        }, { merge: true });
      } catch (e) {}
    }
  }

  // ───────────────────────── Helpers & Auto-Read Password ─────────────────────────
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
      const m = text.match(/<key>ExpirationDate<\/key>\s*<date>([^<]+)<\/date>/i);
      const n = text.match(/<key>TeamName<\/key>\s*<string>([^<]*)<\/string>/i);
      const pName = text.match(/<key>Name<\/key>\s*<string>([^<]*)<\/string>/i);
      const team = text.match(/<key>TeamIdentifier<\/key>\s*<array>\s*<string>([^<]*)<\/string>/i);
      const devices = (text.match(/<key>ProvisionedDevices<\/key>\s*<array>([\s\S]*?)<\/array>/i) || [, ''])[1].split('<string>').length - 1;
      return m ? {
        expiresAt: new Date(m[1]).getTime(),
        teamName: n ? n[1] : '',
        profileName: pName ? pName[1] : '',
        teamId: team ? team[1] : '',
        devices: Math.max(0, devices)
      } : null;
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

  function loadForge() {
    if (window.forge) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = 'https://cdnjs.cloudflare.com/ajax/libs/forge/1.3.1/forge.min.js';
      el.onload = resolve;
      el.onerror = () => reject(new Error('forge'));
      document.head.appendChild(el);
    });
  }

  const COMMON_PASSWORDS = ['1', '123456', '12345678', '1234', 'applep12', 'password', 'apple', 'ipaviet', '123', '0000', ''];

  function cleanCertPassword(raw) {
    if (!raw) return '';
    let s = String(raw).trim();
    const prefixRegex = /^(?:hồ\s*sơ|chứng\s*chỉ|certificate|cert|mật\s*khẩu\s*(?:cert|p12)?|mat\s*khau|password|pass|pwd|mk|code)[\s:=\-]+/i;
    while (prefixRegex.test(s)) {
      s = s.replace(prefixRegex, '').trim();
    }
    s = s.replace(/^["'`]|["'`]$/g, '').trim();
    return s;
  }

  /** Bóc tách mật khẩu từ mọi file text trong ZIP và từ tên file */
  function extractPasswordsFromText(text, fileName) {
    const out = [];
    if (text) {
      const lines = String(text).split(/\r?\n/);
      // 1. Dòng có từ khoá password / mật khẩu / pass:
      for (const line of lines) {
        const m = line.match(/(?:mật\s*khẩu|mat\s*khau|password|pass|pwd|mk|code)\s*(?:certificate|cert|p12)?\s*[:=\-]\s*([^\r\n,;]+)/i);
        if (m && m[1]) {
          const c = cleanCertPassword(m[1]);
          if (c) out.push(c);
        }
      }
      // 2. Dòng đơn ngắn (ví dụ file password.txt chỉ ghi "1" hoặc "123456")
      for (const line of lines) {
        const t = line.trim();
        if (!t) continue;
        const c = cleanCertPassword(t);
        if (c && c.length <= 40 && !/\s/.test(c) && !/^(http|udid|team|date|apple)/i.test(c)) {
          out.push(c);
        }
      }
    }
    if (fileName) {
      const base = String(fileName).replace(/\.(?:zip|p12|txt|mobileprovision)$/i, '');
      const fnMatch = base.match(/(?:pass(?:word)?|pwd|mk)[_\-\s:=]+([a-zA-Z0-9._@#]+)/i);
      if (fnMatch && fnMatch[1]) {
        const c = cleanCertPassword(fnMatch[1]);
        if (c) out.push(c);
      }
    }
    return Array.from(new Set(out));
  }

  /**
   * Kiểm tra mật khẩu .p12 bằng node-forge:
   * - 'valid': giải mã thành công 100%
   * - 'wrong': sai mật khẩu (MAC verification failed)
   * - 'unsupported': file .p12 dùng chuẩn mã hoá mới (PBES2/AES) mà forge không đọc được
   */
  function testP12WithForge(binary, pw) {
    try {
      const asn = window.forge.asn1.fromDer(window.forge.util.createBuffer(binary));
      window.forge.pkcs12.pkcs12FromAsn1(asn, false, pw);
      return 'valid';
    } catch (e) {
      const msg = String(e && e.message || e || '');
      if (/Invalid password|MAC could not be verified|PKCS#12 MAC/i.test(msg)) {
        return 'wrong';
      }
      return 'unsupported';
    }
  }

  /** Tự động dò mật khẩu .p12 từ gợi ý trong ZIP + danh sách mật khẩu thông dụng */
  async function detectP12Password(file, hints, typed) {
    const cleanHints = (hints || []).filter(Boolean);
    let forgeReady = false;
    try {
      await loadForge();
      forgeReady = Boolean(window.forge);
    } catch (e) {}

    if (forgeReady && file) {
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        let bin = '';
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        const list = Array.from(new Set([].concat(cleanHints, typed ? [typed] : [], COMMON_PASSWORDS)));
        let sawUnsupported = false;
        for (const pw of list) {
          const res = testP12WithForge(bin, pw);
          if (res === 'valid') {
            return { password: pw, source: cleanHints.includes(pw) ? 'zip' : 'verified' };
          }
          if (res === 'unsupported') {
            sawUnsupported = true;
            break;
          }
        }
        if (sawUnsupported) {
          const best = cleanHints[0] || typed || '1';
          return { password: best, source: cleanHints.length ? 'zip' : 'default' };
        }
      } catch (e) {}
    }

    if (cleanHints.length > 0) {
      return { password: cleanHints[0], source: 'zip' };
    }
    return { password: typed || '1', source: 'default' };
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

  function getEffectiveMeta() {
    if (!cfg) return null;
    const m = cfg.getMeta && cfg.getMeta();
    if (m) return m;
    const u = cfg.getUser && cfg.getUser();
    return u ? getLocalCert(u.uid) : null;
  }

  function refresh() {
    if (!cfg || busy) return;
    const user = cfg.getUser();
    const vip = cfg.isVip();
    const meta = getEffectiveMeta();
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
    const meta = getEffectiveMeta();
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
    const meta = getEffectiveMeta();
    const state = { p12: null, mp: null, zipFile: null, hints: [], profileInfo: null };
    const wrap = document.createElement('div');
    wrap.id = 'vsModal';
    wrap.className = 'vs-modal';
    wrap.innerHTML = `
      <div class="vs-backdrop" data-close></div>
      <div class="vs-sheet" role="dialog" aria-modal="true" aria-label="Chứng chỉ ký của bạn">
        <div class="vs-grab"></div>
        <h3>Chứng chỉ ký của bạn</h3>
        <p class="vs-sub">${opts.reason ? esc(opts.reason) : 'Tải lên một lần. Hệ thống tự động bóc tách file ZIP, tự đọc mật khẩu và lưu riêng tư theo tài khoản VIP của bạn.'}</p>
        ${meta ? `<div class="vs-current"><b>${esc(meta.name)}</b><span>${esc(meta.teamName || '')}</span></div>` : ''}
        <div class="vs-files">
          <button type="button" class="vs-file" data-pick="zip"><b>File ZIP</b><span id="vsZipTxt">.p12 + .mobileprovision</span></button>
          <button type="button" class="vs-file" data-pick="p12"><b>.p12</b><span id="vsP12Txt">Chọn file</span></button>
          <button type="button" class="vs-file" data-pick="mp"><b>.mobileprovision</b><span id="vsMpTxt">Chọn file</span></button>
        </div>
        <input type="file" id="vsZipIn" accept=".zip" hidden>
        <input type="file" id="vsP12In" accept=".p12" hidden>
        <input type="file" id="vsMpIn" accept=".mobileprovision" hidden>
        <div class="vs-pass-wrap">
          <input type="text" id="vsPass" class="vs-input" placeholder="Mật khẩu .p12 (tự động đọc khi chọn file)" autocomplete="off" spellcheck="false">
          <span class="vs-pass-tag" id="vsPassTag" hidden>Tự động</span>
        </div>
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
    const passEl = wrap.querySelector('#vsPass');
    const passTag = wrap.querySelector('#vsPassTag');

    const updateInfoLine = (passNote) => {
      const info = wrap.querySelector('#vsInfo');
      const parts = [];
      let tone = 'ok';
      if (passNote) parts.push(passNote);
      if (state.profileInfo && state.profileInfo.expiresAt) {
        const p = state.profileInfo;
        const d = daysLeft(p.expiresAt);
        parts.push((p.teamName ? p.teamName + ' · ' : '') + (d >= 0 ? 'còn ' + d + ' ngày' : 'ĐÃ HẾT HẠN'));
        if (d < 0) tone = 'bad';
      }
      info.textContent = parts.join(' · ');
      info.dataset.tone = parts.length ? tone : '';
    };

    const refreshSel = async () => {
      wrap.querySelector('#vsP12Txt').textContent = state.p12 ? state.p12.name : 'Chọn file';
      wrap.querySelector('#vsMpTxt').textContent = state.mp ? state.mp.name : 'Chọn file';
      if (state.mp) {
        state.profileInfo = await profileExpiry(state.mp);
      } else {
        state.profileInfo = null;
      }
      updateInfoLine('');
    };

    const autoPass = async () => {
      if (!state.p12) return;
      const info = wrap.querySelector('#vsInfo');
      info.textContent = 'Đang tự động đọc mật khẩu chứng chỉ...';
      info.dataset.tone = '';
      const fnHints = extractPasswordsFromText('', state.p12.name);
      const allHints = Array.from(new Set([].concat(state.hints || [], fnHints)));
      const r = await detectP12Password(state.p12, allHints, passEl.value.trim());
      if (r && r.password !== null && r.password !== undefined) {
        passEl.value = r.password;
        if (passTag) {
          passTag.hidden = false;
          passTag.textContent = r.source === 'zip' ? 'Từ file ZIP ✓' : (r.source === 'verified' ? 'Đã giải mã ✓' : 'Mặc định ✓');
        }
        const label = r.password === '' ? 'Không mật khẩu ✓' : `🔑 Pass: "${r.password}"`;
        updateInfoLine(label);
      } else {
        updateInfoLine('Hãy kiểm tra hoặc nhập mật khẩu .p12');
      }
    };

    wrap.addEventListener('click', (ev) => {
      if (ev.target.closest('[data-close]')) { closeModal(); return; }
      const pick = ev.target.closest('[data-pick]');
      if (pick) wrap.querySelector({ zip: '#vsZipIn', p12: '#vsP12In', mp: '#vsMpIn' }[pick.dataset.pick]).click();
    });

    wrap.querySelector('#vsP12In').addEventListener('change', async (e) => {
      state.p12 = e.target.files[0] || null;
      state.hints = extractPasswordsFromText('', state.p12 ? state.p12.name : '');
      await refreshSel();
      await autoPass();
    });

    wrap.querySelector('#vsMpIn').addEventListener('change', async (e) => {
      state.mp = e.target.files[0] || null;
      await refreshSel();
      if (state.p12) await autoPass();
    });

    wrap.querySelector('#vsZipIn').addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      err('');
      state.zipFile = f;
      try {
        await loadJsZip();
        const zip = await window.JSZip.loadAsync(f);
        let p12 = null, mp = null;
        const hints = extractPasswordsFromText('', f.name);
        for (const name of Object.keys(zip.files)) {
          const entry = zip.files[name];
          const low = name.toLowerCase();
          if (entry.dir || low.indexOf('__macosx') !== -1) continue;
          const baseName = name.split('/').pop();
          if (low.endsWith('.p12') && !p12) {
            p12 = new File([await entry.async('blob')], baseName, { type: 'application/x-pkcs12' });
            extractPasswordsFromText('', baseName).forEach((h) => hints.push(h));
          } else if (low.endsWith('.mobileprovision') && !mp) {
            mp = new File([await entry.async('blob')], baseName, { type: 'application/octet-stream' });
          } else if (
            low.endsWith('.txt') || low.endsWith('.md') || low.endsWith('.ini') ||
            low.includes('pass') || low.includes('pwd') || low.includes('matkhau') || low.includes('readme') || low.includes('info') ||
            (!/\.(cer|crt|der|pem|ipa|png|jpg|jpeg|gif|webp|ds_store)$/i.test(low))
          ) {
            try {
              const txt = await entry.async('string');
              if (txt && txt.length < 32768) {
                extractPasswordsFromText(txt, baseName).forEach((h) => hints.push(h));
              }
            } catch (x) {}
          }
        }
        if (!p12 || !mp) { err('File ZIP cần chứa đủ cả .p12 và .mobileprovision.'); return; }
        state.p12 = p12;
        state.mp = mp;
        state.hints = Array.from(new Set(hints));
        wrap.querySelector('#vsZipTxt').textContent = f.name;
        await refreshSel();
        await autoPass();
      } catch (ex) { err(ex.message || 'Không đọc được file ZIP.'); }
    });

    wrap.querySelector('#vsSave').addEventListener('click', async (ev) => {
      const btn = ev.currentTarget;
      err('');
      if (!state.p12 || !state.mp) { err('Cần chọn đủ file .p12 và .mobileprovision.'); return; }
      if (state.p12.size > MAX_FILE || state.mp.size > MAX_FILE) { err('File quá lớn (tối đa 300KB mỗi file).'); return; }
      const info = state.profileInfo || (await profileExpiry(state.mp));
      if (!info || !info.expiresAt) { err('File .mobileprovision không hợp lệ.'); return; }
      if (info.expiresAt <= Date.now()) { err('Hồ sơ .mobileprovision này đã hết hạn.'); return; }

      btn.disabled = true;
      btn.textContent = 'Đang lưu...';
      try {
        const p12B64 = await fileToB64(state.p12);
        const mpB64 = await fileToB64(state.mp);
        const password = passEl.value != null ? String(passEl.value).trim() : '1';
        const certName = info.teamName || info.profileName || state.p12.name.replace(/\.p12$/i, '') || 'Cert VIP';

        const record = {
          name: String(certName).substring(0, 80),
          teamName: info.teamName || '',
          teamId: info.teamId || '',
          devices: info.devices || 0,
          expiresAt: info.expiresAt,
          updatedAt: Date.now(),
          p12Name: state.p12.name || 'cert.p12',
          mpName: state.mp.name || 'cert.mobileprovision',
          p12Data: p12B64,
          mpData: mpB64,
          password
        };

        await saveCertVault(record, state.zipFile);
        if (cfg.setMeta) cfg.setMeta(record);
        haptic([15, 60, 20]);
        toast('✅ Đã lưu chứng chỉ VIP! Sẵn sàng ký tự động.');
        closeModal();
        ready = null;
        refresh();
        if (pendingAfterSave) {
          const fn = pendingAfterSave;
          pendingAfterSave = null;
          setTimeout(fn, 250);
        }
      } catch (ex) {
        err(ex.message || 'Không thể lưu chứng chỉ.');
        btn.disabled = false;
        btn.textContent = 'Lưu chứng chỉ';
      }
    });

    const del = wrap.querySelector('#vsDel');
    if (del) del.addEventListener('click', async () => {
      if (!confirm('Xoá chứng chỉ khỏi tài khoản VIP?')) return;
      del.disabled = true;
      try {
        await deleteCertVault();
        if (cfg.setMeta) cfg.setMeta(null);
        ready = null;
        closeModal();
        refresh();
        toast('Đã xoá chứng chỉ.');
      } catch (ex) {
        err(ex.message);
        del.disabled = false;
      }
    });
  }

  // ───────────────────────── Sign pipeline ─────────────────────────
  function buildIpaCandidateUrls(url) {
    const clean = String(url || '').trim();
    if (!clean) return [];
    const isGitHub = /^https?:\/\/(www\.)?github\.com\//i.test(clean) || /^https?:\/\/release-assets\.githubusercontent\.com\//i.test(clean);
    const list = [];
    if (isGitHub) {
      GH_MIRRORS.forEach((m) => list.push(m + clean));
      list.push(clean);
    } else {
      list.push(clean);
      GH_MIRRORS.forEach((m) => list.push(m + clean));
    }
    return list;
  }

  async function streamAndVerifyZip(res, onProgress) {
    const total = parseInt(res.headers.get('content-length') || '0', 10);
    if (!res.body || !res.body.getReader) {
      const blob = await res.blob();
      if (blob.size < 1024) throw new Error('Tệp tải về quá nhỏ hoặc không hợp lệ.');
      const head = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
      if (head[0] !== 0x50 || head[1] !== 0x4B) throw new Error('Phản hồi không phải tệp IPA hợp lệ.');
      onProgress(1);
      return new Blob([blob], { type: 'application/octet-stream' });
    }

    const reader = res.body.getReader();
    const chunks = [];
    let got = 0;
    let checkedMagic = false;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || !value.length) continue;

      if (!checkedMagic) {
        checkedMagic = true;
        if (value.length >= 2 && (value[0] !== 0x50 || value[1] !== 0x4B)) {
          try { reader.cancel(); } catch (e) {}
          throw new Error('Máy chủ trả về dữ liệu không phải định dạng IPA (ZIP).');
        }
      }

      chunks.push(value);
      got += value.length;
      onProgress(total ? Math.min(0.99, got / total) : 1 - Math.exp(-got / 80e6));
    }

    if (got < 1024) throw new Error('Tệp IPA tải về không đầy đủ.');
    onProgress(1);
    return new Blob(chunks, { type: 'application/octet-stream' });
  }

  async function fetchIpa(url, onProgress) {
    const candidates = buildIpaCandidateUrls(url);
    let lastErr = null;
    for (let i = 0; i < candidates.length; i++) {
      const targetUrl = candidates[i];
      try {
        const res = await fetch(targetUrl);
        if (!res || !res.ok) {
          lastErr = new Error('HTTP ' + (res ? res.status : 'Network Error'));
          continue;
        }
        const blob = await streamAndVerifyZip(res, onProgress);
        return blob;
      } catch (err) {
        lastErr = err;
      }
    }
    throw new Error((lastErr && lastErr.message) || 'Không tải được file IPA từ máy chủ.');
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
      if (BAD.indexOf(st.status) !== -1) throw new Error(st.log || st.msg || st.error || 'Chứng chỉ bị thu hồi hoặc sai mật khẩu.');
      onTick(Math.min(0.95, (Date.now() - t0) / 90000));
    }
    throw new Error('Quá thời gian chờ máy chủ ký.');
  }

  function certProblem(msg) {
    return /revok|thu hồi|expire|hết hạn|password|mật khẩu|p12|certificate|provision|mac verify/i.test(msg || '');
  }

  async function run() {
    if (busy) return;
    const user = cfg.getUser();
    if (!user) { toast('⚠️ Vui lòng đăng nhập tài khoản VIP.'); setTimeout(() => { location.href = '../account.html'; }, 900); return; }
    if (!cfg.isVip()) {
      if (confirm('⚡ Ký & cài tự động chỉ dành cho thành viên VIP.\n\nBạn có muốn nâng cấp VIP không?')) location.href = '../dichvu.html';
      return;
    }
    const meta = getEffectiveMeta();
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
      setBtn('Nạp Cert...', 5);
      setDesc('Đang nạp chứng chỉ VIP của bạn...');
      const cert = await loadCertVault();

      setDesc('Đang tải IPA về máy chủ ký...');
      const ipa = await fetchIpa(link, (p) => setBtn('Tải ' + Math.round(p * 100) + '%', 8 + p * 38));

      const fd = new FormData();
      const appName = app.name || 'App';
      fd.append('ipa', ipa, appName.replace(/[^\w.-]+/g, '_') + '.ipa');
      fd.append('p12', b64ToBlob(cert.p12, 'application/x-pkcs12'), cert.p12Name || 'cert.p12');
      fd.append('mp', b64ToBlob(cert.mp, 'application/octet-stream'), cert.mpName || 'cert.mobileprovision');
      fd.append('password', cert.password || '');
      fd.append('app_name', appName);
      if (app.bundleId) fd.append('bundle_id', app.bundleId);

      setDesc('Đang gửi tới cụm ký C++...');
      const jobId = await uploadForSign(fd, (p) => setBtn('Gửi ' + Math.round(p * 100) + '%', 46 + p * 24));

      setDesc('Đang ký ứng dụng ngầm...');
      const download = await pollSign(jobId, (p) => setBtn('Đang ký ' + Math.round(p * 100) + '%', 70 + p * 28));

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
      toast('✅ Đã ký xong! Bấm "Cài Đặt" để cài lên máy.');
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
        openCertModal({ reason: 'Ký thất bại: ' + msg + ' — hãy kiểm tra mật khẩu hoặc thay chứng chỉ mới.' });
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
