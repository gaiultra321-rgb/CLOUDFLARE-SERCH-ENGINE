export async function onRequest(context) {
    // আপনার সার্চ ইঞ্জিনের মেইন ডেটাবেস/ইনডেক্স
    const database = [
        { 
            title: "Python Programming Guide for Beginners", 
            description: "Learn Python from scratch with practical code and projects.",
            url: "https://example.com/python-guide" 
        },
        { 
            title: "How to Host a Telegram Bot on Cloudflare", 
            description: "Step-by-step tutorial on deploying serverless bots using workers.",
            url: "https://example.com/cloudflare-bot" 
        },
        { 
            title: "Advanced Flask Web Application Development", 
            description: "Build robust APIs and web apps using Python Flask framework.",
            url: "https://example.com/flask-apps" 
        },
        { 
            title: "Automated Video Downloader Bot with yt-dlp", 
            description: "Create a powerful Telegram bot to download media instantly.",
            url: "https://example.com/ytdlp-bot" 
        }
    ];

    // ইউজার কী লিখে সার্চ করছে তা URL থেকে বের করা
    const url = new URL(context.request.url);
    const searchQuery = url.searchParams.get('q')?.toLowerCase() || "";

    // সিম্পল টাইটেল এবং ডেসক্রিপশন ম্যাচিং ফিল্টার
    const filteredResults = database.filter(item => 
        item.title.toLowerCase().includes(searchQuery) || 
        item.description.toLowerCase().includes(searchQuery)
    );

    // সিকিউরিটি হেডারসহ JSON রেসপন্স রিটার্ন করা
    return new Response(JSON.stringify(filteredResults), {
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET"
        }
    });
      }
      
