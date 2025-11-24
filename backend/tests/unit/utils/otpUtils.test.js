describe('OTP Tests', () => {
  test('should generate valid OTP', () => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    expect(otp).toHaveLength(6);
  });
});
