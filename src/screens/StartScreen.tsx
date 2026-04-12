import React, { useState, useEffect } from "react";

interface Props {
  onStart: () => void;
}

export default function StartScreen({ onStart }: Props) {
  const [showInstructions, setShowInstructions] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const handlePlayClick = () => {
    setShowInstructions(true);
  };

  useEffect(() => {
    if (!showInstructions) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onStart();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showInstructions, onStart]);

  if (showInstructions) {
    return (
      <div style={styles.containerWithOverlay}>
        <div style={styles.instructionsOverlay}>
          <div style={styles.instructionsBox}>
            <h1 style={styles.title}>¡CÓMO JUGAR!</h1>
            <p style={styles.text}>Desliza ARRIBA para patear</p>
            <div style={styles.pointsBox}>
              <div style={styles.pointRow}>
                <img
                  src="/assets/100-puntos.png"
                  alt="100"
                  style={styles.pointImg}
                />
                <span style={styles.pointText}>Centro</span>
              </div>
              <div style={styles.pointRow}>
                <img
                  src="/assets/50-puntos.png"
                  alt="50"
                  style={styles.pointImg}
                />
                <span style={styles.pointText}>Adentro</span>
              </div>
              <div style={styles.pointRow}>
                <img
                  src="/assets/5-puntos.png"
                  alt="5"
                  style={styles.pointImg}
                />
                <span style={styles.pointText}>Roce</span>
              </div>
            </div>
            <p style={styles.text}>¡Tienes 5 tiros!</p>
            <p style={styles.countdown}>Iniciando en {countdown}...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <img
        src="/assets/btn-jugar.png"
        alt="Jugar"
        onClick={handlePlayClick}
        style={styles.button}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundImage: "url(/assets/fondo-inicio.png)",
    backgroundSize: "100% 100%",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  containerWithOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundImage: "url(/assets/fondo-inicio.png)",
    backgroundSize: "100% 100%",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    cursor: "pointer",
    width: "240px",
    marginBottom: "50px",
  },
  instructionsOverlay: {
    width: "100%",
    height: "100%",
    background: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  instructionsContainer: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background: "rgba(0, 0, 0, 0.85)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  instructionsBox: {
    width: "480px",
    maxWidth: "90vw",
    backgroundColor: "rgba(30, 30, 30, 0.95)",
    padding: "35px",
    borderRadius: "20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    border: "2px solid #fff",
  },
  title: {
    color: "#fff",
    fontSize: "36px",
    margin: "0 0 12px 0",
    fontFamily: "sans-serif",
  },
  text: {
    color: "#fff",
    fontSize: "22px",
    margin: "10px 0",
    fontFamily: "sans-serif",
    textAlign: "center",
  },
  pointsBox: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    margin: "20px 0",
  },
  pointRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "18px",
  },
  pointImg: {
    width: "170px",
  },
  pointText: {
    color: "#ffd700",
    fontSize: "22px",
    fontFamily: "sans-serif",
  },
  countdown: {
    color: "#fff",
    fontSize: "18px",
    marginTop: "15px",
    fontFamily: "sans-serif",
  },
};
