# CTRL S

CTRL S es un software web en desarrollo para la presupuestación y gestión de obras. El estado actual implementa el flujo visual principal, la administración inicial de recursos de un presupuesto y cálculos basados en fórmulas y referencias.

Este repositorio conserva el estado actual del prototipo para facilitar su evaluación, continuidad de desarrollo y colaboración.

## Tecnologías

- Next.js 16 con App Router y Turbopack.
- React 19.
- TypeScript 5 en modo estricto.
- Tailwind CSS 4.
- ESLint 9 con las reglas recomendadas de Next.js.
- Persistencia temporal en `localStorage` del navegador.

Actualmente no existe un backend, una API ni una base de datos conectada. El inicio de sesión es simulado y no valida credenciales contra un servidor.

## Estructura del proyecto

```text
ctrl-s/
├── app/
│   ├── page.tsx                     # Entrada y redirección según sesión local
│   ├── layout.tsx                   # Layout raíz y metadatos
│   ├── globals.css                  # Estilos globales y Tailwind CSS
│   ├── login/                       # Pantalla de acceso simulado
│   ├── home/                        # Panel principal
│   ├── biblioteca/                  # Vista inicial de Biblioteca CONSCA
│   ├── estadisticas/                # Vista inicial de indicadores
│   └── proyectos/
│       ├── page.tsx                 # Presupuesto de proyecto actual
│       └── [id]/
│           ├── page.tsx             # Ruta dinámica de proyecto
│           └── componentes/         # Ribbon, vistas, persistencia y cálculos
├── public/                          # Recursos estáticos
├── eslint.config.mjs                # Configuración de ESLint
├── next.config.ts                   # Configuración de Next.js
├── postcss.config.mjs               # Configuración de PostCSS/Tailwind
├── tsconfig.json                    # Configuración de TypeScript
├── package.json                     # Scripts y dependencias
└── package-lock.json                # Versiones reproducibles de dependencias
```

## Requisitos

- Node.js 20 o posterior.
- npm 10 o posterior.

## Instalación y ejecución local

1. Clonar el repositorio y entrar en su carpeta:

   ```bash
   git clone --branch fix/costo-previsto-tabla-responsive --single-branch https://github.com/santiberterano/control-s.git
   cd ctrl-s
   ```

2. Instalar las dependencias exactas del lockfile:

   ```bash
   npm ci
   ```

3. Iniciar el servidor de desarrollo:

   ```bash
   npm run dev
   ```

4. Abrir [http://localhost:3000](http://localhost:3000).

Para comprobar el build de producción:

```bash
npm run build
npm start
```

No se requieren variables de entorno para ejecutar el estado actual.

La rama `fix/costo-previsto-tabla-responsive` contiene el estado funcional más reciente. Incluye de forma acumulativa las mejoras de recursos, APU, Costo Previsto y Legajo de Obra. La rama `main` conserva el estado inicial y no fue fusionada automáticamente.

## Verificación

```bash
npm run test:formulas
npm run test:apu
npm run test:presupuesto
npm run test:legajo
npm run lint
npm run build
```

## Funcionalidades implementadas

- Pantalla de acceso y sesión simulada mediante `localStorage`.
- Home con accesos a proyectos, biblioteca y estadísticas.
- Navegación del proyecto mediante ribbon.
- Gestión de ítems y rubros de obra.
- Costo Previsto con partidas, fórmulas, APU, costos ocultos, subtotales y totales reactivos.
- Gestión de insumos por categorías y códigos correlativos.
- Gestión de APU por familias, composición con recursos y sub-APU anidados.
- Gestión de mano de obra, equipos, subcontratos y constantes.
- Fórmulas de precios con referencias entre recursos.
- Persistencia local de datos del proyecto en el navegador.
- Legajo de Obra con Costo Previsto, Costo Explotado y Explosión de Insumos.
- Exportación de los informes en PDF y Excel.
- Tabla responsive de Costo Previsto sin desplazamiento horizontal en escritorio.
- Pruebas automatizadas de fórmulas, APU, presupuesto e informes.
- Indicadores de guardado simulados y navegación de regreso al inicio.
- Rutas estáticas y ruta dinámica `/proyectos/[id]`.

## Pendiente o en desarrollo

- Backend y API para autenticación, proyectos y presupuestos.
- Base de datos y persistencia multiusuario.
- Autenticación y autorización reales.
- Listado, creación y selección dinámica de proyectos.
- Biblioteca CONSCA compartida y sincronización entre proyectos.
- Seguimiento de obra, diagramas de Gantt previsto/real y análisis comparativo.
- Estadísticas e indicadores alimentados con datos reales.
- Sincronización y retroalimentación de la biblioteca.
- Ampliación de pruebas de interfaz y estrategia de despliegue.

## Datos y seguridad

- Los archivos `.env*`, certificados, claves privadas y bases de datos locales están excluidos del repositorio.
- Si más adelante se agregan variables de entorno, documentarlas en `.env.example` sin incluir valores sensibles.
- `localStorage` es una solución temporal del prototipo y no debe utilizarse para almacenar credenciales ni información sensible en producción.
