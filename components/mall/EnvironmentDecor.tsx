import { Suspense, useEffect, useMemo } from "react";
import { Billboard, Shadow, useTexture } from "@react-three/drei";
import { SRGBColorSpace } from "three";
import ErrorBoundary from "./ErrorBoundary";
import ProductPhoto from "./ProductPhoto";
function WindowPhoto() {
  const image = useTexture("/environment/window-street.webp");
  return (
    <mesh position={[0, 0, 0.052]}>
      <planeGeometry args={[2.6, 2.5]} />
      <meshBasicMaterial map={image} toneMapped={false} color="#e0e7df" />
    </mesh>
  );
}
export function WindowView() {
  return (
    <ErrorBoundary fallback={null}>
      <Suspense fallback={null}>
        <WindowPhoto />
      </Suspense>
    </ErrorBoundary>
  );
}
function PlantPhoto() {
  const original = useTexture("/environment/plant.webp");
  const texture = useMemo(() => {
    const t = original.clone();
    t.colorSpace = SRGBColorSpace;
    return t;
  }, [original]);
  useEffect(() => () => texture.dispose(), [texture]);
  const image = original.image as HTMLImageElement;
  const width = (2.3 * image.width) / image.height;
  return (
    <group>
      <Shadow position={[0, 0.035, 0]} scale={[0.8, 0.6, 1]} opacity={0.27} />
      <Billboard position={[0, 1.13, 0]} lockX lockZ>
        <mesh>
          <planeGeometry args={[width, 2.3]} />
          <meshBasicMaterial
            map={texture}
            transparent
            alphaTest={0.05}
            toneMapped={false}
          />
        </mesh>
      </Billboard>
    </group>
  );
}
export function ShopPlant() {
  return (
    <ErrorBoundary fallback={null}>
      <Suspense fallback={null}>
        <PlantPhoto />
      </Suspense>
    </ErrorBoundary>
  );
}
export function ShelfStock() {
  return (
    <ErrorBoundary fallback={null}>
      <Suspense fallback={null}>
        {[0.64, 1.44, 2.29].map((y, row) => (
          <group key={y}>
            {[-0.76, -0.25, 0.28, 0.76].map((x, column) => (
              <group key={x} position={[x, y, -3.71]} scale={0.43}>
                <ProductPhoto
                  id={
                    (row + column) % 3 === 0
                      ? "water-bottle"
                      : (row + column) % 3 === 1
                        ? "book"
                        : "lunch-box"
                  }
                />
              </group>
            ))}
          </group>
        ))}
      </Suspense>
    </ErrorBoundary>
  );
}
