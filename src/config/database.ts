import mongoose from 'mongoose';
import logger from '../utils/logger';

export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI no está definida en variables de entorno');
    }

    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      //bufferMaxEntries: 0,
      bufferCommands: false,
    };

    await mongoose.connect(mongoURI, options);
    
    mongoose.connection.on('connected', () => {
      logger.info('Mongoose conectado a MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('Error de Mongoose:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('Mongoose desconectado');
    });

  } catch (error) {
    logger.error('Error conectando a MongoDB:', error);
    throw error;
  }
};