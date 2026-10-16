import { useEffect, useMemo, useRef, useState } from "react";
import { Billboard } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { PlaneGeometry, type MeshBasicMaterial } from "three";
import { bindPersonSurface } from "@/lib/avatar/personSurface";
import type { AvatarState } from "@/lib/avatar/shopkeeperAvatar";
import SceneLabel from "@/components/mall/SceneLabel";

export function AvatarFallback() {
  return (
    <SceneLabel
      position={[0, 0, 0]}
      text="Maya · Your shopkeeper"
      width={2}
      height={0.25}
    />
  );
}

export function PersonAvatar({
  video,
  onReady,
  frostedBackground = false,
}: {
  video?: HTMLVideoElement;
  onReady?: () => void;
  frostedBackground?: boolean;
}) {
  const material = useRef<MeshBasicMaterial>(null);
  const invalidate = useThree((s) => s.invalidate);
  const [failed, setFailed] = useState(false);
  const geometry = useMemo(() => new PlaneGeometry(1.65, 1.65), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    if (!material.current) return;
    const target = material.current;
    let dispose: (() => void) | undefined;
    let stopped = false;
    const start = (source: HTMLImageElement | HTMLVideoElement) => {
      if (!stopped)
        dispose = bindPersonSurface(
          source,
          target,
          invalidate,
          () => setFailed(true),
          onReady,
          frostedBackground,
        );
    };
    const image = new Image();
    if (video) start(video);
    else {
      image.onload = () => start(image);
      image.onerror = () => {
        if (!stopped) setFailed(true);
      };
      image.src = "/avatars/maya-liv.webp";
    }
    return () => {
      stopped = true;
      image.onload = null;
      image.onerror = null;
      dispose?.();
    };
  }, [video, invalidate, onReady, frostedBackground]);
  return (
    <group position={[0, 2.13, -2.25]} name="maya-person">
      <Billboard lockX lockZ>
        <mesh
          geometry={geometry}
          position={[0, 0, video ? 0.002 : 0]}
          renderOrder={video ? 2 : 1}
        >
          <meshBasicMaterial
            ref={material}
            transparent
            opacity={0}
            depthWrite={false}
            depthTest={false}
            toneMapped={false}
          />
        </mesh>
      </Billboard>
      {failed && (
        <group position={[0, 0.85, 0]}>
          <AvatarFallback />
        </group>
      )}
    </group>
  );
}
export default function ShopkeeperAvatar({ state }: { state: AvatarState }) {
  return (
    <group name={`shopkeeper-${state}`}>
      <PersonAvatar />
    </group>
  );
}
