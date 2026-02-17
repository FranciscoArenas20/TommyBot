import { AppDataSource } from './data-source';

export async function initializeDatabase() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Base de datos conectada exitosamente');
    return AppDataSource;
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error);
    throw error;
  }
}

// export async function closeDatabase() {
//   try {
//     await AppDataSource.destroy();
//     console.log('✅ Conexión cerrada');
//   } catch (error) {
//     console.error('❌ Error cerrando conexión:', error);
//   }
// }