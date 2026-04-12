import Phaser from "phaser";

export class MainScene extends Phaser.Scene {
  private ball!: Phaser.Physics.Arcade.Sprite;
  private target!: Phaser.Physics.Arcade.Sprite;
  // private swipePoints: Phaser.Math.Vector2[] = [];
  private trajectoryTween: Phaser.Tweens.Tween | null = null;
  private isKicking: boolean = false;
  private isResolving: boolean = false;
  private targetScaleEvent!: Phaser.Time.TimerEvent;
  private inactivityTimer: Phaser.Time.TimerEvent | null = null;
  private bgMusic!: Phaser.Sound.BaseSound;

  // private useSwipe: boolean = false;

  private score: number = 0;
  private attempts: number = 0;
  private maxAttempts: number = 5;

  private scoreGroup!: Phaser.GameObjects.Group;
  private attemptsText!: Phaser.GameObjects.Text;

  // ============ VARIABLES AJUSTABLES ============
  private W = 896;
  private H = 640;
  private centerX = 448;
  private centerY = 320;

  private goalY = 330; // Altura del arco
  private goalX = 440; // Posición X del arco
  private goalScale = 0.21; // Tamaño del arco

  private targetScaleMin = 0.15; // Tamaño mínimo del objetivo
  private targetScaleMax = 0.2; // Tamaño máximo del objetivo

  private ballScale = 0.15; // Tamaño del balón (más grande)
  private ballStartY = 550; // Posición Y inicial del balón

  private scoreX = 445; // Posición X del score
  private scoreY = 123; // Altura del score
  private scoreScale = 0.5; // Tamaño del score

  private attemptsX = 780; // Posición X de los intentos
  private attemptsY = 580; // Posición Y de los intentos
  // ===========================================

  constructor() {
    super("MainScene");
  }

  preload() {
    this.load.image("fondo-juego", "/assets/fondo-juego.png");
    this.load.image("arco", "/assets/arco.png");
    this.load.image("balon", "/assets/balon.png");
    this.load.image("objetivo", "/assets/objetivo.png");
    this.load.image("pt-0", "/assets/0-puntos.png");
    this.load.image("pt-5", "/assets/5-puntos.png");
    this.load.image("pt-50", "/assets/50-puntos.png");
    this.load.image("pt-100", "/assets/100-puntos.png");
    for (let i = 0; i <= 9; i++) {
      this.load.image(`num_${i}`, `/assets/${i}.png`);
    }
    this.load.image("resultado-bajo", "/assets/resultado-bajo.png");
    this.load.image("resultado-medio", "/assets/resultado-medio.png");
    this.load.image("resultado-alto", "/assets/resultado-alto.png");
    this.load.image("impacto", "/assets/impacto.gif");
    this.load.image("gol", "/assets/gol.gif");
    this.load.audio("football-sountrack", "/assets/football-sountrack.mp3");
    this.load.audio("point-wing", "/assets/point-wing.mp3");
    this.load.audio("point-fail", "/assets/point-fail.mp3");
    this.load.audio("result-sound", "/assets/result-sound.mp3");
    this.load.audio("result-loser", "/assets/result-loser.mp3");
  }

