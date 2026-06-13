const { uploadFile } = require('./sftp');

const MAX_REINTENTOS = 3;
const ESPERAS_MS = [5000, 15000, 30000]; // 5s, 15s, 30s entre reintentos

// Cola simple en memoria
const cola = [];
let procesando = false;

/**
 * Agrega un archivo a la cola y arranca el procesamiento
 */
function encolar({ ruc, tipo, entorno, filename, buffer }) {
  cola.push({ ruc, tipo, entorno, filename, buffer, intentos: 0 });
  console.log(`[COLA] Encolado: ${filename} (${cola.length} en cola)`);
  procesarCola();
}

/**
 * Procesa la cola uno a uno
 */
async function procesarCola() {
  if (procesando || cola.length === 0) return;
  procesando = true;

  while (cola.length > 0) {
    const tarea = cola[0];
    const { ruc, tipo, entorno, filename, buffer } = tarea;

    try {
      await uploadFile(ruc, tipo, filename, buffer, entorno);
      console.log(`[COLA ✅] Subido correctamente: ${filename}`);
      cola.shift(); // Elimina de la cola solo si tuvo éxito
    } catch (err) {
      tarea.intentos++;
      console.error(`[COLA ❌] Intento ${tarea.intentos}/${MAX_REINTENTOS} fallido para ${filename}: ${err.message}`);

      if (tarea.intentos >= MAX_REINTENTOS) {
        console.error(`[COLA 🚨] Se agotaron los reintentos para ${filename}. Descartando.`);
        cola.shift(); // Descarta después de MAX_REINTENTOS
      } else {
        const espera = ESPERAS_MS[tarea.intentos - 1] || 30000;
        console.log(`[COLA ⏳] Reintentando ${filename} en ${espera / 1000}s...`);
        await sleep(espera);
      }
    }
  }

  procesando = false;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Estado actual de la cola (para monitoreo)
 */
function estadoCola() {
  return {
    enCola: cola.length,
    procesando,
    archivos: cola.map(t => ({
      archivo: t.filename,
      ruc: t.ruc,
      tipo: t.tipo,
      entorno: t.entorno,
      intentos: t.intentos,
    })),
  };
}

module.exports = { encolar, estadoCola };
