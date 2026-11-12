/** Ícono de la app (huella) para ImageResponse: solo divs con estilos en línea. */
export function PawIcon({ size, rounded = true }: { size: number; rounded?: boolean }) {
  const s = size / 100;
  const toe = (left: number, top: number, w: number, h: number) => (
    <div
      style={{
        position: "absolute",
        left: left * s,
        top: top * s,
        width: w * s,
        height: h * s,
        borderRadius: "50%",
        background: "#fdf6e9",
      }}
    />
  );
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        position: "relative",
        background: "linear-gradient(140deg, #14b8a6 0%, #0f766e 100%)",
        borderRadius: rounded ? size * 0.22 : 0,
      }}
    >
      {toe(19, 34, 15, 20)}
      {toe(33, 18, 15, 21)}
      {toe(52, 18, 15, 21)}
      {toe(66, 34, 15, 20)}
      <div
        style={{
          position: "absolute",
          left: 30 * s,
          top: 46 * s,
          width: 40 * s,
          height: 34 * s,
          borderRadius: `${20 * s}px ${20 * s}px ${16 * s}px ${16 * s}px`,
          background: "#fdf6e9",
        }}
      />
    </div>
  );
}
