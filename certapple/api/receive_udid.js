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
            // Đẩy khách về lại trang chủ kèm UDID
            res.redirect(301, `https://ipaviet-cert.vercel.app/?udid=${udid}`);
        } else {
            res.status(400).send('Lỗi trích xuất UDID.');
        }
    } else {
        res.status(405).send('Chỉ nhận POST.');
    }
}
