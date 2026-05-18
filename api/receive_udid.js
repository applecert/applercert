export const config = {
    api: { bodyParser: false },
};

export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            let body = '';
            for await (const chunk of req) {
                body += chunk.toString();
            }
            
            const match = body.match(/<key>UDID<\/key>[\s]*<string>([a-zA-Z0-9\-]+)<\/string>/);
            const udid = match ? match[1] : '';

            let plan = '';
            if (req.url && req.url.includes('?plan=')) {
                plan = req.url.split('?plan=')[1].split('&')[0];
            } else if (req.query && req.query.plan) {
                plan = req.query.plan;
            }

            if (udid) {
                const redirectUrl = plan 
                    ? `https://ipaviet.site/certapple/${plan}/?udid=${udid}`
                    : `https://ipaviet.site/certapple/?udid=${udid}`;
                
                // APPLE BẮT BUỘC PHẢI DÙNG 301
                res.setHeader('Location', redirectUrl);
                res.status(301).end();
            } else {
                // Tránh lỗi 400 làm kẹt màn hình cài đặt
                res.setHeader('Location', `https://ipaviet.site/certapple/?error=noudid`);
                res.status(301).end();
            }
        } catch (e) {
            res.setHeader('Location', `https://ipaviet.site/certapple/?error=server`);
            res.status(301).end();
        }
    } else {
        res.status(405).send('Method Not Allowed');
    }
}
