// --- PROTECT.JS ---
document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('contextmenu', function(e) { e.preventDefault(); });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || (e.ctrlKey && e.key === 'u')) { e.preventDefault(); return false; }
    });
});

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyBeKh-_VbiM9F9S4iRdGllx3ypze0Gp4hw",
    authDomain: "ioscert-signer.firebaseapp.com",
    projectId: "ioscert-signer",
    storageBucket: "ioscert-signer.firebasestorage.app"
};
if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.firestore();

function generateShortId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = ''; for (let i = 0; i < 6; i++) { result += chars.charAt(Math.floor(Math.random() * chars.length)); } return result;
}

// --- CẤU HÌNH API GỐC CỦA IPASIGN CHUẨN XÁC 100% ---
const API_SIGN = 'https://sign.ipasign.cc/api/sign';
const API_STATUS = 'https://sign.ipasign.cc/api/status';
const API_DOWNLOAD = 'https://sign.ipasign.cc/api/download';

// --- VUE APP LOGIC ---
new Vue({
    el: '#app',
    data: {
        showStep1: true, showStep2: false, showStep3: false, showStep4: false, showDirectDownload: false,
        progressBar: 0, uploadDetails: '', statusText: '', logText: '', jobId: '',
        certZip: null, certZipText: 'Chọn file ZIP', p12: null, mobileprovision: null,
        password: '', passwordSuggestions: [], showPasswordSuggestions: false,
        selectedApp: '', ipa: null, customIpaFile: null, appStatusText: '', appStatusClass: '',
        ipaUrlMap: {
            'esign': 'https://tight-water-fabbipa-proxy.tlvdzreal.workers.dev/esign',
            'gbox': 'https://tight-water-fabbipa-proxy.tlvdzreal.workers.dev/gbox',
            'sca': 'https://tight-water-fabbipa-proxy.tlvdzreal.workers.dev/scarlet'
        },
        appNames: { 'esign': 'ESign', 'gbox': 'GBox', 'sca': 'Scarlet' },
        download: '', directInstallLink: 'javascript:void(0)', shareUrl: '', copySuccess: false
    },
    computed: {
        canSign() { return (this.ipa && this.ipa.size > 0 && this.certZip && this.password && this.p12 && this.mobileprovision); },
        signButtonText() { return this.canSign ? 'KÝ ỨNG DỤNG' : 'ĐIỀN ĐỦ THÔNG TIN'; }
    },
    mounted() {
        this.loadPasswordSuggestions();
        this.checkDirectDownload();
    },
    methods: {
        formatFileSize(bytes) {
            if (bytes === 0) return '0 B'; const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'], i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
        },
        async selectApp(key) {
            if (this.selectedApp === key) { this.clearApp(); return; }
            this.clearApp(); this.selectedApp = key;
            this.appStatusClass = 'loading'; this.appStatusText = `Đang tải ${this.appNames[key]} từ Server...`;
            try {
                const response = await fetch(this.ipaUrlMap[key]);
                if (!response.ok) throw new Error();
                const blob = await response.blob();
                this.ipa = new File([blob], `${key}.ipa`, { type: 'application/octet-stream' });
                this.appStatusClass = 'success'; this.appStatusText = `Đã sẵn sàng ${this.appNames[key]} (${this.formatFileSize(blob.size)})`;
            } catch (e) {
                this.clearApp(); this.appStatusClass = 'error'; this.appStatusText = 'Lỗi tải IPA. Vui lòng thử lại!';
            }
        },
        selectCustomIpa() { this.clearApp(); this.selectedApp = 'custom'; this.$refs.customIpaInput.click(); },
        handleCustomIpa(e) {
            const file = e.target.files[0];
            if (!file || !file.name.toLowerCase().endsWith('.ipa')) { this.clearApp(); return; }
            this.ipa = file; this.customIpaFile = file;
            this.appStatusClass = 'success'; this.appStatusText = `Đã chọn: ${file.name} (${this.formatFileSize(file.size)})`;
        },
        clearApp() { this.selectedApp = ''; this.ipa = null; this.customIpaFile = null; this.appStatusText = ''; if(this.$refs.customIpaInput) this.$refs.customIpaInput.value=''; },
        
        async getFile(e) {
            const file = e.target.files[0];
            if (file && file.name.toLowerCase().endsWith('.zip')) {
                this.certZip = file; this.certZipText = file.name;
                const zip = new JSZip(); const content = await zip.loadAsync(file);
                this.p12 = null; this.mobileprovision = null;
                for (const [name, f] of Object.entries(content.files)) {
                    if (name.toLowerCase().endsWith('.p12')) this.p12 = new File([await f.async('blob')], name);
                    if (name.toLowerCase().endsWith('.mobileprovision')) this.mobileprovision = new File([await f.async('blob')], name);
                }
                if (!this.p12 || !this.mobileprovision) { alert('ZIP thiếu file P12 hoặc Mobileprovision!'); this.certZip = null; this.certZipText = 'Chọn file ZIP'; }
            }
        },

        loadPasswordSuggestions() { const s = localStorage.getItem('ipa_pwd'); if (s) this.passwordSuggestions = JSON.parse(s); },
        savePwd(pwd) {
            let arr = this.passwordSuggestions.filter(p => p !== pwd);
            arr.unshift(pwd); if (arr.length > 3) arr.pop();
            this.passwordSuggestions = arr; localStorage.setItem('ipa_pwd', JSON.stringify(arr));
        },
        selectPassword(p) { this.password = p; this.showPasswordSuggestions = false; },
        hidePasswordSuggestions() { setTimeout(() => this.showPasswordSuggestions = false, 200); },

        // --- KHÚC FIX LỖI MẠNG LÀ CHỖ NÀY ---
        async upload() {
            if (!this.canSign) return;
            this.savePwd(this.password);
            this.showStep1 = false; this.showStep2 = true; this.progressBar = 0; this.uploadDetails = 'Đang đóng gói dữ liệu...';

            const fd = new FormData();
            fd.append('ipa', this.ipa, this.ipa.name); 
            fd.append('p12', this.p12, this.p12.name); 
            fd.append('mp', this.mobileprovision, this.mobileprovision.name);
            fd.append('password', this.password); 
            fd.append('app_name', this.appNames[this.selectedApp] || 'CustomApp');

            try {
                const xhr = new XMLHttpRequest();
                xhr.upload.addEventListener('progress', e => { 
                    if (e.lengthComputable) { 
                        this.progressBar = Math.round((e.loaded / e.total) * 100); 
                        this.uploadDetails = 'Đang tải lên Server bảo mật...'; 
                    } 
                });
                xhr.onload = () => {
                    if (xhr.status === 200 || xhr.status === 202) {
                        try {
                            const res = JSON.parse(xhr.responseText);
                            this.jobId = res.task_id; 
                            this.showStep2 = false; 
                            this.showStep3 = true; 
                            this.pollStatus();
                        } catch (parseErr) {
                            alert('Dữ liệu Server trả về không hợp lệ!');
                            this.resetToStep1();
                        }
                    } else { 
                        alert('Lỗi Server: ' + xhr.status); 
                        this.resetToStep1(); 
                    }
                };
                xhr.onerror = () => { 
                    alert('Lỗi mạng! Không thể kết nối đến máy chủ ký. Vui lòng kiểm tra Wifi/4G.'); 
                    this.resetToStep1(); 
                };
                
                // Gọi tới đúng API chuẩn của hệ thống gốc
                xhr.open('POST', API_SIGN); 
                xhr.send(fd);
            } catch (e) { 
                alert('Lỗi hệ thống nội bộ!'); 
                this.resetToStep1(); 
            }
        },

        async pollStatus() {
            this.statusText = 'Injecting Certificate...'; 
            this.logText = 'Khởi tạo môi trường...';
            const timer = setInterval(async () => {
                try {
                    const res = await fetch(`${API_STATUS}/${this.jobId}`);
                    const d = await res.json();
                    this.statusText = d.status || 'Processing...'; 
                    this.logText = d.msg || 'Đang biên dịch...';
                    
                    if (d.status === 'SUCCESS' || d.status === 'COMPLETED') {
                        clearInterval(timer);
                        
                        this.download = `${API_DOWNLOAD}/${this.jobId}`;
                        const plistUrl = this.download.replace('/download', '/plist');
                        this.directInstallLink = `itms-services://?action=download-manifest&url=${encodeURIComponent(plistUrl)}`;
                        
                        this.showStep3 = false; 
                        this.showStep4 = true;
                        
                        setTimeout(() => { new QRCode(document.getElementById('qrcode'), { width: 140, height: 140 }).makeCode(this.download); }, 100);
                        this.saveToFirestore(this.download);
                    } else if (d.status === 'FAILURE') { 
                        clearInterval(timer); 
                        alert('Ký thất bại: ' + (d.msg||'Chứng chỉ có thể bị sai hoặc thu hồi!')); 
                        this.resetToStep1(); 
                    }
                } catch(e) {}
            }, 3000);
        },

        checkDevice(e) {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            if (!isIOS) {
                e.preventDefault(); 
                alert('TÍNH NĂNG NÀY CHỈ DÀNH CHO iPHONE/iPAD!\n\nVui lòng dùng ứng dụng Camera của iPhone quét mã QR bên dưới để cài đặt.');
            }
        },

        checkDirectDownload() { 
            const id = new URLSearchParams(window.location.search).get('download'); 
            if (id) this.loadFromFirestore(id); 
        },
        async loadFromFirestore(id) {
            try {
                const doc = await db.collection('signed_apps').doc(id).get();
                if (doc.exists) {
                    const url = doc.data().download_url;
                    this.directInstallLink = `itms-services://?action=download-manifest&url=${encodeURIComponent(url.replace('/download', '/plist'))}`;
                    this.showStep1 = false; this.showDirectDownload = true;
                    setTimeout(() => new QRCode(document.getElementById('directQrcode'), { width: 140, height: 140 }).makeCode(url), 100);
                }
            } catch(e) {}
        },
        async saveToFirestore(url) {
            const shortId = generateShortId();
            await db.collection('signed_apps').doc(shortId).set({ download_url: url, created_at: firebase.firestore.FieldValue.serverTimestamp() });
            this.shareUrl = `${window.location.origin}${window.location.pathname}?download=${shortId}`;
        },
        copyShareUrl() {
            this.$refs.shareUrlInput.select(); document.execCommand('copy');
            this.copySuccess = true; setTimeout(() => this.copySuccess = false, 3000);
        },
        resetToStep1() { this.showStep2 = this.showStep3 = false; this.showStep1 = true; },
        goToHome() { window.location.href = window.location.pathname; }
    }
});
