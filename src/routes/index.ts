import { Router } from 'express';
import authRoutes from './auth.routes';
import moodRoutes from './mood.routes';

const router = Router();

// Rutas principales
router.use('/auth', authRoutes);
router.use('/moods', moodRoutes);

// Info de la API
router.get('/', (req, res) => {
  res.json({
    message: 'Moodify API v1.0',
    status: 'active',
    endpoints: {
      auth: '/api/auth',
      moods: '/api/moods'
    }
  });
});

export default router;