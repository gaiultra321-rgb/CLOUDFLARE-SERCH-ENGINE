const fetch = require('node-fetch');

module.exports = async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).send("Error: Missing target URL.");
    }

    try {
        const parsedUrl = new URL(targetUrl);
        const origin = parsedUrl.origin; // যেমন: https://example.com

        const response = await fetch(targetUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5"
            }
        });

        let html = await response.text();

        // ম্যাজিক: ভাঙা লিংক এবং স্ক্রিপ্ট ফিক্স করার জন্য URL Rewriter লজিক
        // ১. রেলেটিভ পাথগুলোকে (যেমন /assets/style.css) অ্যাবসোলিউট পাথে রূপান্তর (https://example.com/assets/style.css)
        html = html.replace(/(src|href|action)="\/(?!\/)/g, `$1="${origin}/`);
        html = html.replace(/(src|href|action)=' \/(?!\/)/g, `$1='${origin}/`);

        // টার্গেট সাইটের সিকিউরিটি হেডারগুলো রিমুভ করা যাতে ফ্রেমে বাটন ব্লক না হয়
        res.setHeader("Content-Type", "text/html");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.removeHeader("X-Frame-Options");
        res.removeHeader("Content-Security-Policy");

        return res.status(200).send(html);

    } catch (error) {
        return res.status(500).send(`Proxy Error: ওস্তাদ, এই ওয়েবসাইট লোড করা গেল না। কারণ: ${error.message}`);
    }
};
