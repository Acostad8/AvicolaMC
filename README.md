# Sistema Avícola MC

Sistema web de gestión para granjas avícolas. Permite registrar y controlar la producción de huevos, mortalidad, tratamientos, inventario de insumos y personal, con auditoría completa de todas las operaciones.

---

## Tecnologías

- **React 19** + **Vite** — frontend y bundler
- **Tailwind CSS** — estilos utilitarios
- **Supabase** — base de datos PostgreSQL, autenticación y RLS
- **TanStack Query** — caché y sincronización de datos del servidor
- **react-hook-form + Zod** — formularios con validación
- **Recharts** — gráficas y visualizaciones
- **jsPDF** — exportación de reportes a PDF

---

## Instalación

### Requisitos previos

- Node.js 18+
- npm 9+
- Proyecto en [Supabase](https://supabase.com) configurado

### Pasos

```bash
# 1. Clonar el repositorio
git clone <url-del-repositorio>
cd sistema-avicola-mc

# 2. Instalar dependencias
npm install

# 3. Crear archivo de variables de entorno
cp .env.example .env.local   # o crear el archivo manualmente
```

Editar `.env.local` con las credenciales del proyecto Supabase:

```env
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<tu-anon-key>
```

Los valores se encuentran en **Supabase → Project Settings → API**.

```bash
# 4. Iniciar el servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

---

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Build de producción en `/dist` |
| `npm run preview` | Vista previa del build de producción |
| `npm run lint` | Análisis estático con ESLint |

---

## Módulos

| Módulo | Acceso | Descripción |
|--------|--------|-------------|
| Dashboard | Todos | KPIs, gráficas de producción/mortalidad |
| Galpones | Todos (crear: admin) | Instalaciones físicas |
| Lotes | Todos (editar: admin) | Grupos de aves por galpón |
| Razas | Todos | Catálogo de razas |
| Producción | Todos | Registro diario de huevos |
| Mortalidad | Todos | Bajas de aves con causa |
| Tratamientos | Todos | Medicamentos, vacunas y desinfectantes |
| Insumos | Todos (crear/editar: admin) | Inventario y movimientos |
| Predicciones | Todos | Proyección de producción por regresión lineal |
| Reportes | Todos | Exportación a PDF |
| Empleados | Solo admin | Personal de la granja |
| Usuarios | Solo admin | Cuentas del sistema |
| Proveedores | Solo admin | Directorio de proveedores |
| Configuración | Solo admin | Ajustes generales y notificaciones |
| Auditoría | Solo admin | Log de todas las operaciones |

---

## Roles

| Rol | Permisos |
|-----|---------|
| `administrador` | Acceso completo al sistema |
| `encargado` | Solo puede registrar salidas de insumos y tratamientos |

---

## Estructura del proyecto

```
src/
├── context/        # AuthContext, NotificationsContext, ConfigContext, AccessibilityContext
├── lib/            # Supabase client, TanStack Query, utilidades, auditoría
├── hooks/          # Hooks reutilizables (notificaciones, predicciones, inactividad)
├── components/
│   ├── layout/     # Header, Sidebar, PrivateLayout
│   ├── auth/       # ProtectedRoute, AdminRoute
│   └── ui/         # Componentes genéricos (Modal, Badge, Button, ChatBot…)
└── pages/
    ├── public/     # LandingPage, Login, recuperación de contraseña
    └── private/    # Módulos del dashboard (galpones, lotes, producción, etc.)
```

---

## Documentación completa

Ver [DOCUMENTACION.md](./DOCUMENTACION.md) para detalles sobre arquitectura, rutas, base de datos y convenciones de diseño.
