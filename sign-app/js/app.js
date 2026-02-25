// --- PROTECT.JS (Chống F12 cơ bản) ---
document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('contextmenu', function(e) { e.preventDefault(); });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F12') { e.preventDefault(); return false; }
        if (e.ctrlKey && e.shiftKey && e.key === 'I') { e.preventDefault(); return false; }
        if (e.ctrlKey && e.shiftKey && e.key === 'J') { e.preventDefault(); return false; }
        if (e.ctrlKey && e.key === 'u') { e.preventDefault(); return false; }
        if (e.ctrlKey && e.shiftKey && e.key === 'C') { e.preventDefault(); return false; }
    });
});

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyBeKh-_VbiM9F9S4iRdGllx3ypze0Gp4hw",
    authDomain: "ioscert-signer.firebaseapp.com",
    projectId: "ioscert-signer",
    storageBucket: "ioscert-signer.firebasestorage.app",
    messagingSenderId: "31766936132",
    appId: "1:31766936132:web:acf88a5f88396033ac1a11",
    measurementId: "G-7GYFBFWLHE"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

function generateShortId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) { result += chars.charAt(Math.floor(Math.random() * chars.length)); }
    return result;
}

// --- VUE APP LOGIC ---
new Vue({
    el: '#app',
    data: {
        showStep1: true, showStep2: false, showStep3: false, showStep4: false, showDirectDownload: false,
        progressBar: 0, uploadStep: 1, certZip: null, certZipCss: 'invalid', certZipText: 'Chọn file .zip...',
        p12: null, mobileprovision: null, password: '', pwdCss: 'invalid', jobId: '', statusText: '', logText: '',
        download: '', download_ipa: '', shareUrl: '', directDownloadUrl: '', firestoreDocId: '',
        showPasswordSuggestions: false, passwordSuggestions: [], copySuccess: false, isExtractingZip: false, uploadDetails: '',
        selectedApp: '', ipa: null, customIpaFile: null, appStatusText: '', appStatusClass: '', appStatusIcon: '', isIpaLoading: false,
        ipaUrlMap: {
            'esign': 'https://tight-water-fabbipa-proxy.tlvdzreal.workers.dev/esign',
            'gbox': 'https://tight-water-fabbipa-proxy.tlvdzreal.workers.dev/gbox',
            'sca': 'https://tight-water-fabbipa-proxy.tlvdzreal.workers.dev/scarlet'
        },
        appNames: { 'esign': 'ESign 5.0.2', 'gbox': 'GBox', 'sca': 'Scarlet', 'custom': 'IPA tùy chọn' },
        appSizes: { 'esign': '', 'gbox': '', 'sca': '' },
        appStatus: { 'esign': '', 'gbox': '', 'sca': '' }
    },
    computed: {
        selectedAppName() { return this.appNames[this.selectedApp] || ''; },
        canSign() {
            if (!this.ipa || !this.certZip || !this.password || !this.p12 || !this.mobileprovision || this.ipa.size === 0) return false;
            return true;
        },
        signButtonText() {
            if (!this.canSign) return 'Vui lòng điền đủ thông tin';
            if (this.selectedApp === 'custom') return 'Ký IPA Tùy Chọn';
            if (this.selectedApp) return `Ký ${this.selectedAppName}`;
            return 'Bắt đầu Ký!';
        }
    },
    mounted() {
        this.loadPasswordSuggestions();
        this.checkDirectDownload();
    },
    methods: {
        formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024; const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        },
        async selectApp(appKey) {
            if (this.selectedApp === appKey) { this.clearSelectedApp(); return; }
            if (this.selectedApp === 'custom') { this.customIpaFile = null; if (this.$refs.customIpaInput) this.$refs.customIpaInput.value = ''; }
            this.selectedApp = appKey;
            this.appStatus[appKey] = 'loading'; this.appStatusText = 'Đang tải IPA từ server...'; this.appStatusClass = 'loading'; this.appStatusIcon = 'fas fa-spinner fa-spin';
            await this.loadIpaFromUrl(appKey);
        },
        selectCustomIpa() {
            if (this.selectedApp === 'custom') { this.clearSelectedApp(); return; }
            this.selectedApp = 'custom'; this.appStatusText = 'Chọn file IPA từ thiết bị của bạn'; this.appStatusClass = ''; this.appStatusIcon = 'fas fa-upload';
            this.$nextTick(() => { this.$refs.customIpaInput.click(); });
        },
        handleCustomIpa(event) {
            const file = event.target.files[0] || null;
            if (!file || !file.name.toLowerCase().endsWith('.ipa')) { alert('Vui lòng chọn file định dạng .ipa hợp lệ!'); this.clearSelectedApp(); return; }
            this.ipa = file; this.customIpaFile = file;
            this.appStatusText = `Sẵn sàng: ${file.name} (${this.formatFileSize(file.size)})`; this.appStatusClass = 'success'; this.appStatusIcon = 'fas fa-check-circle';
            this.appStatus = { 'esign': '', 'gbox': '', 'sca': '' };
            this.$forceUpdate();
        },
        clearSelectedApp() {
            this.selectedApp = ''; this.ipa = null; this.customIpaFile = null;
            this.appStatusText = ''; this.appStatusClass = ''; this.appStatusIcon = '';
            this.appStatus = { 'esign': '', 'gbox': '', 'sca': '' };
            if (this.$refs.customIpaInput) this.$refs.customIpaInput.value = '';
            this.$forceUpdate();
        },
        loadPasswordSuggestions() { const saved = localStorage.getItem('ipasign_pwd_history'); if (saved) this.passwordSuggestions = JSON.parse(saved); },
        savePasswordToHistory(pwd) {
            if (!pwd) return;
            const idx = this.passwordSuggestions.indexOf(pwd); if (idx > -1) this.passwordSuggestions.splice(idx, 1);
            this.passwordSuggestions.unshift(pwd);
            if (this.passwordSuggestions.length > 3) this.passwordSuggestions = this.passwordSuggestions.slice(0, 3);
            localStorage.setItem('ipasign_pwd_history', JSON.stringify(this.passwordSuggestions));
        },
        selectPassword(pwd) { this.password = pwd; this.showPasswordSuggestions = false; },
        hidePasswordSuggestions() { setTimeout(() => { this.showPasswordSuggestions = false; }, 200); },
        checkDirectDownload() { const id = new URLSearchParams(window.location.search).get('download'); if (id) this.loadFromFirestore(id); },
        async loadFromFirestore(docId) {
            try {
                const doc = await db.collection('signed_apps').doc(docId).get();
                if (doc.exists) {
                    this.directDownloadUrl = doc.data().download_url;
                    this.showDirectDownload = true; this.showStep1 = this.showStep2 = this.showStep3 = this.showStep4 = false;
                    setTimeout(() => { new QRCode(document.getElementById('directQrcode'), { width: 160, height: 160, colorDark: "#000000", colorLight: "#ffffff" }).makeCode(this.directDownloadUrl); }, 100);
                } else alert('Link tải không tồn tại hoặc đã hết hạn!');
            } catch (e) { alert('Có lỗi xảy ra khi tải dữ liệu!'); }
        },
        async saveToFirestore(url) {
            try {
                const shortId = generateShortId();
                await db.collection('signed_apps').doc(shortId).set({ download_url: url, created_at: firebase.firestore.FieldValue.serverTimestamp(), app_name: this.selectedAppName || 'Custom App' });
                this.shareUrl = `${window.location.origin}${window.location.pathname}?download=${shortId}`; return shortId;
            } catch (e) { return null; }
        },
        async loadIpaFromUrl(appKey) {
            try {
                this.isIpaLoading = true;
                const controller = new AbortController(); const timeoutId = setTimeout(() => controller.abort(), 30000);
                const response = await fetch(this.ipaUrlMap[appKey], { signal: controller.signal });
                clearTimeout(timeoutId);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const blob = await response.blob(); if (blob.size === 0) throw new Error('File rỗng');
                const sizeMB = (blob.size / 1024 / 1024).toFixed(2); this.appSizes[appKey] = `${sizeMB} MB`;
                this.ipa = new File([blob], `${appKey}.ipa`, { type: response.headers.get('content-type') || 'application/octet-stream' });
                this.appStatus[appKey] = 'loaded'; this.appStatusText = `Đã tải xong: ${this.appNames[appKey]} (${sizeMB} MB)`; this.appStatusClass = 'success'; this.appStatusIcon = 'fas fa-check-circle';
                this.$forceUpdate();
            } catch (err) {
                this.ipa = null; this.appStatus[appKey] = 'error'; this.appStatusClass = 'error'; this.appStatusIcon = 'fas fa-exclamation-triangle';
                this.appStatusText = err.name === 'AbortError' ? 'Timeout: Mạng chậm' : `Lỗi tải IPA: ${err.message}`;
                this.selectedApp = ''; alert(this.appStatusText);
            } finally { this.isIpaLoading = false; }
        },
        async getFile(e) {
            const file = e.target.files[0] || null;
            if (e.target.accept === '.zip') {
                this.certZip = file; this.certZipCss = file ? 'valid' : 'invalid'; this.certZipText = file ? file.name : 'Chọn file .zip...';
                if (file) await this.extractZipFile(file); this.$forceUpdate();
            }
        },
        async extractZipFile(zipFile) {
            this.isExtractingZip = true;
            try {
                const zip = new JSZip(); const zipContent = await zip.loadAsync(zipFile);
                let p12File = null; let mpFile = null;
                for (const [filename, file] of Object.entries(zipContent.files)) {
                    if (!file.dir) {
                        if (filename.toLowerCase().endsWith('.p12')) p12File = new File([await file.async('blob')], filename, { type: 'application/x-pkcs12' });
                        else if (filename.toLowerCase().endsWith('.mobileprovision')) mpFile = new File([await file.async('blob')], filename, { type: 'application/x-apple-aspen-config' });
                    }
                }
                if (!p12File || !mpFile) throw new Error("Thiếu P12 hoặc Mobileprovision");
                this.p12 = p12File; this.mobileprovision = mpFile;
                this.certZipCss = 'valid'; this.certZipText = `✅ P12 & Provison đã trích xuất`;
            } catch (err) { this.certZipCss = 'invalid'; this.certZipText = 'Lỗi file ZIP, vui lòng thử lại'; alert(err.message); }
            this.isExtractingZip = false;
        },
        async upload() {
            if (!this.canSign) return;
            this.savePasswordToHistory(this.password);
            this.showStep1 = false; this.showStep2 = true; this.progressBar = 0; this.uploadStep = 1; this.uploadDetails = 'Khởi tạo luồng dữ liệu...';
            
            const progressInterval = setInterval(() => {
                if (this.progressBar < 30) { this.uploadStep = 1; this.uploadDetails = 'Đang đóng gói file đẩy lên server...'; }
                else if (this.progressBar < 60) { this.uploadStep = 2; this.uploadDetails = 'Server đang mã hóa chứng chỉ...'; }
                else if (this.progressBar < 90) { this.uploadStep = 3; this.uploadDetails = 'Đang tiến hành Inject Payload...'; }
                if (this.progressBar >= 100) clearInterval(progressInterval);
            }, 200);
            
            const fd = new FormData();
            fd.append('ipa', this.ipa, this.ipa.name); fd.append('p12', this.p12, this.p12.name); fd.append('mp', this.mobileprovision, this.mobileprovision.name);
            fd.append('password', this.password); fd.append('app_name', this.selectedAppName || ''); fd.append('bundle_id', '');
            
            try {
                const xhr = new XMLHttpRequest();
                xhr.upload.addEventListener('progress', (e) => { if (e.lengthComputable) this.progressBar = Math.round((e.loaded / e.total) * 100); });
                xhr.onload = () => {
                    clearInterval(progressInterval);
                    if (xhr.status === 200 || xhr.status === 202) {
                        try {
                            const res = xhr.responseText.trim() ? JSON.parse(xhr.responseText) : { task_id: 'temp_' + Date.now() };
                            this.jobId = res.task_id || ('job_' + Date.now());
                            this.showStep2 = false; this.showStep3 = true; this.statusText = 'Đang thực thi lệnh ký...'; this.pollStatus();
                        } catch (e) {
                            const match = xhr.responseText.trim().match(/[a-zA-Z0-9_-]+/);
                            if (match) { this.jobId = match[0]; this.showStep2 = false; this.showStep3 = true; this.statusText = 'Đang thực thi lệnh...'; this.pollStatus(); } 
                            else { alert('Server trả về dữ liệu không hợp lệ'); this.showStep1 = true; this.showStep2 = false; }
                        }
                    } else { alert(`Lỗi máy chủ (${xhr.status}). Vui lòng thử lại.`); this.showStep1 = true; this.showStep2 = false; }
                };
                xhr.onerror = () => { clearInterval(progressInterval); alert('Lỗi đường truyền! Vui lòng kiểm tra lại 4G/Wifi.'); this.showStep1 = true; this.showStep2 = false; };
                xhr.open('POST', SignUrl); xhr.send(fd);
            } catch (err) { clearInterval(progressInterval); alert('Exception: ' + err.message); this.showStep1 = true; this.showStep2 = false; }
        },
        async pollStatus() {
            this.statusText = 'Injecting Certificate...'; this.logText = 'Đang biên dịch P12...';
            const timer = setInterval(async () => {
                try {
                    const response = await fetch(`${StatusUrl}/${this.jobId}`);
                    if (!response.ok) throw new Error();
                    const txt = await response.text();
                    const d = (() => { try { return JSON.parse(txt); } catch { return { status: 'PROCESSING', msg: txt }; }})();
                    
                    this.statusText = d.status || 'Đang xử lý...'; this.logText = d.msg || 'Đang chạy script ký iOS...';
                    
                    if (d.status === 'SUCCESS' || d.status === 'COMPLETED') {
                        this.download = this.download_ipa = `${DownloadUrl}/${this.jobId}`; clearInterval(timer);
                        const docId = await this.saveToFirestore(this.download);
                        if (docId) {
                            this.showStep3 = false; this.showStep4 = true;
                            setTimeout(() => { 
                                const qc = document.getElementById('qrcode'); if(qc) qc.innerHTML = '';
                                new QRCode(document.getElementById('qrcode'), { width: 150, height: 150, colorDark: "#000000", colorLight: "#ffffff" }).makeCode(this.download); 
                            }, 100);
                        }
                    } else if (d.status === 'FAILURE' || d.status === 'ERROR') { clearInterval(timer); alert('Ký thất bại: ' + (d.msg||'')); this.index(); }
                } catch (err) { this.logText = 'Đang chờ máy chủ phản hồi...'; }
            }, 3000);
            setTimeout(() => { clearInterval(timer); if (this.showStep3) { alert('Hết thời gian chờ. Xin thử lại.'); this.index(); } }, 600000);
        },
        copyShareUrl() {
            const inp = this.$refs.shareUrlInput; inp.select(); inp.setSelectionRange(0, 99999);
            try { navigator.clipboard.writeText(this.shareUrl).then(()=>this.showCopied()); } 
            catch { document.execCommand('copy'); this.showCopied(); }
        },
        showCopied() { this.copySuccess = true; setTimeout(() => { this.copySuccess = false; }, 3000); },
        index() { window.location.href = window.location.pathname; },
        goToHome() { window.location.href = window.location.pathname; }
    },
    watch: {
        password(val) { this.pwdCss = val.length ? 'valid' : 'invalid'; this.$nextTick(() => this.$forceUpdate()); },
        certZip(val) { if (!val) { this.p12 = null; this.mobileprovision = null; } this.$nextTick(() => this.$forceUpdate()); },
        ipa() { this.$nextTick(() => this.$forceUpdate()); },
        customIpaFile() { this.$nextTick(() => this.$forceUpdate()); },
        selectedApp(n, o) { if (o === 'custom' && n !== 'custom') { this.customIpaFile = null; if(this.$refs.customIpaInput) this.$refs.customIpaInput.value = ''; } this.$nextTick(() => this.$forceUpdate()); }
    }
});
