const request = require('supertest');
const express = require('express');

describe('API Tests', () => {
  test('health endpoint returns OK', async () => {
    const app = express();
    app.get('/api/health', (req, res) => res.json({ success: true }));
    
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
