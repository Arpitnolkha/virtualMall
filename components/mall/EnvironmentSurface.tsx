import { Suspense, useEffect, useMemo } from "react";
import { useTexture } from "@react-three/drei";
import { Color, RepeatWrapping, SRGBColorSpace } from "three";
import {
  Surface as BasicSurface,
  type Finish as BasicFinish,
} from "@/lib/scene/materials";
import ErrorBoundary from "./ErrorBoundary";
export type Finish = BasicFinish | "plaster";
type Props = {
  color: string;
  finish?: Finish;
  metalness?: number;
  roughness?: number;
  repeat?: [number, number];
  offset?: [number, number];
};
const paths = {
  wood: "/environment/oak.webp",
  stone: "/environment/limestone.webp",
  plaster: "/environment/plaster.webp",
};
function PhotographMaterial({
  color,
  finish,
  metalness = 0,
  roughness = 0.7,
  repeat = [1, 1],
  offset = [0, 0],
}: Props & { finish: keyof typeof paths }) {
  const original = useTexture(paths[finish]);
  const [rx, ry] = repeat,
    [ox, oy] = offset;
  const texture = useMemo(() => {
    const t = original.clone();
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(rx, ry);
    t.offset.set(ox, oy);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 8;
    t.needsUpdate = true;
    return t;
  }, [original, rx, ry, ox, oy]);
  useEffect(() => () => texture.dispose(), [texture]);
  const tint = useMemo(
    () =>
      new Color(color).lerp(
        new Color("white"),
        finish === "wood" ? 0.65 : 0.15,
      ),
    [color, finish],
  );
  return (
    <meshStandardMaterial
      color={tint}
      map={texture}
      bumpMap={texture}
      bumpScale={finish === "plaster" ? 0.001 : 0.002}
      metalness={metalness}
      roughness={roughness}
    />
  );
}
export function EnvironmentSurface(props: Props) {
  const finish = props.finish;
  const fallback = (
    <BasicSurface
      color={props.color}
      finish={finish === "plaster" ? undefined : finish}
      metalness={props.metalness}
      roughness={props.roughness}
    />
  );
  if (finish !== "wood" && finish !== "stone" && finish !== "plaster")
    return fallback;
  return (
    <ErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <PhotographMaterial {...props} finish={finish} />
      </Suspense>
    </ErrorBoundary>
  );
}
