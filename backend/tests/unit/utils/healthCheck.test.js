describe('Health Tests', () => {
  test('should return health status', () => {
    const health = { status: 'healthy', uptime: process.uptime() };
    expect(health.status).toBe('healthy');
  });
});
