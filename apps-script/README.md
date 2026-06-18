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

### 3. Configurar la contraseña de administración
1. En el menú izquierdo del editor, clic en el ⚙️ (**Configuración del proyecto**).
2. Baja hasta la sección **Propiedades de la secuencia de comandos** (Script Properties).
3. Clic en **Editar propiedades de la secuencia de comandos**.
4. Clic en **Añadir propiedad** y crea:
   - **Propiedad:** `ADMIN_PASSWORD`
   - **Valor:** una contraseña fuerte (la usarás para entrar al panel admin)
5. Clic en **Guardar propiedades de la secuencia de comandos**.

> 💡 Esta contraseña la compartes con tu amiga. Si alguna vez se filtra,
> vuelves aquí y la cambias en 10 segundos.

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

## 🛠️ Solución de problemas

| Síntoma | Posible causa |
|---|---|
| "Password incorrecta" en el panel | La password del panel no coincide con `ADMIN_PASSWORD` del Script Property. Revisa ambos. |
| "ADMIN_PASSWORD no configurado" | Te saltaste el paso 3. Vuelve a configurarlo. |
| Los cambios no aparecen en el sitio | El sitio público lee del CSV publicado, que Google cachea ~5 min. Espera o usa "🔄 Recargar desde Sheet" en el panel. |
| Error CORS en consola del navegador | Verifica que desplegaste con "Quién tiene acceso: Cualquiera". |
| "Authorization required" al testear | Hiciste deploy con "Ejecutar como: Usuario que accede" en vez de "Yo". Re-deploya. |
