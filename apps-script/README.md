# Bellas — Backend de admin (Google Apps Script)

Este script convierte tu Google Sheet en una API privada para que el panel
admin del sitio (`bellassc.store/#admin`) pueda **leer, crear, editar y
archivar** productos sin que tu amiga tenga que abrir el Sheet nunca más.

---

## 🚀 Deploy paso a paso (la primera vez)

### 1. Abrir el editor de Apps Script desde la Sheet
1. Abre la Google Sheet de productos de Bellas (la que está conectada al sitio).
2. Menú **Extensiones → Apps Script**. Se abre un editor en una pestaña nueva.
3. Si te pregunta el nombre del proyecto, ponle algo como `Bellas Admin API`.

### 2. Pegar el código
1. En el editor verás un archivo llamado `Código.gs` (o `Code.gs`) con una función vacía.
2. Borra todo lo que tenga.
3. Copia el contenido completo de `apps-script/Code.gs` de este repo y pégalo ahí.
4. Guarda con `Ctrl+S` (o el ícono de disquete).

### 3. Configurar las Script Properties

En el menú izquierdo del editor, clic en el ⚙️ (**Configuración del proyecto**).
Baja hasta la sección **Propiedades de la secuencia de comandos** (Script Properties)
y crea estas 4 propiedades:

| Propiedad | Valor | Para qué sirve |
|---|---|---|
| `ADMIN_PASSWORD` | Una contraseña fuerte | Login del panel admin |
| `GITHUB_TOKEN` | El PAT que generas en el paso 3.1 | Para que el GAS suba imágenes al repo |
| `GITHUB_REPO` | `fromerito/bellas-store` | Repo donde se guardan las fotos |
| `GITHUB_BRANCH` | `main` (opcional, default `main`) | Rama del repo |

Guarda las propiedades.

> 💡 La `ADMIN_PASSWORD` se la compartes con tu amiga. Si se filtra, vuelves
> aquí y la cambias en 10 segundos. El `GITHUB_TOKEN` nunca sale de esta
> pantalla — tu amiga nunca lo ve.

#### 3.1 Generar el PAT de GitHub (Personal Access Token)

El PAT es el "permiso" que el GAS usa para subir imágenes a tu repo. Lo creas
una sola vez:

1. Abre https://github.com/settings/personal-access-tokens
2. Clic en **Generate new token → Fine-grained personal access token**.
3. Completa el formulario:
   - **Token name:** `Bellas admin upload` (o lo que quieras)
   - **Expiration:** elige `1 year` (renovarás una vez al año)
   - **Repository access:** **Only select repositories** → elige `fromerito/bellas-store`
   - **Repository permissions:** baja hasta **Contents** → cambia a **Read and write**
4. Clic en **Generate token** (al final de la página).
5. Aparece el token, algo como `github_pat_11AAA...`. **Cópialo ahora**, porque
   no podrás verlo de nuevo.
6. Pégalo como valor de `GITHUB_TOKEN` en el paso anterior.

> ⚠️ Este token tiene permiso de escritura sobre tu repo. **No lo compartas**
> ni lo pegues en código que se sube al repo. El GAS lo guarda en Script
> Properties (privado de tu cuenta) — ese es el único lugar donde debería estar.

### 4. Desplegar como Web App
1. Esquina superior derecha → botón azul **Implementar → Nueva implementación**.
2. Clic en el ⚙️ junto a "Seleccionar tipo" → elige **Aplicación web**.
3. Completa el formulario:
   - **Descripción:** `Bellas admin API v1` (opcional)
   - **Ejecutar como:** *Yo* (`tu@gmail.com`)
   - **Quién tiene acceso:** **Cualquiera** (sí, está bien — la auth la hace nuestra password)
4. Clic en **Implementar**.
5. Google te pedirá permisos. Acepta:
   - "Revisar permisos" → tu cuenta → "Configuración avanzada" → "Ir a Bellas Admin API (no seguro)" → "Permitir".
   - Es "no seguro" para Google porque es un script tuyo no verificado, pero es tu propio código en tu propia cuenta. Normal.
6. Te muestra una **URL de la aplicación web**: cópiala. Es algo como:
   ```
   https://script.google.com/macros/s/AKfycby.../exec
   ```

### 5. Probar que funciona
Pega esa URL en una pestaña nueva del navegador. Debe responder:
```json
{"ok":true,"message":"Bellas admin API activa. Usar POST."}
```
Si ves eso, el backend está listo. 🎉

### 6. Conectar el sitio con el backend
1. Entra a `https://bellassc.store/#admin` en el navegador.
2. Te pedirá la URL del Web App (la que copiaste) y la `ADMIN_PASSWORD`.
3. Listo: ya puedes administrar productos desde el panel.

---

## 🔄 ¿Cómo actualizar el script más adelante?

Si cambio algo en `Code.gs`:

1. Copia el nuevo contenido y pégalo en el editor de Apps Script (reemplazando todo).
2. Guarda (`Ctrl+S`).
3. **Implementar → Gestionar implementaciones** → al lado de la implementación activa, clic en ✏️.
4. En "Versión", elige **Nueva versión** → **Implementar**.
5. La URL no cambia, así que el sitio sigue funcionando sin tocar nada más.

> ⚠️ Importante: si creas una **nueva implementación** en vez de actualizar la
> existente, la URL cambia y tendrás que reconfigurarla en el panel admin.

---

## 🔁 Renovar el PAT cuando vence

Si configuraste expiración de 1 año, GitHub te enviará un email cuando se
acerque la fecha. Para renovarlo:

1. Ve a https://github.com/settings/personal-access-tokens
2. Encuentra el token (`Bellas admin upload`).
3. Clic en su nombre → **Regenerate token** (o crea uno nuevo si prefieres).
4. Copia el nuevo valor.
5. Ve al editor de Apps Script → ⚙️ Configuración del proyecto → Script Properties.
6. Edita `GITHUB_TOKEN` y pega el nuevo valor.
7. Guarda. Listo, la subida de imágenes vuelve a funcionar.

## 🛠️ Solución de problemas

| Síntoma | Posible causa |
|---|---|
| "Password incorrecta" en el panel | La password del panel no coincide con `ADMIN_PASSWORD` del Script Property. Revisa ambos. |
| "ADMIN_PASSWORD no configurado" | Te saltaste el paso 3. Vuelve a configurarlo. |
| Los cambios no aparecen en el sitio | El sitio público lee del CSV publicado, que Google cachea ~5 min. Espera o usa "🔄 Recargar catálogo público" en el panel. |
| "GitHub PUT 401" al subir una imagen | El `GITHUB_TOKEN` vencio o es inválido. Genera uno nuevo (ver sección "Renovar el PAT"). |
| "GitHub PUT 403" al subir una imagen | El PAT no tiene permiso de "Contents: Read and write" sobre el repo. Edita el token y agrega el permiso. |
| "GitHub PUT 422" al subir una imagen | El path no existe en la rama configurada. Verifica `GITHUB_BRANCH`. |
| "Faltan GITHUB_TOKEN o GITHUB_REPO" | No configuraste esas Script Properties. Revisa el paso 3. |
| Error CORS en consola del navegador | Verifica que desplegaste con "Quién tiene acceso: Cualquiera". |
| "Authorization required" al testear | Hiciste deploy con "Ejecutar como: Usuario que accede" en vez de "Yo". Re-deploya. |
