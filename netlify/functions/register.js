import { getUsers, saveUsers } from './github.js';
import bcrypt from 'bcryptjs';

export async function handler(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { username, email, password, confirmPassword } = JSON.parse(event.body);

    // Validate input
    if (!username || !email || !password || !confirmPassword) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'All fields are required' })
      };
    }

    if (password !== confirmPassword) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Passwords do not match' })
      };
    }

    if (password.length < 6) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Password must be at least 6 characters' })
      };
    }

    // Get existing users
    let users = [];
    try {
      users = await getUsers();
    } catch (error) {
      // If users.json doesn't exist, start with empty array
      users = [];
    }

    // Check if email already exists
    if (users.find(u => u.email === email)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email already registered' })
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Add new user
    users.push({
      username,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    });

    // Save to GitHub
    await saveUsers(users);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    console.error('Register error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' })
    };
  }
}
