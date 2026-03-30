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
    position: "absolute", // Asegura que se salga de márgenes del padre
    top: 0,
    left: 0,
    width: "100vw", // 100% del ancho de la pantalla real
    height: "100vh", // 100% del alto de la pantalla real
    backgroundImage: "url(/assets/fondo-inicio.png)",
    backgroundSize: "100% 100%", // Obliga a mostrar el 100% de la imagen sin recortes
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  button: {
    cursor: "pointer",
    width: "500px",
    maxWidth: "80%",
    marginBottom: "350px", // Aumenta este número para subir más el botón, o redúcelo para bajarlo
  },
};
