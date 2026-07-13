import { getFile } from './github.js';

export async function handler(event, context) {
  try {
    const file = await getFile('message.json');
    return {
      statusCode: 200,
      body: JSON.stringify(file.data)
    };
  } catch (error) {
    console.error('Load messages error:', error);
    if (error.message.includes('Cannot read')) {
      return {
        statusCode: 200,
        body: JSON.stringify([])
      };
    }
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' })
    };
  }
}
