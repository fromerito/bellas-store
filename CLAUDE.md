# CLAUDE.md — Proyecto Bellas (bellas-store)

> Este archivo es la **memoria del proyecto** para Claude Code. Léelo al inicio de cada sesión para entender la arquitectura, las convenciones y las decisiones tomadas.

---

## 🎯 Visión general

**Bellas** es un catálogo web de productos de belleza para una tienda online ubicada en San Cristóbal, Estado Táchira, Venezuela. Es una **single-page application** servida como sitio estático desde GitHub Pages.

- **Sitio en vivo:** https://bellassc.store (dominio en Namecheap apuntando a GitHub Pages, HTTPS activo)
- **Repositorio:** https://github.com/fromerito/bellas-store
- **Tipo:** Catálogo + carrito que termina con checkout vía WhatsApp
- **Owner:** Fernando Romero — IT por profesión, pero principiante en programación. Este es un proyecto personal (no relacionado con su trabajo en Hero Insurance).

### Filosofía técnica

Este proyecto **prioriza la simplicidad operativa sobre la sofisticación técnica**:

- Un único archivo HTML autocontenido (sin frameworks, sin build step, sin bundlers)
- Google Sheets como "base de datos" — la dueña actualiza productos sin tocar código
- Despliegue por simple commit a `main` (GitHub Pages se encarga del resto)
- Sin servidor propio, sin base de datos, sin costos recurrentes

Si te tienta sugerir migrar a React, Next.js, o un backend "real", **no lo hagas** sin entender primero por qué se eligió este enfoque. La dueña no programa y necesita poder operar sin desarrolladores.

---

## 📁 Estructura del repositorio

```
bellas-store/
├── index.html              # Todo el sitio: HTML + CSS + JS vanilla
├── logo.png                # Logo de Bellas (PNG transparente, fondo eliminado)
├── og-image.png            # Preview para WhatsApp/Instagram (1200x630)
├── favicon.ico             # Favicon multi-tamaño
├── favicon-16x16.png
├── favicon-32x32.png
├── apple-touch-icon.png
├── android-chrome-192x192.png
├── android-chrome-512x512.png
├── bancolombia.png         # Logo método de pago (PNG)
├── zinli.png               # Logo método de pago (PNG)
├── CNAME                   # Configuración dominio personalizado (bellassc.store)
└── fotos/                  # Fotos de productos
    ├── maquillaje/         # Productos con SKU MAQ-XXXX
    ├── skin-care/          # SKI-XXXX
    ├── cabello/            # CAB-XXXX
    ├── accesorios/         # ACC-XXXX
    ├── vestimenta/         # VES-XXXX
    └── perfume/            # PER-XXXX
```

---

## 🔧 Stack técnico

- **HTML/CSS/JS vanilla** — sin frameworks, sin transpiladores
- **Google Sheets** publicado como CSV — fuente de verdad de los productos
- **GitHub Pages** — hosting estático con CDN gratuito y HTTPS
- **Web APIs nativas:**
  - `localStorage` (cache de productos, config, carrito persistente, preferencias)
  - `URLSearchParams` (links compartibles `?p=ID`)
  - `Web Share API` con fallback a Clipboard API
  - `IntersectionObserver` (animaciones fade-in)

### Lo que NO usamos (y por qué)

- ❌ React/Vue/Svelte → innecesario para este alcance, complica el flujo de "edito, commit, deploy"
- ❌ Bundlers (Webpack/Vite) → la dueña necesita poder hacer cambios pequeños desde la web de GitHub sin entorno local
- ❌ TypeScript → curva extra sin beneficios proporcionales para un solo archivo
- ❌ Backend propio → todo se resuelve con un Sheet público + JS en cliente
- ❌ Base de datos → el Sheet hace ese rol, los pedidos se procesan por WhatsApp

---

## 📊 El Google Sheet (fuente de productos)

### URL fija en el código (no cambiar)

```
https://docs.google.com/spreadsheets/d/e/2PACX-1vRFxe-eBox6aa3W7n-ZbY4NDGq5y9RYuM1YpPnRfbkzcIL_lDpvEj9zico2LnYAqfUcbgj-_1m8TfKf/pub?gid=0&single=true&output=csv
```

### Columnas (en este orden)

