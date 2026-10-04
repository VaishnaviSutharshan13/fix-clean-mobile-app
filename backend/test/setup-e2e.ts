// Runs before each e2e spec is imported. Values already in process.env take
// precedence over backend/.env, so the tests never touch the development database.
process.env.MONGODB_URI =
  process.env.MONGODB_URI_TEST ?? 'mongodb://127.0.0.1:27017/fix-clean-co-test';
process.env.JWT_SECRET ??= 'e2e-test-only-secret-not-used-anywhere-else-0123456789';
