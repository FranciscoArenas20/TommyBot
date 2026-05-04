import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from 'dotenv';

config()

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

export class GeminiService {
  
  // Analizar intención del mensaje
  static async analizarMensaje(mensaje: string) {
    const prompt = `
Eres un asistente de una tienda de mascotas llamada Mascotienda Tommy.

Analiza el siguiente mensaje del cliente y extrae información estructurada en formato JSON.

Categorías de intención:
- "consulta_precio": pregunta por precio de productos
- "consulta_producto": pregunta por disponibilidad de productos
- "consulta_delivery": pregunta por delivery/envío
- "consulta_horario": pregunta por horarios
- "pedido": quiere hacer un pedido
- "saludo": solo saluda
- "otro": otros temas

Categorías de productos que maneja la tienda:
- "Gatarina": alimentos para gatos (Mirringo, Donkat, 9lives, Gatsy, Cipacat)
- "Perrarina": alimentos para perros (DogChow, Ringo, Filpo, Supercan, Knina)
- "Medicamentos": desparasitantes, antipulgas y otros
- "Accesorios": peines, pecheras, collares y más
- "Juguetes": juguetes para mascotas

REGLA IMPORTANTE: Si el usuario menciona una categoría de producto (como "gatarina", "perrarina", "accesorios", "juguetes", "medicamentos"), extráela en el campo "categoria". NO la pongas en "productos". Solo pon marcas/nombres específicos en "productos".

Ejemplos:
- "cuales gatarinas tienes" → {"intencion": "consulta_producto", "productos": [], "categoria": "Gatarina"}
- "tienes Mirringo?" → {"intencion": "consulta_producto", "productos": ["Mirringo"], "categoria": null}
- "qué comida para gatos hay" → {"intencion": "consulta_producto", "productos": [], "categoria": "Gatarina"}

Si menciona zona/ubicación, extráela.
Si menciona cantidad, extráela.

Mensaje del cliente: "${mensaje}"

Responde SOLO con JSON válido en este formato:
{
  "intencion": "categoria_de_intencion",
  "productos": ["producto1", "producto2"],
  "categoria": "categoria mencionada o null",
  "zona": "zona mencionada o null",
  "cantidad": numero o null,
  "confianza": 0.0 a 1.0
}
`;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      // Limpiar markdown si viene con ```json
      const cleanJson = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      return JSON.parse(cleanJson);
    } catch (error) {
      console.error('Error analizando mensaje:', error);
      return {
        intencion: 'otro',
        productos: [],
        categoria: null,
        zona: null,
        cantidad: null,
        confianza: 0
      };
    }
  }

  // Generar respuesta personalizada
  static async generarRespuesta(contexto: {
    mensajeCliente: string;
    intencion: string;
    categoria?: string;
    productos?: any[];
    productosRelacionados?: any[];
    zonasDelivery?: any[];
  }) {
    const prompt = `
Eres el asistente virtual de Mascotienda Tommy, una tienda de comida para mascotas.

Contexto:
- Mensaje del cliente: "${contexto.mensajeCliente}"
- Intención detectada: ${contexto.intencion}
${contexto.categoria ? `- Categoría solicitada: ${contexto.categoria}` : ''}
${contexto.productos && contexto.productos.length > 0 ? `- Productos encontrados en la base de datos: ${JSON.stringify(contexto.productos)}` : ''}
${contexto.productosRelacionados && contexto.productosRelacionados.length > 0 ? `- Productos relacionados de la misma categoría: ${JSON.stringify(contexto.productosRelacionados)}` : ''}
${contexto.zonasDelivery && contexto.zonasDelivery.length > 0 ? `- Zonas de delivery: ${JSON.stringify(contexto.zonasDelivery)}` : ''}

REGLAS ABSOLUTAS - NO PUEDES VIOLARLAS:
1. NUNCA inventes nombres de productos que no estén en los datos proporcionados arriba.
2. NUNCA inventes precios. Si un producto tiene precio "0.00" o null, NO digas un precio inventado.
3. Si los productos encontrados tienen precio 0.00, di que están disponibles pero que el precio debe consultarse directamente.
4. SOLO usa la información que te doy en el contexto. Si no hay datos sobre un producto, NO lo menciones.

CASO ESPECIAL - Producto no encontrado:
Si el usuario preguntó por un producto específico y NO aparece en "productos encontrados", responde EXACTAMENTE con este formato:
"No, lo siento, actualmente ese producto no está disponible, pero puedo ofrecerte: [lista de productosRelacionados con sus nombres]"
Los productos relacionados son alternativas de la misma categoría que SÍ están disponibles.

Genera una respuesta amigable, profesional y útil para el cliente.
Usa emojis apropiados (🐾 🐕 🐈 💰 🚚).
Responde de forma conversacional, como un vendedor amable en WhatsApp.
Máximo 3-4 líneas.
`;

    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('Error generando respuesta:', error);
      return 'Disculpa, tuve un problema procesando tu mensaje. ¿Puedes intentar de nuevo? 🙏';
    }
  }
}