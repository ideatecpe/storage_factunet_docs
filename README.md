# sunat-files-service

Microservicio Node.js para gestión de archivos SUNAT (ZIPs) vía SFTP.

## Estructura de carpetas en VPS

```
C:\Facturacion\
  └── 20123456789\        ← RUC empresa
        ├── facturas\
        │     ├── F001-1.zip
        │     └── F001-2.zip
        ├── boletas\
        ├── notas-credito\
        └── notas-debito\
```

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /health | Estado del servicio |
| POST | /files/upload | Subir un ZIP |
| GET | /files/:ruc/:tipo | Listar ZIPs de una carpeta |
| GET | /files/:ruc/:tipo/:filename | Descargar un ZIP |

---

## Ejemplos de uso

### Subir un ZIP (desde backend Node.js)

```javascript
const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

const form = new FormData();
form.append('file', fs.createReadStream('./F001-1.zip'), 'F001-1.zip');
form.append('ruc', '20123456789');
form.append('tipo', 'facturas');

const res = await fetch('http://TU_DROPLET_IP:3000/files/upload', {
  method: 'POST',
  body: form,
  headers: form.getHeaders(),
});
const data = await res.json();
console.log(data);
// { ok: true, archivo: 'F001-1.zip', ruc: '20123456789', tipo: 'facturas', ruta: '/Facturacion/20123456789/facturas/F001-1.zip' }
```

### Subir un ZIP (desde frontend con fetch)

```javascript
const formData = new FormData();
formData.append('file', zipFile); // zipFile es un objeto File del input
formData.append('ruc', '20123456789');
formData.append('tipo', 'facturas');

const res = await fetch('http://TU_DROPLET_IP:3000/files/upload', {
  method: 'POST',
  body: formData,
});
const data = await res.json();
```

### Listar ZIPs de una empresa

```javascript
const res = await fetch('http://TU_DROPLET_IP:3000/files/20123456789/facturas');
const data = await res.json();
// {
//   ok: true, ruc: '20123456789', tipo: 'facturas', total: 2,
//   archivos: [
//     { nombre: 'F001-1.zip', tamaño: 4096, fecha: '2026-05-07T...' },
//     { nombre: 'F001-2.zip', tamaño: 3800, fecha: '2026-05-07T...' }
//   ]
// }
```

### Descargar un ZIP

```javascript
const res = await fetch('http://TU_DROPLET_IP:3000/files/20123456789/facturas/F001-1.zip');
const buffer = await res.arrayBuffer();
// Guardar o procesar el ZIP
```

---

## Despliegue en Droplet

### 1. Clona o sube el proyecto al droplet

```bash
scp -r ./sunat-files-service root@TU_DROPLET_IP:/opt/sunat-files-service
```

### 2. Asegúrate que el .env esté en el servidor (no sube con git)

```bash
# En el droplet
cd /opt/sunat-files-service
nano .env   # llena con tus valores
```

### 3. Levanta con Docker Compose

```bash
docker-compose up -d --build
```

### 4. Verifica que corra

```bash
curl http://localhost:3000/health
```

---

## Tipos de comprobante aceptados

| Valor enviado | Carpeta creada |
|--------------|----------------|
| factura / facturas | facturas |
| boleta / boletas | boletas |
| nota-credito / notas-credito | notas-credito |
| nota-debito / notas-debito | notas-debito |
| guia-remision / guias-remision | guias-remision |
