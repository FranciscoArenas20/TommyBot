import express from 'express';
import cors from 'cors';
import { DatabaseQueries } from '../database/queries';
import { AppDataSource } from '../database/data-source';

const app = express();

app.use(cors());
app.use(express.json());

//Middleware para verificar conexión BD
app.use((req, res, next) => {
  if (!AppDataSource.isInitialized) {
    return res.status(503).json({ 
      error: 'Base de datos no disponible',
      message: 'El servidor está iniciando, intenta de nuevo en unos segundos'
    });
  }
  next();
});
// Ruta de health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API funcionando' });
});

// Buscar producto
app.get('/api/productos/buscar', async (req, res) => {
  try {
    const { nombre } = req.query;
    
    if (!nombre) {
      return res.status(400).json({ error: 'Parámetro "nombre" requerido' });
    }
    
    const productos = await DatabaseQueries.buscarProducto(nombre as string);
    res.json({ productos });
  } catch (error) {
    console.error('Error buscando producto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Listar productos por categoría
app.get('/api/productos/categoria/:categoria', async (req, res) => {
  try {
    const { categoria } = req.params;
    const productos = await DatabaseQueries.obtenerProductosPorCategoria(categoria);
    res.json({ productos });
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Listar todos los productos disponibles
app.get('/api/productos', async (req, res) => {
  try {
    const productos = await DatabaseQueries.listarProductosDisponibles();
    res.json({ productos });
  } catch (error) {
    console.error('Error listando productos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Buscar zona de delivery
app.get('/api/delivery/buscar', async (req, res) => {
  try {
    const { zona } = req.query;
    
    if (!zona) {
      return res.status(400).json({ error: 'Parámetro "zona" requerido' });
    }
    
    const zonas = await DatabaseQueries.buscarZonaDelivery(zona as string);
    res.json({ zonas });
  } catch (error) {
    console.error('Error buscando zona:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export { app };