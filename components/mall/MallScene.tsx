"use client";
import { memo, Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { Html } from "@react-three/drei";
import { nearestYaw, dragLook } from "@/lib/mall/navigation";
import { products } from "@/lib/mall/products";
import { useMallSelection } from "@/lib/mall/productContext";
import { showroomProduct, zones, type ZoneId } from "@/lib/mall/showroom";
import type { MallProduct } from "@/types/mall";
import ShowroomRoom from "./ShowroomRoom";
import ProductObject from "./ProductObject";
const placed = products.map(showroomProduct);
function Navigation({
  zone,
  enabled,
  look,
  navigationKey,
}: {
  zone: ZoneId;
  enabled: boolean;
  look: number;
  navigationKey: number;
}) {
  const { camera, gl, invalidate } = useThree();
  const sweep = useRef(false);
  const reduced = useRef(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      reduced.current = media.matches;
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const motion = useRef({
    position: new Vector3(0, 1.85, 8),
    yaw: 0,
    pitch: -0.1,
    currentYaw: 0,
    currentPitch: -0.1,
  });
  useEffect(() => {
    const selected = zones.find((z) => z.id === zone)!;
    const m = motion.current;
    sweep.current = false;
    m.position.fromArray(selected.position);
    const direction = new Vector3(...selected.target)
      .sub(m.position)
      .normalize();
    m.yaw = nearestYaw(Math.atan2(-direction.x, -direction.z), m.currentYaw);
    m.pitch = Math.asin(direction.y);
    invalidate();
  }, [zone, navigationKey, invalidate]);
  useEffect(() => {
    if (!look || reduced.current) return;
    sweep.current = !sweep.current;
    invalidate();
  }, [look, invalidate]);
  useEffect(() => {
    if (!enabled) {
      // Snapshot the actual rendered pose, even if a popup interrupted a glide.
      const m = motion.current;
      m.position.copy(camera.position);
      m.yaw = m.currentYaw;
      m.pitch = m.currentPitch;
      sweep.current = false;
      return;
    }
    const element = gl.domElement;
    let previous: { x: number; y: number; id: number } | null = null;
    const down = (event: PointerEvent) => {
      if (!event.isPrimary) return;
      previous = { x: event.clientX, y: event.clientY, id: event.pointerId };
    };
    const move = (event: PointerEvent) => {
      if (!previous || previous.id !== event.pointerId) return;
      const m = motion.current;
      const next = dragLook(
        m.yaw,
        m.pitch,
        event.clientX - previous.x,
        event.clientY - previous.y,
      );
      m.yaw = next.yaw;
      m.pitch = next.pitch;
      sweep.current = false;
      previous = { x: event.clientX, y: event.clientY, id: event.pointerId };
      invalidate();
    };
    const up = () => {
      previous = null;
    };
    element.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      element.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [enabled, gl, invalidate, camera]);
  useFrame((_, delta) => {
    if (!enabled) return;
    const m = motion.current;
    if (sweep.current) m.yaw += Math.min(delta, 0.05) * 0.18;
    const ease = reduced.current
      ? 1
      : 1 - Math.exp(-Math.min(delta, 0.05) * 10);
    camera.position.lerp(m.position, ease);
    m.currentYaw += (m.yaw - m.currentYaw) * ease;
    m.currentPitch += (m.pitch - m.currentPitch) * ease;
    camera.rotation.set(m.currentPitch, m.currentYaw, 0, "YXZ");
    if (
      sweep.current ||
      camera.position.distanceToSquared(m.position) > 0.00001 ||
      Math.abs(m.yaw - m.currentYaw) > 0.0001 ||
      Math.abs(m.pitch - m.currentPitch) > 0.0001
    )
      invalidate();
  });
  useEffect(() => {
    invalidate();
  }, [enabled, invalidate]);
  return null;
}
function Products({ onSelect }: { onSelect: (p: MallProduct) => void }) {
  const { activeProduct } = useMallSelection();
  return (
    <>
      {placed.map((p) => (
        <group key={p.id}>
          <ProductObject
            product={p}
            selected={activeProduct?.id === p.id}
            onSelect={() =>
              onSelect(products.find((item) => item.id === p.id)!)
            }
          />
        </group>
      ))}
    </>
  );
}
function MallScene({
  zone,
  enabled,
  onSelect,
  onReady,
  onNavigate,
  look,
  navigationKey,
}: {
  onNavigate: (zone: ZoneId) => void;
  look: number;
  navigationKey: number;
  zone: ZoneId;
  enabled: boolean;
  onSelect: (p: MallProduct) => void;
  onReady: () => void;
}) {
  return (
    <Canvas
      camera={{ position: [0, 1.85, 8], fov: 58, near: 0.1, far: 45 }}
      dpr={[1, 1.5]}
      frameloop="demand"
      onCreated={onReady}
      gl={{ antialias: true, powerPreference: "low-power" }}
      fallback={
        <div className="showroom-fallback">
          The 3D view is unavailable. Use Explore products to meet Maya and
          browse the collection.
        </div>
      }
    >
      <Navigation
        zone={zone}
        enabled={enabled}
        look={look}
        navigationKey={navigationKey}
      />
      <Suspense fallback={null}>
        <ShowroomRoom />
        <Products onSelect={onSelect} />
        {enabled &&
          zones
            .filter((z) => z.id !== zone)
            .map((z) => (
              <Html
                key={z.id}
                position={[z.position[0], 0.35, z.position[2] - 1]}
                center
                zIndexRange={[4, 1]}
                occlude
              >
                <button
                  className="spatial-hotspot"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate(z.id);
                  }}
                  aria-label={`Walk to ${z.name}`}
                >
                  <span aria-hidden="true">⌖</span>
                  <strong>{z.name}</strong>
                  <small>Walk here</small>
                </button>
              </Html>
            ))}
      </Suspense>
    </Canvas>
  );
}
export default memo(MallScene);
