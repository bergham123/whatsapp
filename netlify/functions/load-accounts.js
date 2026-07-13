import { getFile } from './github.js';

export async function handler(event, context) {
  try {
    const file = await getFile('accounts.json');
    return {
      statusCode: 200,
      body: JSON.stringify(file.data)
    };
  } catch (error) {
    console.error('Load accounts error:', error);
    // If file doesn't exist, return empty array
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
