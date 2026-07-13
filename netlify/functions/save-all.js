import { updateFile } from './github.js';

export async function handler(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { accounts, messages } = JSON.parse(event.body);

    // Validate input
    if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Accounts array is required and must not be empty' })
      };
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Messages array is required and must not be empty' })
      };
    }

    // Update both files in GitHub
    await updateFile('accounts.json', accounts, 'Update accounts');
    await updateFile('message.json', messages, 'Update messages');

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    console.error('Save-all error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' })
    };
  }
}
