const express = require('express');
const multer = require('multer');
const { downloadFile, listFiles, fileExists } = require('./sftp');
const { encolar, estadoCola } = require('./queue');

const router = express.Router();

// Multer en memoria (no guarda en disco local)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB máximo
  fileFilter: (req, file, cb) => {
    if (!file.originalname.endsWith('.zip')) {
      return cb(new Error('Solo se permiten archivos ZIP'));
    }
    cb(null, true);
  },
});

/**
 * POST /files/upload
 * Encola un ZIP para subir al VPS en segundo plano
 *
 * Body (multipart/form-data):
 *   - file: archivo .zip
 *   - ruc: RUC de la empresa (ej: 20123456789)
 *   - tipo: tipo de comprobante (ej: facturas, boletas)
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { ruc, tipo } = req.body;

    if (!req.file) return res.status(400).json({ error: 'No se envió ningún archivo' });
    if (!ruc) return res.status(400).json({ error: 'El campo ruc es requerido' });
    if (!tipo) return res.status(400).json({ error: 'El campo tipo es requerido' });
    if (!/^\d{11}$/.test(ruc)) return res.status(400).json({ error: 'RUC inválido, debe tener 11 dígitos' });

    const filename = req.file.originalname;

    // Encola el archivo — responde inmediato al usuario
    encolar({ ruc, tipo, filename, buffer: req.file.buffer });

    return res.status(202).json({
      ok: true,
      mensaje: 'Archivo recibido y en cola de envío',
      archivo: filename,
      ruc,
      tipo,
    });
  } catch (err) {
    console.error('[UPLOAD ERROR]', err.message);
    return res.status(500).json({ error: 'Error al recibir el archivo', detalle: err.message });
  }
});

/**
 * GET /files/cola
 * Estado actual de la cola de uploads
 */
router.get('/cola', (req, res) => {
  res.json({ ok: true, ...estadoCola() });
});

/**
 * GET /files/:ruc/:tipo
 * Lista todos los ZIPs de una carpeta
 * 
 * Ejemplo: GET /files/20123456789/facturas
 */
router.get('/:ruc/:tipo', async (req, res) => {
  try {
    const { ruc, tipo } = req.params;

    if (!/^\d{11}$/.test(ruc)) return res.status(400).json({ error: 'RUC inválido' });

    const archivos = await listFiles(ruc, tipo);

    return res.json({
      ok: true,
      ruc,
      tipo,
      total: archivos.length,
      archivos,
    });
  } catch (err) {
    console.error('[LIST ERROR]', err.message);
    return res.status(500).json({ error: 'Error al listar archivos', detalle: err.message });
  }
});

/**
 * GET /files/:ruc/:tipo/:filename
 * Descarga un ZIP específico
 * 
 * Ejemplo: GET /files/20123456789/facturas/F001-1.zip
 */
router.get('/:ruc/:tipo/:filename', async (req, res) => {
  try {
    const { ruc, tipo, filename } = req.params;

    if (!/^\d{11}$/.test(ruc)) return res.status(400).json({ error: 'RUC inválido' });
    if (!filename.endsWith('.zip')) return res.status(400).json({ error: 'Solo se pueden descargar archivos ZIP' });

    const existe = await fileExists(ruc, tipo, filename);
    if (!existe) return res.status(404).json({ error: 'Archivo no encontrado' });

    const buffer = await downloadFile(ruc, tipo, filename);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (err) {
    console.error('[DOWNLOAD ERROR]', err.message);
    return res.status(500).json({ error: 'Error al descargar el archivo', detalle: err.message });
  }
});

module.exports = router;
