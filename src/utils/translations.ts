import { MoodType } from '../models/Mood';

// Traducciones de moods español -> inglés (para Spotify)
export const MOOD_TRANSLATIONS_ES_TO_EN: Record<string, MoodType> = {
  'muy_feliz': MoodType.VERY_HAPPY,
  'feliz': MoodType.HAPPY,
  'neutral': MoodType.NEUTRAL,
  'triste': MoodType.SAD,
  'muy_triste': MoodType.VERY_SAD,
  'enojado': MoodType.ANGRY,
  'ansioso': MoodType.ANXIOUS,
  'emocionado': MoodType.EXCITED,
  'tranquilo': MoodType.CALM,
  'energetico': MoodType.ENERGETIC,
  'cansado': MoodType.TIRED,
  'motivado': MoodType.MOTIVATED,
  'estresado': MoodType.STRESSED,
  'relajado': MoodType.RELAXED,
  'romantico': MoodType.ROMANTIC,
  'nostalgico': MoodType.NOSTALGIC
};

// Traducciones inglés -> español (para mostrar al usuario)
export const MOOD_TRANSLATIONS_EN_TO_ES: Record<MoodType, string> = {
  [MoodType.VERY_HAPPY]: 'Muy Feliz',
  [MoodType.HAPPY]: 'Feliz',
  [MoodType.NEUTRAL]: 'Neutral',
  [MoodType.SAD]: 'Triste',
  [MoodType.VERY_SAD]: 'Muy Triste',
  [MoodType.ANGRY]: 'Enojado',
  [MoodType.ANXIOUS]: 'Ansioso',
  [MoodType.EXCITED]: 'Emocionado',
  [MoodType.CALM]: 'Tranquilo',
  [MoodType.ENERGETIC]: 'Energético',
  [MoodType.TIRED]: 'Cansado',
  [MoodType.MOTIVATED]: 'Motivado',
  [MoodType.STRESSED]: 'Estresado',
  [MoodType.RELAXED]: 'Relajado',
  [MoodType.ROMANTIC]: 'Romántico',
  [MoodType.NOSTALGIC]: 'Nostálgico'
};

// Emojis para cada mood
export const MOOD_EMOJIS: Record<MoodType, string> = {
  [MoodType.VERY_HAPPY]: '😊',
  [MoodType.HAPPY]: '😃',
  [MoodType.NEUTRAL]: '😐',
  [MoodType.SAD]: '😢',
  [MoodType.VERY_SAD]: '😞',
  [MoodType.ANGRY]: '😠',
  [MoodType.ANXIOUS]: '😟',
  [MoodType.EXCITED]: '🤩',
  [MoodType.CALM]: '😌',
  [MoodType.ENERGETIC]: '⚡',
  [MoodType.TIRED]: '😴',
  [MoodType.MOTIVATED]: '💪',
  [MoodType.STRESSED]: '😰',
  [MoodType.RELAXED]: '😎',
  [MoodType.ROMANTIC]: '💕',
  [MoodType.NOSTALGIC]: '🌅'
};

// Géneros musicales - traducción y mapeo para Spotify
export const GENRE_TRANSLATIONS: Record<string, string> = {
  // Español -> Inglés (para enviar a Spotify)
  'pop': 'pop',
  'rock': 'rock',
  'electronica': 'electronic',
  'reggaeton': 'reggaeton',
  'salsa': 'salsa',
  'bachata': 'bachata',
  'merengue': 'merengue',
  'cumbia': 'cumbia',
  'balada': 'ballad',
  'indie': 'indie',
  'jazz': 'jazz',
  'blues': 'blues',
  'clasica': 'classical',
  'hip_hop': 'hip-hop',
  'rap': 'rap',
  'funk': 'funk',
  'soul': 'soul',
  'rnb': 'r&b',
  'metal': 'metal',
  'punk': 'punk',
  'alternativo': 'alternative',
  'folk': 'folk',
  'country': 'country',
  'disco': 'disco',
  'house': 'house',
  'techno': 'techno',
  'ambient': 'ambient',
  'new_age': 'new-age',
  'lo_fi': 'lo-fi'
};

// Traducciones para géneros - mostrar al usuario
export const GENRE_DISPLAY_NAMES: Record<string, string> = {
  'pop': 'Pop',
  'rock': 'Rock',
  'electronic': 'Electrónica',
  'reggaeton': 'Reggaeton',
  'salsa': 'Salsa',
  'bachata': 'Bachata',
  'merengue': 'Merengue',
  'cumbia': 'Cumbia',
  'ballad': 'Balada',
  'indie': 'Indie',
  'jazz': 'Jazz',
  'blues': 'Blues',
  'classical': 'Clásica',
  'hip-hop': 'Hip Hop',
  'rap': 'Rap',
  'funk': 'Funk',
  'soul': 'Soul',
  'r&b': 'R&B',
  'metal': 'Metal',
  'punk': 'Punk',
  'alternative': 'Alternativo',
  'folk': 'Folk',
  'country': 'Country',
  'disco': 'Disco',
  'house': 'House',
  'techno': 'Techno',
  'ambient': 'Ambient',
  'new-age': 'New Age',
  'lo-fi': 'Lo-Fi'
};

