import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { authService } from '../services/auth.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { ApiResponse } from '../types/api.types';
import jwt from 'jsonwebtoken';
import { sendEmail } from '../services/email.service';

export class AuthController {
  
  /**
   * POST /api/auth/register
   * Registrar nuevo usuario
   */
  async register(req: Request, res: Response<ApiResponse>): Promise<void> {
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

      const { name, email, password } = req.body;

      // Registrar usuario (queda con isEmailVerified = false)
      const result = await authService.register({ name, email, password });

      // Generar token de verificación
      const token = jwt.sign(
        { userId: result.user._id },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      // Link de verificación
      //const verificationLink = `${process.env.CORS_ORIGIN}/api/auth/verify-email?token=${token}`;
      const verificationLink = `${process.env.CORS_ORIGIN_BACK}/api/auth/verify-email?token=${token}`;

      // Enviar correo
      await sendEmail(
        result.user.email,
        'Verifica tu cuenta en Moodify',
        `<h1>Bienvenido a Moodify 🎵</h1>
         <p>Hola ${result.user.name}, confirma tu cuenta haciendo clic en el siguiente enlace:</p>
         <a href="${verificationLink}">Verificar mi cuenta</a>
         <p>Este enlace expira en 1 hora.</p>`
      );

      res.status(201).json({
        success: true,
        message: 'Usuario registrado. Revisa tu correo para verificar tu cuenta.',
        data: {
          user: result.user,
          token: result.token,
          expiresIn: result.expiresIn
        }
      });

    } catch (error: any) {
      console.error('Error en registro:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Error en el registro'
      });
    }
  }


  /**
   * POST /api/auth/login
   * Login de usuario
   */
  async login(req: Request, res: Response<ApiResponse>): Promise<void> {
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

      const { email, password } = req.body;

      // Hacer login
      const result = await authService.login({ email, password });
      if (!result.user.isEmailVerified) {
        res.status(403).json({
          success: false,
          message: "Debes verificar tu correo antes de iniciar sesión"
        });
        return;
      }
      res.json({
        success: true,
        message: `¡Bienvenido de vuelta, ${result.user.name}! `,
        data: {
          user: result.user,
          token: result.token,
          expiresIn: result.expiresIn
        }
      });

    } catch (error: any) {
      console.error('Error en login:', error);
      res.status(401).json({
        success: false,
        message: error.message || 'Error en el login'
      });
    }
  }

  /**
   * GET /api/auth/me
   * Obtener perfil del usuario actual
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

      res.json({
        success: true,
        data: {
          user: req.user
        }
      });

    } catch (error: any) {
      console.error('Error obteniendo perfil:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * PUT /api/auth/profile
   * Actualizar perfil del usuario
   */
  async updateProfile(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      const { name, avatar } = req.body;
      const updates = { name, avatar };

      const updatedUser = await authService.updateProfile(req.user._id.toString(), updates);

      res.json({
        success: true,
        message: 'Perfil actualizado exitosamente',
        data: {
          user: updatedUser
        }
      });

    } catch (error: any) {
      console.error('Error actualizando perfil:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Error actualizando perfil'
      });
    }
  }

  /**
   * POST /api/auth/change-password
   * Cambiar contraseña del usuario
   */
  async changePassword(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      await authService.changePassword(
        req.user._id.toString(),
        currentPassword,
        newPassword
      );

      res.json({
        success: true,
        message: 'Contraseña actualizada exitosamente'
      });

    } catch (error: any) {
      console.error('Error cambiando contraseña:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Error cambiando contraseña'
      });
    }
  }

  /**
   * GET /api/auth/stats
   * Obtener estadísticas del usuario
   */
  async getUserStats(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      const stats = await authService.getUserStats(req.user._id.toString());

      res.json({
        success: true,
        data: {
          stats
        }
      });

    } catch (error: any) {
      console.error('Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo estadísticas'
      });
    }
  }

  /**
   * POST /api/auth/logout
   * Logout (principalmente para limpiar del lado del cliente)
   */
  async logout(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      // En JWT no hay logout real del lado del servidor
      // El cliente debe eliminar el token
      res.json({
        success: true,
        message: 'Logout exitoso. ¡Hasta pronto!'
      });

    } catch (error: any) {
      console.error('Error en logout:', error);
      res.status(500).json({
        success: false,
        message: 'Error en logout'
      });
    }
  }
  async verifyEmail(req: Request, res: Response<ApiResponse>): Promise<void> {
    try {
      const { token } = req.query;
      if (!token) {
        res.status(400).json({ success: false, message: 'Token no proporcionado' });
        return;
      }

      const decoded = jwt.verify(token as string, process.env.JWT_SECRET!) as { userId: string };

      // Actualizar usuario
      const user = await authService.verifyEmail(decoded.userId);
      if (!user) {
        res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        return;
      }

      res.json({
        success: true,
        message: 'Correo verificado con éxito. Ya puedes iniciar sesión.'
      });

    } catch (error: any) {
      console.error('Error en verificación de correo:', error);
      res.status(400).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }
  }
}

// Exportar instancia única
export const authController = new AuthController();