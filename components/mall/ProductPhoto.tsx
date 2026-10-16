import { useEffect, useMemo } from "react";
import { Shadow, useTexture } from "@react-three/drei";
import { DoubleSide, SRGBColorSpace } from "three";
import photos from "@/lib/mall/productPhotos.json";

export default function ProductPhoto({ id }: { id: keyof typeof photos }) {
  const photo = photos[id];
  const loaded = useTexture(photo.src);
  const texture = useMemo(() => {
    const copy = loaded.clone();
    const [x, y, width, height] = photo.bounds;
    copy.offset.set(x, 1 - y - height);
    copy.repeat.set(width, height);
    copy.colorSpace = SRGBColorSpace;
    copy.anisotropy = 4;
    copy.needsUpdate = true;
    return copy;
  }, [loaded, photo]);
  useEffect(() => () => texture.dispose(), [texture]);
  const image = loaded.image as HTMLImageElement;
  const aspect =
    (image.width * photo.bounds[2]) / (image.height * photo.bounds[3]);
  const width = Math.min(photo.maxWidth, photo.maxHeight * aspect);
  const height = width / aspect;
  return (
    <group name={`photographic-${id}`}>
      <Shadow
        position={[0, 0.003, 0]}
        scale={[width * 1.05, width * 0.48, 1]}
        opacity={0.38}
        colorStop={0.25}
      />
      <Shadow
        position={[0, 0.004, 0]}
        scale={[width * 0.8, width * 0.16, 1]}
        opacity={0.55}
        colorStop={0.3}
      />
      {/* The bottom edge meets the support; fixed orientation avoids a revolving cutout. */}
      <group position={[0, height / 2 - 0.004, 0]}>
        <mesh>
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial
            map={texture}
            transparent
            alphaTest={0.05}
            toneMapped={false}
            side={DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
}
