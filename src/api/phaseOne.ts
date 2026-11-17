import { Router } from 'express';
import { Producto } from '../database/entities/Producto';
import { AppDataSource } from '../database/data-source';

export const phaseOne = Router();
const allowed = () => process.env.TOMMY_TEST_NUMBER;
const demoPrices: Record<string, number> = {
  Mirringo: 3.5, Donkat: 3, '9lives': 4, Gatsy: 4.5, Cipacat: 3.25,
  DogChow: 4, Ringo: 2.75, Filpo: 3, Supercan: 3.25, Knina: 4.25,
};

phaseOne.post('/api/evolution/incoming', async (req, res) => {
  if (!process.env.TOMMY_WEBHOOK_SECRET || req.get('x-tommy-secret') !== process.env.TOMMY_WEBHOOK_SECRET)
    return res.sendStatus(403);
  const { data, event, instance } = req.body || {};
  const key = data?.key;
  const jid = key?.remoteJid;
  const pn = typeof jid === 'string' && jid.endsWith('@lid') ? key.remoteJidAlt : jid;
  if (!allowed() || event !== 'messages.upsert' || instance !== 'Tommy Bot' ||
      key?.fromMe !== false || pn !== allowed() + '@s.whatsapp.net' ||
      !(data.message?.conversation || data.message?.extendedTextMessage?.text))
    return res.sendStatus(204);
  try {
    const sanitized = { event, instance, data: { ...data, key: { ...key, remoteJid: pn } } };
    const result = await fetch(process.env.TOMMY_N8N_WEBHOOK!, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(sanitized), signal: AbortSignal.timeout(20000),
    });
    return res.sendStatus(result.ok ? 200 : 502);
  } catch { return res.sendStatus(502); }
});

phaseOne.post('/api/chat/inteligente', async (req, res) => {
  const { mensaje, clientNumber } = req.body || {};
  const sender = String(clientNumber || '').replace(/^\+/, '').replace(/@s\.whatsapp\.net$/, '');
  if (!allowed() || sender !== allowed()) return res.sendStatus(403);
  if (typeof mensaje !== 'string' || !mensaje.trim()) return res.sendStatus(400);
  const items = await AppDataSource.getRepository(Producto).find({ relations: ['categoria'], order: { nombre: 'ASC' } });
  const words = mensaje.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  const has = (word: string) => (words as string[]).includes(word.toLowerCase());
  const named = items.filter(p => has(p.nombre));
  const category = items.filter(p => has(p.categoria.nombre) || (p.categoria.nombre === 'Gatarina' && /\bgatos?\b/i.test(mensaje)) || (p.categoria.nombre === 'Perrarina' && /\bperros?\b/i.test(mensaje)));
  const selected = named.length ? named : category.length ? category : items.filter(p => p.disponible);
  const lines = selected.map(p => {
    const price = Number(p.precioKilo) || demoPrices[p.nombre];
    return p.nombre + (p.disponible ? ' disponible' + (price ? ' · US$' + price.toFixed(2) + '/kg' + (Number(p.precioKilo) ? '' : ' (demo)') : ' · precio por confirmar') : ' agotado');
  });
  const respuesta = (named.length || category.length ? '' : 'Estos son los productos disponibles de Mascotienda Tommy.\n') + lines.join('\n');
  return res.json({ respuesta, analisis: { intencion: 'consulta_producto', productos: selected.map(p => p.nombre) }, productos: selected, productosRelacionados: [], zonasDelivery: [] });
});
