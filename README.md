# OPTINOMINA - Sistema Integral de Liquidación y Nómina

OPTINOMINA es una aplicación web avanzada construida para gestionar, calcular y auditar la nómina de la empresa **OPTIMOLDES S.A.S**. El sistema se encarga de automatizar la lectura de datos biométricos, realizar cálculos complejos de recargos según la normativa laboral colombiana y emitir reportes y colillas de pago (desprendibles) listos para impresión.

---

## 🚀 Tecnologías Utilizadas

El proyecto está desarrollado bajo un stack moderno y reactivo:

- **Framework Core**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack) y [React 19](https://react.dev/).
- **Estilos y UI**: [Tailwind CSS v4](https://tailwindcss.com/) para una arquitectura utilitaria, diseño responsivo y *Glassmorphism*.
- **Iconografía**: [Lucide React](https://lucide.dev/).
- **Base de Datos / Backend**: [Supabase](https://supabase.com/) (PostgreSQL) para persistencia en la nube de la base de empleados, respaldos (backups) y limpieza de quincenas.
- **Procesamiento de Archivos**: Librería `xlsx` para leer e interpretar matrices de Excel y reportes del reloj biométrico.

---

## 📂 Estructura del Proyecto

El código fuente está modularizado en `src/`, separando el enrutamiento, la interfaz y la lógica de negocio:

```text
src/
├── app/
│   └── nomina/
│       └── page.js               # Orquestador principal (State Manager)
├── components/
│   └── Nomina/
│       ├── ColumnVisibilityToggle.jsx # Selector para ocultar/mostrar columnas
│       ├── EditableCell.jsx           # Componente atómico para edición de valores (overrides)
│       ├── EmployeeEditorModal.jsx    # Formulario para crear/editar empleados
│       ├── NominaSummaryCards.jsx     # Tarjetas visuales de métricas
│       ├── TabColillas.jsx            # Módulo de impresión de desprendibles
│       ├── TabDirectorio.jsx          # Directorio HR (Gestión CRUD de empleados)
│       ├── TabLiquidacion.jsx         # Panel lateral interactivo de liquidación
│       ├── TabPanelGeneral.jsx        # Grilla dinámica (Tabla maestra de nómina)
│       └── TabReportes.jsx            # Módulo de reportes (Totales, bancos, segmentación)
└── utils/
    ├── biometricCore.js          # Motor de procesamiento de reglas biométricas y turnos
    ├── constants.js              # Variables constantes, parámetros de ley (SMLV, % Recargos) y columnas
    ├── mathNomina.js             # Funciones utilitarias para conversión de tiempo y moneda
    └── supabase.js               # Cliente y servicios de conexión a la base de datos Supabase
```

---

## 🧠 Arquitectura y Lógica Core

El diseño de la aplicación sigue una arquitectura centralizada para el manejo de estados (`Single Source of Truth`) en el archivo `page.js`, inyectando propiedades (*props*) hacia sus módulos independientes.

1. **El Orquestador (`page.js`)**:
   Maneja los estados globales: `nominaRows` (empleados), `attendanceLogs` (marcaciones biométricas), `overrides` (ediciones manuales) y `hiddenColumns` (configuración de visibilidad). Utiliza el hook `useMemo` para recalcular **toda la nómina** en tiempo real ante cualquier cambio en los estados anteriores, produciendo el objeto `payrollData`.

2. **Cálculos Matemáticos y Legales (`utils/constants.js` & `mathNomina.js`)**:
   Todas las fórmulas obedecen a la ley laboral colombiana. Se parametrizan los recargos:
   - *Nocturno*: 35%
   - *Extra Diurna*: 25% (125% total)
   - *Extra Nocturna*: 75% (175% total)
   - *Festivo Diurno*: 75%
   - *Festivo Nocturno*: 110% (210% total)
   - *Extra Festiva Diurna*: 100% (200% total)
   - *Extra Festiva Nocturna*: 150% (250% total)
   - *Salud y Pensión*: Deducción estándar del 4%.

3. **Motor Biométrico (`utils/biometricCore.js`)**:
   Capaz de procesar archivos Excel del sistema biométrico, deducir los turnos reales de los trabajadores, calcular tolerancias, ignorar horas de almuerzo y separar automáticamente las horas en diurnas, nocturnas, extras y festivas dependiendo del horario.

---

## 🧩 Módulos (Tabs)

Para evitar un código monolítico y mejorar el rendimiento y mantenibilidad, la interfaz está dividida en 4 pestañas principales y un módulo de gestión humana:

- 📊 **Panel General (`TabPanelGeneral.jsx`)**: 
  - Renderiza una tabla extensa (estilo Excel) con las variables de nómina de cada empleado.
  - Implementa filtros de visibilidad: Oculta columnas técnicas por defecto y muestra solo las esenciales (Salario, Devengado, Deducido, Neto).
  - Incluye celdas editables (`EditableCell`) para ajustes de última hora (`overrides`).
  
- 📝 **Liquidación (`TabLiquidacion.jsx`)**:
  - Panel detallado para un trabajador específico. 
  - Muestra un desglose matemático exacto de por qué un empleado recibe su sueldo (basado en cuántas horas hizo, valor de su hora y totales parciales).

- 🖨️ **Colillas (`TabColillas.jsx`)**:
  - Formato adaptado específicamente para impresión (`window.print()`).
  - Oculta fondos y bordes para entregar un desprendible limpio, profesional y listo para entregar al operario como comprobante legal de pago.

- 📈 **Reportes (`TabReportes.jsx`)**:
  - Presenta las métricas consolidadas de toda la empresa en la quincena.
  - Tarjetas de "Total Devengado", "Deducciones", "Auxilios" y "Neto a Pagar".
  - Segmenta los costos por categorías (Inyección, Taller, Otros) y consolida el valor a transferir desglosado por los bancos (Bancolombia vs. Caja Social).

- 👥 **Directorio HR (`TabDirectorio.jsx`)**:
  - Un gestor (CRUD) sincronizado con Supabase para añadir nuevos empleados, ajustar sus salarios base, categoría, préstamos, deducciones fijas (Pólizas) y activar/desactivar perfiles en la empresa.

---

## 🔄 Flujo de Uso de la Aplicación

1. **Configuración y Carga Base**:
   Al iniciar, el sistema consulta Supabase para cargar el **Directorio de Empleados** activos y los parámetros fijos (salarios, préstamos, auxilios).
2. **Importación de Marcaciones**:
   El usuario sube el archivo de datos del biométrico. El motor procesa las filas, deduce el tiempo efectivo y genera el objeto `attendanceLogs`.
3. **Cálculo Automático (Tiempo Real)**:
   La aplicación mapea las horas cruzándolas con los perfiles, calculando recargos, salarios proporcionales a días asistidos y el neto a pagar.
4. **Revisión y Ajuste (Overrides)**:
   Desde el `Panel General` o la pestaña de `Liquidación`, el contador o HR puede ajustar cualquier celda si el empleado reporta una inconsistencia, almacenando ese cambio temporal como un *override* (edición manual).
5. **Reportes e Impresión**:
   Se valida en la pestaña `Reportes` que los totales cuadren con el presupuesto, y finalmente se emiten las `Colillas` para su firma e impresión.
6. **Reinicio de Quincena (Clear)**:
   Al finalizar el pago, el usuario puede "Limpiar Quincena". El sistema preserva los datos fijos (salarios, empleados), borra las horas dinámicas, hace un barrido del estado y sincroniza este `reset` con la base de datos para arrancar un nuevo ciclo.
