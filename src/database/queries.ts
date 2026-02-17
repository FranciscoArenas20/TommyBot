import { AppDataSource } from './data-source';
import { Producto } from './entities/Producto';
import { DeliveryZona } from './entities/DeliveryZona';
import { Categoria } from './entities/Categoria';
import { Like } from 'typeorm';

export class DatabaseQueries {
  
  // Buscar producto por nombre (búsqueda flexible)
  static async buscarProducto(nombreBuscado: string) {
    const productoRepo = AppDataSource.getRepository(Producto);
    
    const productos = await productoRepo.find({
      where: {
        nombre: Like(`%${nombreBuscado}%`),
        disponible: true
      },
      relations: ['categoria']
    });
    
    return productos;
  }

  // Obtener todos los productos por categoría
  static async obtenerProductosPorCategoria(nombreCategoria: string) {
    const productoRepo = AppDataSource.getRepository(Producto);
    
    const productos = await productoRepo.find({
      where: {
        categoria: {
          nombre: Like(`%${nombreCategoria}%`)
        },
        disponible: true
      },
      relations: ['categoria']
    });
    
    return productos;
  }

  // Obtener información de delivery por zona
  static async buscarZonaDelivery(zonaBuscada: string) {
    const deliveryRepo = AppDataSource.getRepository(DeliveryZona);
    
    const zonas = await deliveryRepo.find({
      where: {
        zona: Like(`%${zonaBuscada}%`),
        disponible: true
      }
    });
    
    return zonas;
  }

  // Listar todas las categorías
  static async listarCategorias() {
    const categoriaRepo = AppDataSource.getRepository(Categoria);
    return await categoriaRepo.find();
  }

  // Obtener todos los productos disponibles
  static async listarProductosDisponibles() {
    const productoRepo = AppDataSource.getRepository(Producto);
    
    return await productoRepo.find({
      where: { disponible: true },
      relations: ['categoria'],
      order: { categoria: { nombre: 'ASC' }, nombre: 'ASC' }
    });
  }
}