// --- PROTECT.JS ---
document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('contextmenu', function(e) { e.preventDefault(); });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || (e.ctrlKey && e.key === 'u')) { e.preventDefault(); return false; }
    });
});

// --- FIREBASE CONFIGURATION ---
let db = null;
try {
    const firebaseConfig = {
        apiKey: "AIzaSyBeKh-_VbiM9F9S4iRdGllx3ypze0Gp4hw",
        authDomain: "ioscert-signer.firebaseapp.com",
        projectId: "ioscert-signer",
        storageBucket: "ioscert-signer.firebasestorage.app"
    };
    if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
    db = firebase.firestore();
} catch (error) { console.warn("Firebase Init Error"); }

function generateShortId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = ''; for (let i = 0; i < 6; i++) { result += chars.charAt(Math.floor(Math.random() * chars.length)); } return result;
}

function getAbsoluteUrl(url, defaultEndpoint) {
    if (!url) return defaultEndpoint;
    if (url.startsWith('http')) return url;
    return 'https://sign.ipasign.cc' + (url.startsWith('/') ? '' : '/') + url;
}

// --- VUE APP LOGIC ---
new Vue({
    el: '#app-vip',
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
        download: '', directInstallLink: '', shareUrl: '', copySuccess: false,
        
        // BIẾN QUẢN LÝ NÚT DỰ PHÒNG
        showFallback: false
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
                try {
                    const zip = new JSZip(); const content = await zip.loadAsync(file);
                    this.p12 = null; this.mobileprovision = null;
                    for (const [name, f] of Object.entries(content.files)) {
                        if (name.toLowerCase().endsWith('.p12')) this.p12 = new File([await f.async('blob')], name);
                        if (name.toLowerCase().endsWith('.mobileprovision')) this.mobileprovision = new File([await f.async('blob')], name);
                    }
                    if (!this.p12 || !this.mobileprovision) { alert('ZIP thiếu file P12 hoặc Mobileprovision!'); this.certZip = null; this.certZipText = 'Chọn file ZIP'; }
                } catch (error) { alert('Lỗi đọc file ZIP!'); }
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

        async upload() {
            if (!this.canSign) return;
            this.savePwd(this.password);
            this.showStep1 = false; this.showStep2 = true; this.progressBar = 0; this.uploadDetails = 'Đang khởi tạo kết nối...';
            this.showFallback = false; // Reset trạng thái nút dự phòng

            const fd = new FormData();
            fd.append('ipa', this.ipa, this.ipa.name); 
            fd.append('p12', this.p12, this.p12.name); 
            fd.append('mp', this.mobileprovision, this.mobileprovision.name);
            fd.append('password', this.password); 
            fd.append('app_name', this.appNames[this.selectedApp] || 'CustomApp');

            try {
                let targetUrl = typeof SignUrl !== 'undefined' ? SignUrl : 'https://sign.ipasign.cc/api/sign';
                const apiURL = getAbsoluteUrl(targetUrl, 'https://sign.ipasign.cc/api/sign');
                
                const resp = await axios.post(apiURL, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: e => {
                        if (e.lengthComputable) {
                            this.progressBar = Math.round((e.loaded / e.total) * 100);
                            this.uploadDetails = 'Đang đẩy lên Server Bảo Mật...';
                        }
                    }
                });
                
                this.jobId = resp.data.task_id || resp.data; 
                this.showStep2 = false; 
                this.showStep3 = true; 
                this.pollStatus();
            } catch (e) {
                console.error(e);
                alert('Lỗi mạng! Kiểm tra kết nối hoặc Server đang bận.');
                this.resetToStep1();
            }
        },

        async pollStatus() {
            this.statusText = 'Đang Injecting Certificate...'; 
            this.logText = 'Server đang xác thực...';
            const timer = setInterval(async () => {
                try {
                    let stUrl = typeof StatusUrl !== 'undefined' ? StatusUrl : 'https://sign.ipasign.cc/api/status';
                    const statusApi = getAbsoluteUrl(stUrl, 'https://sign.ipasign.cc/api/status');
                    
                    const res = await axios.get(`${statusApi}/${this.jobId}`);
                    const d = res.data;
                    this.statusText = d.status || 'Processing...'; 
                    this.logText = d.msg || 'Đang biên dịch...';
                    
                    if (d.status === 'SUCCESS' || d.status === 'COMPLETED') {
                        clearInterval(timer);
                        
                        let dlUrl = typeof DownloadUrl !== 'undefined' ? DownloadUrl : 'https://sign.ipasign.cc/download';
                        const downApi = getAbsoluteUrl(dlUrl, 'https://sign.ipasign.cc/download');
                        
                        this.download = `${downApi}/${this.jobId}`;
                        
                        // Mã hóa link itms-services. Nếu Cloudflare chặn, Fallback sẽ giải cứu ở bước ấn nút
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

        // --- HÀM XỬ LÝ CHỐNG "LIỆT" NÚT THẦN THÁNH ---
        triggerInstall(e) {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            if (!isIOS) {
                alert('TÍNH NĂNG NÀY CHỈ DÀNH CHO iPHONE/iPAD!\n\nVui lòng dùng ứng dụng Camera của iPhone quét mã QR bên dưới để cài đặt.');
                return;
            }
            
            // 1. Đổi giao diện nút thành Loading để khách biết là nút đã được ấn
            const btn = e.currentTarget;
            const textSpan = btn.querySelector('.btn-text');
            const svgIcon = btn.querySelector('svg');
            
            if (textSpan) textSpan.innerText = 'ĐANG MỞ POPUP...';
            if (svgIcon) svgIcon.classList.add('spinning');
            btn.style.opacity = '0.7';
            
            // 2. Ép trình duyệt gọi link cài đặt ngầm
            window.location.href = this.directInstallLink;
            
            // 3. NẾU SAFARI CỨNG ĐẦU TỪ CHỐI (Không có popup nào hiện lên)
            // Sau đúng 2.5 giây, Nút màu Đỏ cứu hộ sẽ hiện ra dẫn qua trang tải gốc!
            setTimeout(() => {
                this.showFallback = true;
            }, 2500);
        },

        checkDirectDownload() { 
            const id = new URLSearchParams(window.location.search).get('download'); 
            if (id) this.loadFromFirestore(id); 
        },
        async loadFromFirestore(id) {
            try {
                if(!db) return;
                const doc = await db.collection('signed_apps').doc(id).get();
                if (doc.exists) {
                    const url = doc.data().download_url;
                    this.download = url;
                    
                    const plistUrl = url.replace('/download', '/plist');
                    this.directInstallLink = `itms-services://?action=download-manifest&url=${encodeURIComponent(plistUrl)}`;
                    
                    this.showStep1 = false; this.showDirectDownload = true;
                    setTimeout(() => new QRCode(document.getElementById('directQrcode'), { width: 140, height: 140 }).makeCode(url), 100);
                }
            } catch(e) {}
        },
        async saveToFirestore(url) {
            try {
                if(!db) return;
                const shortId = generateShortId();
                await db.collection('signed_apps').doc(shortId).set({ download_url: url, created_at: firebase.firestore.FieldValue.serverTimestamp() });
                this.shareUrl = `${window.location.origin}${window.location.pathname}?download=${shortId}`;
            } catch (error) {}
        },
        copyShareUrl() {
            this.$refs.shareUrlInput.select(); document.execCommand('copy');
            this.copySuccess = true; setTimeout(() => this.copySuccess = false, 3000);
        },
        resetToStep1() { this.showStep2 = this.showStep3 = false; this.showStep1 = true; },
        goToHome() { window.location.href = window.location.pathname; }
    }
});
