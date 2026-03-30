import Phaser from "phaser";

export class MainScene extends Phaser.Scene {
  private ball!: Phaser.Physics.Arcade.Sprite;
  private target!: Phaser.Physics.Arcade.Sprite;
  private swipePoints: Phaser.Math.Vector2[] = [];
  private trajectoryTween: Phaser.Tweens.Tween | null = null;
  private isKicking: boolean = false;
  private swipeStartTime: number = 0;
  private isResolving: boolean = false;
  private isGameStarted: boolean = false; // Controla que no se juegue mientras estén las instrucciones
  private targetScaleEvent!: Phaser.Time.TimerEvent;
  private inactivityTimer: Phaser.Time.TimerEvent | null = null;
  private bgMusic!: Phaser.Sound.BaseSound;

  // BANDERA DE CONTROL: false = Tiro por Clic/Tap, true = Tiro por Swipe (Deslizar)
  private useSwipe: boolean = false;

  private score: number = 0;
  private attempts: number = 0;
  private maxAttempts: number = 5;

  private scoreGroup!: Phaser.GameObjects.Group;
  private attemptsText!: Phaser.GameObjects.Text;

  constructor() {
    super("MainScene");
  }

  preload() {
    this.load.image("fondo-juego", "/assets/fondo-juego.png");
    this.load.image("arco", "/assets/arco.png");
    this.load.image("balon", "/assets/balon.png");
    this.load.image("objetivo", "/assets/objetivo.png");

    // Imágenes de Puntos
    this.load.image("pt-0", "/assets/0-puntos.png");
    this.load.image("pt-5", "/assets/5-puntos.png");
    this.load.image("pt-50", "/assets/50-puntos.png");
    this.load.image("pt-100", "/assets/100-puntos.png");

    // Cargar los marcadores numéricos (imágenes 0 al 9)
    for (let i = 0; i <= 9; i++) {
      this.load.image(`num_${i}`, `/assets/${i}.png`);
    }

    // Imágenes de Resultados
    this.load.image("resultado-bajo", "/assets/resultado-bajo.png");
    this.load.image("resultado-medio", "/assets/resultado-medio.png");
    this.load.image("resultado-alto", "/assets/resultado-alto.png");

    // Cargar los Sonidos
    this.load.audio("football-sountrack", "/assets/football-sountrack.mp3");
    this.load.audio("point-wing", "/assets/point-wing.mp3");
    this.load.audio("point-fail", "/assets/point-fail.mp3");
    this.load.audio("result-sound", "/assets/result-sound.mp3");
    this.load.audio("result-loser", "/assets/result-loser.mp3");
  }