  create() {
    this.add
      .image(this.centerX, this.centerY, "fondo-juego")
      .setDisplaySize(this.W, this.H);

    // Arco
    this.add.image(this.goalX, this.goalY, "arco").setScale(this.goalScale);

    // Objetivo
    this.target = this.physics.add
      .sprite(this.goalX, this.goalY, "objetivo")
      .setScale(this.targetScaleMin);
    this.target.setImmovable(true);
    this.target.setDepth(2);
    this.target.setCircle(this.target.width / 2);

    // Movimiento horizontal del objetivo
    this.tweens.add({
      targets: this.target,
      x: { from: this.goalX - 100, to: this.goalX + 100 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Cambio de tamaño del objetivo
    this.targetScaleEvent = this.time.addEvent({
      delay: 1500,
      loop: true,
      callback: () => {
        const newScale = Phaser.Math.FloatBetween(
          this.targetScaleMin,
          this.targetScaleMax,
        );
        this.tweens.add({
          targets: this.target,
          scaleX: newScale,
          scaleY: newScale,
          duration: 1500,
          ease: "Sine.easeInOut",
        });
      },
    });

    // Balón
    this.ball = this.physics.add
      .sprite(this.centerX, this.ballStartY, "balon")
      .setScale(this.ballScale);
    this.ball.setDepth(3);
    this.ball.setCircle(this.ball.width / 2);

    this.physics.world.setBounds(0, -200, this.W, 900);

    // Estilos de texto
    const textStyles = {
      fontSize: "36px",
      color: "#fff",
      fontStyle: "bold",
      stroke: "#000",
      strokeThickness: 4,
    };

    this.attemptsText = this.add
      .text(this.attemptsX, this.attemptsY, `0/${this.maxAttempts}`, textStyles)
      .setOrigin(0, 0.5)
      .setDepth(50);

    this.scoreGroup = this.add.group();
    this.updateScoreDisplay();
    this.updateAttemptsDisplay();

    // Música
    this.bgMusic = this.sound.add("football-sountrack", {
      loop: true,
      volume: 0.4,
    });
    this.bgMusic.play();

    this.resetInactivityTimer();

    // Input - Detectar Clic (Tap)
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.resetInactivityTimer();
      if (this.isKicking) return;

      this.tweens.killTweensOf(this.ball);

      // Marca visual de hacia dónde se dirige el tiro
      const aimMark = this.add
        .text(pointer.x, pointer.y, "X", {
          fontSize: "50px",
          color: "#ffff00",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(100);
      this.time.delayedCall(800, () => aimMark.destroy());

      this.kickBallToPoint(pointer.x, pointer.y);
    });
  }

  private updateScoreDisplay() {
    this.scoreGroup.clear(true, true);

    const scoreStr = this.score.toString().padStart(3, "0");

    let totalWidth = 0;
    const digits: Phaser.GameObjects.Image[] = [];

    for (let i = 0; i < scoreStr.length; i++) {
      const digit = this.add
        .image(0, this.scoreY, `num_${scoreStr[i]}`)
        .setOrigin(0, 0.5);
      digit.setScale(this.scoreScale).setDepth(50);
      digits.push(digit);
      totalWidth += digit.displayWidth;
    }

    let currentX = this.scoreX - totalWidth / 2;
    for (const digit of digits) {
      digit.setX(currentX);
      this.scoreGroup.add(digit);
      currentX += digit.displayWidth + 3;
    }
  }

  private updateAttemptsDisplay() {
    if (this.attemptsText) {
      this.attemptsText.setText(`${this.attempts}/${this.maxAttempts}`);
    }
  }

  update() {
    // Ya no hacemos la evaluación aquí. Ahora es 100% precisa porque
    // se calcula en el onComplete del tween del balón, sin perder frames.
  }

  private kickBallToPoint(targetX: number, targetY: number) {
    this.isKicking = true;
    this.attempts++;
    this.updateAttemptsDisplay();

    this.tweens.getTweensOf(this.target).forEach((t) => t.pause());
    this.targetScaleEvent.paused = true;

    // El balón va directamente donde tocas en X y Y
    const finalTargetX = Phaser.Math.Clamp(targetX, 50, this.W - 50);
    const finalTargetY = Math.min(targetY, this.ballStartY - 50); // Evitar patear hacia atrás

    const diffX = finalTargetX - this.ball.x;

    // Punto de control para trayectoria con efecto (comba)
    // Desplazamos el control X en la misma dirección del tiro para crear la curva hacia ese lado
    const curveOffset = diffX * 1.2; // Aumentamos el multiplicador para darle más comba
    const midX = (this.ball.x + finalTargetX) / 2 + curveOffset;
    const midY = (this.ball.y + finalTargetY) / 2 - 80; // Elevamos para simular el vuelo de la parábola

    const curve = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(this.ball.x, this.ball.y),
      new Phaser.Math.Vector2(midX, midY),
      new Phaser.Math.Vector2(finalTargetX, finalTargetY),
    );

    // Determinar ángulo de rotación
    let spinAngle = 0;
    if (diffX < -20) {
      spinAngle = -720; // Rota hacia la izquierda
    } else if (diffX > 20) {
      spinAngle = 720; // Rota hacia la derecha
    } else {
      // Tiro recto: le damos rotación para simular que va rodando de frente
      spinAngle = 360;
    }

    const duration = 800; // Aumentamos el tiempo de vuelo para que vaya más lento

    // Calcular la escala final dinámicamente según la distancia en el eje Y
    // yPercent será 0 en el arco y 1 cerca de la posición inicial de la pelota
    const yPercent = Phaser.Math.Clamp(
      (finalTargetY - this.goalY) / (this.ballStartY - this.goalY),
      0,
      1,
    );
    const finalScale = Phaser.Math.Linear(0.05, this.ballScale, yPercent);

    const pathAnim = { t: 0 };
    this.trajectoryTween = this.tweens.add({
      targets: pathAnim,
      t: 1,
      duration,
      ease: "Linear",
      onUpdate: () => {
        const point = curve.getPoint(pathAnim.t);
        this.ball.setPosition(point.x, point.y);
      },
      onComplete: () => {
        if (!this.isKicking || this.isResolving) return;

        // EVALUACIÓN DE IMPACTO EXACTA EN EL PUNTO FINAL (2D)
        // Ahora calculamos la distancia real bidimensional (X e Y)
        const distance = Phaser.Math.Distance.Between(
          this.ball.x,
          this.ball.y,
          this.target.x,
          this.target.y,
        );
        const currentTargetRadius =
          (this.target.width / 2) * this.target.scaleX;

        if (distance <= currentTargetRadius * 1.5) {
          this.handleGoal(distance, currentTargetRadius);
        } else {
          this.handleMiss();
        }
      },
    });

    this.tweens.add({
      targets: this.ball,
      scaleX: finalScale, // Usar la escala dinámica calculada
      scaleY: finalScale,
      angle: `+=${spinAngle}`,
      duration,
      ease: "Sine.easeOut",
    });
  }

  private handleGoal(distance: number, targetRadius: number) {
    if (!this.isKicking || this.isResolving) return;
    this.isResolving = true;

    if (this.trajectoryTween) {
      this.trajectoryTween.stop();
      this.trajectoryTween = null;
    }
    this.tweens.killTweensOf(this.ball);

    this.sound.play("point-wing");

    // Marca visual donde pega
    const hitMark = this.add
      .text(this.ball.x, this.ball.y, "+", {
        fontSize: "40px",
        color: "#ff0000",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.time.delayedCall(500, () => hitMark.destroy());

    // Sistema de Puntuación (100, 50, 5)
    let points = 0;
    let isPerfect = false;

    // Ampliamos el margen del centro al 50% del radio
    if (distance <= targetRadius * 0.4) {
      points = 100; // Centro
      isPerfect = true;
      // Ampliamos el margen de "adentro" hasta el 100% del radio
    } else if (distance <= targetRadius * 0.9) {
      points = 50; // Adentro
    } else {
      points = 5; // Roce
    }

    this.score += points;
    this.updateScoreDisplay();

    // Impacto
    const impactDOM = this.add.dom(this.target.x, this.target.y, "div");
    const impactNode = impactDOM.node as HTMLDivElement;
    impactNode.innerHTML = `<img src="/assets/impacto.gif?t=${Date.now()}" style="position:absolute;transform:translate(-50%,-50%);width:150px;" />`;
    impactDOM.setDepth(15);
    this.time.delayedCall(600, () => impactDOM.destroy());

    // Puntos flotantes
    const floatingPoints = this.add
      .image(this.target.x, this.target.y - 30, `pt-${points}`)
      .setOrigin(0.5)
      .setDepth(20)
      .setScale(0.6);

    this.tweens.add({
      targets: floatingPoints,
      y: floatingPoints.y - 80,
      alpha: 0,
      duration: 1200,
      ease: "Power2",
      onComplete: () => floatingPoints.destroy(),
    });

    if (isPerfect) {
      const golDOM = this.add.dom(this.target.x, this.target.y, "div");
      const golNode = golDOM.node as HTMLDivElement;
      golNode.innerHTML = `<img src="/assets/gol.gif?t=${Date.now()}" style="position:absolute;transform:translate(-50%,-50%);width:400px;" />`;
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
      this.time.delayedCall(1500, () => this.resetBall());
    }
  }

  private handleMiss() {
    this.isResolving = true;

    if (this.trajectoryTween) {
      this.trajectoryTween.stop();
      this.trajectoryTween = null;
    }
    this.tweens.killTweensOf(this.ball);

    this.sound.play("point-fail");

    // Mostrar el 0 puntos flotante
    const floatingPoints = this.add
      .image(this.ball.x, this.ball.y - 30, "pt-0")
      .setOrigin(0.5)
      .setDepth(20)
      .setScale(0.6);

    this.tweens.add({
      targets: floatingPoints,
      y: floatingPoints.y - 80,
      alpha: 0,
      duration: 1200,
      ease: "Power2",
      onComplete: () => floatingPoints.destroy(),
    });

    this.tweens.add({
      targets: this.ball,
      x: this.centerX,
      y: this.ballStartY,
      scaleX: this.ballScale,
      scaleY: this.ballScale,
      angle: "-=720",
      duration: 2500,
      ease: "Power2",
      onComplete: () => {
        this.ball.setAngle(0);
        this.resumeGame();
      },
    });
  }

  private resetBall() {
    if (this.trajectoryTween) {
      this.trajectoryTween.stop();
      this.trajectoryTween = null;
    }
    this.tweens.killTweensOf(this.ball);
    this.ball.setPosition(this.centerX, this.ballStartY);
    this.ball.setScale(this.ballScale);
    this.ball.setAngle(0);
    this.resumeGame();
  }

  private resumeGame() {
    this.isKicking = false;
    this.isResolving = false;
    this.tweens.getTweensOf(this.target).forEach((t) => t.resume());
    this.targetScaleEvent.paused = false;

    if (this.attempts >= this.maxAttempts) {
      this.showFinalResult();
    }
  }

  private showFinalResult() {
    this.tweens.getTweensOf(this.target).forEach((t) => t.pause());
    this.targetScaleEvent.paused = true;

    if (this.bgMusic && this.bgMusic.isPlaying) {
      this.bgMusic.stop();
    }

    const overlay = this.add
      .rectangle(this.centerX, this.centerY, this.W, this.H, 0x000000, 0.8)
      .setDepth(100);
    overlay.setInteractive();

    let resultImageKey = "resultado-bajo";
    let resultSoundKey = "result-loser";
    if (this.score >= 200 && this.score < 400) {
      resultImageKey = "resultado-medio";
      resultSoundKey = "result-sound";
    } else if (this.score >= 400) {
      resultImageKey = "resultado-alto";
      resultSoundKey = "result-sound";
    }

    this.sound.play(resultSoundKey);

    const resultImg = this.add
      .image(this.centerX, this.centerY, resultImageKey)
      .setDisplaySize(this.W, this.H)
      .setDepth(101);

    // Confeti
    const confetti = this.add
      .particles(0, -50, "balon", {
        x: { min: 0, max: this.W },
        lifespan: 4000,
        speedY: { min: 150, max: 400 },
        speedX: { min: -80, max: 80 },
        rotate: { min: 0, max: 360 },
        gravityY: 250,
        scale: { min: 0.03, max: 0.06 },
        quantity: 1,
        frequency: 40,
        tint: [0xff4d4d, 0xff6666, 0xff7f7f, 0xff9999],
      })
      .setDepth(102);

    this.time.delayedCall(3500, () => confetti.stop());

    let taps = 0;
    resultImg.setInteractive();
    resultImg.on("pointerdown", () => {
      this.resetInactivityTimer();
      taps++;
      if (taps >= 5) {
        this.exitToStartScreen();
      }
    });
  }

  private resetInactivityTimer() {
    if (this.inactivityTimer) this.inactivityTimer.remove();
    this.inactivityTimer = this.time.addEvent({
      delay: 60000,
      callback: this.exitToStartScreen,
      callbackScope: this,
    });
  }

  private exitToStartScreen() {
    if (this.inactivityTimer) {
      this.inactivityTimer.remove();
      this.inactivityTimer = null;
    }
    const onGameOver = this.registry.get("onGameOver");
    if (onGameOver) onGameOver(this.score);
  }
}
