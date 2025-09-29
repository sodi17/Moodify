import mongoose, { Document, Schema,Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  password: string;
  name: string;
  avatar?: string;
  isEmailVerified: boolean;
  
  // Spotify Integration
  spotifyId?: string;
  spotifyAccessToken?: string;
  spotifyRefreshToken?: string;
  spotifyTokenExpiry?: Date;
  isPremium: boolean;
  
  // Gamification
  points: number;
  level: number;
  badges: mongoose.Types.ObjectId[];
  
  // Stats
  totalMoodsLogged: number;
  currentStreak: number;
  longestStreak: number;
  lastMoodDate?: Date;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  addPoints(points: number): Promise<void>;
  updateStreak(): Promise<void>;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email es requerido'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
    },
    password: {
      type: String,
      required: [true, 'Contraseña es requerida'],
      minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
      select: false // No incluir password en queries por defecto
    },
    name: {
      type: String,
      required: [true, 'Nombre es requerido'],
      trim: true,
      maxlength: [50, 'Nombre no puede exceder 50 caracteres']
    },
    avatar: {
      type: String,
      default: null
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    
    // Spotify Integration
    spotifyId: {
      type: String,
      unique: true,
      sparse: true // Permite múltiples valores null
    },
    spotifyAccessToken: {
      type: String,
      select: false
    },
    spotifyRefreshToken: {
      type: String,
      select: false
    },
    spotifyTokenExpiry: {
      type: Date
    },
    isPremium: {
      type: Boolean,
      default: false
    },
    
    // Gamification
    points: {
      type: Number,
      default: 0,
      min: 0
    },
    level: {
      type: Number,
      default: 1,
      min: 1
    },
    badges: [{
      type: Schema.Types.ObjectId,
      ref: 'Badge'
    }],
    
    // Stats
    totalMoodsLogged: {
      type: Number,
      default: 0,
      min: 0
    },
    currentStreak: {
      type: Number,
      default: 0,
      min: 0
    },
    longestStreak: {
      type: Number,
      default: 0,
      min: 0
    },
    lastMoodDate: {
      type: Date
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function(doc, ret) {
        // Remover campos sensibles del JSON response
        const { password, spotifyAccessToken, spotifyRefreshToken, __v, ...cleanRet } = ret;
        return cleanRet;
      }
    }
  }
);

// Indexes para mejorar performance
//userSchema.index({ email: 1 });
//userSchema.index({ spotifyId: 1 });
userSchema.index({ points: -1 });

// Pre-save middleware para hashear password
userSchema.pre('save', async function(next) {
  // Solo hashear si el password fue modificado
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Método para comparar password
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Método para agregar puntos
userSchema.methods.addPoints = async function(points: number): Promise<void> {
  this.points += points;
  
  // Calcular nuevo level (cada 100 puntos = 1 level)
  const newLevel = Math.floor(this.points / 100) + 1;
  if (newLevel > this.level) {
    this.level = newLevel;
    console.log(`¡${this.name} subió al nivel ${this.level}!`);
  }
  
  await this.save();
};

// Método para actualizar racha de días consecutivos
userSchema.methods.updateStreak = async function(): Promise<void> {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (!this.lastMoodDate) {
    // Primera vez loggeando mood
    this.currentStreak = 1;
  } else {
    const lastMoodDay = new Date(this.lastMoodDate);
    lastMoodDay.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);
    
    if (lastMoodDay.getTime() === yesterday.getTime()) {
      // Continuó la racha
      this.currentStreak += 1;
    } else {
      // Se rompió la racha
      this.currentStreak = 1;
    }
  }
  
  // Actualizar record de racha más larga
  if (this.currentStreak > this.longestStreak) {
    this.longestStreak = this.currentStreak;
  }
  
  this.lastMoodDate = today;
  await this.save();
};

export default mongoose.model<IUser>('User', userSchema);