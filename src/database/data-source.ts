import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Categoria } from './entities/Categoria';
import { Producto } from './entities/Producto';
import { DeliveryZona } from './entities/DeliveryZona';

// Cargar variables de entorno
config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  synchronize: true, // IMPORTANTE: en producción debe ser false
  logging: false, // Para ver las queries SQL en consola
  entities: [Categoria, Producto, DeliveryZona],
  migrations: ['src/database/migrations/**/*.ts'],
  subscribers: [],
  ssl: {
    rejectUnauthorized: false // Necesario para Render
  }
});