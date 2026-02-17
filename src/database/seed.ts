import { AppDataSource } from './data-source';
import { Categoria } from './entities/Categoria';
import { Producto } from './entities/Producto';
import { DeliveryZona } from './entities/DeliveryZona';

export async function seedDatabase() {
  try {
    console.log('🌱 Iniciando seed de la base de datos...');

    // Repositorios
    const categoriaRepo = AppDataSource.getRepository(Categoria);
    const productoRepo = AppDataSource.getRepository(Producto);
    const deliveryRepo = AppDataSource.getRepository(DeliveryZona);

    // Verificar si ya hay datos
    const categoriasCount = await categoriaRepo.count();
    if (categoriasCount > 0) {
      console.log('⚠️  La base de datos ya tiene datos. Saltando seed...');
      return;
    }

    // Crear categorías
    const categorias = await categoriaRepo.save([
      { nombre: 'Gatarina', descripcion: 'Alimentos para gatos' },
      { nombre: 'Perrarina', descripcion: 'Alimentos para perros' },
      { nombre: 'Medicamentos', descripcion: 'Desparasitantes, antipulgas y otros' },
      { nombre: 'Accesorios', descripcion: 'Peines, pecheras, collares y más' },
      { nombre: 'Juguetes', descripcion: 'Juguetes para mascotas' }
    ]);

    console.log('✅ Categorías creadas');

    // Crear productos de gato
    await productoRepo.save([
      { nombre: 'Mirringo', categoriaId: categorias[0].id, precioKilo: 0, precioSaco: 0, pesoSacoKg: 0, disponible: true },
      { nombre: 'Donkat', categoriaId: categorias[0].id, precioKilo: 0, precioSaco: 0, pesoSacoKg: 0, disponible: true },
      { nombre: '9lives', categoriaId: categorias[0].id, precioKilo: 0, precioSaco: 0, pesoSacoKg: 0, disponible: true },
      { nombre: 'Gatsy', categoriaId: categorias[0].id, precioKilo: 0, precioSaco: 0, pesoSacoKg: 0, disponible: true },
      { nombre: 'Cipacat', categoriaId: categorias[0].id, precioKilo: 0, precioSaco: 0, pesoSacoKg: 0, disponible: true }
    ]);

    // Crear productos de perro
    await productoRepo.save([
      { nombre: 'DogChow', categoriaId: categorias[1].id, precioKilo: 0, precioSaco: 0, pesoSacoKg: 0, disponible: true },
      { nombre: 'Ringo', categoriaId: categorias[1].id, precioKilo: 0, precioSaco: 0, pesoSacoKg: 0, disponible: true },
      { nombre: 'Filpo', categoriaId: categorias[1].id, precioKilo: 0, precioSaco: 0, pesoSacoKg: 0, disponible: true },
      { nombre: 'Supercan', categoriaId: categorias[1].id, precioKilo: 0, precioSaco: 0, pesoSacoKg: 0, disponible: true },
      { nombre: 'Knina', categoriaId: categorias[1].id, precioKilo: 0, precioSaco: 0, pesoSacoKg: 0, disponible: true }
    ]);

    console.log('✅ Productos creados');

    // Crear zonas de delivery
    await deliveryRepo.save([
      { zona: 'Zona 1 - Centro', precio: 5.00, tiempoEstimado: '30-45 min', disponible: true },
      { zona: 'Zona 2 - Este', precio: 8.00, tiempoEstimado: '45-60 min', disponible: true },
      { zona: 'Zona 3 - Oeste', precio: 8.00, tiempoEstimado: '45-60 min', disponible: true },
      { zona: 'Zona 4 - Sur', precio: 10.00, tiempoEstimado: '60-90 min', disponible: true }
    ]);

    console.log('✅ Zonas de delivery creadas');
    console.log('🎉 Seed completado exitosamente');

  } catch (error) {
    console.error('❌ Error en el seed:', error);
    throw error;
  }
}