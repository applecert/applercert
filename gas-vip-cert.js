// =========================================================================
// IPAVIET - VIP CERT VAULT (Google Apps Script)
// -------------------------------------------------------------------------
// Dán FILE NÀY vào CÙNG project Apps Script với GoogleAppsScriptComplete_WITH_KEYS.js
// (File này dùng chung các biến FIREBASE_* và hàm getFirestoreAccessToken() có sẵn.)
//
// File này KHÔNG chứa bí mật. Token GitHub nằm trong Script Properties:
//   Project Settings → Script Properties → thêm:
//     GH_CERT_TOKEN  = ghp_xxx (fine-grained/classic token, quyền Contents: read & write
//                      CHỈ trên repo cert riêng tư)
//     GH_CERT_REPO   = owner/ten-repo-private   (ví dụ: applecert/vip-cert-vault)
//     GH_CERT_BRANCH = main                     (tuỳ chọn)
//
// Móc vào doPost() của file chính (dòng đầu tiên trong try):
//     var vipRes = vipCertHandlePost(e); if (vipRes) return vipRes;
// =========================================================================

var VIP_CERT_ACTIONS_ = { vip_cert_save: 1, vip_cert_get: 1, vip_cert_delete: 1 };
var VIP_CERT_MAX_BYTES_ = 300 * 1024;      // p12 / mobileprovision tối đa 300KB mỗi file
var VIP_CERT_SAVE_LIMIT_PER_HOUR_ = 10;

function vipCertJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Trả về null nếu request không thuộc VIP cert → để doPost cũ xử lý tiếp. */
function vipCertHandlePost(e) {
  var body;
  try {
    if (!e || !e.postData || !e.postData.contents) return null;
    body = JSON.parse(e.postData.contents);
  } catch (err) { return null; }
  if (!body || !VIP_CERT_ACTIONS_[body.action]) return null;

  try {
    var uid = vipCertVerifyIdToken_(body.idToken);
    if (!uid) return vipCertJson_({ success: false, code: 'AUTH', error: 'Phiên đăng nhập không hợp lệ. Hãy đăng nhập lại.' });
    if (!vipCertIsVipActive_(uid)) return vipCertJson_({ success: false, code: 'NOT_VIP', error: 'Tính năng này chỉ dành cho thành viên VIP còn hạn.' });
    vipCertAssertPrivateRepo_();

    if (body.action === 'vip_cert_save') return vipCertJson_(vipCertSave_(uid, body));
    if (body.action === 'vip_cert_get') return vipCertJson_(vipCertGet_(uid));
    if (body.action === 'vip_cert_delete') return vipCertJson_(vipCertDelete_(uid));
  } catch (err) {
    return vipCertJson_({ success: false, code: 'SERVER', error: String(err && err.message || err) });
  }
  return null;
}

// ---------- Xác thực ----------
function vipCertVerifyIdToken_(idToken) {
  if (!idToken || typeof idToken !== 'string' || idToken.length > 4000) return null;
  var res = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + encodeURIComponent(FIREBASE_API_KEY), {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({ idToken: idToken })
  });
  if (res.getResponseCode() !== 200) return null;
  var data = JSON.parse(res.getContentText());
  var u = data.users && data.users[0];
  if (!u || u.disabled || !/^[A-Za-z0-9_-]{6,128}$/.test(u.localId || '')) return null;
  return u.localId;
}

