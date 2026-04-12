import React, { useState } from "react";
import StartScreen from "./screens/StartScreen";
import GameScreen from "./screens/GameScreen";

type ScreenState = "start" | "game";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenState>("start");

  const handleStart = () => setCurrentScreen("game");

  const handleGameOver = () => {
    setCurrentScreen("start"); // Redirigir directamente al inicio
  };

  return (
    <div style={containerStyles}>
      <div style={totemStyles}>
        {currentScreen === "start" && <StartScreen onStart={handleStart} />}
        {currentScreen === "game" && <GameScreen onGameOver={handleGameOver} />}
      </div>
    </div>
  );
}

const containerStyles: React.CSSProperties = {
  width: "100vw",
  height: "100vh",
  backgroundColor: "#000",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  overflow: "hidden",
};

const totemStyles: React.CSSProperties = {
  width: "896px",
  height: "640px",
  position: "relative",
  backgroundColor: "#111",
};
