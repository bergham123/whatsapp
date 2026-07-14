import { updateFile } from './github.js';

export async function handler(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { filename, base64 } = JSON.parse(event.body);
        if (!filename || !base64) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Filename and base64 are required' }) };
        }

        // تحديد المسار: images/اسم الملف
        const path = `images/${filename}`;
        // تحويل base64 إلى Buffer ثم إلى base64 مرة أخرى بصيغة GitHub (نفس المحتوى)
        // ولكن updateFile يتوقع كائن JSON، لكننا نرفع ملفات ثنائية، لذا يجب تعديل github.js لدعم رفع الملفات الثنائية.
        // سنقوم بإنشاء دالة جديدة في github.js: uploadBinaryFile
        // أو نستخدم updateFile مباشرة مع تمرير المحتوى base64 كسلسلة.
        // updateFile حالياً يتوقع JSON ويحوله إلى stringify، لكننا نريد رفع الملف كما هو.
        // سأضيف دالة جديدة في github.js: uploadFileRaw(path, contentBase64, message)

        // استدعاء دالة جديدة (سنضيفها)
        const result = await uploadFileRaw(path, base64, `Upload ${filename}`);
        const rawUrl = `https://raw.githubusercontent.com/${process.env.OWNER}/${process.env.REPO}/main/${path}`;

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, url: rawUrl })
        };
    } catch (error) {
        console.error(error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
}

// دالة مساعدة لرفع الملفات الثنائية (سنضعها في github.js)
async function uploadFileRaw(path, contentBase64, message) {
    const TOKEN = process.env.GITHUB_TOKEN;
    const OWNER = process.env.OWNER;
    const REPO = process.env.REPO;
    const API = `https://api.github.com/repos/${OWNER}/${REPO}`;

    // نحتاج أولاً إلى الحصول على sha إذا كان الملف موجوداً
    let sha = null;
    try {
        const res = await fetch(`${API}/contents/${path}`, {
            headers: { Authorization: `Bearer ${TOKEN}` }
        });
        if (res.ok) {
            const data = await res.json();
            sha = data.sha;
        }
    } catch (e) {}

    const body = {
        message,
        content: contentBase64,
        ...(sha && { sha })
    };

    const res = await fetch(`${API}/contents/${path}`, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
    }
    return await res.json();
}
