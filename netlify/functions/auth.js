import jwt from 'jsonwebtoken';

export async function handler(event, context) {
  try {
    // Get token from Authorization header
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'No token provided' })
      };
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    return {
      statusCode: 200,
      body: JSON.stringify({
        valid: true,
        user: {
          email: decoded.email,
          username: decoded.username
        }
      })
    };
  } catch (error) {
    console.error('Auth error:', error);
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Invalid or expired token' })
    };
  }
}
