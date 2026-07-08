export async function onRequest(context) {
    const url = new URL(context.request.url);
    const proxyUrl = url.searchParams.get('proxy_url');
    const shouldRotate = url.searchParams.get('rotate');

    // --- পার্ট ১: আইপি রোটেটিং প্রক্সি ব্রাউজার লজিক ---
    if (proxyUrl) {
        try {
            const userAgents = [
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
                "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0"
            ];
            const randomAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

            const requestHeaders = new Headers();
            requestHeaders.set("User-Agent", randomAgent);
            requestHeaders.set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8");
            
            if (shouldRotate === "true") {
                requestHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate");
                requestHeaders.set("Pragma", "no-cache");
                requestHeaders.set("X-Forwarded-For", crypto.randomUUID()); 
            }

            const response = await fetch(proxyUrl, {
                method: "GET",
                headers: requestHeaders,
                redirect: "follow"
            });

            const newHeaders = new Headers(response.headers);
            newHeaders.delete("content-security-policy");
            newHeaders.delete("x-frame-options");
            newHeaders.delete("clear-site-data");
            newHeaders.set("Access-Control-Allow-Origin", "*");

            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: newHeaders
            });
        } catch (err) {
            return new Response(`Proxy Error: ${err.message}`, { status: 500 });
        }
    }

    // --- পার্ট ২: গ্লোবাল ওয়েব সার্চ লজিক ---
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
                results.push({ title: clean(rawTitle), url: finalUrl, snippet: clean(rawSnippet) });
            }
            if (results.length >= 10) break;
        }

        return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json" } });

    } catch (error) {
        return new Response(JSON.stringify([]), { status: 500 });
    }
}