  create() {
    // Fondo y Arco
    this.add
      .image(1080 / 2, 1920 / 2, "fondo-juego")
      .setDisplaySize(1080, 1920);

    // Ajuste de tamaño y posición del arco (Y=550, escala al 65%)
    this.add.image(1080 / 2, 915, "arco").setScale(0.45);

    // Objetivo Dinámico (Ajustamos Y a 915 para coincidir con el arco y reducimos escala)
    this.target = this.physics.add
      .sprite(1080 / 2, 915, "objetivo")
      .setScale(0.45);
    this.target.setImmovable(true);
    this.target.setDepth(2); // Profundidad 2 para el objetivo
    // Convertir hitbox a círculo para que no colisione con esquinas vacías
    this.target.setCircle(this.target.width / 2);

    // Movimiento del objetivo de lado a lado (ajustado al nuevo ancho del arco)
    this.tweens.add({
      targets: this.target,
      x: { from: 370, to: 710 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Cambio de tamaño constante del objetivo
    this.targetScaleEvent = this.time.addEvent({
      delay: 1500,
      loop: true,
      callback: () => {
        const newScale = Phaser.Math.FloatBetween(0.25, 0.6);
        this.tweens.add({
          targets: this.target,
          scaleX: newScale,
          scaleY: newScale,
          duration: 1500, // Aumentado a 1500ms para que coincida con el delay
          ease: "Sine.easeInOut", // Animación mucho más suave y fluida
        });
      },
    });

    // Balón
    this.ball = this.physics.add.sprite(1080 / 2, 1600, "balon").setScale(0.4);
    this.ball.setDepth(3); // Balón en profundidad 3 (delante de todo)
    // Hitbox circular para el balón
    this.ball.setCircle(this.ball.width / 2);

    // Expandir límites del mundo hacia arriba para detectar los fallos (miss)
    this.physics.world.setBounds(0, -500, 1080, 2420);

    // Etiquetas estáticas de UI
    const textStyles = {
      fontSize: "56px",
      color: "#fff",
      fontStyle: "bold",
      stroke: "#000",
      strokeThickness: 8,
    };

    // 👇 >>> AQUÍ CONTROLAS LA POSICIÓN DE LOS TIROS (INTENTOS) <<< 👇
    const attemptsX = 1000; // Posición horizontal (X) - 1030 lo alinea cerca del borde derecho
    const attemptsY = 1750; // Posición vertical (Y) - 1600 está a la altura del balón inicial

    // Texto de intentos en la parte inferior derecha (cerca del balón)
    this.attemptsText = this.add
      .text(attemptsX, attemptsY, `0/${this.maxAttempts}`, textStyles)
      .setOrigin(1, 0.5) // Alineado a la derecha
      .setDepth(50);

    // Grupos para renderizar dinámicamente los números (imágenes)
    this.scoreGroup = this.add.group();
    this.updateScoreDisplay();
    this.updateAttemptsDisplay();

    // Iniciar Música de fondo en loop
    this.bgMusic = this.sound.add("football-sountrack", {
      loop: true,
      volume: 0.4,
    });
    this.bgMusic.play();

    this.resetInactivityTimer(); // Iniciar el temporizador de inactividad global

    // Manejo del Input (Swipe)
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.resetInactivityTimer(); // Reiniciar inactividad en cada toque
      if (!this.isGameStarted || this.isKicking) return;
      this.tweens.killTweensOf(this.ball); // Detener la animación de retorno si la tocan rápidamente de nuevo

      if (this.useSwipe) {
        this.swipePoints = [new Phaser.Math.Vector2(pointer.x, pointer.y)];
        this.swipeStartTime = this.time.now; // Guardamos el momento exacto del toque
      } else {
        // Tiro por clic directo
        this.kickBallToPoint(pointer.x, pointer.y);
      }
    });

    // Rastrear la trayectoria del dedo para calcular la curva
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      this.resetInactivityTimer(); // Reiniciar inactividad al mover el dedo
      if (!this.useSwipe) return; // Bloquear si la bandera de swipe no está activa
      if (
        !this.isGameStarted ||
        this.isKicking ||
        this.swipePoints.length === 0
      )
        return;
      this.swipePoints.push(new Phaser.Math.Vector2(pointer.x, pointer.y));

      // Efecto visual dinámico: arrastrar y rotar el balón antes de lanzarlo
      const startPoint = this.swipePoints[0];
      const deltaX = pointer.x - startPoint.x;
      const deltaY = pointer.y - startPoint.y;

      // El balón sigue al dedo con un efecto de "liga" (elástico al 30%)
      this.ball.setX(1080 / 2 + deltaX * 0.3);
      this.ball.setY(1600 + deltaY * 0.3);
      this.ball.setAngle(deltaX * 1.2); // Multiplicador ajustado para que gire ágilmente con el dedo
    });

    // Cancelar tiro y regresar el balón a su punto de origen con una animación suave
    const cancelSwipe = () => {
      this.swipePoints = [];
      this.tweens.add({
        targets: this.ball,
        x: 1080 / 2,
        y: 1600,
        angle: 0,
        duration: 300,
        ease: "Back.easeOut",
      });
    };

