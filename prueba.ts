import { config } from 'dotenv';

config();

async function listModels() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('❌ GEMINI_API_KEY no está configurada en .env');
      return;
    }

    console.log('🔑 Usando API Key:', apiKey.substring(0, 10) + '...');
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Error:', response.status, error);
      return;
    }
    
    const data: any = await response.json(); // ← Agregado ": any"
    
    console.log('\n📋 Modelos disponibles:\n');
    
    data.models.forEach((model: any) => {
      if (model.supportedGenerationMethods?.includes('generateContent')) {
        console.log(`✅ ${model.name}`);
        console.log(`   Display: ${model.displayName}`);
        console.log(`   Métodos: ${model.supportedGenerationMethods.join(', ')}`);
        console.log('');
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

listModels();