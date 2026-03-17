import Phaser from "phaser";

export class MainScene extends Phaser.Scene {
  private ball!: Phaser.Physics.Arcade.Sprite;
  private target!: Phaser.Physics.Arcade.Sprite;
  private swipePoints: Phaser.Math.Vector2[] = [];
  private trajectoryTween: Phaser.Tweens.Tween | null = null;
  private isKicking: boolean = false;

  private score: number = 0;
  private attempts: number = 0;
  private maxAttempts: number = 5;

  private scoreText!: Phaser.GameObjects.Text;
  private attemptsText!: Phaser.GameObjects.Text;

  constructor() {
    super("MainScene");
  }

  preload() {
    this.load.image("fondo-juego", "/assets/fondo-juego.png");
    this.load.image("arco", "/assets/arco.png");
    this.load.image("balon", "/assets/balon.png");
    this.load.image("objetivo", "/assets/objetivo.png");
    this.load.image("impacto", "/assets/impacto.gif");
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
    this.time.addEvent({
      delay: 1500,
      loop: true,
      callback: () => {
        const newScale = Phaser.Math.FloatBetween(0.25, 0.6);
        this.tweens.add({
          targets: this.target,
          scaleX: newScale,
          scaleY: newScale,
          duration: 300,
          ease: "Power2",
        });
      },
    });

    // Balón
    this.ball = this.physics.add.sprite(1080 / 2, 1600, "balon").setScale(0.6);

    // Expandir límites del mundo hacia arriba para detectar los fallos (miss)
    this.physics.world.setBounds(0, -500, 1080, 2420);

    // Textos de UI
    const textStyles = {
      fontSize: "64px",
      color: "#fff",
      fontStyle: "bold",
      stroke: "#000",
      strokeThickness: 8,
    };
    this.scoreText = this.add.text(50, 50, "Score: 0", textStyles);
    this.attemptsText = this.add.text(1080 - 450, 50, "Tiros: 0/5", textStyles);

    // Manejo del Input (Swipe)
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.isKicking) return;
      this.swipePoints = [new Phaser.Math.Vector2(pointer.x, pointer.y)];
    });

    // Rastrear la trayectoria del dedo para calcular la curva
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (this.isKicking || this.swipePoints.length === 0) return;
      this.swipePoints.push(new Phaser.Math.Vector2(pointer.x, pointer.y));
    });

    // Detectar tanto el levantar el dedo (pointerup) como salir de la pantalla (pointerout)
    const handleSwipe = (pointer: Phaser.Input.Pointer) => {
      if (this.isKicking || this.swipePoints.length < 2) {
        this.swipePoints = [];
        return;
      }

      const start = this.swipePoints[0];
      const end = new Phaser.Math.Vector2(pointer.x, pointer.y);
      this.swipePoints.push(end);

      const swipeDistanceY = start.y - end.y;
      if (swipeDistanceY > 30) {
        this.kickBall(start, end);
      }
      this.swipePoints = [];
    };

    this.input.on("pointerup", handleSwipe);
    this.input.on("pointerout", handleSwipe);

    // Colisión Balón y Target
    this.physics.add.overlap(
      this.ball,
      this.target,
      this.handleGoal as any,
      undefined,
      this,
    );
  }

  update() {
    // Si el balón pasa la portería sin colisionar es un fallo
    if (this.isKicking && this.ball.y < 850) {
      this.handleMiss();
    }
  }

  kickBall(start: Phaser.Math.Vector2, end: Phaser.Math.Vector2) {
    this.isKicking = true;
    this.attempts++;
    this.attemptsText.setText(`Tiros: ${this.attempts}/${this.maxAttempts}`);

    const dx = end.x - start.x;
    const dy = end.y - start.y || -1;

    // Factor de extrapolación para que el balón cruce la línea del arco
    const distanceToGoalY = this.ball.y - 915;
    const extrapolationFactor = Math.abs(distanceToGoalY / dy);

    // X objetivo (con sensibilidad ajustada para mejor jugabilidad)
    const finalTargetX = this.ball.x + dx * extrapolationFactor * 0.6;
    const finalTargetY = 915;

    // Calcular desviación curva (Efecto Magnus / Comba)
    const midIndex = Math.floor(this.swipePoints.length / 2);
    const mid = this.swipePoints[midIndex] || start;

    const t = Math.max(0, Math.min(1, (mid.y - start.y) / dy));
    const expectedStraightX = start.x + dx * t;
    const curveDeviationX = mid.x - expectedStraightX;

    // Punto de control de la curva de Bezier aplicado al balón
    const controlPointX =
      this.ball.x + (finalTargetX - this.ball.x) * 0.5 + curveDeviationX * 12;
    const controlPointY = this.ball.y + (finalTargetY - this.ball.y) * 0.5;

    const curve = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(this.ball.x, this.ball.y),
      new Phaser.Math.Vector2(controlPointX, controlPointY),
      new Phaser.Math.Vector2(finalTargetX, finalTargetY),
    );

    // Duración dinámica basada en la velocidad del swipe
    const duration = Math.max(400, Math.min(1000, 150000 / Math.abs(dy)));

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
    });

    // Animación: el balón se hace pequeño (simulando profundidad 3D) y gira
    this.tweens.add({
      targets: this.ball,
      scaleX: 0.25, // Reduce el tamaño en proporción a la distancia visual del nuevo arco
      scaleY: 0.25,
      angle: { from: 0, to: 1080 }, // Da 3 vueltas completas
      duration: duration,
      ease: "Sine.easeOut",
    });
  }

  handleGoal() {
    if (!this.isKicking) return;
    this.isKicking = false;

    // Detener las animaciones de inmediato
    if (this.trajectoryTween) {
      this.trajectoryTween.stop();
      this.trajectoryTween = null;
    }
    this.tweens.killTweensOf(this.ball);

    // Calcular puntos según la escala actual del objetivo
    const currentScale = this.target.scaleX;
    let points = 10; // grande
    if (currentScale < 0.35)
      points = 50; // pequeño
    else if (currentScale < 0.48) points = 30; // medio

    this.score += points;
    this.scoreText.setText(`Score: ${this.score}`);

    // Efecto visual de Impacto
    const impact = this.add.image(this.ball.x, this.ball.y, "impacto");
    this.tweens.add({
      targets: impact,
      alpha: 0,
      scale: 1.5,
      duration: 500,
      onComplete: () => impact.destroy(),
    });

    this.time.delayedCall(1000, () => this.resetBall());
  }

  handleMiss() {
    this.isKicking = false;
    if (this.trajectoryTween) {
      this.trajectoryTween.stop();
      this.trajectoryTween = null;
    }
    this.tweens.killTweensOf(this.ball);
    this.time.delayedCall(500, () => this.resetBall());
  }

  resetBall() {
    if (this.trajectoryTween) {
      this.trajectoryTween.stop();
      this.trajectoryTween = null;
    }
    this.tweens.killTweensOf(this.ball); // Detener animaciones previas
    this.ball.setPosition(1080 / 2, 1600);
    this.ball.setScale(0.6); // Restaurar tamaño original
    this.ball.setAngle(0); // Restaurar rotación

    if (this.attempts >= this.maxAttempts) {
      const onGameOver = this.registry.get("onGameOver");
      if (onGameOver) onGameOver(this.score);
    }
  }
}
