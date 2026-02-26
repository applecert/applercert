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
        download: '', directInstallLink: '', shareUrl: '', copySuccess: false
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
            this.showStep1 = false; this.showStep2 = true; this.progressBar = 0; this.uploadDetails = 'Đang đóng gói dữ liệu...';

            const fd = new FormData();
            fd.append('ipa', this.ipa, this.ipa.name); 
            fd.append('p12', this.p12, this.p12.name); 
            fd.append('mp', this.mobileprovision, this.mobileprovision.name);
            fd.append('password', this.password); 
            fd.append('app_name', this.appNames[this.selectedApp] || 'CustomApp');

            try {
                // Điền thẳng URL API gốc để loại bỏ hoàn toàn file index.js rác
                const apiURL = 'https://sign.ipasign.cc/api/sign';
                const resp = await axios.post(apiURL, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: e => {
                        if (e.lengthComputable) {
                            this.progressBar = Math.round((e.loaded / e.total) * 100);
                            this.uploadDetails = 'Đang tải lên Server bảo mật...';
                        }
                    }
                });
                
                this.jobId = resp.data.task_id || resp.data; 
                this.showStep2 = false; 
                this.showStep3 = true; 
                this.pollStatus();
            } catch (e) {
                alert('Lỗi mạng! Không thể kết nối tới Server Ký.');
                this.resetToStep1();
            }
        },

        async pollStatus() {
            this.statusText = 'Injecting Certificate...'; 
            this.logText = 'Khởi tạo môi trường...';
            const timer = setInterval(async () => {
                try {
                    const statusApi = 'https://sign.ipasign.cc/api/status';
                    const res = await axios.get(`${statusApi}/${this.jobId}`);
                    const d = res.data;
                    this.statusText = d.status || 'Processing...'; 
                    this.logText = d.msg || 'Đang biên dịch...';
                    
                    if (d.status === 'SUCCESS' || d.status === 'COMPLETED') {
                        clearInterval(timer);
                        
                        this.download = `https://ipa.ipasign.cc/download/${this.jobId}`;
                        
                        // --- ĐÂY LÀ PHÉP MÀU: CÀO LINK CÀI ĐẶT TRỰC TIẾP ---
                        this.statusText = 'Đang trích xuất cấu hình...';
                        try {
                            // Dùng Proxy trung gian để đọc trộm trang download và lấy link Plist chuẩn 100%
                            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(this.download)}`;
                            const htmlRes = await fetch(proxyUrl);
                            const htmlData = await htmlRes.json();
                            
                            // Lọc ra đúng cái link itms-services xịn
                            const match = htmlData.contents.match(/(itms-services:\/\/[^"']+)/);
                            if (match) {
                                this.directInstallLink = match[1].replace(/&amp;/g, '&');
                            } else {
                                this.directInstallLink = this.download; // Fallback
                            }
                        } catch (err) {
                            this.directInstallLink = this.download; // Fallback nếu proxy nghẽn
                        }
                        
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

        // Hàm Cài Đặt 
        triggerInstall() {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            if (!isIOS) {
                alert('TÍNH NĂNG NÀY CHỈ DÀNH CHO iPHONE/iPAD!\n\nVui lòng dùng ứng dụng Camera của iPhone quét mã QR bên dưới để cài đặt.');
                return;
            }
            
            // Nếu cào được link itms, chuyển hướng thẳng. Nếu không cào được, nhảy qua trang download
            window.location.href = this.directInstallLink;
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
                    
                    // Giống lúc Ký xong, cào link cài đặt cho khách truy cập
                    try {
                        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
                        const htmlRes = await fetch(proxyUrl);
                        const htmlData = await htmlRes.json();
                        const match = htmlData.contents.match(/(itms-services:\/\/[^"']+)/);
                        if (match) {
                            this.directInstallLink = match[1].replace(/&amp;/g, '&');
                        } else {
                            this.directInstallLink = url;
                        }
                    } catch (err) {
                        this.directInstallLink = url;
                    }
                    
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
