// Validates required environment variables at startup so the app fails fast
// with a clear message instead of a vague connection error.
export function validateEnv(config: Record<string, unknown>) {
  const mongodbUri = config.MONGODB_URI;

  if (typeof mongodbUri !== 'string' || mongodbUri.trim() === '') {
    throw new Error(
      'MONGODB_URI is not set. Copy backend/.env.example to backend/.env and provide a MongoDB connection string.',
    );
  }

  if (!/^mongodb(\+srv)?:\/\//.test(mongodbUri)) {
    throw new Error(
      'MONGODB_URI must start with "mongodb://" or "mongodb+srv://".',
    );
  }

  return config;
}
