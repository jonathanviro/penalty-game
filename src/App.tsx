import React, { useState } from "react";
import StartScreen from "./screens/StartScreen";
import GameScreen from "./screens/GameScreen";
import ResultScreen from "./screens/ResultScreen";

type ScreenState = "start" | "game" | "result";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenState>("start");
  const [finalScore, setFinalScore] = useState<number>(0);

  const handleStart = () => setCurrentScreen("game");

  const handleGameOver = (score: number) => {
    setFinalScore(score);
    setCurrentScreen("result");
  };

  const handleRestart = () => setCurrentScreen("start");

  return (
    <div style={containerStyles}>
      <div style={totemStyles}>
        {currentScreen === "start" && <StartScreen onStart={handleStart} />}
        {currentScreen === "game" && <GameScreen onGameOver={handleGameOver} />}
        {currentScreen === "result" && (
          <ResultScreen score={finalScore} onRestart={handleRestart} />
        )}
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
  width: "1080px",
  height: "1920px",
  position: "relative",
  backgroundColor: "#111",
};
