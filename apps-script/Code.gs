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

// Mapeo de nombre de categoría → slug para construir la ruta de la imagen
// dentro del repo (fotos/<slug>/<SKU>.jpg). Tiene que coincidir con el
// frontend (CATEGORIA_SLUGS en index.html).
const CATEGORIA_SLUGS = {
  'Maquillaje': 'maquillaje',
  'Skin Care':  'skin-care',
  'Cabello':    'cabello',
  'Accesorios': 'accesorios',
  'Perfume':    'perfume',
  'Vestimenta': 'vestimenta'
};

// Sufijos de archivo según el slot de imagen (0 = principal, 1/2/3 = adicionales)
const SLOT_SUFIJOS = ['', '-b', '-c', '-d'];

// Dominio público donde GitHub Pages sirve los archivos. Usado para construir
// la URL final que se guarda en el Sheet.
const PUBLIC_DOMAIN = 'https://bellassc.store';

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
    if (action === 'upload')  return jsonResponse(subirImagen(body));

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

/**
 * Sube una imagen al repo de GitHub usando la Contents API.
 * El archivo se guarda en fotos/<slug-categoria>/<SKU><sufijo>.<ext>
 * y se devuelve la URL pública (servida por GitHub Pages).
 *
 * Espera en el body:
 *   categoria: 'Maquillaje' | 'Skin Care' | ... (nombre exacto del Sheet)
 *   sku:       'MAQ-0001'
 *   ext:       'jpg' | 'png' | 'webp' (lowercase)
 *   slot:      0 = principal, 1 = -b, 2 = -c, 3 = -d
 *   content:   base64 del archivo (sin prefijo data:...)
 *
 * Requiere en Script Properties:
 *   GITHUB_TOKEN  → PAT fine-grained con permiso 'Contents: read & write' sobre el repo
 *   GITHUB_REPO   → 'fromerito/bellas-store' (owner/repo)
 *   GITHUB_BRANCH → 'main' (opcional, default 'main')
 */
function subirImagen(body) {
  const props = PropertiesService.getScriptProperties();
  const token  = props.getProperty('GITHUB_TOKEN');
  const repo   = props.getProperty('GITHUB_REPO');
  const branch = props.getProperty('GITHUB_BRANCH') || 'main';

  if (!token || !repo) {
    return { ok: false, error: 'Faltan GITHUB_TOKEN o GITHUB_REPO en Script Properties' };
  }

  const categoria = String(body.categoria || '').trim();
  const sku       = String(body.sku || '').trim().toUpperCase();
  const ext       = String(body.ext || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const slot      = parseInt(body.slot, 10) || 0;
  const content   = String(body.content || '');

  if (!CATEGORIA_SLUGS[categoria]) {
    return { ok: false, error: 'Categoría inválida: ' + categoria };
  }
  if (!/^[A-Z]{3}-\d{4}$/.test(sku)) {
    return { ok: false, error: 'SKU inválido (formato esperado: XXX-NNNN)' };
  }
  if (!['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
    return { ok: false, error: 'Extensión no permitida: ' + ext };
  }
  if (slot < 0 || slot > 3) {
    return { ok: false, error: 'Slot inválido (0-3)' };
  }
  if (!content) {
    return { ok: false, error: 'Falta el contenido del archivo' };
  }

  const slug = CATEGORIA_SLUGS[categoria];
  const sufijo = SLOT_SUFIJOS[slot];
  const path = `fotos/${slug}/${sku}${sufijo}.${ext}`;
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}`;

  // Si el archivo ya existe, necesitamos su SHA para sobrescribir.
  let existingSha = null;
  const getRes = UrlFetchApp.fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
    method: 'get',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    muteHttpExceptions: true
  });
  if (getRes.getResponseCode() === 200) {
    existingSha = JSON.parse(getRes.getContentText()).sha;
  } else if (getRes.getResponseCode() !== 404) {
    return { ok: false, error: 'GitHub GET ' + getRes.getResponseCode() + ': ' + getRes.getContentText().substring(0, 200) };
  }

  const payload = {
    message: `admin: ${existingSha ? 'reemplaza' : 'agrega'} ${path}`,
    content: content,
    branch: branch
  };
  if (existingSha) payload.sha = existingSha;

  const putRes = UrlFetchApp.fetch(apiUrl, {
    method: 'put',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  const putCode = putRes.getResponseCode();
  if (putCode < 200 || putCode >= 300) {
    return { ok: false, error: 'GitHub PUT ' + putCode + ': ' + putRes.getContentText().substring(0, 200) };
  }

  // Bust de cache del navegador: agregamos timestamp para que la imagen
  // se vea actualizada incluso si se reemplazó.
  const url = `${PUBLIC_DOMAIN}/${path}?v=${Date.now()}`;
  return { ok: true, url: url, path: path, replaced: !!existingSha };
}
