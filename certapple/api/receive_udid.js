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

        // CÁCH BẮT ĐUÔI PLAN AN TOÀN TUYỆT ĐỐI TRÊN VERCEL
        let plan = '';
        if (req.url && req.url.includes('?plan=')) {
            plan = req.url.split('?plan=')[1].split('&')[0];
        } else if (req.query && req.query.plan) {
            plan = req.query.plan;
        }

        if (udid) {
            // Nếu phát hiện đuôi plan, búng về đúng thư mục đó
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
