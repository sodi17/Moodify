import { Router } from 'express';
import authRoutes from './auth.routes';
import moodRoutes from './mood.routes';
import spotifyRoutes from './spotify.routes';

const router = Router();

// Rutas principales
router.use('/auth', authRoutes);
router.use('/moods', moodRoutes);
router.use('/spotify', spotifyRoutes);

// Info de la API
router.get('/', (req, res) => {
  res.json({
    message: 'Moodify API v1.0',
    status: 'active',
    endpoints: {
      auth: '/api/auth',
      moods: '/api/moods',
      spotify: '/api/spotify'
    }
  });
});

export default router;