function vipCertFirestoreUserFields_(uid) {
  var token = getFirestoreAccessToken();
  if (!token) throw new Error('Không lấy được quyền Firestore.');
  var res = UrlFetchApp.fetch('https://firestore.googleapis.com/v1/projects/' + FIREBASE_PROJECT_ID + '/databases/(default)/documents/users/' + uid, {
    method: 'get', headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) return null;
  return JSON.parse(res.getContentText()).fields || {};
}

function vipCertIsVipActive_(uid) {
  var f = vipCertFirestoreUserFields_(uid);
  if (!f) return false;
  var exp = f.vipExpire;
  if (exp) {
    var ms = exp.timestampValue ? new Date(exp.timestampValue).getTime() : (exp.integerValue ? parseInt(exp.integerValue, 10) : 0);
    return ms > Date.now();
  }
  return !!((f.isVip && f.isVip.booleanValue) || (f.vip && f.vip.booleanValue) || (f.role && f.role.stringValue === 'vip'));
}

// ---------- GitHub (repo private) ----------
function vipCertGhConf_() {
  var p = PropertiesService.getScriptProperties();
  var conf = { token: p.getProperty('GH_CERT_TOKEN'), repo: p.getProperty('GH_CERT_REPO'), branch: p.getProperty('GH_CERT_BRANCH') || 'main' };
  if (!conf.token || !conf.repo) throw new Error('Chưa cấu hình GH_CERT_TOKEN / GH_CERT_REPO trong Script Properties.');
  return conf;
}

function vipCertGh_(method, path, payload) {
  var c = vipCertGhConf_();
  var opt = {
    method: method, muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + c.token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
  };
  if (payload) { opt.contentType = 'application/json'; opt.payload = JSON.stringify(payload); }
  return UrlFetchApp.fetch('https://api.github.com/repos/' + c.repo + path, opt);
}

/** Từ chối lưu nếu repo đang public: bảo vệ p12 + mật khẩu của khách. */
function vipCertAssertPrivateRepo_() {
  var cache = CacheService.getScriptCache();
  if (cache.get('vipcert_repo_private') === '1') return;
  var res = vipCertGh_('get', '');
  if (res.getResponseCode() !== 200) throw new Error('Không truy cập được repo cert (HTTP ' + res.getResponseCode() + ').');
  if (JSON.parse(res.getContentText()).private !== true) {
    throw new Error('Repo cert đang PUBLIC. Hãy chuyển sang Private trước khi dùng tính năng này.');
  }
  cache.put('vipcert_repo_private', '1', 600);
}

function vipCertPutFile_(path, b64, message) {
  var c = vipCertGhConf_();
  var sha = null;
  var chk = vipCertGh_('get', '/contents/' + path + '?ref=' + encodeURIComponent(c.branch));
  if (chk.getResponseCode() === 200) sha = JSON.parse(chk.getContentText()).sha;
  var body = { message: message, content: b64, branch: c.branch };
  if (sha) body.sha = sha;
  var put = vipCertGh_('put', '/contents/' + path, body);
  if (put.getResponseCode() > 201) throw new Error('GitHub từ chối lưu file (HTTP ' + put.getResponseCode() + ').');
}

function vipCertGetFile_(path) {
  var c = vipCertGhConf_();
  var res = vipCertGh_('get', '/contents/' + path + '?ref=' + encodeURIComponent(c.branch));
  if (res.getResponseCode() === 404) return null;
  if (res.getResponseCode() !== 200) throw new Error('Không đọc được cert từ GitHub (HTTP ' + res.getResponseCode() + ').');
  return JSON.parse(res.getContentText()).content.replace(/\s/g, '');
}

function vipCertDeleteFile_(path) {
  var c = vipCertGhConf_();
  var chk = vipCertGh_('get', '/contents/' + path + '?ref=' + encodeURIComponent(c.branch));
  if (chk.getResponseCode() !== 200) return;
  vipCertGh_('delete', '/contents/' + path, { message: 'VIP cert removed', sha: JSON.parse(chk.getContentText()).sha, branch: c.branch });
}

// ---------- Parse mobileprovision ----------
function vipCertParseProfile_(b64) {
  var text = Utilities.newBlob(Utilities.base64Decode(b64)).getDataAsString('ISO-8859-1');
  var start = text.indexOf('<?xml'), end = text.indexOf('</plist>');
  if (start < 0 || end < 0) throw new Error('File .mobileprovision không hợp lệ.');
  var xml = text.substring(start, end + 8);
  function str(key) { var m = xml.match(new RegExp('<key>' + key + '</key>\\s*<string>([^<]*)</string>')); return m ? m[1] : ''; }
  var exp = xml.match(/<key>ExpirationDate<\/key>\s*<date>([^<]+)<\/date>/);
  var team = xml.match(/<key>TeamIdentifier<\/key>\s*<array>\s*<string>([^<]*)<\/string>/);
  var devices = (xml.match(/<key>ProvisionedDevices<\/key>\s*<array>([\s\S]*?)<\/array>/) || [, ''])[1].split('<string>').length - 1;
  if (!exp) throw new Error('Không đọc được ngày hết hạn của hồ sơ.');
  return { profileName: str('Name'), teamName: str('TeamName'), teamId: team ? team[1] : '', expiresAt: new Date(exp[1]).getTime(), devices: devices };
}

// ---------- Actions ----------
function vipCertValidB64_(s) { return typeof s === 'string' && s.length > 0 && s.length <= VIP_CERT_MAX_BYTES_ * 1.4 && /^[A-Za-z0-9+\/=]+$/.test(s); }

function vipCertSave_(uid, body) {
  var cache = CacheService.getScriptCache(), rlKey = 'vipcert_rl_' + uid;
  var n = parseInt(cache.get(rlKey) || '0', 10);
  if (n >= VIP_CERT_SAVE_LIMIT_PER_HOUR_) return { success: false, code: 'RATE', error: 'Bạn thao tác quá nhiều lần. Thử lại sau ít phút.' };
  cache.put(rlKey, String(n + 1), 3600);

  if (!vipCertValidB64_(body.p12) || !vipCertValidB64_(body.mp)) return { success: false, code: 'BAD_FILE', error: 'File chứng chỉ không hợp lệ hoặc quá lớn.' };
  var password = typeof body.password === 'string' ? body.password : '';
  if (password.length > 128) return { success: false, code: 'BAD_PASS', error: 'Mật khẩu quá dài.' };

  var info = vipCertParseProfile_(body.mp);
  if (info.expiresAt <= Date.now()) return { success: false, code: 'EXPIRED', error: 'Hồ sơ .mobileprovision này đã hết hạn.' };

  var base = 'vip-certs/' + uid + '/';
  var meta = {
    name: String(body.name || info.profileName || 'Cert').substring(0, 80), password: password,
    p12Name: String(body.p12Name || 'cert.p12').substring(0, 80), mpName: String(body.mpName || 'cert.mobileprovision').substring(0, 80),
    teamName: info.teamName, teamId: info.teamId, devices: info.devices, expiresAt: info.expiresAt, updatedAt: Date.now()
  };
  vipCertPutFile_(base + 'cert.p12', body.p12, 'VIP cert upload');
  vipCertPutFile_(base + 'cert.mobileprovision', body.mp, 'VIP cert upload');
  vipCertPutFile_(base + 'meta.json', Utilities.base64Encode(JSON.stringify(meta), Utilities.Charset.UTF_8), 'VIP cert meta');
  vipCertWriteUserMeta_(uid, meta);
  return { success: true, meta: vipCertPublicMeta_(meta) };
}

function vipCertGet_(uid) {
  var base = 'vip-certs/' + uid + '/';
  var metaB64 = vipCertGetFile_(base + 'meta.json');
  if (!metaB64) return { success: false, code: 'NO_CERT', error: 'Bạn chưa thêm chứng chỉ.' };
  var meta = JSON.parse(Utilities.newBlob(Utilities.base64Decode(metaB64)).getDataAsString());
  if (meta.expiresAt <= Date.now()) return { success: false, code: 'EXPIRED', error: 'Chứng chỉ của bạn đã hết hạn. Hãy thay chứng chỉ mới.', meta: vipCertPublicMeta_(meta) };
  var p12 = vipCertGetFile_(base + 'cert.p12'), mp = vipCertGetFile_(base + 'cert.mobileprovision');
  if (!p12 || !mp) return { success: false, code: 'NO_CERT', error: 'Dữ liệu chứng chỉ bị thiếu. Hãy thêm lại.' };
  return { success: true, p12: p12, mp: mp, password: meta.password || '', p12Name: meta.p12Name, mpName: meta.mpName, meta: vipCertPublicMeta_(meta) };
}

function vipCertDelete_(uid) {
  var base = 'vip-certs/' + uid + '/';
  vipCertDeleteFile_(base + 'cert.p12'); vipCertDeleteFile_(base + 'cert.mobileprovision'); vipCertDeleteFile_(base + 'meta.json');
  vipCertWriteUserMeta_(uid, null);
  return { success: true };
}

function vipCertPublicMeta_(m) {
  return { name: m.name, teamName: m.teamName, teamId: m.teamId, devices: m.devices, expiresAt: m.expiresAt, updatedAt: m.updatedAt };
}

/** Ghi metadata (KHÔNG có bí mật) vào users/{uid}.vipCert để giao diện hiển thị nhanh. */
function vipCertWriteUserMeta_(uid, meta) {
  var token = getFirestoreAccessToken();
  if (!token) return;
  var fields = meta ? { vipCert: { mapValue: { fields: {
    name: { stringValue: meta.name }, teamName: { stringValue: meta.teamName || '' },
    expiresAt: { timestampValue: new Date(meta.expiresAt).toISOString() },
    updatedAt: { timestampValue: new Date(meta.updatedAt).toISOString() }
  } } } } : {};
  UrlFetchApp.fetch('https://firestore.googleapis.com/v1/projects/' + FIREBASE_PROJECT_ID + '/databases/(default)/documents/users/' + uid + '?updateMask.fieldPaths=vipCert', {
    method: 'patch', contentType: 'application/json', headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify({ fields: fields }), muteHttpExceptions: true
  });
}

