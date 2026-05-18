export const config = {
    api: { bodyParser: false },
};

export default async function handler(req, res) {
    if (req.method === 'POST') {
        let body = '';
        for await (const chunk of req) {
            body += chunk;
        }
        
        // Trích xuất UDID
        const match = body.match(/<key>UDID<\/key>[\s]*<string>([a-zA-Z0-9\-]+)<\/string>/);
        const udid = match ? match[1] : '';

        // Đọc tên thư mục gói từ đuôi URL (Ví dụ: order01)
        const plan = req.query.plan || ''; 

        if (udid) {
            // Tự động búng khách về đúng thư mục gói họ vừa đứng
            const redirectUrl = plan 
                ? `https://ipaviet.site/certapple/${plan}/?udid=${udid}`
                : `https://ipaviet.site/certapple/?udid=${udid}`;
                
            res.redirect(301, redirectUrl);
        } else {
            res.status(400).send('Không trích xuất được UDID. Vui lòng thử lại.');
        }
    } else {
        res.status(405).send('Phương thức không được hỗ trợ.');
    }
}
