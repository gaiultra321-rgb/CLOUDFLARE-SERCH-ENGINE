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
                "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36"
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

    // --- পার্ট ২: ফিক্সড গ্লোবাল সার্চ লজিক (JSON API) ---
    const searchQuery = url.searchParams.get('q');
    if (!searchQuery) {
        return new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json" } });
    }

    try {
        // DuckDuckGo-র অফিশিয়াল JSON API ব্যবহার করা হয়েছে যা কখনো ব্লক বা ক্র্যাশ করবে না
        const targetUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&format=json&no_html=1&skip_disambig=1`;
        
        const response = await fetch(targetUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
        });

        const data = await response.json();
        const results = [];

        // ১. মেইন ডেফিনিটিভ রেজাল্ট থাকলে তা অ্যাড করা
        if (data.AbstractURL && data.AbstractText) {
            results.push({
                title: data.Heading || "Main Result",
                url: data.AbstractURL,
                snippet: data.AbstractText
            });
        }

        // ২. রিলেটেড টপিকস থেকে বাকি রেজাল্টগুলো পার্স করা
        if (data.RelatedTopics && data.RelatedTopics.length > 0) {
            for (const topic of data.RelatedTopics) {
                if (topic.FirstURL && topic.Text) {
                    // টেক্সট থেকে টাইটেল আলাদা করা
                    const textParts = topic.Text.split(' - ');
                    const title = textParts[0] || "Result";
                    const snippet = textParts[1] || topic.Text;

                    results.push({
                        title: title,
                        url: topic.FirstURL,
                        snippet: snippet
                    });
                }
                if (results.length >= 12) break; // সর্বোচ্চ ১২টি রেজাল্ট
            }
        }

        return new Response(JSON.stringify(results), { 
            headers: { 
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            } 
        });

    } catch (error) {
        return new Response(JSON.stringify([{ title: "Error", url: "#", snippet: "Failed to parse data." }]), { status: 500 });
    }
}
