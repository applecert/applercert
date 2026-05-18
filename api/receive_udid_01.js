export const config = {
    api: { bodyParser: false },
};

export default async function handler(req, res) {
    if (req.method === 'POST') {
        let body = '';
        for await (const chunk of req) {
            body += chunk;
        }
        
        const match = body.match(/<key>UDID<\/key>[\s]*<string>([a-zA-Z0-9\-]+)<\/string>/);
        const udid = match ? match[1] : '';

        if (udid) {
            // FIX CỨNG: Búng thẳng về thư mục order01, bỏ qua việc kiểm tra đuôi URL
            res.redirect(301, `https://ipaviet.site/certapple/order01/?udid=${udid}`);
        } else {
            res.status(400).send('Không trích xuất được UDID. Vui lòng thử lại.');
        }
    } else {
        res.status(405).send('Phương thức không được hỗ trợ.');
    }
}
