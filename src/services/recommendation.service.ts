import { MoodType, MoodIntensity } from '../models/Mood';

export interface MoodMusicProfile {
  genres: string[];
  energy: number; // 0.0 - 1.0
  valence: number; // 0.0 - 1.0 (negativity to positivity)
  danceability: number; // 0.0 - 1.0
  acousticness: number; // 0.0 - 1.0
  tempo: { min: number; max: number }; // BPM
  keywords: string[];
}

export class RecommendationService {
  
  /**
   * Mapeo de moods a características musicales
   */
  private moodProfiles: Record<MoodType, MoodMusicProfile> = {
    [MoodType.VERY_HAPPY]: {
      genres: ['pop', 'dance', 'funk', 'disco', 'electronic'],
      energy: 0.8,
      valence: 0.9,
      danceability: 0.8,
      acousticness: 0.2,
      tempo: { min: 120, max: 140 },
      keywords: ['upbeat', 'celebration', 'party', 'joy']
    },
    
    [MoodType.HAPPY]: {
      genres: ['pop', 'indie-pop', 'reggae', 'funk', 'soul'],
      energy: 0.7,
      valence: 0.8,
      danceability: 0.6,
      acousticness: 0.3,
      tempo: { min: 100, max: 130 },
      keywords: ['feel good', 'positive', 'uplifting', 'cheerful']
    },
    
    [MoodType.EXCITED]: {
      genres: ['electronic', 'rock', 'pop-punk', 'dance', 'hip-hop'],
      energy: 0.9,
      valence: 0.8,
      danceability: 0.7,
      acousticness: 0.1,
      tempo: { min: 130, max: 160 },
      keywords: ['energetic', 'pumped', 'adrenaline', 'hype']
    },
    
    [MoodType.MOTIVATED]: {
      genres: ['hip-hop', 'rock', 'electronic', 'pop', 'workout'],
      energy: 0.8,
      valence: 0.7,
      danceability: 0.6,
      acousticness: 0.2,
      tempo: { min: 120, max: 150 },
      keywords: ['motivational', 'power', 'strength', 'focus']
    },
    
    [MoodType.ENERGETIC]: {
      genres: ['electronic', 'dance', 'pop', 'rock', 'punk'],
      energy: 0.9,
      valence: 0.7,
      danceability: 0.8,
      acousticness: 0.1,
      tempo: { min: 125, max: 145 },
      keywords: ['high energy', 'dynamic', 'powerful', 'intense']
    },
    
    [MoodType.CALM]: {
      genres: ['ambient', 'chillout', 'acoustic', 'indie-folk', 'new-age'],
      energy: 0.3,
      valence: 0.6,
      danceability: 0.3,
      acousticness: 0.7,
      tempo: { min: 60, max: 90 },
      keywords: ['peaceful', 'serene', 'meditation', 'tranquil']
    },
    
    [MoodType.RELAXED]: {
      genres: ['chillout', 'lounge', 'jazz', 'bossa-nova', 'indie'],
      energy: 0.4,
      valence: 0.6,
      danceability: 0.4,
      acousticness: 0.6,
      tempo: { min: 70, max: 100 },
      keywords: ['chill', 'laid back', 'smooth', 'mellow']
    },
    
    [MoodType.ROMANTIC]: {
      genres: ['r&b', 'soul', 'jazz', 'acoustic', 'indie'],
      energy: 0.4,
      valence: 0.7,
      danceability: 0.5,
      acousticness: 0.5,
      tempo: { min: 70, max: 110 },
      keywords: ['love', 'romantic', 'intimate', 'sensual']
    },
    
    [MoodType.NOSTALGIC]: {
      genres: ['oldies', 'classic-rock', 'vintage', 'retro', '80s'],
      energy: 0.5,
      valence: 0.6,
      danceability: 0.4,
      acousticness: 0.4,
      tempo: { min: 80, max: 120 },
      keywords: ['memories', 'throwback', 'classic', 'vintage']
    },
    
    [MoodType.SAD]: {
      genres: ['indie', 'alternative', 'singer-songwriter', 'blues', 'acoustic'],
      energy: 0.3,
      valence: 0.3,
      danceability: 0.3,
      acousticness: 0.6,
      tempo: { min: 60, max: 90 },
      keywords: ['melancholy', 'emotional', 'heartbreak', 'introspective']
    },
    
    [MoodType.VERY_SAD]: {
      genres: ['sad', 'blues', 'acoustic', 'indie', 'alternative'],
      energy: 0.2,
      valence: 0.2,
      danceability: 0.2,
      acousticness: 0.8,
      tempo: { min: 50, max: 80 },
      keywords: ['depression', 'sorrow', 'tears', 'grief']
    },
    
    [MoodType.ANGRY]: {
      genres: ['metal', 'punk', 'hard-rock', 'rap', 'hardcore'],
      energy: 0.9,
      valence: 0.3,
      danceability: 0.5,
      acousticness: 0.1,
      tempo: { min: 140, max: 180 },
      keywords: ['anger', 'rage', 'aggressive', 'intense']
    },
    
    [MoodType.STRESSED]: {
      genres: ['ambient', 'classical', 'meditation', 'new-age', 'acoustic'],
      energy: 0.2,
      valence: 0.4,
      danceability: 0.2,
      acousticness: 0.8,
      tempo: { min: 60, max: 80 },
      keywords: ['stress relief', 'calming', 'anxiety', 'peace']
    },
    
    [MoodType.ANXIOUS]: {
      genres: ['ambient', 'chillout', 'acoustic', 'indie', 'lo-fi'],
      energy: 0.3,
      valence: 0.4,
      danceability: 0.3,
      acousticness: 0.7,
      tempo: { min: 70, max: 90 },
      keywords: ['anxiety relief', 'soothing', 'comfort', 'gentle']
    },
    
    [MoodType.TIRED]: {
      genres: ['lo-fi', 'chillout', 'ambient', 'acoustic', 'jazz'],
      energy: 0.2,
      valence: 0.5,
      danceability: 0.2,
      acousticness: 0.6,
      tempo: { min: 60, max: 85 },
      keywords: ['sleepy', 'drowsy', 'rest', 'gentle']
    },
    
    [MoodType.NEUTRAL]: {
      genres: ['pop', 'indie', 'alternative', 'rock', 'electronic'],
      energy: 0.5,
      valence: 0.5,
      danceability: 0.5,
      acousticness: 0.4,
      tempo: { min: 90, max: 120 },
      keywords: ['balanced', 'moderate', 'everyday', 'casual']
    }
  };

