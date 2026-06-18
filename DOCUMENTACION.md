# Sistema Avícola MC — Documentación

Sistema web de gestión para granjas avícolas. Permite registrar y controlar la producción de huevos, mortalidad, tratamientos, inventario de insumos y personal.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite |
| Estilos | Tailwind CSS (con clases custom: `.card`, `.input-base`, `.badge`) |
| Backend / BD | Supabase (PostgreSQL + RLS + Auth) |
| Estado servidor | TanStack Query |
| Formularios | react-hook-form + Zod |
| Gráficas | Recharts |
| PDF | jsPDF + autoTable |
| Iconos | lucide-react |
| Notificaciones UI | react-hot-toast |

---

## Roles de usuario

| Rol | Permisos |
|-----|---------|
| `administrador` | Acceso completo — puede crear galpones, insumos, usuarios, ver auditoría y configuración |
| `encargado` | Acceso limitado — solo puede registrar salidas de insumos y tratamientos |

La verificación de rol se hace en frontend con `perfil?.rol === 'administrador'` y en base de datos con la función `is_admin()`.

---

## Arquitectura de la aplicación

```
src/
├── App.jsx                  # Rutas, providers globales
├── context/
│   ├── AuthContext.jsx       # Sesión, perfil, signIn/signOut
│   ├── AccessibilityContext  # Dark mode y preferencias de accesibilidad
│   ├── ConfigContext         # Configuración general de la app
│   └── NotificationsContext  # Sistema de notificaciones persistente
├── lib/
│   ├── supabase.js           # Cliente Supabase
│   ├── auditoria.js          # Helper para registrar eventos de sesión
│   ├── estadistica.js        # Regresión lineal para predicciones
│   ├── queryClient.js        # Configuración de TanStack Query
│   └── utils.js              # Formateo de fechas, números, etc.
├── hooks/                    # Hooks reutilizables
├── components/
│   ├── layout/               # Header, Sidebar, PrivateLayout
│   ├── auth/                 # ProtectedRoute, AdminRoute
│   └── ui/                   # Componentes genéricos (Modal, Badge, Button…)
└── pages/
    ├── public/               # LandingPage, Login, Recuperar/Restablecer contraseña
    └── private/              # Todos los módulos del dashboard
```

---

## Módulos del sistema

### Operación avícola
- **Galpones** — registro de instalaciones físicas
- **Razas** — catálogo de razas de aves
- **Lotes** — grupos de aves por galpón con fecha de ingreso y raza
- **Producción** — registro diario de huevos; edición permitida hasta 24h después
- **Mortalidad** — bajas de aves con causa

### Sanidad
- **Tratamientos** — aplicación de medicamentos, vacunas, desinfectantes y otros; filtrado por categoría

### Inventario
- **Insumos** — catálogo de materiales con stock
- **Movimientos** — entradas (solo admin) y salidas de inventario

### Administración
- **Empleados** — personal de la granja
- **Usuarios** — cuentas del sistema
- **Proveedores** — directorio de proveedores

### Herramientas
- **Dashboard** — KPIs animados, gráficas de producción/mortalidad, alertas de umbral
- **Predicciones** — regresión lineal sobre histórico de producción
- **Reportes** — exportación a PDF
- **Auditoría** — log de todas las operaciones con diff viewer (solo admin)
- **Configuración** — ajustes generales y preferencias de notificaciones (solo admin)

---

## Autenticación y sesiones

- Login con email/contraseña via Supabase Auth
- `AuthContext` mantiene `session` y `perfil` del usuario autenticado
- Polling cada 3 minutos para detectar cuentas desactivadas por un admin
- Re-validación del JWT al volver al tab (visibilitychange)
- Logout registra evento en auditoría automáticamente

---

## Sistema de notificaciones

- `NotificationsContext` + hook `useNotify`
- Persiste hasta 60 notificaciones en `localStorage`
- Categorías configurables: `sistema`, `produccion`, `mortalidad`, `recordatorios`
- Badge de no leídas en el header

---

## Auditoría

Tabla `auditoria` en base de datos con triggers automáticos en:
- `produccion`, `mortalidad`, `insumos`, `movimientos_insumos`, `tratamientos`, `perfiles`, `galpones`, `lotes`

Eventos de sesión registrados desde el frontend: `LOGIN`, `LOGOUT`, `PASSWORD_CHANGE`, `RESET_PASSWORD`.

Solo los administradores pueden leer el log de auditoría.

---

## Rutas principales

| Ruta | Acceso | Descripción |
|------|--------|-------------|
| `/` | Público | Landing page |
| `/login` | Público | Inicio de sesión |
| `/dashboard` | Autenticado | Panel principal |
| `/dashboard/galpones` | Autenticado | Lista de galpones |
| `/dashboard/lotes` | Autenticado | Lista de lotes |
| `/dashboard/produccion` | Autenticado | Registro de producción |
| `/dashboard/mortalidad` | Autenticado | Registro de mortalidad |
| `/dashboard/tratamientos` | Autenticado | Tratamientos |
| `/dashboard/insumos` | Autenticado | Inventario |
| `/dashboard/empleados` | Solo admin | Empleados |
| `/dashboard/usuarios` | Solo admin | Usuarios del sistema |
| `/dashboard/proveedores` | Solo admin | Proveedores |
| `/dashboard/predicciones` | Autenticado | Predicciones de producción |
| `/dashboard/reportes` | Autenticado | Generación de PDF |
| `/dashboard/configuracion` | Solo admin | Configuración |
| `/dashboard/auditoria` | Solo admin | Log de auditoría |

---

## Base de datos

- Proveedor: **Supabase** (PostgreSQL con RLS habilitado)
- Proyecto: `AvicolaMC` — región `us-west-2`
- Row Level Security activo en todas las tablas sensibles
- Todas las migraciones aplicadas y sin pendientes a la fecha

---

## Instalación y ejecución local

### Requisitos previos

- Node.js 18 o superior
- npm 9 o superior
- Cuenta en [Supabase](https://supabase.com) con el proyecto configurado

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd sistema-avicola-mc
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crear un archivo `.env.local` en la raíz del proyecto con las credenciales de Supabase:

```env
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<tu-anon-key>
```

Estos valores se obtienen en el panel de Supabase → **Project Settings → API**.

### 4. Ejecutar en modo desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

### Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia el servidor de desarrollo con HMR |
| `npm run build` | Genera el bundle de producción en `/dist` |
| `npm run preview` | Sirve el build de producción localmente |
| `npm run lint` | Ejecuta ESLint sobre el código fuente |
