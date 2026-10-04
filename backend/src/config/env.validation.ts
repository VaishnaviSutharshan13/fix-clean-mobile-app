// Validates required environment variables at startup so the app fails fast
// with a clear message instead of a vague connection or signing error.
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

  const jwtSecret = config.JWT_SECRET;

  if (typeof jwtSecret !== 'string' || jwtSecret.length < 32) {
    throw new Error(
      'JWT_SECRET must be set to a random string of at least 32 characters (e.g. `openssl rand -hex 64`).',
    );
  }

  const jwtExpiresIn = config.JWT_EXPIRES_IN;

  if (
    jwtExpiresIn !== undefined &&
    jwtExpiresIn !== '' &&
    !/^\d+\s*(ms|s|m|h|d|w|y)?$/.test(String(jwtExpiresIn))
  ) {
    throw new Error(
      'JWT_EXPIRES_IN must be a number of seconds or a duration such as "15m", "1h" or "1d".',
    );
  }

  return config;
}
