export async function onRequest(context) {
    const url = new URL(context.request.url);
    const searchQuery = url.searchParams.get('q');

    if (!searchQuery) {
        return new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json" } });
    }

    try {
        // আমরা DuckDuckGo এর অফিশিয়াল ফ্রি লাইভ এইচটিএমএল সার্চ ব্যবহার করছি (গুগল/ইয়াহুর মতো ডাটা দেয়)
        const targetUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;
        
        const response = await fetch(targetUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        });

        const html = await response.text();
        const results = [];

        // ক্লাউডফ্লেয়ার ওয়ার্কারের ভেতরেই আমরা জাভাস্ক্রিপ্ট দিয়ে রেগুলার এক্সপ্রেশন (RegEx) ব্যবহার করে 
        // লাইভ সার্চের রেজাল্টগুলোর Title, URL এবং Snippet আলাদা করে কাটছাঁট (Parse) করে নিচ্ছি।
        const resultBlockRegex = /<div class="result results_links results_links_deep web-result.*?">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
        let match;

        while ((match = resultBlockRegex.exec(html)) !== null) {
            const block = match[1];

            // Title এবং URL এক্সট্রাক্ট করা
            const titleUrlRegex = /<a class="result__url" href="([^"]+)">/;
            const titleTextRegex = /<a class="result__snippet"[\s\S]*?>([\s\S]*?)<\/ins>/; // Fallback text parse
            const headingRegex = /<a class="result__url"[\s\S]*?>([\s\S]*?)<\/a>/;

            // ক্লিনআপ ফাংশন (HTML ট্যাগ রিমুভ করার জন্য)
            const clean = (str) => str ? str.replace(/<\/?[^>]+(>|$)/g, "").trim() : "";

            // ফাইনাল ডাটা ফিল্টারিং
            const rawUrl = block.match(/href="([^"]+)"/)?.[1] || "";
            // DuckDuckGo এর ইন্টারনাল রিডাইরেক্ট ইউআরএল ক্লিন করে মেইন সাইটের লিঙ্ক বের করা
            let finalUrl = rawUrl;
            if (rawUrl.includes('uddg=')) {
                const parts = rawUrl.split('uddg=');
                if (parts[1]) {
                    finalUrl = decodeURIComponent(parts[1].split('&')[0]);
                }
            }

            const rawTitle = block.match(/<a class="result__a"[\s\S]*?>([\s\S]*?)<\/a>/)?.[1] || "No Title";
            const rawSnippet = block.match(/<a class="result__snippet"[\s\S]*?>([\s\S]*?)<\/a>/)?.[1] || "";

            if (finalUrl && !finalUrl.includes('duckduckgo.com/y.js')) {
                results.push({
                    title: clean(rawTitle),
                    url: finalUrl,
                    snippet: clean(rawSnippet)
                });
            }
            
            // সর্বোচ্চ ১০-১২ টা মেইন রেজাল্ট দেখাবে (গুগলের প্রথম পেজের মতো)
            if (results.length >= 12) break;
        }

        return new Response(JSON.stringify(results), {
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "public, max-age=60" // ১ মিনিটের ক্যাশিং স্পিড বাড়ানোর জন্য
            }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: "Search failed", details: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
                }
            
