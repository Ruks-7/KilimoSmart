# Testing Guide

## Quick Start

```bash
cd backend
npm test
```

That's it! All tests run automatically.

## What Gets Tested

- ✅ **Authentication** - Token validation
- ✅ **OTP System** - Generate & validate codes  
- ✅ **Health Checks** - API status
- ✅ **Error Handling** - Correct status codes

**Total: 11 simple tests**

## Commands

```bash
npm test              # Run all tests
npm run test:unit     # Unit tests only
npm run test:watch    # Auto-rerun on changes
```

## Adding Your Own Test

```javascript
test('should work correctly', () => {
  const result = myFunction(input);
  expect(result).toBe(expected);
});
```

## Production Health Check

```bash
curl https://your-app.vercel.app/api/health
```

Should return: `{ "success": true, "message": "API is running" }`

## Troubleshooting

**Tests fail?**
```bash
cd backend
rm -rf node_modules
npm install
npm test
```

**Need more info?** Check the test files in `backend/tests/`
