# MODELADO DE PROCESOS

**Proyecto:** Desarrollo de un sistema web para la gestión avícola de granjas productoras de huevo con registro de producción, control sanitario, inventario de insumos y predicción de rendimiento — Sistema Avícola MC (SIAMC).

**Asignatura:** Proyecto Integrador.

**Objetivo:** Representar los procesos de la granja avícola tal como se realizan hoy (AS-IS) y como quedan soportados por SIAMC (TO-BE), para identificar los puntos de mejora, los actores y las reglas de negocio que el sistema debe implementar.

---

## 1. Notación y alcance

Los diagramas siguen la notación BPMN 2.0: cada carril (lane) corresponde a un actor o componente; los círculos verdes son eventos de inicio (con reloj si los dispara el tiempo), los círculos rojos son eventos de fin, los rombos son compuertas exclusivas (X) y los rectángulos redondeados son tareas. El color de la tarea indica quién la realiza: azul para tareas de usuario, verde para tareas del sistema, amarillo para tareas programadas o notificaciones y rojo para tareas de validación crítica. El cilindro representa los datos que se guardan en la base de datos de Supabase (PostgreSQL con RLS), y la línea discontinua indica asociación de datos.

Se modelan dos procesos actuales (AS-IS), que son los que originan el problema, y cinco procesos propuestos (TO-BE), que corresponden a los módulos de SIAMC. La Tabla 1 resume el inventario de procesos.

**Tabla 1**
*Inventario de procesos modelados*

| Código | Proceso | Tipo | Actores | Módulo de SIAMC | Requisitos |
|--------|---------|------|---------|-----------------|------------|
| P1 | Registro diario de producción de huevos | Misional | Encargado, administrador, sistema | Producción | RF01, RF02, RF08, RF09 |
| P2 | Registro de mortalidad y actualización del lote | Misional | Encargado, administrador, sistema | Mortalidad / Lotes | RF03, RF10, RF11 |
| P3 | Movimientos de inventario de insumos | Apoyo (inventario) | Encargado, administrador, sistema | Insumos | RF04, RF12, RF13, RF14 |
| P4 | Aplicación y seguimiento de tratamientos sanitarios | Apoyo (sanidad) | Encargado, administrador, sistema | Tratamientos | RF05, RF15 |
| P5 | Predicción de producción y generación de reportes | Misional | Administrador, sistema | Predicciones / Reportes | RF06, RF07, RF16 |

*Nota.* Elaboración propia. Los códigos RF corresponden al documento de requisitos funcionales de SIAMC.

---

## 2. Procesos actuales (AS-IS)

### Figura 1
**AS-IS 1. Registro manual de producción y mortalidad**

*Nota.* Elaboración propia con base en la observación del proceso en la granja.

El encargado del galpón recorre las jaulas al final del día, cuenta los huevos por bandeja y anota las cifras en un cuaderno junto con las aves muertas y la causa aparente. Al final de la semana, el administrador transcribe los datos a una hoja de cálculo para calcular totales. No hay validación de doble registro, ni ventana de edición, ni cruce automático con el inventario del lote: si el encargado olvida un día o anota una cifra errada, el administrador no se entera hasta que compara la hoja con lo que vendió, y para entonces los huevos ya salieron de la granja sin trazabilidad.

### Figura 2
**AS-IS 2. Control de inventario de insumos y tratamientos**

*Nota.* Elaboración propia con base en la observación del proceso en la granja.

Las entradas de alimento, vacunas y medicamentos quedan anotadas en la factura del proveedor y, cuando el administrador se acuerda, se copian a una lista en papel. Las salidas (consumo diario de alimento, aplicación de tratamientos) no se registran: se asume que el bulto se acaba cuando se acaba. El resultado es que la granja no sabe el stock real, no puede justificar cuándo se aplicó un tratamiento ni a qué lote, y los pedidos al proveedor se hacen de memoria.

### Problemas identificados en el AS-IS

- Información dispersa en cuadernos y hojas de cálculo que no se cruzan (producción, mortalidad, inventario, tratamientos).
- Sin validación de registros duplicados por lote y fecha; sin ventana de edición controlada.
- Stock de insumos desconocido en tiempo real; pedidos al proveedor basados en memoria.
- Trazabilidad sanitaria inexistente: no hay evidencia fechada de qué tratamiento se aplicó, a qué lote, por quién.
- Transcripción manual semanal, con riesgo de errores y sin bitácora de quién modificó qué.
- Imposibilidad de proyectar la producción futura por falta de histórico estructurado.

---

## 3. Procesos propuestos con SIAMC (TO-BE)

### Figura 3
**TO-BE 1. Registro diario de producción con ventana de edición de 24 h**

*Nota.* Elaboración propia. Implementado en `ProduccionForm.jsx`, `ProduccionList.jsx` y los triggers de la tabla `produccion`.

**Descripción.** El encargado abre el módulo de Producción, selecciona el lote activo y la fecha, e ingresa cantidades por categoría (buenos, rotos, pequeños, deformes). SIAMC valida en el cliente con react-hook-form + Zod y en el servidor con reglas RLS que el usuario pueda acceder al galpón del lote. Al guardar, el registro queda con `creado_por` y `fecha_registro`; durante las siguientes 24 horas el mismo encargado o un administrador puede editarlo, después de esa ventana solo el administrador puede modificarlo y cada cambio se envía al log de auditoría con el diff antes/después. El dashboard actualiza los KPIs animados y la gráfica de producción al instante vía TanStack Query.

**Reglas de negocio:** un lote solo registra producción si está en estado `activo`; no se permiten fechas futuras; la edición queda bloqueada para el encargado 24 h después de `fecha_registro`; todo cambio queda en `auditoria` con usuario, operación y diff.