    // Detectar tanto el levantar el dedo (pointerup) como salir de la pantalla (pointerout)
    const handleSwipe = (pointer: Phaser.Input.Pointer) => {
      if (!this.useSwipe) return; // Bloquear si la bandera de swipe no está activa
      if (!this.isGameStarted) return;
      if (this.isKicking || this.swipePoints.length < 2) {
        cancelSwipe();
        return;
      }

      const start = this.swipePoints[0];
      const end = new Phaser.Math.Vector2(pointer.x, pointer.y);
      this.swipePoints.push(end);

      const swipeDistanceY = start.y - end.y;

      // Calcular el tiempo transcurrido en milisegundos
      const swipeTime = this.time.now - this.swipeStartTime;

      if (swipeDistanceY > 30 && swipeTime > 0) {
        // Velocidad = Distancia / Tiempo (píxeles por milisegundo)
        const swipeSpeed = swipeDistanceY / swipeTime;

        this.kickBall(start, end, swipeSpeed);
        this.swipePoints = [];
      } else {
        cancelSwipe();
      }
    };

    this.input.on("pointerup", handleSwipe);
    this.input.on("pointerout", handleSwipe);

    // --- MODAL DE INSTRUCCIONES DENTRO DEL JUEGO ---
    // 1. Overlay oscuro que bloquea los clics en el fondo
    const overlay = this.add
      .rectangle(1080 / 2, 1920 / 2, 1080, 1920, 0x000000, 0.7)
      .setDepth(100);
    overlay.setInteractive();

    // 2. Pausamos el objetivo para que no empiece a moverse antes de tiempo
    this.tweens.getTweensOf(this.target).forEach((t) => t.pause());
    this.targetScaleEvent.paused = true;

    // 3. Creamos el Modal de Instrucciones usando DOM
    const modalDiv = document.createElement("div");
    modalDiv.style.cssText = `
      background-color: rgba(0, 0, 0, 0.8);
      padding: 60px 50px;
      border-radius: 40px;
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 800px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.5);
      border: 4px solid #fff;
      font-family: sans-serif;
    `;

    modalDiv.innerHTML = `
      <h1 style="color: #fff; font-size: 70px; margin: 0 0 20px 0; text-align: center; width: 100%;">¡CÓMO JUGAR!</h1>
      <p style="color: #fff; font-size: 45px; text-align: center; margin: 15px 0;">${this.useSwipe ? "Desliza tu dedo hacia el objetivo para patear." : "Toca el punto en la portería donde quieres patear."}</p>
      <div style="display: flex; flex-direction: column; gap: 35px; margin: 40px 0; width: 100%;">
        <div style="display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 40px;">
          <img src="/assets/100-puntos.png" alt="100 puntos" style="width: 250px; object-fit: contain;" />
          <span style="color: #ffd700; font-size: 45px; font-weight: bold; width: 300px;">Centro</span>
        </div>
        <div style="display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 40px;">
          <img src="/assets/50-puntos.png" alt="50 puntos" style="width: 250px; object-fit: contain;" />
          <span style="color: #ffd700; font-size: 45px; font-weight: bold; width: 300px;">Adentro</span>
        </div>
        <div style="display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 40px;">
          <img src="/assets/5-puntos.png" alt="5 puntos" style="width: 250px; object-fit: contain;" />
          <span style="color: #ffd700; font-size: 45px; font-weight: bold; width: 300px;">Roce exterior</span>
        </div>
      </div>
      <p style="color: #fff; font-size: 45px; text-align: center; margin: 15px 0;">¡Tienes 5 tiros para sumar el mayor puntaje!</p>
      <img id="btn-empezar" src="/assets/btn-jugar.png" alt="Jugar" style="cursor: pointer; width: 400px; margin-top: 30px; display: block; margin-left: auto; margin-right: auto; align-self: center;" />
    `;

    const instructionsDOM = this.add
      .dom(1080 / 2, 1920 / 2, modalDiv)
      .setDepth(101);

