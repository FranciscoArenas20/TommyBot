import 'reflect-metadata';
import { initializeDatabase } from './database/init';
import { seedDatabase } from './database/seed';
import { app } from './api/server';
import { config } from 'dotenv';
import { AppDataSource } from './database/data-source';

config()

const PORT = process.env.PORT || 3000;

async function main() {
  try {
     // Inicializar conexión
    await initializeDatabase();
    console.log('Base de datos inicializada')

    if(!AppDataSource.isInitialized){
        throw new Error('La base de datos no se inicializo correctamente')
    }

    // Poblar base de datos con datos iniciales
    await seedDatabase();
    
    
    app.listen(PORT, () => {
      console.log(`🚀 Servidor API ejecutándose en http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`✅ Base de datos: ${AppDataSource.isInitialized ? 'Conectada' : 'Desconectada'}`)
    });
    // Cerrar conexión al terminar
  } catch (error) {
    console.error('Error fatal:', error);
    process.exit(1);
  }
}

main();