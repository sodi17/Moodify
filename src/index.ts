import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { connectDatabase } from './config/database';

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Conectar a MongoDB
    await connectDatabase();
    console.log('MongoDB conectado');

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
      console.log(`Ambiente: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Error iniciando servidor:', error);
    process.exit(1);
  }
}

// Manejo graceful de cierre
process.on('SIGTERM', () => {
  console.log('SIGTERM recibido, cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT recibido, cerrando servidor...');
  process.exit(0);
});

startServer();