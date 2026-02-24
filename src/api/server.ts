import express from 'express';
import cors from 'cors';
import { DatabaseQueries } from '../database/queries';
import { AppDataSource } from '../database/data-source';
import { GeminiService } from '../ai/gemini';
import { DeliveryZona } from '../database/entities/DeliveryZona';
import { Pedido } from '../database/entities/Pedido';

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

// app.get('/products', async (req, res) => {
//   try {
//     return res.status(200).
//   }
// })

app.post('/api/chat/inteligente', async (req, res) => {
  try {
    const { mensaje, clientNumber } = req.body;
    
    if (!mensaje) {
      return res.status(400).json({ error: 'Parámetro "mensaje" requerido' });
    }

    console.log(`📨 Mensaje recibido de ${clientNumber}: ${mensaje}`);

    // 1. Analizar intención con Gemini
    const analisis = await GeminiService.analizarMensaje(mensaje);
    console.log('🧠 Análisis IA:', analisis);

    let respuesta = '';
    let productos: any[] = [];
    let zonasDelivery: any[] = [];

    // 2. Ejecutar acciones según la intención
    switch (analisis.intencion) {
      case 'consulta_precio':
      case 'consulta_producto':
        // Buscar productos mencionados
        if (analisis.productos && analisis.productos.length > 0) {
          for (const nombreProducto of analisis.productos) {
            const productosEncontrados = await DatabaseQueries.buscarProducto(nombreProducto);
            productos.push(...productosEncontrados);
          }
        } else {
          // Si no mencionó productos específicos, mostrar todos
          productos = await DatabaseQueries.listarProductosDisponibles();
        }
        break;

      case 'consulta_delivery':
        // Buscar zona si la mencionó
        if (analisis.zona) {
          zonasDelivery = await DatabaseQueries.buscarZonaDelivery(analisis.zona);
        } else {
          // Mostrar todas las zonas
          const deliveryRepo = AppDataSource.getRepository(DeliveryZona);
          zonasDelivery = await deliveryRepo.find({ where: { disponible: true } });
        }
        break;

      case 'consulta_horario':
        respuesta = '🕐 Nuestro horario:\n\nLunes a Sábado: 8:00am - 6:00pm\nDomingos: 9:00am - 2:00pm\n\n¿En qué más te puedo ayudar? 🐾';
        break;

      case 'saludo':
        respuesta = '¡Hola! 👋 Bienvenido a Tommy Pet Food 🐾\n\n¿En qué te puedo ayudar hoy?\n\nPuedo informarte sobre:\n• Productos disponibles\n• Precios\n• Delivery\n• Horarios';
        break;

      case 'pedido':
        respuesta = '📦 ¡Genial! Para procesar tu pedido necesito:\n\n1️⃣ Producto(s) que deseas\n2️⃣ Cantidad\n3️⃣ Zona de entrega\n\n¿Me puedes dar estos detalles? 🐕';
        break;

      default:
        respuesta = 'Entiendo que tienes una consulta. ¿Podrías darme más detalles sobre qué necesitas? Puedo ayudarte con productos, precios, delivery y horarios 🐾';
    }

    // 3. Si no hay respuesta fija, generar con IA
    if (!respuesta) {
      respuesta = await GeminiService.generarRespuesta({
        mensajeCliente: mensaje,
        intencion: analisis.intencion,
        productos: productos.length > 0 ? productos : undefined,
        zonasDelivery: zonasDelivery.length > 0 ? zonasDelivery : undefined
      });
    }

    // 4. Responder
    res.json({
      respuesta,
      analisis,
      productos,
      zonasDelivery
    });

  } catch (error) {
    console.error('Error en chat inteligente:', error);
    res.status(500).json({ error: 'Error procesando mensaje' });
  }
});

// Crear pedido
app.post('/api/pedidos/crear', async (req, res) => {
  try {
    const { 
      clienteNombre, 
      clienteTelefono, 
      productos, 
      total, 
      zonaEntrega 
    } = req.body;

    const pedidoRepo = AppDataSource.getRepository(Pedido);
    
    const nuevoPedido = pedidoRepo.create({
      clienteNombre,
      clienteTelefono,
      productos: JSON.stringify(productos),
      total,
      zonaEntrega,
      estado: 'pendiente'
    });

    await pedidoRepo.save(nuevoPedido);

    res.json({ 
      success: true, 
      pedido: nuevoPedido 
    });

  } catch (error) {
    console.error('Error creando pedido:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

export { app };