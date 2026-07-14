// استيراد الدوال الجديدة التي أضفناها في github.js
import { getRawFile, updateRawFile } from './github.js';

export async function handler(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { time } = JSON.parse(event.body);
        if (!time) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Time is required' }) };
        }

        // time is like "09:00"
        const [hour, minute] = time.split(':');
        const cron = `${parseInt(minute)} ${parseInt(hour)} * * *`;

        // قراءة ملف send.yaml كنص خام
        const raw = await getRawFile('.github/workflows/send.yaml');
        const lines = raw.content.split('\n'); // raw.content هو النص

        // تعديل السطر الذي يبدأ بـ cron:
        const newLines = lines.map(line => {
            if (line.trim().startsWith('cron:')) {
                // المحافظة على المسافات البادئة (عادة 4 مسافات أو 2)
                const indent = line.match(/^\s*/)[0];
                return `${indent}cron: '${cron}'`;
            }
            return line;
        });

        const newYaml = newLines.join('\n');

        // رفع الملف المُعدَّل إلى GitHub
        await updateRawFile('.github/workflows/send.yaml', newYaml, `Update schedule to ${time}`);

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, cron })
        };
    } catch (error) {
        console.error(error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
}
