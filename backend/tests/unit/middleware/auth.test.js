const jwt = require('jsonwebtoken');

describe('Auth Tests', () => {
  test('should validate JWT token', () => {
    const token = jwt.sign({ userId: 1 }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    expect(decoded.userId).toBe(1);
  });
});
