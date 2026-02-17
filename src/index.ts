import 'reflect-metadata';
import { initializeDatabase, closeDatabase } from './database/init';
import { seedDatabase } from './database/seed';
import { app } from './api/server';
import { config } from 'dotenv';

config()

const PORT = process.env.PORT || 3000;

async function main() {
  try {
    // Inicializar conexión
     // Inicializar conexión
    await initializeDatabase();
    
    // Poblar base de datos con datos iniciales
    await seedDatabase();
    
    console.log('🚀 Base de datos iniciada');
    
    app.listen(PORT, () => {
      console.log(`🚀 Servidor API ejecutándose en http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });
    // Cerrar conexión al terminar
    await closeDatabase();
  } catch (error) {
    console.error('Error fatal:', error);
    process.exit(1);
  }
}

main();