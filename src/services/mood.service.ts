import Mood, { IMood, MoodType, MoodIntensity } from '../models/Mood';
import User from '../models/User';
import { recommendationService } from './recommendation.service';
import { TranslationService } from '../utils/translations';
import mongoose from 'mongoose';
import { PipelineStage } from "mongoose";

export interface CreateMoodData {
  moodType: MoodType;
  intensity: MoodIntensity;
  description?: string;
  tags?: string[];
  weather?: string;
  location?: string;
  activity?: string;
  socialContext?: 'alone' | 'with_friends' | 'with_family' | 'at_work' | 'in_public';
  preferredGenres?: string[];
  energyLevel?: number;
  valence?: number;
}

export interface MoodAnalytics {
  totalMoods: number;
  mostCommonMood: {
    mood: MoodType;
    count: number;
    percentage: number;
    displayName: string;
  };
  moodDistribution: Array<{
    mood: MoodType;
    count: number;
    percentage: number;
    displayName: string;
  }>;
  averageIntensity: number;
  averageEnergy: number;
  averageValence: number;
  weeklyTrend: Array<{
    date: string;
    mood: MoodType;
    intensity: number;
    count: number;
    displayName: string;
  }>;
  monthlyStats: {
    totalPlaylistsCreated: number;
    totalPlaylistsRated: number;
    averageRating: number;
    pointsEarned: number;
  };
}

export interface WeeklyTrendItem {
  date: string;
  mood: MoodType;
  intensity: number;
  count: number;
  displayName: string;
}

export class MoodService {

  /**
   * Crear nuevo mood
   */
  async createMood(userId: string, data: CreateMoodData): Promise<IMood> {
    // Calcular puntos basados en intensidad y contexto
    let points = 10; // Base points
    if (data.intensity >= MoodIntensity.HIGH) points += 5;
    if (data.description && data.description.length > 50) points += 5;
    if (data.tags && data.tags.length > 0) points += 3;
    if (data.weather || data.location || data.activity) points += 2;

    // Crear mood
    const mood = new Mood({
      userId,
      moodType: data.moodType,
      intensity: data.intensity,
      description: data.description,
      tags: data.tags || [],
      weather: data.weather,
      location: data.location,
      activity: data.activity,
      socialContext: data.socialContext,
      preferredGenres: data.preferredGenres || [],
      energyLevel: data.energyLevel || 5,
      valence: data.valence || 5,
      pointsAwarded: points
    });

    await mood.save();

    // Actualizar estadísticas del usuario
    await this.updateUserStats(userId, points);

    return mood;
  }