// Keywords en español para búsquedas de Spotify
export const MOOD_KEYWORDS_ES: Record<MoodType, string[]> = {
  [MoodType.VERY_HAPPY]: ['alegría', 'felicidad', 'celebración', 'fiesta'],
  [MoodType.HAPPY]: ['contento', 'positivo', 'animado', 'alegre'],
  [MoodType.EXCITED]: ['emocionado', 'energía', 'adrenalina', 'hype'],
  [MoodType.MOTIVATED]: ['motivación', 'fuerza', 'inspiración', 'superación'],
  [MoodType.ENERGETIC]: ['energía', 'dinámico', 'poderoso', 'intenso'],
  [MoodType.CALM]: ['calma', 'paz', 'serenidad', 'tranquilidad'],
  [MoodType.RELAXED]: ['relajado', 'chill', 'suave', 'tranquilo'],
  [MoodType.ROMANTIC]: ['amor', 'romántico', 'íntimo', 'sensual'],
  [MoodType.NOSTALGIC]: ['nostalgia', 'recuerdos', 'pasado', 'melancolía'],
  [MoodType.SAD]: ['tristeza', 'melancolía', 'dolor', 'soledad'],
  [MoodType.VERY_SAD]: ['depresión', 'pena', 'llanto', 'desolación'],
  [MoodType.ANGRY]: ['enojo', 'rabia', 'ira', 'frustración'],
  [MoodType.STRESSED]: ['estrés', 'ansiedad', 'tensión', 'presión'],
  [MoodType.ANXIOUS]: ['ansiedad', 'nervios', 'preocupación', 'inquietud'],
  [MoodType.TIRED]: ['cansancio', 'sueño', 'fatiga', 'descanso'],
  [MoodType.NEUTRAL]: ['normal', 'equilibrio', 'cotidiano', 'casual']
};

// Mensajes de la aplicación en español
export const APP_MESSAGES = {
  MOOD_CREATED: '¡Estado de ánimo registrado exitosamente! 😊',
  PLAYLIST_GENERATED: '¡Tu playlist personalizada está lista! 🎵',
  POINTS_EARNED: 'Has ganado {points} puntos',
  LEVEL_UP: '¡Felicidades! Has subido al nivel {level} 🎉',
  STREAK_CONTINUED: '¡Racha de {days} días! Sigue así 🔥',
  BADGE_EARNED: '¡Has desbloqueado una nueva insignia! 🏆',
  WELCOME_BONUS: '¡Bienvenido a Moodify! Has recibido 50 puntos de regalo 🎁',
  SPOTIFY_CONNECTED: '¡Spotify conectado exitosamente! 🎵',
  SPOTIFY_PREMIUM_REQUIRED: 'Necesitas Spotify Premium para reproducir música completa',
  MOOD_DELETED: 'Estado de ánimo eliminado correctamente',
  PROFILE_UPDATED: 'Perfil actualizado exitosamente',
  PASSWORD_CHANGED: 'Contraseña cambiada exitosamente'
};

// Descripciones de intensidad
export const INTENSITY_DESCRIPTIONS = {
  1: 'Ligero',
  2: 'Moderado', 
  3: 'Intenso',
  4: 'Muy Intenso'
};

// Contextos sociales
export const SOCIAL_CONTEXTS = {
  'alone': 'Solo/a',
  'with_friends': 'Con amigos',
  'with_family': 'Con familia',
  'at_work': 'En el trabajo',
  'in_public': 'En público'
};

// Clima
export const WEATHER_OPTIONS = {
  'sunny': 'Soleado ☀️',
  'cloudy': 'Nublado ☁️',
  'rainy': 'Lluvioso 🌧️',
  'stormy': 'Tormentoso ⛈️',
  'snowy': 'Nevando ❄️',
  'foggy': 'Brumoso 🌫️',
  'windy': 'Ventoso 💨'
};

/**
 * Utility functions para traducciones
 */
export class TranslationService {
  
  /**
   * Traduce mood del español al inglés para Spotify
   */
  static translateMoodToEnglish(spanishMood: string): MoodType | null {
    return MOOD_TRANSLATIONS_ES_TO_EN[spanishMood] || null;
  }
  
  /**
   * Traduce mood del inglés al español para mostrar al usuario
   */
  static translateMoodToSpanish(englishMood: MoodType): string {
    return MOOD_TRANSLATIONS_EN_TO_ES[englishMood] || englishMood;
  }
  
  /**
   * Obtiene el emoji para un mood
   */
  static getMoodEmoji(mood: MoodType): string {
    return MOOD_EMOJIS[mood] || '😐';
  }
  
  /**
   * Obtiene el nombre completo con emoji
   */
  static getMoodDisplayName(mood: MoodType): string {
    const spanish = this.translateMoodToSpanish(mood);
    const emoji = this.getMoodEmoji(mood);
    return `${spanish} ${emoji}`;
  }
  
  /**
   * Traduce géneros para enviar a Spotify
   */
  static translateGenreToSpotify(spanishGenre: string): string {
    return GENRE_TRANSLATIONS[spanishGenre] || spanishGenre;
  }
  
  /**
   * Traduce géneros para mostrar al usuario
   */
  static translateGenreToDisplay(englishGenre: string): string {
    return GENRE_DISPLAY_NAMES[englishGenre] || englishGenre;
  }
  
  /**
   * Obtiene keywords en español para un mood
   */
  static getMoodKeywords(mood: MoodType): string[] {
    return MOOD_KEYWORDS_ES[mood] || [];
  }
  
  /**
   * Formatea mensaje con variables
   */
  static formatMessage(template: string, variables: Record<string, any>): string {
    let message = template;
    Object.entries(variables).forEach(([key, value]) => {
      message = message.replace(`{${key}}`, value.toString());
    });
    return message;
  }
}

// Lista de moods disponibles para el frontend
export const AVAILABLE_MOODS = Object.values(MoodType).map(mood => ({
  value: mood,
  label: TranslationService.translateMoodToSpanish(mood),
  emoji: TranslationService.getMoodEmoji(mood),
  displayName: TranslationService.getMoodDisplayName(mood)
}));

// Lista de géneros disponibles para el frontend
export const AVAILABLE_GENRES = Object.entries(GENRE_DISPLAY_NAMES).map(([value, label]) => ({
  value,
  label
}));