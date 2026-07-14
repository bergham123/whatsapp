import { getRawFile } from './github.js';

export async function handler(event, context) {
    try {
        const raw = await getRawFile('.github/workflows/send.yaml');
        // استخراج cron من المحتوى النصي (raw.content)
        const match = raw.content.match(/cron:\s*'([^']+)'/);
        if (match) {
            const cron = match[1]; // مثل "0 9 * * *"
            const parts = cron.split(' ');
            const minute = parts[0];
            const hour = parts[1];
            const time = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
            return { statusCode: 200, body: JSON.stringify({ time }) };
        }
        return { statusCode: 200, body: JSON.stringify({ time: '' }) };
    } catch (error) {
        // إذا لم يوجد الملف أو حدث خطأ، نعيد وقت فارغ
        return { statusCode: 200, body: JSON.stringify({ time: '' }) };
    }
}