  /**
   * Obtener moods del usuario con paginación
   */
  async getUserMoods(
    userId: string, 
    page: number = 1, 
    limit: number = 10,
    moodType?: MoodType,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    moods: IMood[];
    total: number;
    page: number;
    pages: number;
  }> {
    // Construir filtros
    const filters: any = { userId };
    
    if (moodType) {
      filters.moodType = moodType;
    }
    
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) filters.createdAt.$gte = startDate;
      if (endDate) filters.createdAt.$lte = endDate;
    }

    // Ejecutar consultas en paralelo
    const [moods, total] = await Promise.all([
      Mood.find(filters)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .lean(),
      Mood.countDocuments(filters)
    ]);

    return {
      moods,
      total,
      page,
      pages: Math.ceil(total / limit)
    };
  }

  /**
   * Obtener mood por ID
   */
  async getMoodById(userId: string, moodId: string): Promise<IMood | null> {
    return await Mood.findOne({ _id: moodId, userId });
  }

  /**
   * Actualizar mood
   */
  async updateMood(
    userId: string, 
    moodId: string, 
    updates: Partial<CreateMoodData>
  ): Promise<IMood | null> {
    return await Mood.findOneAndUpdate(
      { _id: moodId, userId },
      updates,
      { new: true, runValidators: true }
    );
  }

  /**
   * Eliminar mood
   */
  async deleteMood(userId: string, moodId: string): Promise<boolean> {
    const result = await Mood.deleteOne({ _id: moodId, userId });
    return result.deletedCount > 0;
  }

  /**
   * Calificar playlist generada
   */
  async rateMoodPlaylist(
    userId: string, 
    moodId: string, 
    rating: number, 
    feedback?: string
  ): Promise<IMood | null> {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating debe ser entre 1 y 5');
    }

    const mood = await Mood.findOneAndUpdate(
      { _id: moodId, userId },
      { 
        playlistRating: rating, 
        feedback,
        wasPlaylistListened: true
      },
      { new: true }
    );

    // Otorgar puntos por feedback (solo la primera vez)
    if (mood && rating >= 4) {
      await this.updateUserStats(userId, 5);
    }

    return mood;
  }

  /**
   * Marcar playlist como escuchada
   */
  async markPlaylistAsListened(userId: string, moodId: string): Promise<IMood | null> {
    const mood = await Mood.findOneAndUpdate(
      { _id: moodId, userId, wasPlaylistListened: false },
      { wasPlaylistListened: true },
      { new: true }
    );

    // Otorgar puntos por escuchar playlist
    if (mood) {
      await this.updateUserStats(userId, 3);
    }

    return mood;
  }

  /**
   * Obtener analytics de moods
   */
  async getMoodAnalytics(userId: string, days: number = 30): Promise<MoodAnalytics> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Obtener todos los moods del período
    const moods = await Mood.find({
      userId,
      createdAt: { $gte: startDate }
    }).lean();

    if (moods.length === 0) {
      return {
        totalMoods: 0,
        mostCommonMood: { 
          mood: MoodType.NEUTRAL, 
          count: 0, 
          percentage: 0,
          displayName: TranslationService.getMoodDisplayName(MoodType.NEUTRAL)
        },
        moodDistribution: [],
        averageIntensity: 0,
        averageEnergy: 0,
        averageValence: 0,
        weeklyTrend: [],
        monthlyStats: {
          totalPlaylistsCreated: 0,
          totalPlaylistsRated: 0,
          averageRating: 0,
          pointsEarned: 0
        }
      };
    }

    // Calcular distribución de moods
    const moodCounts: Record<string, number> = {};
    let totalIntensity = 0;
    let totalEnergy = 0;
    let totalValence = 0;
    let playlistsCreated = 0;
    let playlistsRated = 0;
    let totalRating = 0;
    let totalPoints = 0;

    moods.forEach(mood => {
      moodCounts[mood.moodType] = (moodCounts[mood.moodType] || 0) + 1;
      totalIntensity += mood.intensity;
      totalEnergy += mood.energyLevel;
      totalValence += mood.valence;
      totalPoints += mood.pointsAwarded;

      if (mood.playlistId) playlistsCreated++;
      if (mood.playlistRating) {
        playlistsRated++;
        totalRating += mood.playlistRating;
      }
    });

    // Encontrar mood más común
    const mostCommon = Object.entries(moodCounts).reduce(
      (max, [mood, count]) => count > max.count ? { mood: mood as MoodType, count } : max,
      { mood: MoodType.NEUTRAL, count: 0 }
    );

    // Crear distribución
    const moodDistribution = Object.entries(moodCounts).map(([mood, count]) => ({
      mood: mood as MoodType,
      count,
      percentage: Math.round((count / moods.length) * 100),
      displayName: TranslationService.getMoodDisplayName(mood as MoodType)
    })).sort((a, b) => b.count - a.count);

    // Trend semanal (últimos 7 días)
    const weeklyTrend = await this.getWeeklyTrend(userId, 7);

    return {
      totalMoods: moods.length,
      mostCommonMood: {
        ...mostCommon,
        percentage: Math.round((mostCommon.count / moods.length) * 100),
        displayName: TranslationService.getMoodDisplayName(mostCommon.mood)
      },
      moodDistribution,
      averageIntensity: Math.round((totalIntensity / moods.length) * 10) / 10,
      averageEnergy: Math.round((totalEnergy / moods.length) * 10) / 10,
      averageValence: Math.round((totalValence / moods.length) * 10) / 10,
      weeklyTrend,
      monthlyStats: {
        totalPlaylistsCreated: playlistsCreated,
        totalPlaylistsRated: playlistsRated,
        averageRating: playlistsRated > 0 ? Math.round((totalRating / playlistsRated) * 10) / 10 : 0,
        pointsEarned: totalPoints
      }
    };
  }

  /**
   * Obtener trend semanal
   */
  async getWeeklyTrend(userId: string, days: number = 7): Promise<WeeklyTrendItem[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const pipeline: PipelineStage[] = [
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          mood: '$moodType'
        },
        count: { $sum: 1 },
        avgIntensity: { $avg: '$intensity' }
      }
    },
    {
      $sort: { '_id.date': -1 as const }
    }
  ];

  const results = await Mood.aggregate(pipeline);

  return results.map(item => ({
    date: item._id.date,
    mood: item._id.mood,
    intensity: Math.round(item.avgIntensity * 10) / 10,
    count: item.count,
    displayName: TranslationService.getMoodDisplayName(item._id.mood)
  }));
}

  /**
   * Obtener moods más comunes del usuario
   */
  async getTopMoods(userId: string, limit: number = 5): Promise<Array<{
  mood: MoodType;
  count: number;
  percentage: number;
  displayName: string;
  avgIntensity: number;
  avgRating: number;
  lastLogged: Date;
}>> {
  const pipeline: PipelineStage[] = [
    {
      $match: { userId: new mongoose.Types.ObjectId(userId) }
    },
    {
      $group: {
        _id: '$moodType',
        count: { $sum: 1 },
        avgIntensity: { $avg: '$intensity' },
        avgRating: { $avg: '$playlistRating' },
        lastLogged: { $max: '$createdAt' }
      }
    },
    {
      $sort: { count: -1 as const }
    },
    {
      $limit: limit
    }
  ];

  const results = await Mood.aggregate(pipeline);
  const totalMoods = await Mood.countDocuments({ userId });

  return results.map(item => ({
    mood: item._id,
    count: item.count,
    percentage: totalMoods > 0 ? Math.round((item.count / totalMoods) * 100) : 0,
    displayName: TranslationService.getMoodDisplayName(item._id),
    avgIntensity: Math.round(item.avgIntensity * 10) / 10,
    avgRating: item.avgRating ? Math.round(item.avgRating * 10) / 10 : 0,
    lastLogged: item.lastLogged
  }));
}

  /**
   * Buscar moods por texto
   */
  async searchMoods(
    userId: string, 
    searchTerm: string, 
    page: number = 1, 
    limit: number = 10
  ): Promise<{
    moods: IMood[];
    total: number;
    page: number;
    pages: number;
  }> {
    const searchRegex = new RegExp(searchTerm, 'i');
    
    const filters = {
      userId,
      $or: [
        { description: searchRegex },
        { tags: { $in: [searchRegex] } },
        { location: searchRegex },
        { activity: searchRegex }
      ]
    };

    const [moods, total] = await Promise.all([
      Mood.find(filters)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .lean(),
      Mood.countDocuments(filters)
    ]);

    return {
      moods,
      total,
      page,
      pages: Math.ceil(total / limit)
    };
  }

  /**
   * Obtener mood stats por período
   */
  async getMoodStatsByPeriod(
  userId: string,
  period: 'week' | 'month' | 'year' = 'month'
): Promise<Array<{
  period: string;
  totalMoods: number;
  mostCommonMood: string;
  avgIntensity: number;
  pointsEarned: number;
}>> {
  const now = new Date();
  let startDate: Date;
  let groupFormat: string;

  switch (period) {
    case 'week':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6 * 7); // 6 semanas atrás
      groupFormat = '%Y-W%U'; // Año-Semana
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1); // 12 meses atrás
      groupFormat = '%Y-%m'; // Año-Mes
      break;
    case 'year':
      startDate = new Date(now.getFullYear() - 4, 0, 1); // 5 años atrás
      groupFormat = '%Y'; // Año
      break;
  }

  const pipeline: PipelineStage[] = [
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          period: { $dateToString: { format: groupFormat, date: '$createdAt' } },
          mood: '$moodType'
        },
        count: { $sum: 1 },
        avgIntensity: { $avg: '$intensity' },
        totalPoints: { $sum: '$pointsAwarded' }
      }
    },
    {
      $group: {
        _id: '$_id.period',
        moods: {
          $push: {
            mood: '$_id.mood',
            count: '$count'
          }
        },
        totalMoods: { $sum: '$count' },
        avgIntensity: { $avg: '$avgIntensity' },
        pointsEarned: { $sum: '$totalPoints' }
      }
    },
    {
      $addFields: {
        mostCommonMood: {
          $arrayElemAt: [
            {
              $map: {
                input: {
                  $slice: [
                    {
                      $sortArray: {
                        input: '$moods',
                        sortBy: { count: -1 as const }
                      }
                    },
                    1
                  ]
                },
                as: 'mood',
                in: '$$mood.mood'
              }
            },
            0
          ]
        }
      }
    },
    {
      $sort: { _id: -1 as const }
    }
  ];

  const results = await Mood.aggregate(pipeline);

  return results.map(item => ({
    period: item._id,
    totalMoods: item.totalMoods,
    mostCommonMood: TranslationService.getMoodDisplayName(item.mostCommonMood),
    avgIntensity: Math.round(item.avgIntensity * 10) / 10,
    pointsEarned: item.pointsEarned
  }));
}

  /**
   * Actualizar estadísticas del usuario
   */
  private async updateUserStats(userId: string, pointsToAdd: number): Promise<void> {
    const user = await User.findById(userId);
    if (!user) return;

    // Incrementar contador de moods
    user.totalMoodsLogged += 1;
    
    // Actualizar racha
    await user.updateStreak();
    
    // Agregar puntos
    await user.addPoints(pointsToAdd);
  }

  /**
   * Obtener recomendaciones de música para un mood
   */
  getMusicRecommendations(moodType: MoodType, intensity: MoodIntensity, userGenres?: string[]) {
    return recommendationService.getMusicProfile(moodType, intensity);
  }

  /**
   * Generar parámetros para búsqueda en Spotify
   */
  getSpotifySearchParams(moodType: MoodType, intensity: MoodIntensity, userGenres?: string[]) {
    return recommendationService.getSpotifySearchParams(moodType, intensity, userGenres);
  }
}

// Exportar instancia única (Singleton)
export const moodService = new MoodService();