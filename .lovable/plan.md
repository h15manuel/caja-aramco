# Convertir Caja Aramco a SPA estática para GitHub Pages

## Objetivo
La app debe poder publicarse en `https://h15manuel.github.io/caja-aramco/` como sitio estático (HTML+JS+CSS), sin servidor, y seguir siendo 100% offline-capable. Toda la lógica ya es client-side (localStorage + fetch directo al Apps Script), así que no se pierde ninguna funcionalidad.

## Cambios principales

### 1. Quitar TanStack Start (SSR) → migrar a Vite + TanStack Router en modo SPA
- Eliminar `@tanstack/react-start`, `@cloudflare/vite-plugin`, `@lovable.dev/vite-tanstack-config`, `wrangler`.
- Reemplazar `vite.config.ts` por una config Vite estándar con:
  - `@vitejs/plugin-react`
  - `@tanstack/router-plugin/vite` (file-based routing en modo SPA, sin SSR)
  - `@tailwindcss/vite`
  - `base: '/caja-aramco/'`
- Crear `index.html` en la raíz (el entry HTML que GitHub Pages servirá).
- Crear `src/main.tsx` que monta `<RouterProvider />` en `#root`.
- Eliminar `src/routes/__root.tsx` shellComponent (html/head/body) → mover meta tags al `index.html`. El root route queda solo con `<Outlet />` + providers.
- Eliminar `src/server.ts`, `wrangler.jsonc`, cualquier `*.server.ts` o `createServerFn` (no hay ninguno usado realmente — todo el sync va por `fetch` directo al Apps Script desde el cliente).

### 2. Routing compatible con GitHub Pages
- Usar **HashRouter** (URLs tipo `/#/settings`) **o** agregar un `404.html` que redirija al `index.html` (truco clásico de SPA en GH Pages).
- Recomendación: **404.html redirect** — mantiene URLs limpias (`/caja-aramco/settings`) y funciona con TanStack Router sin cambios.
- Configurar el router con `basepath: '/caja-aramco'`.

### 3. Renombrar el proyecto
- `package.json` → `"name": "caja-aramco"`.
- Title en `index.html`: "Caja Aramco — Control de Caja".
- Actualizar `<title>` y `<meta description>` en cada route file.

### 4. PWA / Offline (opcional pero recomendado)
- Agregar `vite-plugin-pwa` con un service worker que cachee todos los assets → la app funciona sin internet una vez cargada.
- Manifest con nombre "Caja Aramco", icono, theme-color, instalable en móvil.

### 5. GitHub Actions para deploy automático
- Crear `.github/workflows/deploy.yml` que en cada push a `main`:
  1. `bun install`
  2. `bun run build`
  3. Sube `dist/` a la branch `gh-pages` (o usa el action oficial `actions/deploy-pages`).
- En GitHub: Settings → Pages → Source: GitHub Actions.

## Estructura final

```text
caja-aramco/
├── index.html              ← entry HTML (nuevo)
├── public/
│   ├── 404.html            ← redirect SPA para GH Pages
│   └── favicon.ico
├── src/
│   ├── main.tsx            ← monta RouterProvider (nuevo)
│   ├── router.tsx          ← createRouter con basepath
│   ├── routes/
│   │   ├── __root.tsx      ← solo providers + <Outlet />
│   │   ├── index.tsx
│   │   ├── history.tsx
│   │   └── settings.tsx
│   ├── components/         ← sin cambios
│   ├── contexts/           ← sin cambios
│   └── hooks/              ← sin cambios
├── vite.config.ts          ← Vite SPA + base: '/caja-aramco/'
├── package.json            ← name: caja-aramco
└── .github/workflows/deploy.yml
```

## Lo que NO cambia
- Toda la lógica de negocio: `AppContext`, `SyncContext`, `useSync`, componentes de caja, manager, settings.
- Apps Script y sincronización (sigue siendo `fetch` desde el cliente).
- Estilos y design system (`src/styles.css`, tokens, Tailwind).
- localStorage (sigue persistiendo todo offline).

## Trade-offs / cosas a saber
- Pierdes SSR → la primera carga muestra HTML mínimo y luego React hidrata. Para una app interna de control de caja **no afecta**.
- SEO no aplica (es app interna autenticada por código de turno).
- La URL final será `https://h15manuel.github.io/caja-aramco/` (con la barra final). Sin la barra GitHub redirige automático.
- El primer deploy tarda unos minutos en propagarse en GH Pages.

## Pasos del despliegue (después de mergear los cambios)
1. Hacer commit/push a `main`.
2. En el repo de GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Esperar a que el workflow termine (pestaña Actions).
4. Abrir `https://h15manuel.github.io/caja-aramco/`.

¿Procedo con todo esto?
