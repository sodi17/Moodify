import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types/api.types';

/**
 * Middleware para manejar errores 404
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
  });
};

/**
 * Middleware para manejar errores generales
 */
export const errorHandler = (
  error: any,
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): void => {
  console.error('Error:', {
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    path: req.path,
    method: req.method
  });

  // Error de validación de Mongoose
  if (error.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: Object.values(error.errors).map((err: any) => ({
        field: err.path,
        message: err.message
      }))
    });
    return;
  }

  // Error de cast de MongoDB (ID inválido)
  if (error.name === 'CastError') {
    res.status(400).json({
      success: false,
      message: 'ID inválido'
    });
    return;
  }

  // Error de duplicado (código 11000 de MongoDB)
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    res.status(400).json({
      success: false,
      message: `El ${field} ya existe`
    });
    return;
  }

  // Error de JWT
  if (error.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
    return;
  }

  if (error.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      message: 'Token expirado'
    });
    return;
  }

  // Error genérico
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: error.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};