    // 4. Lógica de inicio al pulsar jugar
    const btnEmpezar = modalDiv.querySelector(
      "#btn-empezar",
    ) as HTMLImageElement;
    btnEmpezar.onclick = () => {
      instructionsDOM.destroy();
      overlay.destroy();
      this.isGameStarted = true;

      // Reanudar el objetivo
      this.tweens.getTweensOf(this.target).forEach((t) => t.resume());
      this.targetScaleEvent.paused = false;
    };
  }

  private updateScoreDisplay() {
    this.scoreGroup.clear(true, true);

    // Rellenar con ceros a la izquierda para tener siempre 3 dígitos (ej. "000", "050")
    const scoreStr = this.score.toString().padStart(3, "0");

    // 👇 >>> AQUÍ CONTROLAS EL PUNTAJE (POSICIÓN Y TAMAÑO) <<< 👇
    const scoreY = 560; // Altura (Y)
    const scoreOffsetX = 0; // Movimiento horizontal (0 = centro exacto, negativo hacia izquierda, positivo hacia derecha)
    const scoreScale = 1.0; // Tamaño de las imágenes (aumentado de 0.8 a 1.0)
    const scoreSpacing = 5; // Espaciado en píxeles entre los números

    // Calculamos el ancho total para centrarlo horizontalmente
    let totalWidth = 0;
    const digits: Phaser.GameObjects.Image[] = [];

    for (let i = 0; i < scoreStr.length; i++) {
      const digit = this.add
        .image(0, scoreY, `num_${scoreStr[i]}`)
        .setOrigin(0, 0.5); // Origen vertical al centro de la imagen
      digit.setScale(scoreScale).setDepth(50); // Aseguramos que siempre esté por encima de todo
      digits.push(digit);
      totalWidth += digit.displayWidth;
      if (i < scoreStr.length - 1) totalWidth += scoreSpacing; // Añade espacio entre números
    }

    // Ahora los posicionamos centrados horizontalmente en la pantalla (1080) más el ajuste
    let currentX = 1080 / 2 - totalWidth / 2 + scoreOffsetX;
    for (const digit of digits) {
      digit.setX(currentX);
      this.scoreGroup.add(digit);
      currentX += digit.displayWidth + scoreSpacing;
    }
  }

  private updateAttemptsDisplay() {
    if (this.attemptsText) {
      this.attemptsText.setText(`${this.attempts}/${this.maxAttempts}`);
    }
  }

  update() {
    if (this.isKicking && !this.isResolving) {
      // Evaluamos la distancia en el frame exacto en que el balón cruza la profundidad del arco (Y = 915)
      // Damos un rango (930 a 880) por si el balón va muy rápido y salta varios píxeles en un solo frame
      if (this.ball.y <= 930 && this.ball.y >= 880) {
        const distance = Phaser.Math.Distance.Between(
          this.ball.x,
          this.ball.y,
          this.target.x,
          this.target.y,
        );
        const targetRadius = (this.target.width / 2) * this.target.scaleX;

        // Verificamos si está tocando el objetivo (con el margen visual del 40%)
        if (distance <= targetRadius * 1.4) {
          this.handleGoal(distance, targetRadius);
          return;
        }
      }

      // Si el balón pasa de largo hacia el fondo de la red sin haber tocado el objetivo
      if (this.ball.y < 850) {
        this.handleMiss();
      }
    }
  }

  kickBall(
    start: Phaser.Math.Vector2,
    end: Phaser.Math.Vector2,
    swipeSpeed: number,
  ) {
    this.isKicking = true;
    this.attempts++;
    this.updateAttemptsDisplay();

    // Congelar el objetivo al patear
    this.tweens.getTweensOf(this.target).forEach((t) => t.pause()); // Pausa tanto el movimiento como la escala en curso
    this.targetScaleEvent.paused = true;

    const dx = end.x - start.x;
    const dy = end.y - start.y || -1;

    // Factor de extrapolación para que el balón cruce la línea del arco
    const distanceToGoalY = this.ball.y - 800; // Extendemos la meta visual hacia el fondo de la red
    const extrapolationFactor = Math.abs(distanceToGoalY / dy);

    // X objetivo (con sensibilidad ajustada para mejor jugabilidad)
    let finalTargetX = this.ball.x + dx * extrapolationFactor * 0.6;
    // Limitar para que el balón no se vaya volando fuera de la pantalla (Tótem de 1080px)
    finalTargetX = Phaser.Math.Clamp(finalTargetX, 100, 980);
    const finalTargetY = 800;

    // Eliminamos el cálculo de la comba (chanfle) para que siempre sea un tiro RECTO.
    // Punto de control de la trayectoria posicionado exactamente en el centro.
    const controlPointX = this.ball.x + (finalTargetX - this.ball.x) * 0.5;
    const controlPointY = this.ball.y + (finalTargetY - this.ball.y) * 0.5;

    const curve = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(this.ball.x, this.ball.y),
      new Phaser.Math.Vector2(controlPointX, controlPointY),
      new Phaser.Math.Vector2(finalTargetX, finalTargetY),
    );

    // Determinar la dirección de rotación en el aire según la dirección del trazo
    let spinDirection = 1; // Giro a la derecha por defecto
    if (dx < 0) {
      spinDirection = -1; // Giro a la izquierda si el trazo finalizó hacia allá
    }

    // Duración basada 100% en la VELOCIDAD REAL del dedo del jugador
    // Si el speed es alto (ej. 2.5 px/ms), la duración será cercana a los 800ms (rápido).
    // Si el speed es bajo (ej. 0.5 px/ms), se acercará a los 1800ms (lento).
    const duration = Math.max(800, Math.min(1800, 2000 / swipeSpeed));

    // Animación de la trayectoria
    const pathAnim = { t: 0 };
    this.trajectoryTween = this.tweens.add({
      targets: pathAnim,
      t: 1,
      duration: duration,
      ease: "Sine.easeOut",
      onUpdate: () => {
        const point = curve.getPoint(pathAnim.t);
        this.ball.setPosition(point.x, point.y);
      },
      onComplete: () => {
        // Seguro a prueba de fallos: Si la animación termina y no ha colisionado, es un fallo
        if (this.isKicking && !this.isResolving) {
          this.handleMiss();
        }
      },
    });

    // Animación: el balón se hace pequeño (simulando profundidad 3D) y gira
    const spinAngle = 1080 * spinDirection; // 3 Vueltas completas en la dirección correcta
    this.tweens.add({
      targets: this.ball,
      scaleX: 0.08, // Escala drásticamente menor para asegurar que sea más pequeño que el objetivo en su fase mínima
      scaleY: 0.08,
      angle: `+=${spinAngle}`, // Suma las vueltas partiendo del ángulo con el que el jugador lo soltó
      duration: duration,
      ease: "Sine.easeOut",
    });
  }

  // NUEVA FUNCIÓN: Tiro por Clic/Tap con Chanfle (Curva)
  private kickBallToPoint(targetX: number, targetY: number) {
    this.isKicking = true;
    this.attempts++;
    this.updateAttemptsDisplay();

    // Congelar el objetivo al patear
    this.tweens.getTweensOf(this.target).forEach((t) => t.pause());
    this.targetScaleEvent.paused = true;

    // Limitar para que el balón no se vaya volando fuera de los bordes laterales
    const finalTargetX = Phaser.Math.Clamp(targetX, 100, 980);

    // Aseguramos que el balón avance por lo menos hasta la red (Y=800) para que cruce la línea de gol
    // Si el usuario da clic más al fondo de la red (ej. Y=400), respetamos ese valor.
    const finalTargetY = Math.min(targetY, 800);

    // Cálculo del Chanfle (Efecto de Curva)
    const screenCenterX = 1080 / 2;
    const offsetFromCenter = finalTargetX - screenCenterX;

    // Ajustamos el punto de control de Bezier para crear la curva "jalando" el punto intermedio hacia afuera
    // Multiplicamos por 0.8 para hacer la curva bastante pronunciada y visible
    const controlPointX =
      this.ball.x + (finalTargetX - this.ball.x) * 0.5 + offsetFromCenter * 0.8;
    const controlPointY = this.ball.y + (finalTargetY - this.ball.y) * 0.5;

    const curve = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(this.ball.x, this.ball.y),
      new Phaser.Math.Vector2(controlPointX, controlPointY),
      new Phaser.Math.Vector2(finalTargetX, finalTargetY),
    );

    // Dirección del giro del balón (hacia donde se patea)
    const spinDirection = offsetFromCenter < 0 ? -1 : 1;
    const duration = 1200; // Tiempo de vuelo fijo para una buena sensación de disparo

    const pathAnim = { t: 0 };
    this.trajectoryTween = this.tweens.add({
      targets: pathAnim,
      t: 1,
      duration: duration,
      ease: "Sine.easeOut",
      onUpdate: () => {
        const point = curve.getPoint(pathAnim.t);
        this.ball.setPosition(point.x, point.y);
      },
      onComplete: () => {
        // Si termina el viaje y no chocó con el objetivo, es un fallo
        if (this.isKicking && !this.isResolving) {
          this.handleMiss();
        }
      },
    });

    const spinAngle = 1080 * spinDirection;
    this.tweens.add({
      targets: this.ball,
      scaleX: 0.08,
      scaleY: 0.08,
      angle: `+=${spinAngle}`,
      duration: duration,
      ease: "Sine.easeOut",
    });
  }

  handleGoal = (distance: number, targetRadius: number) => {
    if (!this.isKicking || this.isResolving) return;

    this.isResolving = true; // Evitar que se ejecute múltiples veces por colisión

    // Detener las animaciones de inmediato
    if (this.trajectoryTween) {
      this.trajectoryTween.stop();
      this.trajectoryTween = null;
    }
    this.tweens.killTweensOf(this.ball);

    // Reproducir sonido de acierto
    this.sound.play("point-wing");

    // Puntuación fija basada puramente en la precisión
    let points = 50; // Poco al centro
    let isPerfect = false;

    // Zonas de precisión mejoradas y más permisivas
    if (distance <= targetRadius * 0.5) {
      // El 50% central otorga los 100 puntos
      points = 100;
      isPerfect = true;
    } else if (distance <= targetRadius * 0.95) {
      // Del 50% al 95% del radio otorga 50 puntos
      points = 50;
    } else {
      // Más del 95% (incluso por fuera del borde visual gracias al margen expandido) otorga 5 puntos
      points = 5;
    }

    this.score += points;
    this.updateScoreDisplay();

    // Efecto visual de Impacto (Centrado de forma infalible con contenedor Div)
    const impactDOM = this.add.dom(this.target.x, this.target.y, "div");
    const impactNode = impactDOM.node as HTMLDivElement;
    impactNode.style.width = "0px";
    impactNode.style.height = "0px";
    impactNode.style.overflow = "visible";
    impactNode.innerHTML = `<img src="/assets/impacto.gif?t=${new Date().getTime()}" style="position: absolute; transform: translate(-50%, -50%); width: 250px;" />`;
    impactDOM.setDepth(15);

    // Eliminar el GIF de impacto de la pantalla tras 800ms (ajusta este número según la duración de tu GIF)
    this.time.delayedCall(800, () => impactDOM.destroy());

    // Imagen flotante indicando los puntos ganados (reemplaza al texto)
    const floatingPoints = this.add
      .image(this.target.x, this.target.y - 50, `pt-${points}`) // Centrado sobre el objetivo
      .setOrigin(0.5)
      .setDepth(20)
      .setScale(0.8); // Ajusta este 0.8 dependiendo del tamaño de tus imágenes

    this.tweens.add({
      targets: floatingPoints,
      y: floatingPoints.y - 150,
      alpha: 0,
      duration: 1500,
      ease: "Power2",
      onComplete: () => floatingPoints.destroy(),
    });

    if (isPerfect) {
      // Efecto visual de GOL exclusivo para tiros perfectos (+100)
      const golDOM = this.add.dom(this.target.x, this.target.y, "div");
      const golNode = golDOM.node as HTMLDivElement;
      golNode.style.width = "0px";
      golNode.style.height = "0px";
      golNode.style.overflow = "visible";
      // Añadimos el timestamp aquí también para que siempre se reinicie desde el inicio
      golNode.innerHTML = `<img src="/assets/gol.gif?t=${new Date().getTime()}" style="position: absolute; transform: translate(-50%, -50%); width: 400px;" />`;

      golDOM.setScale(0).setDepth(10);

      this.tweens.add({
        targets: golDOM,
        scale: 0.85,
        duration: 400,
        ease: "Back.easeOut",
        yoyo: true,
        hold: 2500,
        onComplete: () => golDOM.destroy(),
      });

      this.time.delayedCall(3300, () => this.resetBall());
    } else {
      // Si no fue perfecto (+5 o +50), solo esperamos que el texto desaparezca
      this.time.delayedCall(1500, () => this.resetBall());
    }
  };

  handleMiss() {
    this.isResolving = true; // Evitar que el update() lo llame en bucle

    if (this.trajectoryTween) {
      this.trajectoryTween.stop();
      this.trajectoryTween = null;
    }
    this.tweens.killTweensOf(this.ball);

    // Reproducir sonido de fallo
    this.sound.play("point-fail");

    // Mostrar imagen de 0 puntos flotante al fallar
    const floatingZero = this.add
      .image(this.ball.x, this.ball.y - 50, "pt-0")
      .setOrigin(0.5)
      .setDepth(20)
      .setScale(0.8);
    this.tweens.add({
      targets: floatingZero,
      y: floatingZero.y - 150,
      alpha: 0,
      duration: 1500,
      ease: "Power2",
      onComplete: () => floatingZero.destroy(),
    });

    // Hacer rodar el balón de regreso a su posición inicial
    this.tweens.add({
      targets: this.ball,
      x: 1080 / 2,
      y: 1600,
      scaleX: 0.4,
      scaleY: 0.4,
      angle: "-=720", // Efecto de rodar hacia atrás dando 2 vueltas completas
      duration: 3500, // Aumentado de 2.2 a 3.5 segundos para un regreso muy suave
      ease: "Power2",
      onComplete: () => {
        this.ball.setAngle(0);
        this.resumeGame();
      },
    });
  }

  resetBall() {
    if (this.trajectoryTween) {
      this.trajectoryTween.stop();
      this.trajectoryTween = null;
    }
    this.tweens.killTweensOf(this.ball); // Detener animaciones previas
    this.ball.setPosition(1080 / 2, 1600);
    this.ball.setScale(0.4); // Restaurar tamaño original
    this.ball.setAngle(0); // Restaurar rotación

    this.resumeGame();
  }

  resumeGame() {
    this.isKicking = false; // Permitir patear nuevamente
    this.isResolving = false; // Reiniciar el estado para el siguiente tiro
    this.tweens.getTweensOf(this.target).forEach((t) => t.resume()); // Reanudar movimiento y escala en curso del objetivo
    this.targetScaleEvent.paused = false; // Reanudar latido de tamaño

    if (this.attempts >= this.maxAttempts) {
      this.showFinalResult();
    }
  }

  private showFinalResult() {
    // Congelar la escena para que nada más se mueva
    this.tweens.getTweensOf(this.target).forEach((t) => t.pause());
    this.targetScaleEvent.paused = true;
    this.isGameStarted = false; // Prevenir que puedan patear de nuevo

    // Detener la música de fondo y reproducir el sonido final
    if (this.bgMusic && this.bgMusic.isPlaying) {
      this.bgMusic.stop();
    }

    // 1. Overlay oscuro translúcido (dejando ver el fondo del juego congelado)
    const overlay = this.add
      .rectangle(1080 / 2, 1920 / 2, 1080, 1920, 0x000000, 0.8)
      .setDepth(100);
    overlay.setInteractive(); // Bloquea los clics/swipes hacia el pasto

    // 2. Determinar la imagen y el sonido de resultado según el puntaje (Puntaje Máximo: 500)
    let resultImageKey = "resultado-bajo";
    let resultSoundKey = "result-loser"; // Sonido por defecto para el nivel más bajo
    if (this.score >= 200 && this.score < 400) {
      resultImageKey = "resultado-medio";
      resultSoundKey = "result-sound";
    } else if (this.score >= 400) {
      resultImageKey = "resultado-alto";
      resultSoundKey = "result-sound";
    }

    this.sound.play(resultSoundKey);

    // 3. Mostrar la imagen de resultado pegada al fondo
    const resultImg = this.add
      .image(1080 / 2, 1920, resultImageKey) // Y=1920 (Borde inferior absoluto)
      .setOrigin(0.5, 1) // Punto de anclaje inferior central
      .setDepth(101);

    // Ocupar todo el ancho de la pantalla (1080) manteniendo su proporción original
    resultImg.displayWidth = 1080;
    resultImg.scaleY = resultImg.scaleX;

    // 4. Efecto de Confeti (Lluvia de pelotas de colores)
    const confetti = this.add
      .particles(0, -50, "balon", {
        x: { min: 0, max: 1080 }, // Que abarque todo el ancho de la pantalla
        lifespan: 5000, // Cada pelota vive 5 segundos (suficiente para caer)
        speedY: { min: 200, max: 600 }, // Velocidad de caída
        speedX: { min: -100, max: 100 }, // Ligero movimiento hacia los lados
        rotate: { min: 0, max: 360 }, // Que vayan rotando al caer
        gravityY: 300, // Gravedad
        scale: { min: 0.03, max: 0.08 }, // Pelotitas un poco más pequeñas para no tapar el resultado
        quantity: 1, // Reducimos de 5 a 1 para mucha menos densidad
        frequency: 50, // Separamos la emisión (1 cada 50ms) en lugar de cada frame
        tint: [
          0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xffffff,
        ], // Colores aleatorios vivos
      })
      .setDepth(102);

    // Detener la generación de confeti después de 3 segundos para que limpie la pantalla antes
    this.time.delayedCall(4000, () => confetti.stop());

    // 5. Lógica de reinicio oculto: 5 toques (taps) en la imagen de resultado
    let taps = 0;
    resultImg.setInteractive();
    resultImg.on("pointerdown", () => {
      this.resetInactivityTimer(); // Refrescar inactividad si están tocando la imagen
      taps++;
      if (taps >= 5) {
        this.exitToStartScreen(); // Dirigir a la pantalla de inicio en lugar de reiniciar
      }
    });
  }

  private resetInactivityTimer() {
    if (this.inactivityTimer) this.inactivityTimer.remove();
    this.inactivityTimer = this.time.addEvent({
      delay: 60000, // 30 segundos (30,000 ms)
      callback: this.exitToStartScreen,
      callbackScope: this,
    });
  }

  private exitToStartScreen() {
    // Limpiamos el temporizador para evitar ejecuciones en segundo plano mientras React cambia de pantalla
    if (this.inactivityTimer) {
      this.inactivityTimer.remove();
      this.inactivityTimer = null;
    }

    // Llamamos al evento que conecta Phaser con React para desmontar el juego
    const onGameOver = this.registry.get("onGameOver");
    if (onGameOver) {
      onGameOver(this.score);
    }
  }
}
