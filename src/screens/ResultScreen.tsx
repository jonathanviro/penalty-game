import React from "react";

interface Props {
  score: number;
  onRestart: () => void;
}

export default function ResultScreen({ score, onRestart }: Props) {
  // Lógica para definir la imagen resultado
  let resultImage = "/assets/resultado-bajo.png";
  if (score >= 40 && score < 90) {
    resultImage = "/assets/resultado-medio.png";
  } else if (score >= 90) {
    resultImage = "/assets/resultado-alto.png";
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.scoreText}>Puntaje Final: {score}</h1>
      <img src={resultImage} alt="Resultado Final" style={styles.resultImg} />
      <img
        src="/assets/btn-reintentar.png"
        alt="Reintentar"
        onClick={onRestart}
        style={styles.button}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: "100%",
    height: "100%",
    backgroundColor: "#000",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "60px",
  },
  scoreText: { color: "#fff", fontSize: "80px", margin: 0 },
  resultImg: { width: "800px", maxWidth: "80%" },
  button: { cursor: "pointer", width: "400px", maxWidth: "60%" },
};
