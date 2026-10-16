import { memo } from "react";
import { RoundedBox } from "@react-three/drei";
import {
  EnvironmentSurface as Surface,
  type Finish,
} from "./EnvironmentSurface";
import { WindowView, ShopPlant, ShelfStock } from "./EnvironmentDecor";
import SceneLabel from "./SceneLabel";
type V = [number, number, number];
function Box({
  position,
  size,
  color,
  finish,
  metalness = 0,
}: {
  position: V;
  size: V;
  color: string;
  finish?: Finish;
  metalness?: number;
}) {
  return (
    <mesh position={position} receiveShadow castShadow>
      <boxGeometry args={size} />
      <Surface
        color={color}
        finish={finish}
        repeat={
          finish === "wood"
            ? [
                Math.min(size[0] / 1.2, 4),
                Math.max(0.2, Math.max(size[1], size[2]) / 2),
              ]
            : finish === "plaster"
              ? [Math.max(size[0], size[2]) / 2, size[1] / 2]
              : [Math.max(1, size[0] / 2), 1]
        }
        offset={[
          Math.abs(position[0] * 0.13) % 1,
          Math.abs(position[2] * 0.21) % 1,
        ]}
        metalness={metalness}
        roughness={finish === "stone" ? 0.38 : 0.7}
      />
    </mesh>
  );
}
function DisplayTable({ z, height }: { z: number; height: number }) {
  return (
    <group>
      {[-3.65, 3.65].map((x) => (
        <group key={x}>
          {[-0.48, 0.48].map((dz) => (
            <Box
              key={dz}
              position={[x, height / 2, z + dz]}
              size={[0.12, height, 0.12]}
              color="#35372f"
              metalness={0.6}
            />
          ))}
          <Box
            position={[x, 0.19, z]}
            size={[0.12, 0.1, 1.12]}
            color="#35372f"
            metalness={0.6}
          />
        </group>
      ))}
      <Box
        position={[0, height - 0.16, z]}
        size={[7.95, 0.32, 1.25]}
        color="#977451"
        finish="wood"
      />
      <RoundedBox
        args={[8.04, 0.1, 1.4]}
        position={[0, height + 0.05, z]}
        radius={0.025}
        smoothness={3}
        receiveShadow
        castShadow
      >
        <Surface color="#eee7d8" finish="stone" roughness={0.42} />
      </RoundedBox>
      <Box
        position={[0, 0.28, z]}
        size={[7.7, 0.07, 1.12]}
        color="#ac8d69"
        finish="wood"
      />
      {[-2.8, 0, 2.8].map((x) => (
        <group key={x}>
          <Box
            position={[x, 0.43, z]}
            size={[0.92, 0.25, 0.73]}
            color="#c4ae87"
            finish="fabric"
          />
          <Box
            position={[x, 0.57, z]}
            size={[0.96, 0.04, 0.76]}
            color="#dfd2b7"
          />
        </group>
      ))}
    </group>
  );
}
function Pendant({ x }: { x: number }) {
  return (
    <group position={[x, 0, -1.45]}>
      <Box
        position={[0, 4.05, 0]}
        size={[0.018, 1.1, 0.018]}
        color="#383730"
        metalness={0.7}
      />
      <mesh position={[0, 3.48, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.44, 0.27, 32, 1, true]} />
        <meshStandardMaterial
          color="#bba276"
          metalness={0.7}
          roughness={0.32}
          side={2}
        />
      </mesh>
      <mesh position={[0, 3.34, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.4, 32]} />
        <meshStandardMaterial
          color="#fff1cd"
          emissive="#ffd899"
          emissiveIntensity={2}
        />
      </mesh>
      <pointLight
        position={[0, 3.2, 0]}
        color="#ffdeb0"
        intensity={9}
        distance={5}
        decay={2}
      />
    </group>
  );
}
export default memo(function MallEnvironment() {
  return (
    <group>
      <Box position={[0, -0.14, 0]} size={[10, 0.28, 9]} color="#796950" />
      {Array.from({ length: 16 }, (_, i) =>
        Array.from({ length: 5 }, (_, j) => {
          const start = Math.max(-4.5, -4.5 - (i % 3) * 0.75 + j * 2.25);
          const end = Math.min(4.5, -4.5 - (i % 3) * 0.75 + (j + 1) * 2.25);
          if (end <= start) return null;
          return (
            <Box
              key={`${i}-${j}`}
              position={[-4.69 + i * 0.625, 0.012, (start + end) / 2]}
              size={[0.615, 0.022, end - start - 0.009]}
              color={
                ["#eadbc4", "#d9cbb3", "#e3d2b6", "#ddd0b9"][(i * 3 + j) % 4]
              }
              finish="wood"
            />
          );
        }),
      )}
      <Box
        position={[0, 2.3, -4.3]}
        size={[10, 4.6, 0.16]}
        color="#e7e4dc"
        finish="plaster"
      />
      <Box
        position={[-4.9, 2.3, 0]}
        size={[0.16, 4.6, 8.6]}
        color="#939c89"
        finish="plaster"
      />
      <Box
        position={[4.9, 2.3, -2.65]}
        size={[0.16, 4.6, 3.3]}
        color="#939c89"
        finish="plaster"
      />
      <Box
        position={[0, 0.1, -4.19]}
        size={[9.8, 0.2, 0.065]}
        color="#6b705f"
      />
      <Box position={[-4.79, 0.1, 0]} size={[0.06, 0.2, 8.5]} color="#6b705f" />
      <Box
        position={[0, 4.48, -4.15]}
        size={[9.8, 0.065, 0.1]}
        color="#b89e6b"
        metalness={0.6}
      />
      <mesh position={[0, 4.39, -4.16]}>
        <boxGeometry args={[9.4, 0.018, 0.04]} />
        <meshStandardMaterial
          color="#fff3da"
          emissive="#ffddb1"
          emissiveIntensity={2}
        />
      </mesh>
      <DisplayTable z={0.7} height={1.38} />
      <DisplayTable z={3.1} height={1} />
      <Pendant x={-2.7} />
      <Pendant x={2.7} />
      {/* Deep window reveals make daylight feel part of the architecture. */}
      {[-1.9, 1.5].map((z) => (
        <group
          key={z}
          position={[-4.79, 2.68, z]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <Box position={[0, 0, 0]} size={[2.8, 2.7, 0.08]} color="#4e574e" />
          <mesh position={[0, 0, 0.045]}>
            <planeGeometry args={[2.6, 2.5]} />
            <meshBasicMaterial color="#d8e3dd" />
          </mesh>
          <WindowView />
          {[-1.32, 0, 1.32].map((x) => (
            <Box
              key={x}
              position={[x, 0, 0.1]}
              size={[0.055, 2.65, 0.1]}
              color="#555b50"
            />
          ))}
          <Box
            position={[0, 0.28, 0.1]}
            size={[2.65, 0.055, 0.1]}
            color="#555b50"
          />
          <Box
            position={[0, -1.38, 0.17]}
            size={[3, 0.12, 0.45]}
            color="#eee7d9"
            finish="stone"
          />
        </group>
      ))}
      <Box
        position={[0, 0.036, -0.45]}
        size={[3.4, 0.02, 0.88]}
        color="#bbad91"
        finish="fabric"
      />
      <Box
        position={[0, 4.55, -1.5]}
        size={[10, 0.16, 0.18]}
        color="#7e694e"
        finish="wood"
      />
      {[-4.65, 4.65].map((x) => (
        <Box
          key={x}
          position={[x, 2.3, -4.05]}
          size={[0.18, 4.6, 0.24]}
          color="#a88a64"
          finish="wood"
        />
      ))}
      <Box
        position={[0, 2.15, -4.14]}
        size={[3.5, 3.6, 0.08]}
        color="#a38b69"
        finish="wood"
      />
      {/* Checkout accessories, outside the avatar's video area. */}
      <group position={[1.04, 1.38, -1.45]} rotation={[0, -0.3, 0]}>
        <Box
          position={[0, 0.015, 0]}
          size={[0.38, 0.03, 0.3]}
          color="#333d3c"
          metalness={0.5}
        />
        <Box
          position={[0, 0.12, -0.05]}
          size={[0.055, 0.24, 0.05]}
          color="#444e4a"
          metalness={0.6}
        />
        <group position={[0, 0.25, -0.03]} rotation={[-0.28, 0, 0]}>
          <Box position={[0, 0, 0]} size={[0.44, 0.3, 0.025]} color="#2c3432" />
          <SceneLabel
            position={[0, 0, 0.015]}
            width={0.39}
            height={0.25}
            text="WELCOME"
            background="#617c72"
            color="#f8f4e9"
            billboard={false}
          />
        </group>
      </group>
      <group position={[-1.02, 1.36, -1.6]}>
        <Box
          position={[0, 0.23, 0]}
          size={[0.39, 0.46, 0.25]}
          color="#cdb58b"
          finish="fabric"
        />
        <SceneLabel
          position={[0, 0.24, 0.13]}
          width={0.28}
          height={0.12}
          text="MAYA’S"
          background="#cdb58b"
          billboard={false}
        />
        <mesh position={[0, 0.48, 0.04]}>
          <torusGeometry args={[0.09, 0.012, 8, 20, Math.PI]} />
          <Surface color="#806d4f" />
        </mesh>
      </group>
      <RoundedBox
        position={[0, 0.63, -1.6]}
        args={[2.8, 1.26, 1]}
        radius={0.06}
        smoothness={4}
        castShadow
        receiveShadow
      >
        <Surface color="#3e6055" roughness={0.62} />
      </RoundedBox>
      {Array.from({ length: 22 }, (_, i) => (
        <Box
          key={i}
          position={[-1.32 + i * 0.126, 0.62, -1.085]}
          size={[0.034, 1.12, 0.03]}
          color="#567467"
        />
      ))}
      <RoundedBox
        position={[0, 1.3, -1.6]}
        args={[3, 0.12, 1.16]}
        radius={0.025}
        smoothness={3}
        receiveShadow
        castShadow
      >
        <Surface color="#e5e2d7" finish="stone" roughness={0.3} />
      </RoundedBox>
      <Box
        position={[0, 0.08, -1.08]}
        size={[2.75, 0.08, 0.035]}
        color="#b89e6b"
        metalness={0.7}
      />
      <SceneLabel
        billboard={false}
        position={[0, 0.76, -1.03]}
        width={1.8}
        height={0.23}
        text="MAYA’S · AT YOUR SERVICE"
        background="#3e6055"
        color="#e7d6b0"
      />
      <Box
        position={[0, 3.87, -4.02]}
        size={[3.05, 0.78, 0.08]}
        color="#d2ba91"
        metalness={0.35}
      />
      <SceneLabel
        billboard={false}
        position={[0, 3.87, -3.96]}
        width={2.94}
        height={0.67}
        text="Maya’s"
        background="#ede8db"
        color="#354c3e"
      />
      {[-3.4, 3.4].map((x) => (
        <group key={x}>
          <Box
            position={[x, 1.6, -4.15]}
            size={[2.22, 2.3, 0.08]}
            color="#b09877"
            finish="wood"
          />
          {[0.6, 1.4, 2.25].map((y) => (
            <group key={y}>
              <Box
                position={[x, y, -3.88]}
                size={[2.22, 0.07, 0.62]}
                color="#c9b18b"
                finish="wood"
              />
              <mesh position={[x, y - 0.04, -3.73]}>
                <boxGeometry args={[1.98, 0.016, 0.1]} />
                <meshStandardMaterial
                  emissive="#ffdb9d"
                  emissiveIntensity={1.8}
                  color="#ffefd5"
                />
              </mesh>
            </group>
          ))}
          {[-1.06, 1.06].map((dx) => (
            <Box
              key={dx}
              position={[x + dx, 1.6, -3.83]}
              size={[0.035, 2.2, 0.025]}
              color="#564e40"
              metalness={0.6}
            />
          ))}
          <group position={[x, 0, 0]}>
            <ShelfStock />
          </group>
        </group>
      ))}
      {[-4.15, 4.15].map((x) => (
        <group key={x} position={[x, 0.02, -2.3]}>
          <ShopPlant />
        </group>
      ))}
    </group>
  );
});