| Col | Nombre | Obligatoria | Descripción |
|---|---|---|---|
| A | `nombre` | ✅ | Nombre del producto |
| B | `descripcion` | ❌ | Descripción corta (1-2 líneas) |
| C | `categoria` | ❌ | Maquillaje / Skin Care / Cabello / Accesorios / Vestimenta / Perfume |
| D | `precio` | ✅ | Precio en USD (solo número, sin `$`) |
| E | `imagen` | ❌ | URL imagen principal |
| F | `imagen2` | ❌ | URL imagen 2 (opcional) |
| G | `imagen3` | ❌ | URL imagen 3 (opcional) |
| H | `imagen4` | ❌ | URL imagen 4 (opcional) |
| I | `estado` | ❌ | Vacío / `agotado` / `proximamente` / `destacado` / combinaciones con guión |
| J | `sku` | ❌ | Código único formato `MAQ-0001`, `SKI-0001`, etc. |
| K | `cantidad` | ❌ | Stock disponible. Si es 0 o vacío, no se permite agregar al carrito |

### Reglas críticas del Sheet

1. **El código tolera el desorden de columnas** — busca por nombre del encabezado, no por posición
2. **Los encabezados son case-insensitive** y se normalizan sin tildes (`descripción` = `descripcion`)
3. **El ID del producto = número de fila** — por eso **no se deben reordenar filas** una vez publicado el sitio (rompería los links compartidos `?p=N`)
4. Para "ocultar" un producto sin borrarlo: marcar `estado` como `proximamente` o vaciar contenido

### Convención de SKUs

- Formato: `XXX-NNNN` (3 letras de prefijo + 4 dígitos con ceros a la izquierda)
- Prefijos:
  - `MAQ` → Maquillaje
  - `SKI` → Skin Care
  - `CAB` → Cabello
  - `ACC` → Accesorios
  - `VES` → Vestimenta
  - `PER` → Perfume
- **Los SKUs nunca se reutilizan** aunque el producto se descontinúe
- Numeración correlativa **dentro de cada categoría**, no global

---

## 🎨 Diseño y branding

### Paleta de colores (tema claro — el único activo)

```css
--negro: #faf6ee;              /* marfil cálido (fondo principal) */
--negro-suave: #f3ece0;        /* crema tostado (fondos suaves) */
--dorado: #8b6b2e;             /* dorado oscuro (contraste sobre claro) */
--dorado-claro: #a87f3a;       /* dorado medio */
--dorado-oscuro: #6b4f20;      /* dorado más profundo (acentos fuertes) */
--crema: #e8d4a8;              /* crema acento */
--rosa: #f5e6e8;               /* rosa suave (gradientes hero) */
--blanco-marfil: #2a2418;      /* marrón muy oscuro (texto principal) */
```

> **Nota histórica:** El proyecto tuvo un tema oscuro inicialmente. Se migró a tema claro completo y se eliminó el oscuro. Los nombres de variables `--negro` y `--blanco-marfil` parecen invertidos por razones de evolución histórica — no los renombres sin reemplazar todas sus referencias.

### Tipografía (Google Fonts)

- **Display:** `Parisienne` (script, igual al logo)
- **Serif:** `Cormorant Garamond` (títulos, hero)
- **Sans:** `Inter` (body, UI)

### Datos de marca (hardcodeados en el HTML)

- **Nombre:** Bellas
- **Eslogan/hero:** "Todo lo que necesitas para Brillar"
- **WhatsApp:** +58 412 0664059 (guardado como `584120664059`)
- **Instagram:** @BELLASSSC
- **Ubicación:** San Cristóbal, Estado Táchira - Venezuela
- **Mensaje footer:** "¡Gracias por darle brillo a este emprendimiento con tu compra!"

---

## ⚙️ Funcionalidades implementadas

### Catálogo principal
1. ✅ Grid de productos cargado desde Google Sheets con cache local en `localStorage`
2. ✅ Precios en 3 monedas: USD, COP, VES (tasas editables desde panel admin)
3. ✅ Filtros por categoría
4. ✅ Buscador de texto (busca en nombre, descripción y categoría)
5. ✅ **Filtro por rango de precio** con slider dual (min/max), se ajusta automáticamente a los precios del catálogo
6. ✅ Diseño responsive (mobile-first, desktop expandido)

