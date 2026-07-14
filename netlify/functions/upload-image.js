import { uploadFileRaw } from './github.js';

export async function handler(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { filename, base64 } = JSON.parse(event.body);
        if (!filename || !base64) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Filename and base64 are required' }) };
        }

        // تنظيف اسم الملف (إزالة المسارات الضارة)
        const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, '');
        const path = `images/${cleanName}`;

        // رفع الملف إلى GitHub (base64 نقية بدون رأس)
        await uploadFileRaw(path, base64, `Upload ${cleanName}`);

        // إنشاء رابط المشاهدة الخام
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
