# ⚽ Penalty Challenge

Juego interactivo 2D de simulación de tiro penal diseñado para ejecutarse en **pantalla horizontal** con una resolución de **896x640**.

El proyecto combina la potencia de **React** para el manejo de interfaces y flujos de pantallas, con el motor de físicas y renderizado **Phaser 3** para las mecánicas del juego.

---

## 🚀 Estado Actual del Juego (Contexto)

Hasta la fecha, se han implementado de manera funcional las siguientes características y mecánicas:

### 1. Interfaz y Flujo (React)

- **StartScreen:** Pantalla de inicio con fondo y botón para comenzar.
- **GameScreen:** Contenedor dinámico que inicializa, monta y desmonta el canvas de Phaser de forma segura.
- **ResultScreen:** Pantalla final que muestra el puntaje obtenido y mensajes/imágenes dinámicos según el rendimiento del jugador, con opción a reiniciar.

### 2. Mecánicas de Juego (Phaser 3)

- **Sistema de Tiro (Swipe):** Detección de trazos en la pantalla (`pointerdown`, `pointermove`, `pointerup/out`).
- **Efecto de Curva (Magnus):** Se utiliza extrapolación y una curva de Bézier (QuadraticBezier) para que el balón imite de manera realista la trayectoria curva dibujada por el dedo del jugador.
- **Profundidad 3D:** El balón reduce su tamaño de `0.6` a `0.25` a medida que viaja al arco, simulando profundidad y distancia.
- **Objetivo Dinámico:** Un target (diana) se mueve constantemente de lado a lado (interpolado por `tweens`) dentro del arco y cambia de tamaño de forma aleatoria (entre `0.25` y `0.6`).
- **Colisiones y Puntuación:** Se detecta el `overlap` físico entre el balón y el objetivo. Los puntos otorgados dependen de la dificultad (el tamaño actual del objetivo al recibir el golpe).
- **Intentos:** El jugador dispone de un máximo de 5 tiros por partida. Al finalizar, el puntaje es enviado a la capa de React.

---

## 🛠️ Stack Tecnológico y Librerías

- **Vite:** Empaquetador extremadamente rápido para el entorno de desarrollo.
- **React 19:** Utilizado para gestionar el estado de la aplicación, el enrutado manual de pantallas y la persistencia de datos superficiales (puntaje final).
- **TypeScript:** Brinda tipado estricto mejorando la mantenibilidad, especialmente crucial al manejar configuraciones y físicas de Phaser.
- **Phaser 3:** Framework principal del juego encargado de renderizar Sprites, ejecutar el motor de físicas `Arcade`, manejar el ciclo `update`, Tweens y gestos nativos táctiles.
- **pnpm:** Gestor de paquetes rápido y eficiente con ahorro en espacio de disco.

---

## 📦 Instrucciones de Instalación y Ejecución

Para levantar este proyecto en cualquier otro equipo, sigue estos pasos asumiendo que tienes instalado **Node.js** (v18+ recomendado).

### 1. Instalar pnpm (si no lo tienes)

Si el entorno nuevo no tiene `pnpm` instalado, ábrelo en la terminal y ejecuta:

```bash
npm install -g pnpm
```

### 2. Clonar o descargar el repositorio

Abre tu terminal en la carpeta principal del proyecto (donde se encuentra el `package.json`).

### 3. Instalar dependencias

Instala todas las librerías necesarias ejecutando:

```bash
pnpm install
```

### 4. Modo Desarrollo

Para inicializar el servidor de desarrollo en caliente (HMR), corre el siguiente comando:

```bash
pnpm run dev
```

Se habilitará en un entorno local (generalmente `http://localhost:5173/`). Recomendamos utilizar la vista de "Modo de dispositivo" en las herramientas de desarrollador del navegador y establecer una resolución personalizada de **896 x 640** para emular la pantalla real.

### 5. Modo Producción

Si necesitas crear el compilado final del juego minificado para desplegar:

```bash
pnpm run build
```

Los archivos listos para producción se encontrarán en la carpeta `/dist/`.

---

## 📂 Estructura de Assets Requeria

Todas las imágenes (`.png`, `.gif`, etc.) se cargan dinámicamente de forma directa desde la raíz del servidor.
Asegúrate de que la carpeta raíz `/public/assets/` contenga todos los recursos visuales del proyecto (`fondo-juego.png`, `arco.png`, `balon.png`, etc.) para evitar el error característico de 'cuadros verdes/negros' de Phaser.
