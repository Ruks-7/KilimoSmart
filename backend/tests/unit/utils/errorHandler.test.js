describe('Error Tests', () => {
  test('should set correct status code', () => {
    const error = new Error('Test error');
    error.statusCode = 400;
    expect(error.statusCode).toBe(400);
  });
});
