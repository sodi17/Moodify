import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { moodService } from '../services/mood.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { ApiResponse } from '../types/api.types';
import { MoodType, MoodIntensity } from '../models/Mood';
import { TranslationService, APP_MESSAGES } from '../utils/translations';

export class MoodController {

  /**
   * POST /api/moods
   * Crear nuevo mood
   */
  async createMood(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      // Verificar errores de validación
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Datos inválidos',
          errors: errors.array()
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      const {
        moodType,
        intensity,
        description,
        tags,
        weather,
        location,
        activity,
        socialContext,
        preferredGenres,
        energyLevel,
        valence
      } = req.body;

      // Crear mood
      const mood = await moodService.createMood(req.user._id.toString(), {
        moodType,
        intensity,
        description,
        tags,
        weather,
        location,
        activity,
        socialContext,
        preferredGenres,
        energyLevel,
        valence
      });

      // Obtener recomendaciones musicales
      const musicProfile = moodService.getMusicRecommendations(moodType, intensity, preferredGenres);

      res.status(201).json({
        success: true,
        message: TranslationService.formatMessage(APP_MESSAGES.POINTS_EARNED, { points: mood.pointsAwarded }),
        data: {
          mood: {
            ...mood.toObject(),
            moodDisplayName: TranslationService.getMoodDisplayName(mood.moodType)
          },
          musicRecommendations: musicProfile,
          spotifyParams: moodService.getSpotifySearchParams(moodType, intensity, preferredGenres)
        }
      });

    } catch (error: any) {
      console.error('Error creando mood:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * GET /api/moods
   * Obtener moods del usuario con paginación y filtros
   */
  async getUserMoods(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50); // Max 50
      const moodType = req.query.moodType as MoodType;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const result = await moodService.getUserMoods(
        req.user._id.toString(),
        page,
        limit,
        moodType,
        startDate,
        endDate
      );

      // Agregar display names a los moods
      const moodsWithDisplayNames = result.moods.map(mood => ({
        ...mood,
        moodDisplayName: TranslationService.getMoodDisplayName(mood.moodType),
        intensityDisplay: ['Ligero', 'Moderado', 'Intenso', 'Muy Intenso'][mood.intensity - 1]
      }));

      res.json({
        success: true,
        data: {
          moods: moodsWithDisplayNames,
          pagination: {
            page: result.page,
            limit,
            total: result.total,
            pages: result.pages
          }
        }
      });

    } catch (error: any) {
      console.error('Error obteniendo moods:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * GET /api/moods/:id
   * Obtener mood específico por ID
   */
  async getMoodById(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      const { id } = req.params;
      const mood = await moodService.getMoodById(req.user._id.toString(), id);

      if (!mood) {
        res.status(404).json({
          success: false,
          message: 'Mood no encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          mood: {
            ...mood.toObject(),
            moodDisplayName: TranslationService.getMoodDisplayName(mood.moodType),
            intensityDisplay: ['Ligero', 'Moderado', 'Intenso', 'Muy Intenso'][mood.intensity - 1]
          }
        }
      });

    } catch (error: any) {
      console.error('Error obteniendo mood:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * PUT /api/moods/:id
   * Actualizar mood
   */
  async updateMood(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Datos inválidos',
          errors: errors.array()
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      const { id } = req.params;
      const updates = req.body;

      const updatedMood = await moodService.updateMood(req.user._id.toString(), id, updates);

      if (!updatedMood) {
        res.status(404).json({
          success: false,
          message: 'Mood no encontrado'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Mood actualizado exitosamente',
        data: {
          mood: {
            ...updatedMood.toObject(),
            moodDisplayName: TranslationService.getMoodDisplayName(updatedMood.moodType)
          }
        }
      });

    } catch (error: any) {
      console.error('Error actualizando mood:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * DELETE /api/moods/:id
   * Eliminar mood
   */
  async deleteMood(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      const { id } = req.params;
      const deleted = await moodService.deleteMood(req.user._id.toString(), id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Mood no encontrado'
        });
        return;
      }

      res.json({
        success: true,
        message: APP_MESSAGES.MOOD_DELETED
      });

    } catch (error: any) {
      console.error('Error eliminando mood:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * POST /api/moods/:id/rate
   * Calificar playlist del mood
   */
  async rateMoodPlaylist(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Datos inválidos',
          errors: errors.array()
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      const { id } = req.params;
      const { rating, feedback } = req.body;

      const updatedMood = await moodService.rateMoodPlaylist(
        req.user._id.toString(),
        id,
        rating,
        feedback
      );

      if (!updatedMood) {
        res.status(404).json({
          success: false,
          message: 'Mood no encontrado'
        });
        return;
      }

      res.json({
        success: true,
        message: rating >= 4 
          ? '¡Gracias por tu calificación! Has ganado puntos extra 🎵' 
          : 'Gracias por tu feedback, nos ayuda a mejorar',
        data: {
          mood: updatedMood,
          rating: updatedMood.playlistRating
        }
      });

    } catch (error: any) {
      console.error('Error calificando playlist:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Error interno del servidor'
      });
    }
  }

  /**
   * POST /api/moods/:id/listen
   * Marcar playlist como escuchada
   */
  async markPlaylistAsListened(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      const { id } = req.params;
      const updatedMood = await moodService.markPlaylistAsListened(req.user._id.toString(), id);

      if (!updatedMood) {
        res.status(404).json({
          success: false,
          message: 'Mood no encontrado'
        });
        return;
      }

      res.json({
        success: true,
        message: '¡Has ganado puntos por escuchar la playlist! 🎵',
        data: {
          mood: updatedMood
        }
      });

    } catch (error: any) {
      console.error('Error marcando playlist como escuchada:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * GET /api/moods/analytics
   * Obtener analytics de moods del usuario
   */
  async getMoodAnalytics(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      const days = parseInt(req.query.days as string) || 30;
      const analytics = await moodService.getMoodAnalytics(req.user._id.toString(), days);

      res.json({
        success: true,
        data: {
          analytics,
          period: `${days} días`
        }
      });

    } catch (error: any) {
      console.error('Error obteniendo analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * GET /api/moods/top
   * Obtener moods más comunes del usuario
   */
  async getTopMoods(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      const limit = Math.min(parseInt(req.query.limit as string) || 5, 10);
      const topMoods = await moodService.getTopMoods(req.user._id.toString(), limit);

      res.json({
        success: true,
        data: {
          topMoods
        }
      });

    } catch (error: any) {
      console.error('Error obteniendo top moods:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * GET /api/moods/search
   * Buscar moods por texto
   */
  async searchMoods(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      const searchTerm = req.query.q as string;
      if (!searchTerm) {
        res.status(400).json({
          success: false,
          message: 'Término de búsqueda requerido'
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

      const result = await moodService.searchMoods(
        req.user._id.toString(),
        searchTerm,
        page,
        limit
      );

      const moodsWithDisplayNames = result.moods.map(mood => ({
        ...mood,
        moodDisplayName: TranslationService.getMoodDisplayName(mood.moodType)
      }));

      res.json({
        success: true,
        data: {
          moods: moodsWithDisplayNames,
          searchTerm,
          pagination: {
            page: result.page,
            limit,
            total: result.total,
            pages: result.pages
          }
        }
      });

    } catch (error: any) {
      console.error('Error buscando moods:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * GET /api/moods/stats/:period
   * Obtener estadísticas por período
   */
  async getMoodStatsByPeriod(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      const period = req.params.period as 'week' | 'month' | 'year';
      if (!['week', 'month', 'year'].includes(period)) {
        res.status(400).json({
          success: false,
          message: 'Período inválido. Usa: week, month, year'
        });
        return;
      }

      const stats = await moodService.getMoodStatsByPeriod(req.user._id.toString(), period);

      res.json({
        success: true,
        data: {
          stats,
          period
        }
      });

    } catch (error: any) {
      console.error('Error obteniendo stats por período:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * GET /api/moods/recommendations/:moodType/:intensity
   * Obtener recomendaciones musicales para un mood específico
   */
  async getMusicRecommendations(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const { moodType, intensity } = req.params;
      const userGenres = req.query.genres ? (req.query.genres as string).split(',') : [];

      if (!Object.values(MoodType).includes(moodType as MoodType)) {
        res.status(400).json({
          success: false,
          message: 'Tipo de mood inválido'
        });
        return;
      }

      const intensityNum = parseInt(intensity);
      if (intensityNum < 1 || intensityNum > 4) {
        res.status(400).json({
          success: false,
          message: 'Intensidad debe ser entre 1 y 4'
        });
        return;
      }

      const recommendations = moodService.getMusicRecommendations(
        moodType as MoodType,
        intensityNum as MoodIntensity,
        userGenres
      );

      const spotifyParams = moodService.getSpotifySearchParams(
        moodType as MoodType,
        intensityNum as MoodIntensity,
        userGenres
      );

      res.json({
        success: true,
        data: {
          moodType,
          moodDisplayName: TranslationService.getMoodDisplayName(moodType as MoodType),
          intensity: intensityNum,
          recommendations,
          spotifyParams
        }
      });

    } catch (error: any) {
      console.error('Error obteniendo recomendaciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

// Exportar instancia única
export const moodController = new MoodController();