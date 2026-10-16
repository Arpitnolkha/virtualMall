import { memo, Suspense, useMemo, useState } from "react";
import { RoundedBox, useGLTF } from "@react-three/drei";
import type { MallProduct } from "@/types/mall";
import ProductPrimitive from "./ProductPrimitive";
import ProductPhoto from "./ProductPhoto";
import photos from "@/lib/mall/productPhotos.json";
import SceneLabel from "./SceneLabel";
import ProductHighlight from "./ProductHighlight";
import ErrorBoundary from "./ErrorBoundary";
function LoadedModel({ path }: { path: string }) {
  const { scene } = useGLTF(path);
  const clone = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={clone} />;
}
export default memo(function ProductObject({
  product,
  selected,
  onSelect,
}: {
  product: MallProduct;
  selected: boolean;
  onSelect: (product: MallProduct) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const fallback = <ProductPrimitive product={product} />;
  const photographic = Object.hasOwn(photos, product.id) ? (
    <ErrorBoundary key={product.id} fallback={fallback}>
      <Suspense fallback={fallback}>
        <ProductPhoto id={product.id as keyof typeof photos} />
      </Suspense>
    </ErrorBoundary>
  ) : (
    fallback
  );
  return (
    <group
      name={`product-${product.id}`}
      position={product.position}
      rotation={product.rotation}
    >
      <RoundedBox
        args={[1.25, 0.035, 0.66]}
        radius={0.014}
        smoothness={2}
        position={[0, -0.0175, 0]}
      >
        <meshStandardMaterial color="#b7aa92" roughness={0.95} />
      </RoundedBox>
      <group
        onClick={(e) => {
          if (e.delta > 6) return;
          e.stopPropagation();
          onSelect(product);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
          setHovered(true);
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
          setHovered(false);
        }}
      >
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[1.35, 1.35, 0.6]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <group scale={product.scale ?? 1}>
          {product.modelPath ? (
            <ErrorBoundary key={product.modelPath} fallback={fallback}>
              <Suspense fallback={fallback}>
                <LoadedModel path={product.modelPath} />
              </Suspense>
            </ErrorBoundary>
          ) : (
            photographic
          )}
        </group>
      </group>
      {(selected || hovered) && <ProductHighlight />}
      <SceneLabel
        billboard={false}
        position={[0, -0.19, 0.925]}
        width={0.95}
        height={0.15}
        text={product.name}
        background={selected ? "#ffe4a7" : "#f8f5e9"}
        onClick={() => onSelect(product)}
      />
    </group>
  );
});
