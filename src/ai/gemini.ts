import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from 'dotenv';

config()

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

export class GeminiService {
  
  // Analizar intención del mensaje
  static async analizarMensaje(mensaje: string) {
    const prompt = `
Eres un asistente de una tienda de mascotas llamada Tommy Pet Food.

Analiza el siguiente mensaje del cliente y extrae información estructurada en formato JSON.

Categorías de intención:
- "consulta_precio": pregunta por precio de productos
- "consulta_producto": pregunta por disponibilidad de productos
- "consulta_delivery": pregunta por delivery/envío
- "consulta_horario": pregunta por horarios
- "pedido": quiere hacer un pedido
- "saludo": solo saluda
- "otro": otros temas

Si menciona productos, extrae los nombres.
Si menciona zona/ubicación, extráela.
Si menciona cantidad, extráela.

Mensaje del cliente: "${mensaje}"

Responde SOLO con JSON válido en este formato:
{
  "intencion": "categoria_de_intencion",
  "productos": ["producto1", "producto2"],
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
    productos?: any[];
    zonasDelivery?: any[];
  }) {
    const prompt = `
Eres el asistente virtual de Tommy Pet Food, una tienda de comida para mascotas.

Contexto:
- Mensaje del cliente: "${contexto.mensajeCliente}"
- Intención detectada: ${contexto.intencion}
${contexto.productos ? `- Productos encontrados: ${JSON.stringify(contexto.productos)}` : ''}
${contexto.zonasDelivery ? `- Zonas de delivery: ${JSON.stringify(contexto.zonasDelivery)}` : ''}

Genera una respuesta amigable, profesional y útil para el cliente.
Usa emojis apropiados (🐾 🐕 🐈 💰 🚚).
Si hay productos, menciona nombres y precios.
Si aún no hay precios configurados (precio 0.00), menciona que están disponibles y pide que consulten por el precio específico.

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