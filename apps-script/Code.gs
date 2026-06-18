/**
 * Bellas — Backend de administración del catálogo
 *
 * Web App de Google Apps Script que expone 4 acciones sobre la hoja conectada:
 *   - list          → devuelve todos los productos (incluyendo archivados)
 *   - create        → agrega una fila nueva
 *   - update        → actualiza una fila por id (= número de fila en el Sheet)
 *   - archive       → marca una fila como estado=archivado (soft delete)
 *
 * Auth: cada request debe incluir { password: "<ADMIN_PASSWORD>" } en el body.
 * La password se configura en Project Settings → Script Properties → ADMIN_PASSWORD.
 *
 * Despliegue: ver apps-script/README.md
 */

// Las columnas del Sheet, en el orden esperado. Si cambias el orden en el Sheet
// no toques esto — el script igual busca por nombre en la fila de encabezados.
const COLUMNAS = [
  'nombre', 'descripcion', 'categoria', 'precio',
  'imagen', 'imagen2', 'imagen3', 'imagen4',
  'estado', 'sku', 'cantidad'
];

/**
 * Punto de entrada para POST. Toda la API entra por aquí.
 * El body se envía como text/plain con JSON adentro (evita preflight CORS).
 */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const expectedPassword = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');

    if (!expectedPassword) {
      return jsonResponse({ ok: false, error: 'ADMIN_PASSWORD no configurado en Script Properties' });
    }
    if (body.password !== expectedPassword) {
      return jsonResponse({ ok: false, error: 'Password incorrecta' });
    }

    const action = body.action;
    if (action === 'list')    return jsonResponse(listProductos());
    if (action === 'create')  return jsonResponse(crearProducto(body.producto));
    if (action === 'update')  return jsonResponse(actualizarProducto(body.id, body.producto));
    if (action === 'archive') return jsonResponse(archivarProducto(body.id));

    return jsonResponse({ ok: false, error: 'Acción desconocida: ' + action });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err && err.message || err) });
  }
}

/**
 * GET sin parámetros responde un ping para verificar que la URL es correcta
 * después del deploy. No expone datos.
 */
function doGet() {
  return jsonResponse({ ok: true, message: 'Bellas admin API activa. Usar POST.' });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Devuelve un mapa { nombre_columna → indice } leído de la fila 1.
 * Tolera mayúsculas/minúsculas y espacios.
 */
function getColumnIndex(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach((h, i) => {
    const norm = String(h || '').toLowerCase().trim();
    if (norm) map[norm] = i;
  });
  return map;
}

function getSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
}

/**
 * Lee todos los productos del Sheet y los devuelve como array.
 * El id de cada producto es el número de fila (1-indexed, igual que ?p=N).
 */
function listProductos() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { ok: true, productos: [] };

  const idx = getColumnIndex(sheet);
  const numCols = sheet.getLastColumn();
  const data = sheet.getRange(2, 1, lastRow - 1, numCols).getValues();

  const productos = [];
  data.forEach((row, i) => {
    const nombre = String(row[idx.nombre] || '').trim();
    if (!nombre) return; // saltar filas vacías
    productos.push({
      id: i + 2, // +2 porque empezamos en fila 2 y queremos el número de fila real
      nombre: nombre,
      descripcion: String(row[idx.descripcion] || ''),
      categoria: String(row[idx.categoria] || ''),
      precio: String(row[idx.precio] || ''),
      imagen: String(row[idx.imagen] || ''),
      imagen2: String(row[idx.imagen2] || ''),
      imagen3: String(row[idx.imagen3] || ''),
      imagen4: String(row[idx.imagen4] || ''),
      estado: String(row[idx.estado] || ''),
      sku: String(row[idx.sku] || ''),
      cantidad: String(row[idx.cantidad] || '')
    });
  });
  return { ok: true, productos: productos };
}

/**
 * Agrega un producto al final del Sheet. Devuelve el id (= nº de fila) creado.
 */
function crearProducto(producto) {
  if (!producto || !String(producto.nombre || '').trim()) {
    return { ok: false, error: 'El nombre es obligatorio' };
  }
  const sheet = getSheet();
  const idx = getColumnIndex(sheet);
  const numCols = sheet.getLastColumn();

  // Buscamos la primera fila vacía después de la última con datos.
  // sheet.getLastRow() puede dar una fila ocupada; appendRow va al final real.
  const fila = new Array(numCols).fill('');
  COLUMNAS.forEach(col => {
    if (idx[col] !== undefined && producto[col] !== undefined) {
      fila[idx[col]] = producto[col];
    }
  });
  sheet.appendRow(fila);
  const nuevaFila = sheet.getLastRow();
  return { ok: true, id: nuevaFila };
}

/**
 * Actualiza los campos provistos en la fila `id`. Los campos no incluidos
 * en `producto` se dejan intactos.
 */
function actualizarProducto(id, producto) {
  const fila = parseInt(id, 10);
  if (!fila || fila < 2) return { ok: false, error: 'id inválido' };
  if (!producto) return { ok: false, error: 'Faltan datos del producto' };

  const sheet = getSheet();
  if (fila > sheet.getLastRow()) return { ok: false, error: 'La fila no existe' };

  const idx = getColumnIndex(sheet);
  COLUMNAS.forEach(col => {
    if (idx[col] !== undefined && producto[col] !== undefined) {
      sheet.getRange(fila, idx[col] + 1).setValue(producto[col]);
    }
  });
  return { ok: true, id: fila };
}

/**
 * Soft delete: marca la fila con estado=archivado.
 * Mantiene la fila para no romper links compartidos ?p=N.
 */
function archivarProducto(id) {
  const fila = parseInt(id, 10);
  if (!fila || fila < 2) return { ok: false, error: 'id inválido' };

  const sheet = getSheet();
  if (fila > sheet.getLastRow()) return { ok: false, error: 'La fila no existe' };

  const idx = getColumnIndex(sheet);
  if (idx.estado === undefined) return { ok: false, error: 'Falta la columna "estado"' };

  sheet.getRange(fila, idx.estado + 1).setValue('archivado');
  return { ok: true, id: fila };
}
