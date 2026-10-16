import { RoundedBox } from "@react-three/drei";
import { useMemo } from "react";
import { IcosahedronGeometry, Vector3 } from "three";
import { Surface, type Finish } from "@/lib/scene/materials";
import type { MallProduct } from "@/types/mall";
type V = [number, number, number];
function Block({
  size,
  position = [0, 0, 0],
  color,
  radius = 0.04,
  finish,
  metalness = 0,
  roughness = 0.6,
}: {
  size: V;
  position?: V;
  color: string;
  radius?: number;
  finish?: Finish;
  metalness?: number;
  roughness?: number;
}) {
  return (
    <RoundedBox
      args={size}
      radius={radius}
      smoothness={4}
      position={position}
      castShadow
      receiveShadow
    >
      <Surface
        color={color}
        finish={finish}
        metalness={metalness}
        roughness={roughness}
      />
    </RoundedBox>
  );
}
function Ring({
  position,
  radius,
  tube,
  color,
  rotation = [0, 0, 0],
  arc = Math.PI * 2,
  metalness = 0,
}: {
  position: V;
  radius: number;
  tube: number;
  color: string;
  rotation?: V;
  arc?: number;
  metalness?: number;
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow>
      <torusGeometry args={[radius, tube, 10, 40, arc]} />
      <Surface color={color} metalness={metalness} roughness={0.4} />
    </mesh>
  );
}
function Ball() {
  const patches = useMemo(() => {
    const geo = new IcosahedronGeometry(1, 0);
    const pos = geo.getAttribute("position");
    const vertices: Vector3[] = [];
    for (let i = 0; i < pos.count; i++) {
      const v = new Vector3().fromBufferAttribute(pos, i).normalize();
      if (!vertices.some((p) => p.distanceTo(v) < 0.001)) vertices.push(v);
    }
    geo.dispose();
    return vertices.map((v) => {
      const normal = v.clone();
      const axis = new Vector3(0, 1, 0);
      if (Math.abs(v.y) > 0.9) axis.set(1, 0, 0);
      const right = new Vector3().crossVectors(axis, normal).normalize();
      const up = new Vector3().crossVectors(normal, right);
      const near = vertices
        .filter((p) => p.distanceTo(v) > 0.1)
        .sort((a, b) => a.distanceTo(v) - b.distanceTo(v))
        .slice(0, 5)
        .map((p) => v.clone().multiplyScalar(2).add(p).normalize())
        .sort(
          (a, b) =>
            Math.atan2(a.dot(up), a.dot(right)) -
            Math.atan2(b.dot(up), b.dot(right)),
        );
      const data: number[] = [];
      for (let i = 0; i < 5; i++) {
        for (const point of [
          v,
          near[i].clone().lerp(v, 0.07).normalize(),
          near[(i + 1) % 5].clone().lerp(v, 0.07).normalize(),
        ])
          data.push(...point.clone().multiplyScalar(0.394).toArray());
      }
      return new Float32Array(data);
    });
  }, []);
  return (
    <group position={[0, 0.4, 0]} rotation={[0.2, 0.3, 0.1]}>
      <mesh castShadow>
        <sphereGeometry args={[0.39, 40, 28]} />
        <Surface color="#eceae4" finish="leather" roughness={0.8} />
      </mesh>
      {patches.map((data, i) => (
        <mesh key={i}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[data, 3]} />
          </bufferGeometry>
          <meshBasicMaterial color="#242a2b" side={2} />
        </mesh>
      ))}
    </group>
  );
}
export default function ProductPrimitive({
  product: p,
}: {
  product: MallProduct;
}) {
  switch (p.id) {
    case "school-backpack":
      return (
        <group>
          {[-0.22, 0.22].map((x) => (
            <group key={x}>
              <Block
                size={[0.095, 0.66, 0.1]}
                position={[x, 0.43, -0.19]}
                color="#482e24"
                finish="fabric"
              />
              <Ring
                position={[x, 0.57, -0.14]}
                radius={0.17}
                tube={0.045}
                color="#604235"
                rotation={[0, Math.PI / 2, 0]}
              />
            </group>
          ))}
          <Block
            size={[0.7, 0.84, 0.39]}
            position={[0, 0.45, 0]}
            radius={0.14}
            color="#b5673f"
            finish="fabric"
            roughness={0.95}
          />
          <Block
            size={[0.57, 0.4, 0.13]}
            position={[0, 0.29, 0.225]}
            radius={0.065}
            color="#a75432"
            finish="fabric"
            roughness={0.95}
          />
          <Block
            size={[0.54, 0.014, 0.012]}
            position={[0, 0.46, 0.299]}
            color="#3e3028"
            radius={0.004}
          />
          <Block
            size={[0.025, 0.075, 0.017]}
            position={[0.22, 0.425, 0.31]}
            color="#c6b799"
            radius={0.005}
            metalness={0.8}
          />
          <Block
            size={[0.14, 0.07, 0.012]}
            position={[0, 0.68, 0.202]}
            color="#e1c4a0"
            radius={0.009}
          />
          <Ring
            position={[0, 0.88, 0]}
            radius={0.12}
            tube={0.026}
            color="#4e3528"
            arc={Math.PI}
          />
          {[-0.36, 0.36].map((x) => (
            <Block
              key={x}
              size={[0.09, 0.27, 0.26]}
              position={[x, 0.25, 0]}
              color="#7c4b32"
              finish="fabric"
              radius={0.03}
            />
          ))}
        </group>
      );
    case "running-shoes":
      return (
        <group>
          {[-0.235, 0.235].map((x, i) => (
            <group
              key={x}
              position={[x, 0, 0]}
              rotation={[0, i ? 0.1 : -0.1, 0]}
            >
              <Block
                size={[0.35, 0.075, 0.78]}
                position={[0, 0.06, 0.04]}
                color="#303333"
                radius={0.035}
              />
              <Block
                size={[0.35, 0.11, 0.76]}
                position={[0, 0.13, 0.04]}
                color="#ece9df"
                radius={0.05}
              />
              <mesh
                position={[0, 0.255, 0.12]}
                scale={[0.165, 0.135, 0.32]}
                castShadow
              >
                <sphereGeometry args={[1, 28, 20]} />
                <Surface color="#b99862" finish="fabric" roughness={0.95} />
              </mesh>
              <Block
                size={[0.29, 0.27, 0.3]}
                position={[0, 0.27, -0.17]}
                color="#aa8957"
                finish="fabric"
                radius={0.09}
              />
              <mesh
                position={[0, 0.42, -0.18]}
                rotation={[-Math.PI / 2, 0, 0]}
                scale={[0.8, 1, 1]}
              >
                <circleGeometry args={[0.105, 24]} />
                <Surface color="#302e2a" />
              </mesh>
              <Ring
                position={[0, 0.417, -0.18]}
                rotation={[Math.PI / 2, 0, 0]}
                radius={0.112}
                tube={0.024}
                color="#ccb58d"
              />
              {[0, 0.07, 0.14, 0.21].map((z) => (
                <group
                  key={z}
                  position={[0, 0.367 - z * 0.18, z - 0.06]}
                  rotation={[0, 0.18, 0]}
                >
                  <Block
                    size={[0.22, 0.014, 0.022]}
                    color="#faf6e9"
                    radius={0.006}
                  />
                </group>
              ))}
              {[-0.17, 0.17].map((s) => (
                <Block
                  key={s}
                  size={[0.008, 0.055, 0.27]}
                  position={[s, 0.25, 0.06]}
                  color="#eee7d5"
                  radius={0.002}
                />
              ))}
            </group>
          ))}
        </group>
      );
    case "water-bottle":
      return (
        <group>
          <mesh position={[0, 0.43, 0]} castShadow>
            <cylinderGeometry args={[0.208, 0.22, 0.72, 48]} />
            <Surface color="#507d76" metalness={0.65} roughness={0.26} />
          </mesh>
          <mesh position={[0, 0.07, 0]} castShadow>
            <sphereGeometry args={[0.22, 36, 20]} />
            <Surface color="#507d76" metalness={0.65} roughness={0.26} />
          </mesh>
          <mesh position={[0, 0.8, 0]} castShadow>
            <cylinderGeometry args={[0.145, 0.208, 0.12, 40]} />
            <Surface color="#537a74" metalness={0.7} roughness={0.23} />
          </mesh>
          <mesh position={[0, 0.9, 0]} castShadow>
            <cylinderGeometry args={[0.158, 0.158, 0.115, 40]} />
            <Surface color="#263e3b" roughness={0.42} />
          </mesh>
          {[0.86, 0.875, 0.89, 0.905, 0.92].map((y) => (
            <Ring
              key={y}
              position={[0, y, 0]}
              radius={0.158}
              tube={0.004}
              color="#566965"
              rotation={[Math.PI / 2, 0, 0]}
            />
          ))}
          <Ring
            position={[0, 1.02, 0]}
            radius={0.082}
            tube={0.018}
            color="#a6aaa4"
            metalness={0.85}
          />
          <Block
            size={[0.045, 0.16, 0.009]}
            position={[0, 0.46, 0.211]}
            color="#d1ded8"
            radius={0.004}
          />
        </group>
      );
    case "book":
      return (
        <group rotation={[0, -0.2, -0.12]}>
          <Block
            size={[0.57, 0.79, 0.18]}
            position={[0, 0.4, 0]}
            color="#343e53"
            finish="fabric"
            radius={0.015}
          />
          <Block
            size={[0.52, 0.73, 0.15]}
            position={[0.018, 0.4, 0.008]}
            color="#eee8d9"
            radius={0.006}
          />
          {Array.from({ length: 13 }, (_, i) => (
            <Block
              key={i}
              size={[0.51, 0.002, 0.155]}
              position={[0.02, 0.08 + i * 0.051, 0.01]}
              color="#d0c6b5"
              radius={0.0005}
            />
          ))}
          <Block
            size={[0.57, 0.79, 0.027]}
            position={[0, 0.4, 0.098]}
            color="#39495b"
            finish="fabric"
            radius={0.007}
          />
          <Block
            size={[0.48, 0.006, 0.004]}
            position={[0, 0.69, 0.115]}
            color="#c1a263"
            radius={0.001}
          />
          <Block
            size={[0.3, 0.028, 0.004]}
            position={[0, 0.59, 0.115]}
            color="#d5bc85"
            radius={0.001}
          />
          <Block
            size={[0.22, 0.013, 0.004]}
            position={[0, 0.54, 0.115]}
            color="#d5bc85"
            radius={0.001}
          />
          <Ring
            position={[0, 0.35, 0.118]}
            radius={0.125}
            tube={0.005}
            color="#c6a56a"
            metalness={0.5}
          />
          <Block
            size={[0.036, 0.12, 0.008]}
            position={[0.16, 0.024, 0.01]}
            color="#b95d49"
            radius={0.002}
          />
        </group>
      );
    case "toy-car":
      return (
        <group>
          <Block
            size={[0.88, 0.21, 0.4]}
            position={[0, 0.24, 0]}
            color="#b84e36"
            radius={0.08}
            metalness={0.45}
            roughness={0.22}
          />
          <Block
            size={[0.45, 0.23, 0.345]}
            position={[-0.05, 0.43, 0]}
            color="#af452f"
            radius={0.065}
            metalness={0.45}
            roughness={0.22}
          />
          {[-0.177, 0.177].map((z) => (
            <Block
              key={z}
              size={[0.32, 0.13, 0.012]}
              position={[-0.05, 0.44, z]}
              color="#273c45"
              radius={0.018}
              metalness={0.5}
              roughness={0.15}
            />
          ))}
          {[-0.44, 0.44].map((x) => (
            <group key={x}>
              <Block
                size={[0.035, 0.06, 0.33]}
                position={[x, 0.21, 0]}
                color="#b1b2a9"
                radius={0.01}
                metalness={0.85}
              />
              {[-0.12, 0.12].map((z) => (
                <Block
                  key={z}
                  size={[0.022, 0.055, 0.085]}
                  position={[x, 0.3, z]}
                  color={x > 0 ? "#f8efd1" : "#752821"}
                  radius={0.012}
                />
              ))}
            </group>
          ))}
          {[-0.28, 0.28].flatMap((x) =>
            [-0.22, 0.22].map((z) => (
              <group
                key={`${x}-${z}`}
                position={[x, 0.16, z]}
                rotation={[Math.PI / 2, 0, 0]}
              >
                <mesh castShadow>
                  <cylinderGeometry args={[0.139, 0.139, 0.065, 32]} />
                  <Surface color="#242527" roughness={0.94} />
                </mesh>
                <mesh position={[0, z > 0 ? -0.037 : 0.037, 0]}>
                  <cylinderGeometry args={[0.075, 0.075, 0.009, 24]} />
                  <Surface color="#bfc2c2" metalness={0.85} roughness={0.27} />
                </mesh>
              </group>
            )),
          )}
        </group>
      );
    case "football":
      return <Ball />;
    case "headphones":
      return (
        <group>
          <Ring
            position={[0, 0.46, 0]}
            radius={0.34}
            tube={0.043}
            color="#373e46"
            arc={Math.PI}
            metalness={0.65}
          />
          <Ring
            position={[0, 0.46, 0]}
            radius={0.29}
            tube={0.036}
            color="#25292d"
            arc={Math.PI}
          />
          {[-0.32, 0.32].map((x) => (
            <group key={x}>
              <Block
                size={[0.035, 0.28, 0.06]}
                position={[x, 0.43, 0]}
                color="#a1a6aa"
                metalness={0.85}
                radius={0.012}
              />
              <mesh
                position={[x, 0.27, 0]}
                rotation={[0, 0, Math.PI / 2]}
                scale={[1, 1, 1.2]}
                castShadow
              >
                <cylinderGeometry args={[0.17, 0.17, 0.12, 40]} />
                <Surface color="#424d58" metalness={0.45} roughness={0.32} />
              </mesh>
              <mesh
                position={[x + Math.sign(x) * -0.07, 0.27, 0]}
                rotation={[0, Math.PI / 2, 0]}
                scale={[1, 1.18, 1]}
              >
                <torusGeometry args={[0.11, 0.039, 12, 32]} />
                <Surface color="#242629" finish="leather" roughness={0.8} />
              </mesh>
            </group>
          ))}
        </group>
      );
    default:
      return (
        <group>
          <Block
            size={[0.78, 0.32, 0.53]}
            position={[0, 0.19, 0]}
            color="#a1aa86"
            radius={0.095}
            roughness={0.43}
          />
          <Block
            size={[0.79, 0.018, 0.54]}
            position={[0, 0.345, 0]}
            color="#424b3a"
            radius={0.008}
          />
          <Block
            size={[0.81, 0.075, 0.56]}
            position={[0, 0.39, 0]}
            color="#c5cbb0"
            radius={0.034}
            roughness={0.36}
          />
          <Block
            size={[0.57, 0.014, 0.32]}
            position={[0, 0.435, 0]}
            color="#b2bc9e"
            radius={0.006}
          />
          {[-0.29, 0.29].map((x) => (
            <Block
              key={x}
              size={[0.1, 0.17, 0.035]}
              position={[x, 0.32, 0.282]}
              color="#4c5b45"
              radius={0.014}
              metalness={0.2}
            />
          ))}
          <Ring
            position={[0, 0.44, 0]}
            radius={0.1}
            tube={0.012}
            color="#667359"
            arc={Math.PI}
          />
        </group>
      );
  }
}
