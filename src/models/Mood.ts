import mongoose, { Document, Schema } from 'mongoose';

export enum MoodType {
  VERY_SAD = 'very_sad',
  SAD = 'sad',
  NEUTRAL = 'neutral',
  HAPPY = 'happy',
  VERY_HAPPY = 'very_happy',
  ANGRY = 'angry',
  ANXIOUS = 'anxious',
  EXCITED = 'excited',
  CALM = 'calm',
  ENERGETIC = 'energetic',
  TIRED = 'tired',
  MOTIVATED = 'motivated',
  STRESSED = 'stressed',
  RELAXED = 'relaxed',
  ROMANTIC = 'romantic',
  NOSTALGIC = 'nostalgic'
}

export enum MoodIntensity {
  LOW = 1,
  MODERATE = 2,
  HIGH = 3,
  EXTREME = 4
}

export interface IMood extends Document {
  userId: mongoose.Types.ObjectId;
  
  // Core mood data
  moodType: MoodType;
  intensity: number; // Cambiado de MoodIntensity a number
  description?: string;
  tags: string[];
  
  // Context
  weather?: string;
  location?: string;
  activity?: string;
  socialContext?: 'alone' | 'with_friends' | 'with_family' | 'at_work' | 'in_public';
  
  // Music preferences for this mood
  preferredGenres: string[];
  energyLevel: number; // 1-10 scale
  valence: number; // 1-10 scale (positive/negative)
  
  // Generated playlist
  playlistId?: string;
  playlistUrl?: string;
  songsGenerated: number;
  
  // Analytics
  pointsAwarded: number;
  wasPlaylistListened: boolean;
  playlistRating?: number; // 1-5 stars
  feedback?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const moodSchema = new Schema<IMood>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Usuario es requerido'],
      index: true
    },
    
    // Core mood data
    moodType: {
      type: String,
      enum: Object.values(MoodType),
      required: [true, 'Tipo de estado de ánimo es requerido']
    },
    intensity: {
      type: Number,
      required: [true, 'Intensidad es requerida'],
      min: [1, 'Intensidad mínima es 1'],
      max: [4, 'Intensidad máxima es 4'],
      validate: {
        validator: function(v: number) {
          return Number.isInteger(v) && v >= 1 && v <= 4;
        },
        message: 'Intensidad debe ser un número entero entre 1 y 4'
      }
    },
    description: {
      type: String,
      maxlength: [500, 'Descripción no puede exceder 500 caracteres'],
      trim: true
    },
    tags: [{
      type: String,
      lowercase: true,
      trim: true,
      maxlength: 20
    }],
    
    // Context
    weather: {
      type: String,
      enum: ['sunny', 'cloudy', 'rainy', 'stormy', 'snowy', 'foggy', 'windy'],
      default: null
    },
    location: {
      type: String,
      maxlength: 100,
      trim: true
    },
    activity: {
      type: String,
      maxlength: 100,
      trim: true
    },
    socialContext: {
      type: String,
      enum: ['alone', 'with_friends', 'with_family', 'at_work', 'in_public'],
      default: null
    },
    
    // Music preferences
    preferredGenres: [{
      type: String,
      lowercase: true,
      trim: true
    }],
    energyLevel: {
      type: Number,
      min: 1,
      max: 10,
      default: 5
    },
    valence: {
      type: Number,
      min: 1,
      max: 10,
      default: 5
    },
    
    // Generated playlist
    playlistId: {
      type: String,
      default: null
    },
    playlistUrl: {
      type: String,
      default: null
    },
    songsGenerated: {
      type: Number,
      default: 0,
      min: 0
    },
    
    // Analytics
    pointsAwarded: {
      type: Number,
      default: 10,
      min: 0
    },
    wasPlaylistListened: {
      type: Boolean,
      default: false
    },
    playlistRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    feedback: {
      type: String,
      maxlength: 1000,
      trim: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function(doc, ret) {
        const { __v, ...cleanRet } = ret;
        return cleanRet;
      }
    }
  }
);

// Indexes para mejorar performance
moodSchema.index({ userId: 1, createdAt: -1 });
moodSchema.index({ moodType: 1 });
moodSchema.index({ createdAt: -1 });
moodSchema.index({ userId: 1, moodType: 1 });

// Virtual para mood score (combines type, intensity, and context)
moodSchema.virtual('moodScore').get(function() {
  const baseScore = this.intensity;
  const valenceBonus = this.valence > 5 ? 1 : 0;
  const energyBonus = this.energyLevel > 7 ? 1 : 0;
  return baseScore + valenceBonus + energyBonus;
});

// Static method para obtener analytics de moods
moodSchema.statics.getMoodAnalytics = async function(userId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return await this.aggregate([
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
        avgIntensity: { $avg: '$intensity' },
        avgValence: { $avg: '$valence' },
        avgEnergy: { $avg: '$energyLevel' }
      }
    },
    {
      $sort: { '_id.date': -1 }
    }
  ]);
};

// Static method para obtener los moods más comunes
moodSchema.statics.getTopMoods = async function(userId: string, limit: number = 5) {
  return await this.aggregate([
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
      $sort: { count: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

export default mongoose.model<IMood>('Mood', moodSchema);