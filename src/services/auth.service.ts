import jwt, { Secret, SignOptions } from "jsonwebtoken";
import User, { IUser } from '../models/User';

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: IUser;
  token: string;
  expiresIn: string;
}

export interface JWTPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

export class AuthService {
  
  /**
   * Generar JWT token
   */
  private generateToken(userId: string): string {
    const secret: Secret = process.env.JWT_SECRET as Secret;
    if (!secret) {
      throw new Error("JWT_SECRET no está configurado");
    }
  
    const options: SignOptions = {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d" as any,
    };
  
    return jwt.sign({ userId }, secret, options);
  }

  /**
   * Registrar nuevo usuario
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const { name, email, password } = data;

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('El email ya está registrado');
    }

    // Crear nuevo usuario
    const user = new User({
      name,
      email,
      password,
      points: 50, // Puntos de bienvenida
    });

    await user.save();

    // Generar token
    const token = this.generateToken(user._id.toString());

    return {
      user,
      token,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    };
  }

  /**
   * Login de usuario
   */
  async login(data: LoginData): Promise<AuthResponse> {
    const { email, password } = data;

    // Buscar usuario (incluir password para comparar)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    // Verificar password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      throw new Error('Credenciales inválidas');
    }

    // Generar token
    const token = this.generateToken(user._id.toString());

    // Obtener el usuario sin password para la respuesta
    const userForResponse = await User.findById(user._id);
    if (!userForResponse) {
      throw new Error('Error obteniendo usuario');
    }

    return {
      user: userForResponse,
      token,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    };
  }

  /**
   * Obtener usuario por ID
   */
  async getUserById(userId: string): Promise<IUser | null> {
    return await User.findById(userId);
  }

  /**
   * Verificar y decodificar JWT token
   */
  verifyToken(token: string): JWTPayload {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET no está configurado');
    }

    try {
      return jwt.verify(token, secret) as JWTPayload;
    } catch (error) {
      throw new Error('Token inválido');
    }
  }

  /**
   * Actualizar perfil de usuario
   */
  async updateProfile(userId: string, updates: Partial<{ name: string; avatar: string }>): Promise<IUser> {
    // Campos permitidos para actualizar
    const allowedUpdates = ['name', 'avatar'];
    const filteredUpdates: any = {};

    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key) && updates[key as keyof typeof updates] !== undefined) {
        filteredUpdates[key] = updates[key as keyof typeof updates];
      }
    });

    const user = await User.findByIdAndUpdate(
      userId,
      filteredUpdates,
      { new: true, runValidators: true }
    );

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    return user;
  }

  /**
   * Cambiar contraseña
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Verificar contraseña actual
    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) {
      throw new Error('Contraseña actual incorrecta');
    }

    // Actualizar contraseña (el pre-save middleware se encarga del hash)
    user.password = newPassword;
    await user.save();
  }

  /**
   * Obtener estadísticas del usuario
   */
  async getUserStats(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    return {
      points: user.points,
      level: user.level,
      totalMoodsLogged: user.totalMoodsLogged,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      isPremium: user.isPremium,
      badgesCount: user.badges.length,
      memberSince: user.createdAt
    };
  }

  async verifyEmail(userId: string) {
    return User.findByIdAndUpdate(userId, { isEmailVerified: true }, { new: true });
  }
}

// Exportar instancia única (Singleton)
export const authService = new AuthService();