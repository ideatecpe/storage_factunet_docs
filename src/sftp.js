const SftpClient = require('ssh2-sftp-client');

const sftpConfig = {
  host: process.env.SFTP_HOST,
  port: parseInt(process.env.SFTP_PORT) || 22,
  username: process.env.SFTP_USER,
  password: process.env.SFTP_PASSWORD,
};

const BASE_PATH = process.env.SFTP_BASE_PATH || '/Facturacion';

/**
 * Normaliza el tipo de comprobante a nombre de carpeta
 * Ej: "factura" -> "facturas", "BOLETA" -> "boletas"
 */
function normalizeTipo(tipo) {
  const mapa = {
    factura: 'facturas',
    facturas: 'facturas',
    boleta: 'boletas',
    boletas: 'boletas',
    'nota-credito': 'notas-credito',
    'notas-credito': 'notas-credito',
    'nota-debito': 'notas-debito',
    'notas-debito': 'notas-debito',
    'guia-remision': 'guias-remision',
    'guias-remision': 'guias-remision',
  };
  return mapa[tipo.toLowerCase()] || tipo.toLowerCase();
}

/**
 * Construye la ruta remota: /Facturacion/{entorno}/{ruc}/{tipo}/
 */
function buildRemotePath(ruc, tipo, filename = '', entorno = '') {
  const tipoNorm = normalizeTipo(tipo);
  const base = entorno
    ? `${BASE_PATH}/${entorno}/${ruc}/${tipoNorm}`
    : `${BASE_PATH}/${ruc}/${tipoNorm}`;
  return filename ? `${base}/${filename}` : base;
}

/**
 * Asegura que la carpeta remota exista, creándola si es necesario
 */
async function ensureRemoteDir(sftp, remotePath) {
  try {
    await sftp.mkdir(remotePath, true); // true = recursive
  } catch (err) {
    // Si ya existe, no es error
    if (!err.message.includes('already exists')) {
      throw err;
    }
  }
}

/**
 * Sube un archivo ZIP al VPS via SFTP
 * @param {string} ruc - RUC de la empresa
 * @param {string} tipo - Tipo de comprobante
 * @param {string} filename - Nombre del archivo (ej: F001-1.zip)
 * @param {Buffer} fileBuffer - Contenido del archivo
 */
async function uploadFile(ruc, tipo, filename, fileBuffer, entorno = '') {
  const sftp = new SftpClient();
  try {
    await sftp.connect(sftpConfig);
    const remotDir = buildRemotePath(ruc, tipo, '', entorno);
    await ensureRemoteDir(sftp, remotDir);
    const remotePath = buildRemotePath(ruc, tipo, filename, entorno);
    await sftp.put(fileBuffer, remotePath);
    return { success: true, path: remotePath };
  } finally {
    await sftp.end();
  }
}

/**
 * Descarga un archivo ZIP del VPS via SFTP
 * @returns {Buffer} contenido del archivo
 */
async function downloadFile(ruc, tipo, filename) {
  const sftp = new SftpClient();
  try {
    await sftp.connect(sftpConfig);
    const remotePath = buildRemotePath(ruc, tipo, filename);
    const buffer = await sftp.get(remotePath);
    return buffer;
  } finally {
    await sftp.end();
  }
}

/**
 * Lista los archivos ZIP de una carpeta en el VPS
 * @returns {Array} lista de archivos con nombre, tamaño y fecha
 */
async function listFiles(ruc, tipo) {
  const sftp = new SftpClient();
  try {
    await sftp.connect(sftpConfig);
    const remotePath = buildRemotePath(ruc, tipo);

    // Verifica si la carpeta existe
    const exists = await sftp.exists(remotePath);
    if (!exists) return [];

    const files = await sftp.list(remotePath);
    return files
      .filter(f => f.name.endsWith('.zip'))
      .map(f => ({
        nombre: f.name,
        tamaño: f.size,
        fecha: new Date(f.modifyTime).toLocaleString('es-PE', { timeZone: 'America/Lima' }),
        ruta: buildRemotePath(ruc, tipo, f.name),
      }));
  } finally {
    await sftp.end();
  }
}

/**
 * Verifica si un archivo existe en el VPS
 */
async function fileExists(ruc, tipo, filename) {
  const sftp = new SftpClient();
  try {
    await sftp.connect(sftpConfig);
    const remotePath = buildRemotePath(ruc, tipo, filename);
    const exists = await sftp.exists(remotePath);
    return !!exists;
  } finally {
    await sftp.end();
  }
}

module.exports = { uploadFile, downloadFile, listFiles, fileExists, buildRemotePath };
