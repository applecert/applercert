export const config = {
    api: { bodyParser: false },
};

export default async function handler(req, res) {
    if (req.method === 'POST') {
        let body = '';
        for await (const chunk of req) {
            body += chunk;
        }
        
        // Trích xuất UDID từ dữ liệu Apple gửi lên
        const match = body.match(/<key>UDID<\/key>[\s]*<string>([a-zA-Z0-9\-]+)<\/string>/);
        const udid = match ? match[1] : '';

        // Tự động nhận diện gói dựa vào đuôi URL ẩn từ file .mobileconfig gửi lên
        let plan = '';
        if (req.url && req.url.includes('?plan=')) {
            plan = req.url.split('?plan=')[1].split('&')[0];
        } else if (req.query && req.query.plan) {
            plan = req.query.plan;
        }

        if (udid) {
            // Dùng mã chuyển hướng 302 để chặn Safari lưu cache bậy
            const redirectUrl = plan 
                ? `https://ipaviet.site/certapple/${plan}/?udid=${udid}`
                : `https://ipaviet.site/certapple/?udid=${udid}`;
                
            res.redirect(302, redirectUrl);
        } else {
            res.status(400).send('Không trích xuất được UDID. Vui lòng thử lại.');
        }
    } else {
        res.status(405).send('Phương thức không được hỗ trợ.');
    }
}
