import { getFile, updateFile } from './github.js';

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
        // بناء cron بناءً على الوقت المدخل (كل يوم في هذا الوقت)
        // cron format: minute hour * * *
        const [hour, minute] = time.split(':');
        const cron = `${parseInt(minute)} ${parseInt(hour)} * * *`;

        // قراءة ملف send.yaml
        const file = await getFile('.github/workflows/send.yaml');
        let yamlContent = file.data; // هذا سيكون string لأننا نستخدم getFile الذي يعيد JSON.parse، لكن YAML ليس JSON.
        // لذلك يجب تعديل getFile ليعيد المحتوى النصي كما هو، أو نتعامل مع YAML كنص.
        // سنقوم بقراءة الملف كنص باستخدام دالة جديدة في github.js: getRawFile

        // لكن لتجنب تعقيد تحليل YAML، سنقوم بتعديل الملف عن طريق استبدال السطر الذي يحتوي على cron.
        // أو نستخدم طريقة أبسط: نخزن الوقت في ملف منفصل (مثل schedule.txt) ونقرأه في workflow.
        // لكن السؤال يطلب تعديل workflow مباشرة، سأفترض أننا سنقوم بتعديل send.yaml بشكل نصي.

        // سنقوم بتنفيذ بديل: نكتب الوقت في ملف schedule.json، ثم في workflow نقرأ هذا الملف ونستخدمه لتشغيل job.
        // بهذه الطريقة لا نعدل ملف workflow نفسه، بل نستخدم متغيرات أو نقرأ ملف.
        // لكن الأفضل هو تعديل workflow مباشرة لأن cron مكتوب فيه.

        // سأقوم بقراءة ملف send.yaml كنص، واستبدال السطر الذي يبدأ بـ "cron:".
        // لكن YAML له تنسيق، يمكننا استبدال السطر كاملاً.
        // سنستخدم دالة getRawFile و updateRawFile.

        // سأكتب دالتين جديدتين في github.js: getRawFile و updateRawFile.
        // ثم نستخدمهما هنا.

        const rawYaml = await getRawFile('.github/workflows/send.yaml');
        const lines = rawYaml.split('\n');
        const newLines = lines.map(line => {
            if (line.trim().startsWith('cron:')) {
                return `    cron: '${cron}'`;
            }
            return line;
        });
        const newYaml = newLines.join('\n');

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
