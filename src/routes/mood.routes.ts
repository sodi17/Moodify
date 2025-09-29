import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { moodController } from '../controllers/mood.controller';
import { authenticate } from '../middleware/auth.middleware';
import { MoodType, MoodIntensity } from '../models/Mood';

const router = Router();

/**
 * Validaciones
 */
const createMoodValidation = [
  body('moodType')
    .isIn(Object.values(MoodType))
    .withMessage('Tipo de mood inválido'),
  body('intensity')
    .isInt({ min: 1, max: 4 })
    .withMessage('Intensidad debe ser entre 1 y 4'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Descripción no puede exceder 500 caracteres')
    .trim(),
  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Máximo 10 tags permitidos'),
  body('tags.*')
    .optional()
    .isLength({ min: 1, max: 20 })
    .withMessage('Cada tag debe tener entre 1 y 20 caracteres')
    .trim(),
  body('weather')
    .optional()
    .isIn(['sunny', 'cloudy', 'rainy', 'stormy', 'snowy', 'foggy', 'windy'])
    .withMessage('Clima inválido'),
  body('location')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Ubicación no puede exceder 100 caracteres')
    .trim(),
  body('activity')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Actividad no puede exceder 100 caracteres')
    .trim(),
  body('socialContext')
    .optional()
    .isIn(['alone', 'with_friends', 'with_family', 'at_work', 'in_public'])
    .withMessage('Contexto social inválido'),
  body('preferredGenres')
    .optional()
    .isArray({ max: 5 })
    .withMessage('Máximo 5 géneros permitidos'),
  body('energyLevel')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Nivel de energía debe ser entre 1 y 10'),
  body('valence')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Valencia debe ser entre 1 y 10')
];

const updateMoodValidation = [
  body('moodType')
    .optional()
    .isIn(Object.values(MoodType))
    .withMessage('Tipo de mood inválido'),
  body('intensity')
    .optional()
    .isInt({ min: 1, max: 4 })
    .withMessage('Intensidad debe ser entre 1 y 4'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Descripción no puede exceder 500 caracteres')
    .trim(),
  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Máximo 10 tags permitidos'),
  body('energyLevel')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Nivel de energía debe ser entre 1 y 10'),
  body('valence')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Valencia debe ser entre 1 y 10')
];

const ratingValidation = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating debe ser entre 1 y 5'),
  body('feedback')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Feedback no puede exceder 1000 caracteres')
    .trim()
];

const mongoIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('ID inválido')
];

const periodValidation = [
  param('period')
    .isIn(['week', 'month', 'year'])
    .withMessage('Período debe ser: week, month o year')
];

const recommendationValidation = [
  param('moodType')
    .isIn(Object.values(MoodType))
    .withMessage('Tipo de mood inválido'),
  param('intensity')
    .isInt({ min: 1, max: 4 })
    .withMessage('Intensidad debe ser entre 1 y 4')
];

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página debe ser mayor a 0'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Límite debe ser entre 1 y 50')
];

/**
 * Todas las rutas requieren autenticación
 */
router.use(authenticate);

/**
 * Analytics y estadísticas (estas deben ir ANTES de las rutas con :id)
 */

// GET /api/moods/analytics - Analytics de moods
router.get('/analytics', moodController.getMoodAnalytics);

// GET /api/moods/top - Top moods del usuario
router.get('/top', moodController.getTopMoods);

// GET /api/moods/search - Buscar moods
router.get('/search', paginationValidation, moodController.searchMoods);

// GET /api/moods/stats/:period - Estadísticas por período
router.get('/stats/:period', periodValidation, moodController.getMoodStatsByPeriod);

// GET /api/moods/recommendations/:moodType/:intensity - Recomendaciones musicales
router.get('/recommendations/:moodType/:intensity', recommendationValidation, moodController.getMusicRecommendations);

/**
 * CRUD básico (estas van después)
 */

// POST /api/moods - Crear nuevo mood
router.post('/', createMoodValidation, moodController.createMood);

// GET /api/moods - Obtener moods del usuario
router.get('/', paginationValidation, moodController.getUserMoods);

// GET /api/moods/:id - Obtener mood específico
router.get('/:id', mongoIdValidation, moodController.getMoodById);

// PUT /api/moods/:id - Actualizar mood
router.put('/:id', mongoIdValidation, updateMoodValidation, moodController.updateMood);

// DELETE /api/moods/:id - Eliminar mood
router.delete('/:id', mongoIdValidation, moodController.deleteMood);

/**
 * Funcionalidades de playlist
 */

// POST /api/moods/:id/rate - Calificar playlist del mood
router.post('/:id/rate', mongoIdValidation, ratingValidation, moodController.rateMoodPlaylist);

// POST /api/moods/:id/listen - Marcar playlist como escuchada
router.post('/:id/listen', mongoIdValidation, moodController.markPlaylistAsListened);

/**
 * Ruta de información (sin autenticación)
 */
const infoRouter = Router();
infoRouter.get('/', (req, res) => {
  res.json({
    message: 'Moodify Mood API',
    requiresAuth: true,
    endpoints: {
      create: 'POST /api/moods',
      getAll: 'GET /api/moods',
      getById: 'GET /api/moods/:id',
      update: 'PUT /api/moods/:id',
      delete: 'DELETE /api/moods/:id',
      rate: 'POST /api/moods/:id/rate',
      listen: 'POST /api/moods/:id/listen',
      analytics: 'GET /api/moods/analytics',
      topMoods: 'GET /api/moods/top',
      search: 'GET /api/moods/search?q=term',
      statsByPeriod: 'GET /api/moods/stats/:period',
      recommendations: 'GET /api/moods/recommendations/:moodType/:intensity'
    },
    availableMoods: Object.values(MoodType),
    intensityLevels: [1, 2, 3, 4],
    weatherOptions: ['sunny', 'cloudy', 'rainy', 'stormy', 'snowy', 'foggy', 'windy'],
    socialContexts: ['alone', 'with_friends', 'with_family', 'at_work', 'in_public']
  });
});

export default router;