  /**
   * Obtener perfil musical basado en el mood
   */
  getMusicProfile(moodType: MoodType, intensity: MoodIntensity): MoodMusicProfile {
    const baseProfile = this.moodProfiles[moodType];
    
    // Ajustar intensidad
    const intensityMultiplier = intensity / 2.5; // Normalize 1-4 to ~0.4-1.6
    
    return {
      ...baseProfile,
      energy: Math.min(1.0, Math.max(0.0, baseProfile.energy * intensityMultiplier)),
      valence: baseProfile.valence,
      danceability: Math.min(1.0, Math.max(0.0, baseProfile.danceability * intensityMultiplier)),
      acousticness: baseProfile.acousticness,
      tempo: {
        min: Math.max(50, Math.floor(baseProfile.tempo.min * intensityMultiplier)),
        max: Math.min(200, Math.floor(baseProfile.tempo.max * intensityMultiplier))
      }
    };
  }

  /**
   * Generar parámetros de búsqueda para Spotify
   */
  getSpotifySearchParams(moodType: MoodType, intensity: MoodIntensity, userPreferences?: string[]) {
    const profile = this.getMusicProfile(moodType, intensity);
    
    // Combinar géneros recomendados con preferencias del usuario
    let genres = profile.genres;
    if (userPreferences && userPreferences.length > 0) {
      genres = [...new Set([...userPreferences, ...profile.genres])].slice(0, 5);
    }

    return {
      // Géneros
      seed_genres: genres.slice(0, 5).join(','),
      
      // Audio features
      target_energy: profile.energy,
      target_valence: profile.valence,
      target_danceability: profile.danceability,
      target_acousticness: profile.acousticness,
      
      // Tempo
      min_tempo: profile.tempo.min,
      max_tempo: profile.tempo.max,
      
      // Cantidad de canciones
      limit: 20,
      
      // Market
      market: 'US'
    };
  }

  /**
   * Generar query de búsqueda de texto para Spotify
   */
  getSearchQuery(moodType: MoodType, intensity: MoodIntensity): string {
    const profile = this.moodProfiles[moodType];
    const keywords = profile.keywords;
    const genres = profile.genres.slice(0, 2);
    
    // Combinar keywords y géneros
    const searchTerms = [...keywords.slice(0, 2), ...genres];
    
    return searchTerms.join(' OR ');
  }

  /**
   * Obtener nombre amigable para el mood
   */
  getMoodDisplayName(moodType: MoodType): string {
    const displayNames: Record<MoodType, string> = {
      [MoodType.VERY_HAPPY]: 'Súper Feliz 😊',
      [MoodType.HAPPY]: 'Feliz 😃',
      [MoodType.EXCITED]: 'Emocionado 🤩',
      [MoodType.MOTIVATED]: 'Motivado 💪',
      [MoodType.ENERGETIC]: 'Con Energía ⚡',
      [MoodType.CALM]: 'Tranquilo 😌',
      [MoodType.RELAXED]: 'Relajado 😎',
      [MoodType.ROMANTIC]: 'Romántico 💕',
      [MoodType.NOSTALGIC]: 'Nostálgico 🌅',
      [MoodType.SAD]: 'Triste 😢',
      [MoodType.VERY_SAD]: 'Muy Triste 😞',
      [MoodType.ANGRY]: 'Enojado 😠',
      [MoodType.STRESSED]: 'Estresado 😰',
      [MoodType.ANXIOUS]: 'Ansioso 😟',
      [MoodType.TIRED]: 'Cansado 😴',
      [MoodType.NEUTRAL]: 'Neutral 😐'
    };

    return displayNames[moodType] || moodType;
  }

  /**
   * Generar nombre para playlist basado en mood
   */
  generatePlaylistName(moodType: MoodType, intensity: MoodIntensity): string {
    const moodName = this.getMoodDisplayName(moodType);
    const intensityText = ['Suave', 'Moderado', 'Intenso', 'Extremo'][intensity - 1];
    const date = new Date().toLocaleDateString('es-ES');
    
    return `${moodName} - ${intensityText} (${date})`;
  }

  /**
   * Obtener descripción para playlist
   */
  generatePlaylistDescription(moodType: MoodType, intensity: MoodIntensity): string {
    const profile = this.moodProfiles[moodType];
    const moodName = this.getMoodDisplayName(moodType);
    
    return `Playlist generada automáticamente por Moodify para cuando te sientes ${moodName.toLowerCase()}. Géneros: ${profile.genres.slice(0, 3).join(', ')}. ¡Que la disfrutes! 🎵`;
  }
}

// Exportar instancia única
export const recommendationService = new RecommendationService();