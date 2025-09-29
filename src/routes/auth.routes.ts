import { Router } from 'express';
import { body } from 'express-validator';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * Validaciones
 */
const registerValidation = [
  body('name')
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres')
    .trim(),
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe contener al menos: 1 minúscula, 1 mayúscula y 1 número')
];

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Contraseña es requerida')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Contraseña actual es requerida'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('La nueva contraseña debe tener al menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La nueva contraseña debe contener al menos: 1 minúscula, 1 mayúscula y 1 número')
];

const profileUpdateValidation = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres')
    .trim(),
  body('avatar')
    .optional()
    .isURL()
    .withMessage('Avatar debe ser una URL válida')
];

/**
 * Rutas públicas (sin autenticación)
 */

// POST /api/auth/register - Registro de usuario
router.post('/register', registerValidation, authController.register);

// POST /api/auth/login - Login de usuario  
router.post('/login', loginValidation, authController.login);

// GET /api/auth/verify-email - Verificación de correo
router.get('/verify-email', authController.verifyEmail);

/**
 * Rutas protegidas (requieren autenticación)
 */

// GET /api/auth/me - Obtener perfil actual
router.get('/me', authenticate, authController.getProfile);

// PUT /api/auth/profile - Actualizar perfil
router.put('/profile', authenticate, profileUpdateValidation, authController.updateProfile);

// POST /api/auth/change-password - Cambiar contraseña
router.post('/change-password', authenticate, changePasswordValidation, authController.changePassword);

// GET /api/auth/stats - Obtener estadísticas del usuario
router.get('/stats', authenticate, authController.getUserStats);

// POST /api/auth/logout - Logout
router.post('/logout', authenticate, authController.logout);

/**
 * Ruta de información
 */
router.get('/', (req, res) => {
  res.json({
    message: 'Moodify Auth API',
    endpoints: {
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      verifyEmail: 'GET /api/auth/verify-email',
      profile: 'GET /api/auth/me',
      updateProfile: 'PUT /api/auth/profile',
      changePassword: 'POST /api/auth/change-password',
      stats: 'GET /api/auth/stats',
      logout: 'POST /api/auth/logout'
    },
    documentation: 'Usa Bearer token en Authorization header para rutas protegidas'
  });
});

export default router;