### Figura 4
**TO-BE 2. Registro de mortalidad con actualización automática del lote**

*Nota.* Elaboración propia. Implementado en `MortalidadForm.jsx` y los triggers de la tabla `mortalidad`.

**Descripción.** El encargado registra las aves muertas del día indicando el lote, la cantidad y la causa (`enfermedad`, `accidente`, `causa_desconocida`, `depredador`, `calor_frio_extremo`, `otra`). SIAMC descuenta la cantidad del contador vivo del lote mediante un trigger `SECURITY DEFINER` que sortea RLS, y si el lote queda en cero propone marcarlo como `finalizado`. El sistema emite una notificación en la categoría `mortalidad` cuando la mortalidad diaria supera el umbral configurado por el administrador en el módulo de Configuración.

**Reglas de negocio:** la cantidad no puede exceder las aves vivas del lote; la causa es obligatoria y debe pertenecer al dominio cerrado; el descuento del lote y el registro en auditoría ocurren en la misma transacción; la alerta de umbral se dispara en el frontend al recibir el evento de TanStack Query.

### Figura 5
**TO-BE 3. Movimientos de inventario de insumos con separación por rol**

*Nota.* Elaboración propia. Implementado en `MovimientoForm.jsx`, `InsumosList.jsx` y las políticas RLS de `movimientos_insumos`.

**Descripción.** El administrador registra entradas al inventario indicando insumo, cantidad, proveedor y documento soporte; el encargado solo puede registrar salidas y únicamente a nombre propio (`registrado_por = auth.uid()`). Un trigger de la tabla recalcula el stock del insumo en la misma transacción. Si una salida dejaría el stock en negativo, la transacción se aborta y el formulario muestra el error. Cuando el stock cae por debajo del mínimo definido en el insumo, el sistema genera una notificación en la categoría `sistema` para el administrador.

**Reglas de negocio:** entradas solo las registra `administrador` (política RLS); salidas solo el usuario autenticado y a nombre propio; stock resultante nunca negativo; cada movimiento queda en auditoría con cantidad, saldo anterior y saldo nuevo.

### Figura 6
**TO-BE 4. Aplicación y seguimiento de tratamientos sanitarios**

*Nota.* Elaboración propia. Implementado en `TratamientoForm.jsx`, `TratamientoDetalle.jsx` y la tabla `tratamientos`.

**Descripción.** El encargado o administrador registra el tratamiento (vacunación, medicación, desparasitación, vitaminas, antibiótico u otro) indicando lote, insumo aplicado, fecha de inicio, fecha de finalización planificada y observaciones. Mientras el tratamiento esté en estado `activo`, el detalle muestra los días transcurridos y los días restantes. Al llegar la fecha de finalización, el sistema sugiere al administrador cerrarlo; una vez cerrado pasa a `finalizado` y queda disponible para auditorías sanitarias. El movimiento del insumo asociado se registra en paralelo como salida de inventario.

**Reglas de negocio:** `fecha_fin >= fecha_inicio`; el insumo del tratamiento debe pertenecer a una categoría sanitaria (`medicamento`, `vacuna`, `desinfectante`); el cierre del tratamiento es irreversible y queda en auditoría.

### Figura 7
**TO-BE 5. Predicción de producción y generación de reportes PDF**

*Nota.* Elaboración propia. Implementado en `Predicciones.jsx`, `lib/estadistica.js` y `Reportes.jsx`.

**Descripción.** El administrador elige el lote y el horizonte de días a proyectar. SIAMC consulta el histórico de producción del lote, aplica regresión lineal simple sobre la serie temporal y devuelve la proyección junto con el coeficiente de determinación (R²) para que el usuario interprete la confianza del pronóstico. Desde el módulo de Reportes el administrador exporta a PDF (jsPDF + autoTable) con filtros por rango de fecha, lote o módulo (producción, mortalidad, insumos, tratamientos). El PDF incluye encabezado con el nombre del usuario que lo generó y marca de tiempo.

**Reglas de negocio:** la proyección requiere al menos 7 registros de producción del lote; el horizonte máximo es 30 días; los reportes solo los puede exportar un usuario autenticado y respetan RLS (un encargado solo exporta datos de sus galpones).

---

## 4. Comparación AS-IS frente a TO-BE

**Tabla 2**
*Cambios introducidos por SIAMC en cada proceso*

| Aspecto | Proceso actual (AS-IS) | Proceso con SIAMC (TO-BE) |
|---------|------------------------|---------------------------|
| Registro de producción | Cuaderno al final del día, transcripción semanal | Formulario validado por lote y fecha, con ventana de edición de 24 h |
| Doble registro de producción | Posible, nadie lo detecta | Bloqueado por constraint único (lote, fecha) |
| Mortalidad | Anotada en papel, sin cruce con el lote | Descuento automático del lote y notificación por umbral |
| Trazabilidad sanitaria | Inexistente | Tratamiento con lote, insumo, fechas y responsable, auditado |
| Inventario de insumos | Lista en papel, salidas no registradas | Entradas (admin) y salidas (encargado) con stock recalculado por trigger |
| Separación de responsabilidades | No existe, cualquiera anota todo | Políticas RLS: entradas solo admin, salidas solo a nombre propio |
| Pedidos al proveedor | De memoria | Alertas automáticas al cruzar el stock mínimo |
| Proyección de producción | Imposible por falta de histórico | Regresión lineal con R² sobre el histórico del lote |
| Auditoría | No existe | Log con diff antes/después para cada operación sensible |
| Reportes | Hoja de cálculo manual | PDF filtrable por rango, lote o módulo con marca de usuario y fecha |

*Nota.* Elaboración propia.
