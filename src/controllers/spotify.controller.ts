import { Response } from 'express';
import { spotifyService } from '../services/spotify.service';
import { moodService } from '../services/mood.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { ApiResponse } from '../types/api.types';
import { MoodType, MoodIntensity } from '../models/Mood';
import Mood from '../models/Mood';

export class SpotifyController {

  /**
   * GET /api/spotify/auth
   * Iniciar proceso de autorización OAuth con Spotify
   */
  async initiateAuth(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      // Generar state para seguridad (incluir userId)
      const state = `${req.user._id.toString()}_${Date.now()}`;
      const authUrl = spotifyService.getAuthorizationUrl(state);

      res.json({
        success: true,
        data: {
          authUrl,
          message: 'Redirige al usuario a esta URL para autorizar Spotify'
        }
      });

    } catch (error: any) {
      console.error('Error iniciando auth de Spotify:', error);
      res.status(500).json({
        success: false,
        message: 'Error iniciando autorización con Spotify'
      });
    }
  }

  /**
   * GET /api/spotify/callback
   * Callback de OAuth - Spotify redirige aquí después de autorización
   */
  async handleCallback(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { code, state, error } = req.query;

      // Si el usuario rechazó la autorización
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Autorización rechazada por el usuario'
        });
        return;
      }

      if (!code || !state) {
        res.status(400).json({
          success: false,
          message: 'Código o state faltante'
        });
        return;
      }

      // Extraer userId del state
      const userId = (state as string).split('_')[0];

      // Conectar cuenta de Spotify
      const user = await spotifyService.connectSpotifyAccount(userId, code as string);

      res.json({
        success: true,
        message: '¡Spotify conectado exitosamente! 🎵',
        data: {
          user: {
            spotifyId: user.spotifyId,
            isPremium: user.isPremium,
            avatar: user.avatar
          }
        }
      });

    } catch (error: any) {
      console.error('Error en callback de Spotify:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error conectando con Spotify'
      });
    }
  }

  /**
   * GET /api/spotify/profile
   * Obtener perfil de Spotify del usuario
   */
  async getProfile(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      if (!req.user.spotifyId) {
        res.status(400).json({
          success: false,
          message: 'No tienes cuenta de Spotify conectada'
        });
        return;
      }

      const accessToken = await spotifyService.ensureValidToken(req.user);
      const profile = await spotifyService.getUserProfile(accessToken);

      res.json({
        success: true,
        data: {
          profile
        }
      });

    } catch (error: any) {
      console.error('Error obteniendo perfil de Spotify:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo perfil de Spotify'
      });
    }
  }

  /**
   * POST /api/spotify/disconnect
   * Desconectar cuenta de Spotify
   */
  async disconnect(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      await spotifyService.disconnectSpotifyAccount(req.user._id.toString());

      res.json({
        success: true,
        message: 'Cuenta de Spotify desconectada exitosamente'
      });

    } catch (error: any) {
      console.error('Error desconectando Spotify:', error);
      res.status(500).json({
        success: false,
        message: 'Error desconectando Spotify'
      });
    }
  }

  /**
   * POST /api/spotify/create-playlist/:moodId
   * Crear playlist en Spotify basada en un mood
   */
  async createPlaylistForMood(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      if (!req.user.spotifyId) {
        res.status(400).json({
          success: false,
          message: 'Necesitas conectar tu cuenta de Spotify primero',
          //action: 'Visita /api/spotify/auth para conectar'
        });
        return;
      }

      const { moodId } = req.params;
      const { customName } = req.body;

      // Obtener mood
      const mood = await moodService.getMoodById(req.user._id.toString(), moodId);
      if (!mood) {
        res.status(404).json({
          success: false,
          message: 'Mood no encontrado'
        });
        return;
      }

      // IMPORTANTE: Recargar usuario con tokens de Spotify
      const User = require('../models/User').default;
      const userWithTokens = await User.findById(req.user._id)
        .select('+spotifyAccessToken +spotifyRefreshToken');

      if (!userWithTokens) {
        res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
        return;
      }

      // Crear playlist en Spotify
      const result = await spotifyService.createMoodPlaylist(
        userWithTokens,
        mood.moodType,
        mood.intensity as MoodIntensity,
        mood.preferredGenres,
        customName
      );

      // Actualizar mood con info de playlist
      mood.playlistId = result.playlist.id;
      mood.playlistUrl = result.playlist.external_urls.spotify;
      mood.songsGenerated = result.tracks.length;
      await mood.save();

      // Otorgar puntos por crear playlist
      await req.user.addPoints(15);

      res.status(201).json({
        success: true,
        message: '¡Playlist creada exitosamente! 🎵 +15 puntos',
        data: {
          playlist: {
            id: result.playlist.id,
            name: result.playlist.name,
            url: result.playlist.external_urls.spotify,
            tracksCount: result.tracks.length,
            image: result.playlist.images && result.playlist.images[0] ? result.playlist.images[0].url : null
          },
          tracks: result.tracks.map(track => ({
            id: track.id,
            name: track.name,
            artist: track.artists[0].name,
            album: track.album.name,
            image: track.album.images[0]?.url,
            previewUrl: track.preview_url,
            spotifyUrl: track.external_urls.spotify
          }))
        }
      });

    } catch (error: any) {
      console.error('Error creando playlist:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error creando playlist'
      });
    }
  }

  /**
   * POST /api/spotify/search-tracks
   * Buscar tracks basados en mood (sin crear playlist)
   */
  async searchTracks(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      if (!req.user.spotifyId) {
        res.status(400).json({
          success: false,
          message: 'Necesitas conectar tu cuenta de Spotify primero'
        });
        return;
      }

      const { moodType, intensity, genres, limit } = req.body;

      if (!moodType || !intensity) {
        res.status(400).json({
          success: false,
          message: 'moodType e intensity son requeridos'
        });
        return;
      }

      // Recargar usuario con tokens
      const User = require('../models/User').default;
      const userWithTokens = await User.findById(req.user._id)
        .select('+spotifyAccessToken +spotifyRefreshToken');

      const accessToken = await spotifyService.ensureValidToken(userWithTokens);
      const tracks = await spotifyService.getRecommendations(
        accessToken,
        moodType as MoodType,
        intensity as MoodIntensity,
        genres,
        limit || 20
      );

      res.json({
        success: true,
        data: {
          tracks: tracks.map(track => ({
            id: track.id,
            name: track.name,
            artist: track.artists[0].name,
            album: track.album.name,
            image: track.album.images[0]?.url,
            previewUrl: track.preview_url,
            spotifyUrl: track.external_urls.spotify,
            duration: track.duration_ms
          })),
          total: tracks.length
        }
      });

    } catch (error: any) {
      console.error('Error buscando tracks:', error);
      res.status(500).json({
        success: false,
        message: 'Error buscando música en Spotify'
      });
    }
  }

  /**
   * GET /api/spotify/playlist/:playlistId
   * Obtener detalles de una playlist con sus tracks
   */
  async getPlaylistDetails(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      if (!req.user.spotifyId) {
        res.status(400).json({
          success: false,
          message: 'Necesitas conectar tu cuenta de Spotify primero'
        });
        return;
      }

      const { playlistId } = req.params;

      // Recargar usuario con tokens
      const User = require('../models/User').default;
      const userWithTokens = await User.findById(req.user._id)
        .select('+spotifyAccessToken +spotifyRefreshToken');

      const accessToken = await spotifyService.ensureValidToken(userWithTokens);
      const playlist = await spotifyService.getPlaylist(accessToken, playlistId);

      res.json({
        success: true,
        data: {
          playlist: {
            id: playlist.id,
            name: playlist.name,
            description: playlist.description,
            url: playlist.external_urls.spotify,
            image: playlist.images && playlist.images[0] ? playlist.images[0].url : null,
            tracksCount: playlist.tracks.total,
            owner: playlist.owner.display_name,
            public: playlist.public
          },
          tracks: playlist.tracks.items.map(item => ({
            id: item.track.id,
            name: item.track.name,
            artist: item.track.artists[0].name,
            artists: item.track.artists.map(a => a.name).join(', '),
            album: item.track.album.name,
            image: item.track.album.images[0]?.url,
            duration: item.track.duration_ms,
            previewUrl: item.track.preview_url,
            spotifyUrl: item.track.external_urls.spotify,
            explicit: item.track.explicit,
            popularity: item.track.popularity
          }))
        }
      });

    } catch (error: any) {
      console.error('Error obteniendo playlist:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error obteniendo playlist de Spotify'
      });
    }
  }

  /**
   * GET /api/spotify/playlists
   * Obtener playlists del usuario
   */
  async getUserPlaylists(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      if (!req.user.spotifyId) {
        res.status(400).json({
          success: false,
          message: 'Necesitas conectar tu cuenta de Spotify primero'
        });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 20;

      // Recargar usuario con tokens
      const User = require('../models/User').default;
      const userWithTokens = await User.findById(req.user._id)
        .select('+spotifyAccessToken +spotifyRefreshToken');

      if (!userWithTokens) {
        res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
        return;
      }

      const accessToken = await spotifyService.ensureValidToken(userWithTokens);
      const playlists = await spotifyService.getUserPlaylists(accessToken, limit);

      res.json({
        success: true,
        data: {
          playlists: playlists.map(playlist => ({
            id: playlist.id,
            name: playlist.name,
            description: playlist.description,
            image: playlist.images && playlist.images[0] ? playlist.images[0].url : null,
            tracksCount: playlist.tracks.total,
            url: playlist.external_urls.spotify,
            public: playlist.public
          })),
          total: playlists.length
        }
      });

    } catch (error: any) {
      console.error('Error obteniendo playlists:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error obteniendo playlists'
      });
    }
  }

  /**
   * POST /api/spotify/play
   * Reproducir música (solo Premium)
   */
  async play(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
      return;
    }

    if (!req.user.isPremium) {
      res.status(403).json({
        success: false,
        message: 'Necesitas Spotify Premium para reproducir música'
      });
      return;
    }

    const { contextUri, uris, deviceId } = req.body;

    if (!contextUri && !uris) {
      res.status(400).json({
        success: false,
        message: 'Debes proporcionar contextUri o uris'
      });
      return;
    }

    // ⬇️ ESTO ES LO CRÍTICO - debe recargar el usuario
    const User = require('../models/User').default;
    const userWithTokens = await User.findById(req.user._id)
      .select('+spotifyAccessToken +spotifyRefreshToken');

    if (!userWithTokens) {
      res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
      return;
    }

    const accessToken = await spotifyService.ensureValidToken(userWithTokens);
    await spotifyService.play(accessToken, contextUri, uris, deviceId);

    res.json({
      success: true,
      message: 'Reproducción iniciada'
    });

  } catch (error: any) {
    console.error('Error reproduciendo:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error reproduciendo música'
    });
  }
 }

  /**
   * POST /api/spotify/pause
   * Pausar reproducción (solo Premium)
   */
 async pause(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
      return;
    }

    if (!req.user.isPremium) {
      res.status(403).json({
        success: false,
        message: 'Necesitas Spotify Premium'
      });
      return;
    }

    const { deviceId } = req.body;

    // Recargar usuario con tokens
    const User = require('../models/User').default;
    const userWithTokens = await User.findById(req.user._id)
      .select('+spotifyAccessToken +spotifyRefreshToken');

    if (!userWithTokens) {
      res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
      return;
    }

    const accessToken = await spotifyService.ensureValidToken(userWithTokens);
    await spotifyService.pause(accessToken, deviceId);

    res.json({
      success: true,
      message: 'Reproducción pausada'
    });

  } catch (error: any) {
    console.error('Error pausando:', error);
    res.status(500).json({
      success: false,
      message: 'Error pausando reproducción'
    });
  }
}

  /**
   * GET /api/spotify/debug
   * Debug info sobre la conexión de Spotify
   */
  async debugSpotifyConnection(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      const hasSpotifyId = !!req.user.spotifyId;
      const hasAccessToken = !!req.user.spotifyAccessToken;
      const hasRefreshToken = !!req.user.spotifyRefreshToken;
      const tokenExpiry = req.user.spotifyTokenExpiry;
      const isTokenExpired = tokenExpiry ? new Date() >= tokenExpiry : true;

      res.json({
        success: true,
        data: {
          spotifyConnected: hasSpotifyId,
          spotifyId: req.user.spotifyId || 'No conectado',
          isPremium: req.user.isPremium,
          tokenStatus: {
            hasAccessToken,
            hasRefreshToken,
            tokenExpiry: tokenExpiry ? tokenExpiry.toISOString() : 'No disponible',
            isTokenExpired,
            needsRefresh: isTokenExpired
          },
          troubleshooting: isTokenExpired 
            ? 'Token expirado. Intenta desconectar y reconectar Spotify.'
            : 'Todo parece correcto. Si hay errores, revisa los logs del servidor.'
        }
      });

    } catch (error: any) {
      console.error('Error en debug:', error);
      res.status(500).json({
        success: false,
        message: 'Error en diagnóstico'
      });
    }
  }

  /**
   * GET /api/spotify/playback-capabilities
   * Verificar capacidades de reproducción del usuario
   */
  async getPlaybackCapabilities(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      const hasSpotify = !!req.user.spotifyId;
      const isPremium = req.user.isPremium;

      res.json({
        success: true,
        data: {
          hasSpotifyConnected: hasSpotify,
          isPremium,
          capabilities: {
            canViewTrackInfo: true,
            canPlayPreview: true,  // 30 segundos para todos
            canOpenInSpotify: hasSpotify,
            canPlayFullTrack: hasSpotify && isPremium,
            canControlPlayback: hasSpotify && isPremium,
            canCreatePlaylists: hasSpotify
          },
          instructions: {
            free: 'Puedes reproducir previews de 30 segundos o abrir en la app de Spotify',
            premium: 'Puedes reproducir canciones completas directamente desde Moodify'
          }
        }
      });

    } catch (error: any) {
      console.error('Error obteniendo capacidades:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo capacidades de reproducción'
      });
    }
  }

  /**
   * GET /api/spotify/devices
   * Obtener dispositivos disponibles
   */
  async getDevices(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      if (!req.user.spotifyId) {
        res.status(400).json({
          success: false,
          message: 'Necesitas conectar tu cuenta de Spotify primero'
        });
        return;
      }

      // Recargar usuario con tokens
      const User = require('../models/User').default;
      const userWithTokens = await User.findById(req.user._id)
        .select('+spotifyAccessToken +spotifyRefreshToken');

      if (!userWithTokens) {
        res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
        return;
      }

      const accessToken = await spotifyService.ensureValidToken(userWithTokens);
      const devices = await spotifyService.getDevices(accessToken);

      res.json({
        success: true,
        data: {
          devices,
          total: devices.length,
          help: devices.length === 0 
            ? 'No hay dispositivos activos. Abre Spotify en tu PC, móvil o en https://open.spotify.com'
            : `${devices.length} dispositivo(s) disponible(s)`
        }
      });

    } catch (error: any) {
      console.error('Error obteniendo dispositivos:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo dispositivos',
        //details: error.message
      });
    }
  }
  /**
 * GET /api/spotify/player-token
 * Obtener token para Spotify Web Playback SDK
 */
async getPlayerToken(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
      return;
    }

    if (!req.user.spotifyId) {
      res.status(400).json({
        success: false,
        message: 'Necesitas conectar tu cuenta de Spotify'
      });
      return;
    }

    if (!req.user.isPremium) {
      res.status(403).json({
        success: false,
        message: 'Spotify Web Player requiere cuenta Premium'
      });
      return;
    }

    // Recargar usuario con tokens
    const User = require('../models/User').default;
    const userWithTokens = await User.findById(req.user._id)
      .select('+spotifyAccessToken +spotifyRefreshToken');

    if (!userWithTokens) {
      res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
      return;
    }

    const accessToken = await spotifyService.ensureValidToken(userWithTokens);

    res.json({
      success: true,
      data: {
        accessToken,
        expiresIn: 3600
      }
    });

  } catch (error: any) {
    console.error('Error obteniendo token del player:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo token'
    });
  }
 }
}

// Exportar instancia única
export const spotifyController = new SpotifyController();