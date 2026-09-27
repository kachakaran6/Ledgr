export const config = {
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET || 'logpast-super-secret-jwt-key-change-in-production-2026',
  corsOrigin: process.env.CORS_ORIGIN || true,
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 1000),
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '',
  useSupabase: Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)),
  databaseUrl: process.env.DATABASE_URL || '',
  usePostgres: Boolean(process.env.DATABASE_URL)
};
