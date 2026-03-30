import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { getGameConfig } from "../game/config";

interface Props {
  onGameOver: (score: number) => void;
}

export default function GameScreen({ onGameOver }: Props) {
  const gameContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameContainerRef.current) return;

    const config = getGameConfig(gameContainerRef.current.id, onGameOver);
    const game = new Phaser.Game(config);

    return () => {
      game.destroy(true);
    };
  }, [onGameOver]);

  return (
    <div
      id="phaser-game-container"
      ref={gameContainerRef}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
