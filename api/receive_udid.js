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

        if (udid) {
            // Chuyển hướng về trang chủ web của bạn kèm theo mã UDID
            res.redirect(301, `https://applercert.vercel.app/?udid=${udid}`);
        } else {
            res.status(400).send('Không trích xuất được UDID. Vui lòng thử lại.');
        }
    } else {
        res.status(405).send('Phương thức không được hỗ trợ.');
    }
}
