require('dotenv').config();
const express = require('express');
const cors = require('cors');
const filesRouter = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, servicio: 'sunat-files-service', timestamp: new Date().toISOString() });
});

// Rutas de archivos
app.use('/files', filesRouter);

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`✅ sunat-files-service corriendo en puerto ${PORT}`);
  console.log(`   SFTP -> ${process.env.SFTP_HOST}:${process.env.SFTP_PORT}`);
  console.log(`   Ruta base -> ${process.env.SFTP_BASE_PATH}`);
});
