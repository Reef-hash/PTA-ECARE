import rateLimit from 'express-rate-limit';

export const authStrictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_AUTH_STRICT || '5', 10),
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authModerateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_AUTH_MODERATE || '10', 10),
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_GENERAL || '100', 10),
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
