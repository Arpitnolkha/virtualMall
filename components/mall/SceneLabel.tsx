import { useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
export default function SceneLabel({
  text,
  position,
  width = 1.65,
  height = 0.34,
  background = "#f8f5e9",
  color = "#3c4835",
  billboard = true,
  onClick,
}: {
  text: string;
  position: [number, number, number];
  width?: number;
  height?: number;
  background?: string;
  color?: string;
  billboard?: boolean;
  onClick?: () => void;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 768;
    canvas.height = Math.round((768 * height) / width);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = background;
    ctx.beginPath();
    ctx.roundRect(0, 0, canvas.width, canvas.height, 20);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.font = `500 ${Math.round(canvas.height * 0.43)}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - 30);
    const t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    return t;
  }, [text, width, height, background, color]);
  useEffect(() => () => texture.dispose(), [texture]);
  // Shelf cards and wall signage sit in the room instead of floating over it.
  if (!billboard)
    return (
      <mesh
        position={position}
        onClick={
          onClick
            ? (e) => {
                e.stopPropagation();
                onClick();
              }
            : undefined
        }
      >
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial map={texture} transparent roughness={0.85} />
      </mesh>
    );
  return (
    <sprite
      position={position}
      scale={[width, height, 1]}
      onClick={
        onClick
          ? (e) => {
              e.stopPropagation();
              onClick();
            }
          : undefined
      }
    >
      <spriteMaterial
        map={texture}
        transparent
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </sprite>
  );
}
