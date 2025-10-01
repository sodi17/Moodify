import { Router } from 'express';
import { body, param } from 'express-validator';
import { spotifyController } from '../controllers/spotify.controller';
import { authenticate, requireSpotifyConnection, requireSpotifyPremium } from '../middleware/auth.middleware';
import { MoodType } from '../models/Mood';

const router = Router();

/**
 * =========================================
 * RUTAS DE AUTENTICACIÓN Y CONEXIÓN
 * =========================================
 */

// GET /api/spotify/auth - Iniciar OAuth
router.get('/auth', authenticate, spotifyController.initiateAuth);

// GET /api/spotify/callback - Callback de OAuth
router.get('/callback', spotifyController.handleCallback);

// POST /api/spotify/disconnect - Desconectar cuenta
router.post('/disconnect', authenticate, requireSpotifyConnection, spotifyController.disconnect);

/**
 * =========================================
 * INFORMACIÓN DEL USUARIO Y PERFIL
 * =========================================
 */

// GET /api/spotify/profile - Obtener perfil de Spotify
router.get('/profile', authenticate, requireSpotifyConnection, spotifyController.getProfile);

// GET /api/spotify/playback-capabilities - Ver qué puede hacer el usuario
router.get('/playback-capabilities', authenticate, spotifyController.getPlaybackCapabilities);

// GET /api/spotify/debug - Debug de conexión
router.get('/debug', authenticate, spotifyController.debugSpotifyConnection);

/**
 * =========================================
 * PLAYLISTS
 * =========================================
 */

// GET /api/spotify/playlists - Obtener playlists del usuario
router.get('/playlists', authenticate, requireSpotifyConnection, spotifyController.getUserPlaylists);

// GET /api/spotify/playlist/:playlistId - Obtener detalles de una playlist específica
router.get('/playlist/:playlistId', authenticate, requireSpotifyConnection, spotifyController.getPlaylistDetails);

// POST /api/spotify/create-playlist/:moodId - Crear playlist basada en un mood
router.post(
  '/create-playlist/:moodId',
  authenticate,
  requireSpotifyConnection,
  [
    param('moodId').isMongoId().withMessage('ID de mood inválido'),
    body('customName').optional().isString().trim()
  ],
  spotifyController.createPlaylistForMood
);

/**
 * =========================================
 * BÚSQUEDA Y RECOMENDACIONES
 * =========================================
 */

// POST /api/spotify/search-tracks - Buscar tracks por mood
router.post(
  '/search-tracks',
  authenticate,
  requireSpotifyConnection,
  [
    body('moodType').isIn(Object.values(MoodType)).withMessage('Tipo de mood inválido'),
    body('intensity').isInt({ min: 1, max: 4 }).withMessage('Intensidad debe ser entre 1 y 4'),
    body('genres').optional().isArray().withMessage('Géneros debe ser un array'),
    body('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Límite debe ser entre 1 y 50')
  ],
  spotifyController.searchTracks
);

/**
 * =========================================
 * REPRODUCCIÓN Y CONTROL (PREMIUM)
 * =========================================
 */

// GET /api/spotify/devices - Obtener dispositivos disponibles
router.get('/devices', authenticate, requireSpotifyConnection, spotifyController.getDevices);

// GET /api/spotify/player-token - Token para Web Playback SDK
router.get('/player-token', authenticate, requireSpotifyConnection, spotifyController.getPlayerToken);

// POST /api/spotify/play - Reproducir música
router.post(
  '/play',
  authenticate,
  requireSpotifyPremium,
  [
    body('contextUri').optional().isString().withMessage('contextUri debe ser string'),
    body('uris').optional().isArray().withMessage('uris debe ser array'),
    body('deviceId').optional().isString().withMessage('deviceId debe ser string')
  ],
  spotifyController.play
);

// POST /api/spotify/pause - Pausar reproducción
router.post(
  '/pause',
  authenticate,
  requireSpotifyPremium,
  [
    body('deviceId').optional().isString().withMessage('deviceId debe ser string')
  ],
  spotifyController.pause
);

// POST /api/spotify/test-playback - Test de reproducción rápido
//router.post('/test-playback', authenticate, requireSpotifyPremium, spotifyController.testPlayback);

/**
 * =========================================
 * INFORMACIÓN DE LA API (AL FINAL)
 * =========================================
 */
router.get('/', (req, res) => {
  res.json({
    message: 'Moodify Spotify Integration API',
    version: '1.0',
    documentation: 'https://github.com/tu-repo/moodify-backend',
    endpoints: {
      authentication: {
        initiateAuth: 'GET /api/spotify/auth',
        callback: 'GET /api/spotify/callback',
        disconnect: 'POST /api/spotify/disconnect'
      },
      profile: {
        getProfile: 'GET /api/spotify/profile',
        getCapabilities: 'GET /api/spotify/playback-capabilities',
        debug: 'GET /api/spotify/debug'
      },
      playlists: {
        getUserPlaylists: 'GET /api/spotify/playlists',
        getPlaylistDetails: 'GET /api/spotify/playlist/:playlistId',
        createFromMood: 'POST /api/spotify/create-playlist/:moodId'
      },
      music: {
        searchTracks: 'POST /api/spotify/search-tracks'
      },
      playback: {
        getDevices: 'GET /api/spotify/devices',
        getPlayerToken: 'GET /api/spotify/player-token',
        play: 'POST /api/spotify/play (Premium)',
        pause: 'POST /api/spotify/pause (Premium)',
        testPlayback: 'POST /api/spotify/test-playback (Premium)'
      }
    },
    requirements: {
      authentication: 'Bearer token requerido en todas las rutas excepto /callback',
      spotifyConnection: 'Cuenta de Spotify conectada requerida para la mayoría de endpoints',
      spotifyPremium: 'Cuenta Premium requerida para endpoints de reproducción'
    }
  });
});

export default router;