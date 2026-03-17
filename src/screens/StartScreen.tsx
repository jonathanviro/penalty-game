import React from "react";

interface Props {
  onStart: () => void;
}

export default function StartScreen({ onStart }: Props) {
  return (
    <div style={styles.container}>
      <img
        src="/assets/btn-jugar.png"
        alt="Jugar"
        onClick={onStart}
        style={styles.button}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: "100%",
    height: "100%",
    backgroundImage: "url(/assets/fondo-inicio.png)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: "300px",
  },
  button: {
    cursor: "pointer",
    width: "500px",
    maxWidth: "80%",
  },
};
