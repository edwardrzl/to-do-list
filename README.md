# Tareas — Gestor de tareas personal (PWA)

Aplicación web progresiva (PWA) de gestión de tareas para uso personal. Diseñada para instalarse en el celular y funcionar completamente offline: sin backend, sin servidor, sin cuenta. Los datos viven en el navegador y persisten entre sesiones.

---

## Stack

| Capa | Tecnología |
|---|---|
| UI | React 18 + TypeScript |
| Build | Vite 8 |
| Estilos | TailwindCSS v4 (`@tailwindcss/vite`) |
| Enrutamiento | React Router v6 |
| Persistencia | IndexedDB vía `idb` |
| PWA | `vite-plugin-pwa` + Workbox (generateSW) |

---

## Características

- **Bandeja principal** — lista de todas las tareas, ordenadas por fecha ascendente (sueltas al final). Sección de completadas colapsable.
- **Vista semanal** — calendario de lunes a domingo con navegación de semana en semana. Las tareas con hora aparecen ordenadas dentro de su día.
- **Modal de creación/edición** — nombre (obligatorio), categoría con chip de color, fecha y hora opcionales. Enter guarda rápido y deja el formulario abierto para crear otra.
- **Categorías con color fijo** — Trabajo (azul), Personal (verde), Citas (rojo), Estudio (ámbar), Compras (naranja), Otro (gris).
- **Swipe para eliminar** — deslizar a la izquierda en una tarea expone el botón de borrado.
- **Offline-first** — service worker con precaching de todos los assets. La app arranca y funciona sin conexión.
- **Instalable** — manifest PWA configurado para `display: standalone`; se puede agregar a la pantalla de inicio en iOS y Android.

---

## Estructura del proyecto

```
src/
├── types/          # Tipos TypeScript compartidos (Tarea, Categoria, colores)
├── db/             # Capa de acceso a IndexedDB (openDB, getAllTareas, saveTarea, deleteTarea)
├── context/        # TareasContext — estado global y operaciones CRUD en memoria + IDB
├── components/
│   ├── TaskModal.tsx         # Modal de creación y edición
│   ├── EtiquetaCategoria.tsx # Chip de categoría con color
│   └── BottomNav.tsx         # Barra de navegación inferior fija
├── pages/
│   ├── Bandeja.tsx    # Pantalla principal (lista de tareas)
│   └── Calendario.tsx # Vista semanal
├── App.tsx    # Shell de la app, rutas, FAB, estado del modal
└── main.tsx   # Entry point con BrowserRouter
```

---

## Decisiones técnicas

**Sin backend ni autenticación.** El alcance es uso personal en un solo dispositivo. Añadir un servidor introduciría complejidad (auth, sync, conflictos) que no aporta valor aquí.

**IndexedDB con `idb`.** La API nativa de IndexedDB es verbosa. `idb` expone una interfaz con Promises sin añadir abstracción innecesaria. El schema se define con TypeScript (`DBSchema`) para que las operaciones estén tipadas end-to-end.

**Estado en memoria + escritura optimista.** `TareasContext` mantiene las tareas en `useState` para renders síncronos. Cada mutación actualiza el estado local inmediatamente y luego escribe a IDB en segundo plano. No hay loading states en operaciones CRUD (solo en la carga inicial).

**`vite-plugin-pwa` con `generateSW`.** Genera el service worker automáticamente con Workbox y precachea todos los assets del build. No requiere mantener un `sw.js` manual.

**TailwindCSS v4 vía `@tailwindcss/vite`.** Sin archivo de configuración: el plugin detecta las clases directamente del código fuente. Elimina el paso de purge manual.

**`verbatimModuleSyntax` en TypeScript.** El proyecto usa `import type` para todos los imports de tipos, requerido por la configuración estricta de módulos de Vite. Evita que el bundler intente resolver imports que solo existen en tiempo de compilación.

---

## Correr localmente

**Requisitos:** Node.js 18+ y npm.

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo con HMR
npm run dev
# → http://localhost:5173

# Build de producción
npm run build

# Previsualizar el build (incluye service worker activo)
npm run preview
```

> Para probar la instalación como PWA usar `npm run preview`, no `npm run dev`. El service worker solo se registra en el build de producción.

---

## Modelo de datos

```typescript
interface Tarea {
  id: string           // UUID v4 generado en cliente
  nombre: string       // Obligatorio
  categoria?: 'Trabajo' | 'Personal' | 'Citas' | 'Estudio' | 'Compras' | 'Otro'
  fecha?: string       // 'YYYY-MM-DD' — opcional
  hora?: string        // 'HH:MM'     — solo válida si hay fecha
  completada: boolean
  creadaEn: string     // ISO timestamp
}
```

Una tarea sin `fecha` es una tarea "suelta": aparece en la bandeja pero no en el calendario. Una tarea con `fecha` aparece en ambas vistas.
