export async function onRequest(context) {
    const url = new URL(context.request.url);
    
    // চেক করা হচ্ছে ইউজার কি সার্চ করছে নাকি কোনো ওয়েবসাইট প্রক্সি দিয়ে ব্রাউজ করতে চাচ্ছে
    const proxyUrl = url.searchParams.get('proxy_url');
    
    // --- পার্ট ১: ওয়েবসাইট প্রক্সি ব্রাউজার লজিক ---
    if (proxyUrl) {
        try {
            const response = await fetch(proxyUrl, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36..."
                }
            });

            // অরিজিনাল সাইটের রেসপন্স হেডার মডিফাই করা (সিকিউরিটি ব্লক ভাঙ্গার জন্য)
            const newHeaders = new Headers(response.headers);
            newHeaders.delete("content-security-policy");
            newHeaders.delete("x-frame-options");
            newHeaders.delete("clear-site-data");
            
            // আপনার নিজস্ব ডোমেইনকে ফ্রেম করার অনুমতি দেওয়া
            newHeaders.set("Access-Control-Allow-Origin", "*");

            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: newHeaders
            });
        } catch (err) {
            return new Response(`Anonymizer Error: Unable to proxy this website. Reason: ${err.message}`, { status: 500 });
        }
    }

    // --- পার্ট ২: গ্লোবাল সার্চ ইঞ্জিন লজিক (আগেরটিই সামান্য উন্নত করা) ---
    const searchQuery = url.searchParams.get('q');
    if (!searchQuery) {
        return new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json" } });
    }

    try {
        const targetUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;
        const response = await fetch(targetUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36..." }
        });

        const html = await response.text();
        const results = [];
        const resultBlockRegex = /<div class="result results_links results_links_deep web-result.*?">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
        let match;

        while ((match = resultBlockRegex.exec(html)) !== null) {
            const block = match[1];
            const clean = (str) => str ? str.replace(/<\/?[^>]+(>|$)/g, "").trim() : "";

            const rawUrl = block.match(/href="([^"]+)"/)?.[1] || "";
            let finalUrl = rawUrl;
            if (rawUrl.includes('uddg=')) {
                const parts = rawUrl.split('uddg=');
                if (parts[1]) finalUrl = decodeURIComponent(parts[1].split('&')[0]);
            }

            const rawTitle = block.match(/<a class="result__a"[\s\S]*?>([\s\S]*?)<\/a>/)?.[1] || "No Title";
            const rawSnippet = block.match(/<a class="result__snippet"[\s\S]*?>([\s\S]*?)<\/a>/)?.[1] || "";

            if (finalUrl && !finalUrl.includes('duckduckgo.com')) {
                results.push({
                    title: clean(rawTitle),
                    url: finalUrl,
                    snippet: clean(rawSnippet)
                });
            }
            if (results.length >= 10) break;
        }

        return new Response(JSON.stringify(results), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });

    } catch (error) {
        return new Response(JSON.stringify([]), { status: 500 });
    }
}
