import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { ApiResponse } from '../types/api.types';
import { IUser } from '../models/User';

export interface AuthRequest extends Request {
  user?: IUser; // Cambiado de 'any' a 'IUser' para mejor tipado
}

/**
 * Middleware para verificar autenticación JWT
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Token de acceso requerido'
      });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Error en authenticate:', error);
    res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }
};

/**
 * Middleware para verificar si el usuario tiene Spotify conectado
 */
export const requireSpotifyConnection = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Autenticación requerida'
    });
    return;
  }

  if (!req.user.spotifyId) {
    res.status(403).json({
      success: false,
      message: 'Conexión con Spotify requerida',
      action: 'Conecta tu cuenta de Spotify primero',
      authUrl: '/api/spotify/auth'
    });
    return;
  }

  next();
};

/**
 * Middleware para verificar si el usuario es Premium de Spotify
 */
export const requireSpotifyPremium = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Autenticación requerida'
    });
    return;
  }

  if (!req.user.isPremium) {
    res.status(403).json({
      success: false,
      message: 'Spotify Premium requerido para esta funcionalidad',
      upgradeMessage: 'Actualiza tu cuenta de Spotify a Premium para reproducir música completa'
    });
    return;
  }

  next();
};