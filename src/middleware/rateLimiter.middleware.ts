import rateLimit from 'express-rate-limit';

/**
 * Rate limiter general para todas las rutas de API
 */
const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 100 requests por ventana
  message: {
    success: false,
    message: 'Demasiadas peticiones desde esta IP, por favor intenta de nuevo más tarde.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false,
  skipFailedRequests: false
});

/**
 * Rate limiter más estricto para login/registro
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos por ventana
  message: {
    success: false,
    message: 'Demasiados intentos de autenticación, por favor intenta de nuevo en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiter para creación de moods
 */
export const moodCreationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // 10 moods por minuto
  message: {
    success: false,
    message: 'Estás creando moods muy rápido, espera un momento.'
  }
});

export default rateLimiter;