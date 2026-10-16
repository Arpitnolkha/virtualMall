import { useMemo } from "react";
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
export type Finish = "fabric" | "wood" | "stone" | "leather";
// Small deterministic shared textures: no network requests or per-frame work.
const textures = new Map<Finish, CanvasTexture>();
function textureFor(finish: Finish) {
  const existing = textures.get(finish);
  if (existing) return existing;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  let seed = 71;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  ctx.fillStyle = finish === "wood" ? "#ddc6a3" : "#eeeeea";
  ctx.fillRect(0, 0, 256, 256);
  if (finish === "wood") {
    for (let i = 0; i < 420; i++) {
      const x = random() * 256;
      ctx.strokeStyle = `rgba(77,42,16,${random() * 0.18})`;
      ctx.lineWidth = random() * 1.8;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      for (let y = 0; y <= 256; y += 8)
        ctx.lineTo(x + Math.sin(y * 0.025 + x) * 2, y);
      ctx.stroke();
    }
  } else if (finish === "fabric") {
    for (let i = 0; i < 256; i += 4) {
      ctx.fillStyle = i % 8 ? "#b6b6b1" : "#d9d9d3";
      ctx.fillRect(i, 0, 1, 256);
      ctx.fillRect(0, i, 256, 1);
    }
  } else {
    for (let i = 0; i < 10000; i++) {
      const shade = Math.floor(170 + random() * 80);
      ctx.fillStyle = `rgba(${shade},${shade},${shade},.4)`;
      ctx.fillRect(
        random() * 256,
        random() * 256,
        finish === "stone" ? 2 : 1,
        1,
      );
    }
    if (finish === "stone") {
      ctx.strokeStyle = "#b6b4ab";
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        let y = random() * 256;
        ctx.moveTo(0, y);
        for (let x = 0; x <= 256; x += 8) {
          y += (random() - 0.5) * 12;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.anisotropy = 4;
  texture.repeat.set(finish === "fabric" ? 3 : 1, finish === "fabric" ? 3 : 1);
  textures.set(finish, texture);
  return texture;
}
export function Surface({
  color,
  finish,
  metalness = 0,
  roughness = 0.65,
}: {
  color: string;
  finish?: Finish;
  metalness?: number;
  roughness?: number;
}) {
  const map = useMemo(() => (finish ? textureFor(finish) : null), [finish]);
  return (
    <meshStandardMaterial
      color={color}
      map={map}
      bumpMap={map}
      bumpScale={
        finish === "fabric" ? 0.012 : finish === "leather" ? 0.007 : 0.003
      }
      metalness={metalness}
      roughness={roughness}
    />
  );
}
