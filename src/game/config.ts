import Phaser from "phaser";
import { MainScene } from "./MainScene";

export const getGameConfig = (
  parent: string,
  onGameOver: (score: number) => void,
): Phaser.Types.Core.GameConfig => ({
  type: Phaser.AUTO,
  parent,
  width: 1080,
  height: 1920,
  transparent: true,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0, x: 0 },
      debug: false,
    },
  },
  scene: [MainScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  callbacks: {
    preBoot: (game) => {
      game.registry.set("onGameOver", onGameOver);
    },
  },
});
