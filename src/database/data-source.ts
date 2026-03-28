import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Categoria } from './entities/Categoria';
import { Producto } from './entities/Producto';
import { DeliveryZona } from './entities/DeliveryZona';
import { Pedido } from './entities/Pedido';

// Cargar variables de entorno
config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: true, // IMPORTANTE: en producción debe ser false
  logging: false,
  entities: [Categoria, Producto, DeliveryZona, Pedido],
  migrations: ['src/database/migrations/**/*.ts'],
  subscribers: [],
  ssl: {
    rejectUnauthorized: false // Necesario para Render
  }
});