### Carrito
1. ✅ Drawer lateral con animación
2. ✅ Controles `+` / `−` directamente en cada tarjeta (actualización granular, sin re-render)
3. ✅ **Carrito persistente 3 días** en `localStorage` con expiración automática
4. ✅ **Control de stock**: bloquea si se excede `cantidad` con toast `"Solo quedan X disponibles"`
5. ✅ Productos que pasan a `agotado`/`proximamente` en el Sheet se eliminan automáticamente del carrito al recargar
6. ✅ Checkout abre WhatsApp con mensaje pre-llenado (productos + totales en 3 monedas)
7. ✅ El mensaje de WhatsApp incluye el SKU entre corchetes: `• 2x Labial [MAQ-0001] — $24.00`

### Visualización de productos
1. ✅ **Múltiples imágenes por producto** (hasta 4) con puntitos indicadores en la tarjeta
2. ✅ **Lightbox con carrusel**: flechas, teclas ← →, swipe en móvil, dots clicables, cierre con Esc/clic fondo
3. ✅ **Estados de producto** con cintas:
   - `agotado`: opacidad 50%, cinta marrón "AGOTADO", sin botón comprar
   - `proximamente`: cinta dorada "PRÓXIMAMENTE", sin botón
   - `destacado`: cinta dorada ✨ con animación de brillo
   - Combinaciones: `destacado-agotado`, `destacado-proximamente`
4. ✅ SKU visible debajo del nombre en la tarjeta y en el lightbox

### Sharing
1. ✅ Botón compartir en cada tarjeta (Web Share API + fallback Clipboard)
2. ✅ Links directos a producto: `bellassc.store/?p=ID` abre el lightbox de ese producto automáticamente

### UX/Conversión
1. ✅ Modal "¿Cómo comprar?" (5 pasos) que aparece automático la primera vez + botón flotante permanente
2. ✅ Botón flotante de WhatsApp en esquina inferior derecha (chat directo sin pasar por carrito)
3. ✅ Sección "Métodos de pago" con 5 chips: Efectivo, Pago Móvil (Bs), Binance, Zinli, Bancolombia

### Admin
1. ✅ Panel admin oculto, se accede con URL secreta: `bellassc.store/#admin`
2. ✅ Pestañas: Productos (solo lectura, los datos vienen del Sheet) y Configuración (tasas, WhatsApp, mensaje)
3. ✅ Botón "🔄 Recargar desde Sheet" para refrescar productos al instante
4. ✅ Export/Import de respaldo en JSON

### SEO y meta
1. ✅ Favicon multi-tamaño + apple-touch-icon
2. ✅ Open Graph completo (Facebook/WhatsApp previews)
3. ✅ Twitter Cards
4. ✅ Meta description y keywords
5. ✅ Tag `theme-color` para barra del navegador en móvil

---

## 🚧 Funcionalidades pendientes (en orden acordado)

Estas estaban planeadas pero quedaron pausadas:

1. ⏳ **Analytics** (Umami o GA4) — pausada por decisión del dueño
2. ⏳ **SEO avanzado** (sitemap.xml, robots.txt, structured data schema.org) — saltada
3. ⏳ **Sección "Sobre nosotros"** — pausada para retomar luego
4. ⏳ **Testimonios de clientes**
5. ⏳ **PWA** (Progressive Web App, "instalable" en el celular)

---

## 🧠 Convenciones del código

### JavaScript

- **Sin clases, sin módulos ES6** — todo es funciones globales en un `<script>` en el HTML
- **Estado central** en una variable global `state` (objeto plano con `config`, `productos`, `carrito`, etc.)
- **localStorage keys:**
  - `bellas_data_v1` → config + productos cacheados
  - `bellas_data_v1_cache` → cache del último Sheet exitoso
  - `bellas_carrito_v1` → carrito persistente con timestamp (3 días de vida)
  - `bellas_como_comprar_visto` → si el usuario ya vio el modal de bienvenida
- **Funciones nombradas en español** (es el estilo histórico del proyecto): `agregarAlCarrito`, `cambiarCantidad`, `renderProductos`, etc.

### CSS

- **Variables CSS en `:root`** (no usar valores hardcodeados de color sin razón)
- **BEM-ish naming** sin guiones bajos: `.producto-card`, `.producto-imagen`, `.lightbox-flecha`
- **Mobile-first**: estilos base son móvil, media queries para `min-width: 768px`
- **Sin librerías externas de CSS** (no Tailwind, no Bootstrap)

