const API_URL = 'https://evolution-api-tommy.onrender.com';
const API_KEY = 'mascotiendatommy';
const INSTANCE_NAME = 'tommy_bot';

// Verificar estado
async function checkInstanceStatus() {
  try {
    const response = await fetch(`${API_URL}/instance/connectionState/${INSTANCE_NAME}`, {
      method: 'GET',
      headers: {
        'apikey': API_KEY,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(30000) // 30 segundos timeout
    });
    
    const data = await response.json();
    console.log('Estado de la instancia:', data);
    return data;
  } catch (error) {
    console.error('Error verificando estado:', error.message);
  }
}

// Enviar mensaje con retry
async function sendTextMessage(phoneNumber, message, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Intento ${i + 1} de ${retries}`);
      console.log('Enviando a:', phoneNumber);
      
      const response = await fetch(`${API_URL}/message/sendText/${INSTANCE_NAME}`, {
        method: 'POST',
        headers: {
          'apikey': API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          number: phoneNumber,
          text: message
        }),
        signal: AbortSignal.timeout(30000) // 30 segundos timeout
      });
      
      console.log('Status HTTP:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ Mensaje enviado exitosamente:', data);
      return data;
      
    } catch (error) {
      console.error(`❌ Error en intento ${i + 1}:`, error.message);
      
      if (i < retries - 1) {
        console.log('Reintentando en 3 segundos...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }
  
  console.error('❌ Falló después de todos los intentos');
}

// Ejecutar
async function main() {
  await checkInstanceStatus();
  
  // Esperar 2 segundos antes de enviar
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // REEMPLAZA CON TU NÚMERO (formato: código país + número sin espacios)
  await sendTextMessage('584245620837', '¡Hola! Mensaje de prueba 🐾');
}

main();