### HTML

- Todo en español (idioma del usuario final)
- Atributos `aria-*` para accesibilidad básica
- Imágenes con `loading="lazy"` cuando aplica

---

## 🔐 Notas técnicas críticas

### Rendimiento

- El primer render usa **cache local del Sheet** y luego refresca en background — UX percibida como instantánea
- Las imágenes son `loading="lazy"` y `object-fit: contain`/`cover` según contexto
- Animaciones usan `transform` y `opacity` (no propiedades que disparan layout)

### Edge cases manejados

- Si `localStorage` falla (modo incógnito, cuota llena): try/catch silencioso, todo sigue funcionando en memoria
- Si el Sheet no carga: muestra cache del último éxito + toast de advertencia
- Si un producto del carrito ya no existe en el Sheet: se remueve silenciosamente
- Si un producto del carrito quedó `agotado`/`proximamente`: se remueve y avisa
- Si la cantidad pedida excede el stock: se ajusta al stock disponible antes del checkout

### Compatibilidad

- Funciona en navegadores modernos (Chrome, Firefox, Safari, Edge — últimos 2 años)
- No se garantiza Internet Explorer ni Opera Mini
- Móvil: probado en Android y iOS

---

## 📋 Reglas explícitas del dueño

Estas son reglas que el dueño ha pedido explícitamente:

1. **El archivo principal HTML siempre se llama `index.html`** (no `bellas.html` ni otros nombres)
2. **Cuando hagas commits, escribe mensajes cortos pero descriptivos**, por ejemplo: `feat: filtro por rango de precio`, `fix: SKU no aparecía en lightbox`
3. **El sitio debe poder editarse desde la web de GitHub** sin requerir setup local (la dueña hace cambios pequeños desde el navegador)
4. **Las imágenes de productos viven en `fotos/<categoria>/<SKU>.jpg`** (ej: `fotos/maquillaje/MAQ-0001.jpg`)
5. **Convenciones de naming de fotos:**
   - Principal: `MAQ-0001.jpg`
   - Adicionales: `MAQ-0001-b.jpg`, `MAQ-0001-c.jpg`, `MAQ-0001-d.jpg`
   - Solo letras/números/guiones, sin espacios ni tildes, extensión en minúsculas
6. **Cuando vayamos a crecer:** si `index.html` supera ~3000 líneas de JavaScript, considerar split en archivos por área (catálogo, carrito, admin, etc.) dentro de una carpeta `assets/js/`. Pero por ahora **no lo hagas** — sigue en un solo archivo.

---

## 🤝 Cómo trabajar con el dueño

- Es **principiante en programación** pero trabaja en IT, así que entiende conceptos generales
- Prefiere **respuestas directas sin halagos innecesarios**
- Pide que se cuestionen sus suposiciones si pueden estar mal
- Prefiere ver opciones con pros/contras antes de decidir
- Quiere **archivos entregados explícitamente** (no asume que "están en alguna carpeta")
- Quiere que cualquier cambio se valide visualmente antes de declararse listo
- Trabaja en español

---

## 🚀 Comandos útiles

```bash
# Ver el estado del repo
git status

# Ver a qué remoto apunta
git remote -v

# Ver tu identidad actual
git config user.name
git config user.email

# Servir el sitio localmente para probar antes de pushear
python3 -m http.server 8000
# Luego abrir http://localhost:8000

# Validar el HTML rápido
python3 -c "from html.parser import HTMLParser; p=HTMLParser(); p.feed(open('index.html').read()); print('OK')"
```

---

## 📌 Estado actual del proyecto

Última sesión documentada: el proyecto está **funcional en producción**. Se acaba de generar el archivo `Catálogo_Bellas.xlsx` con SKUs asignados a los 56 productos existentes. Tareas pendientes inmediatas:

1. Completar precios faltantes (19 productos marcados como `agotado` por falta de precio)
2. Corregir los 4 productos con precios mal interpretados (Excel los convirtió a fechas)
3. Llenar la columna `cantidad` con el stock real
4. Empezar a subir las fotos siguiendo la convención `fotos/<categoria>/<SKU>.jpg`
5. Reemplazar las URLs externas de fotos (si las hay) por las locales del repo
