import { memo } from "react";
import { RoundedBox, Shadow } from "@react-three/drei";
import { EnvironmentSurface as Surface } from "./EnvironmentSurface";
import { ShopPlant, WindowView } from "./EnvironmentDecor";
import SceneLabel from "./SceneLabel";
import { displays, zones } from "@/lib/mall/showroom";
type V = [number, number, number];
function Block({
  position,
  size,
  color = "#cbb391",
  finish = "wood",
}: {
  position: V;
  size: V;
  color?: string;
  finish?: "wood" | "stone" | "plaster";
}) {
  return (
    <mesh position={position} receiveShadow>
      <boxGeometry args={size} />
      <Surface
        color={color}
        finish={finish}
        repeat={[
          Math.max(1, size[0] / 3),
          Math.max(1, Math.max(size[1], size[2]) / 3),
        ]}
        roughness={finish === "stone" ? 0.3 : 0.7}
      />
    </mesh>
  );
}
function Led({ position, size }: { position: V; size: V }) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshBasicMaterial color="#ffdda1" toneMapped={false} />
    </mesh>
  );
}
export default memo(function ShowroomRoom() {
  return (
    <group>
      <color attach="background" args={["#ddd1bd"]} />
      <fog attach="fog" args={["#ddd1bd", 19, 34]} />
      <ambientLight intensity={0.4} color="#ffefd9" />
      <hemisphereLight args={["#f4f1e7", "#887052", 0.85]} />
      <directionalLight position={[-5, 9, 5]} intensity={1.3} color="#fff2db" />
      <Block
        position={[0, -0.13, 0]}
        size={[21, 0.25, 24]}
        color="#eee2cd"
        finish="stone"
      />
      <Block
        position={[0, 3, -8]}
        size={[21, 6, 0.3]}
        color="#e0d0b7"
        finish="plaster"
      />
      {/* A finished arrival facade keeps the room believable when looking behind. */}
      <Block
        position={[0, 3, 10]}
        size={[21, 6, 0.3]}
        color="#e4d8c2"
        finish="plaster"
      />
      <group position={[0, 2.7, 9.79]} rotation={[0, Math.PI, 0]} scale={1.85}>
        <WindowView />
      </group>
      {[-2.6, 0, 2.6].map((x) => (
        <Block
          key={`door-${x}`}
          position={[x, 2.7, 9.62]}
          size={[0.065, 4.95, 0.09]}
          color="#65503b"
        />
      ))}
      <group position={[0, 5.2, 9.6]} rotation={[0, Math.PI, 0]}>
        <SceneLabel
          text="A LITTLE WORLD OF DISCOVERY"
          position={[0, 0, 0]}
          width={4.8}
          height={0.38}
          background="#6f5940"
          color="#fff1d5"
          billboard={false}
        />
      </group>
      {[-1, 1].map((side) => (
        <group
          key={`lounge-${side}`}
          position={[side * 7, 0, 6.2]}
          rotation={[0, side * -0.25, 0]}
        >
          <RoundedBox
            args={[3, 0.5, 1.3]}
            position={[0, 0.55, 0]}
            radius={0.22}
            smoothness={4}
          >
            <Surface color="#9eab92" finish="fabric" />
          </RoundedBox>
          <RoundedBox
            args={[3, 0.75, 0.3]}
            position={[0, 1, 0.5]}
            radius={0.14}
            smoothness={4}
          >
            <Surface color="#9eab92" finish="fabric" />
          </RoundedBox>
          <mesh position={[0, 0.34, -1.4]}>
            <cylinderGeometry args={[0.7, 0.7, 0.09, 40]} />
            <Surface color="#b89466" finish="wood" />
          </mesh>
          <mesh position={[0, 0.16, -1.4]}>
            <cylinderGeometry args={[0.28, 0.4, 0.3, 24]} />
            <meshStandardMaterial color="#3e4139" />
          </mesh>
        </group>
      ))}
      {[-1, 1].map((side) => (
        <group
          key={`curved-shelf-${side}`}
          position={[side * 9.55, 0, 3.3]}
          rotation={[0, (side * -Math.PI) / 2, 0]}
        >
          <mesh position={[0, 3.4, 0]}>
            <torusGeometry args={[1.65, 0.065, 8, 48, Math.PI]} />
            <meshStandardMaterial
              color="#b29158"
              metalness={0.65}
              roughness={0.35}
            />
          </mesh>
          {[-1.65, 1.65].map((x) => (
            <Block
              key={x}
              position={[x, 1.7, 0]}
              size={[0.08, 3.4, 0.12]}
              color="#a78752"
            />
          ))}
          {[0.6, 1.5, 2.4, 3.3].map((y) => (
            <group key={y}>
              <RoundedBox
                args={[3.25, 0.1, 0.9]}
                position={[0, y, 0.35]}
                radius={0.045}
                smoothness={3}
              >
                <Surface color="#d0b184" finish="wood" />
              </RoundedBox>
              <Led position={[0, y - 0.07, 0.71]} size={[2.9, 0.024, 0.025]} />
              {[-0.9, 0, 0.9].map((x, i) => (
                <mesh key={x} position={[x, y + 0.23, 0.33]}>
                  <cylinderGeometry args={[0.11, 0.18, 0.36 + i * 0.07, 24]} />
                  <meshStandardMaterial color={i % 2 ? "#83977b" : "#ddd0b7"} />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      ))}
      {[-10, 10].map((x) => (
        <Block
          key={x}
          position={[x, 3, 1]}
          size={[0.25, 6, 18]}
          color="#e0d0b7"
          finish="plaster"
        />
      ))}
      <mesh position={[0, 6, 0]}>
        <boxGeometry args={[21, 0.18, 20]} />
        <meshStandardMaterial color="#302c25" roughness={0.9} />
      </mesh>
      {[-7, -3, 3, 7].map((x) => (
        <Led key={x} position={[x, 5.88, 0]} size={[0.035, 0.025, 17]} />
      ))}
      <mesh position={[0, 5.8, -1]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.7, 0.075, 8, 64]} />
        <meshBasicMaterial color="#ffe4b0" />
      </mesh>
      <Block
        position={[0, 2.8, -7.75]}
        size={[4.8, 5.3, 0.2]}
        color="#866447"
      />
      {Array.from({ length: 27 }, (_, i) => (
        <Block
          key={i}
          position={[-2.3 + i * 0.177, 2.8, -7.59]}
          size={[0.065, 5.3, 0.08]}
          color="#b29265"
        />
      ))}
      <SceneLabel
        position={[0, 4.1, -7.48]}
        text="Maya’s"
        width={3.3}
        height={0.8}
        background="#866447"
        color="#fff0ce"
        billboard={false}
      />
      <SceneLabel
        position={[0, 3.45, -7.47]}
        text="EXPLORE · ASK · DISCOVER"
        width={3.2}
        height={0.22}
        background="#866447"
        color="#fff0ce"
        billboard={false}
      />
      {[-6.4, 6.4].map((x) => (
        <group key={x} position={[x, 0, -7.5]}>
          <Block
            position={[0, 2.6, 0]}
            size={[4.9, 4.8, 0.2]}
            color="#a68761"
          />
          {[0.7, 1.7, 2.7, 3.7, 4.7].map((y, i) => (
            <group key={y}>
              <Block
                position={[0, y, 0.4]}
                size={[4.8, 0.09, 0.85]}
                color="#c0a27c"
              />
              <Led position={[0, y - 0.06, 0.7]} size={[4.6, 0.025, 0.045]} />
              {[-1.8, -0.8, 0.35, 1.4].map((xx, j) => (
                <mesh key={xx} position={[xx, y + 0.25, 0.35]}>
                  <cylinderGeometry
                    args={[
                      0.1 + (j % 2) * 0.06,
                      0.16,
                      0.4 + (i % 2) * 0.08,
                      16,
                    ]}
                  />
                  <meshStandardMaterial
                    color={["#e6d7ba", "#9caa8a", "#b38757", "#c8b9a0"][j]}
                    roughness={0.5}
                  />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      ))}
      {[-9.7, 9.7].map((x) => (
        <group
          key={x}
          position={[x, 3, 1]}
          rotation={[0, x < 0 ? Math.PI / 2 : -Math.PI / 2, 0]}
          scale={1.7}
        >
          <WindowView />
        </group>
      ))}
      {displays.map((display) => (
        <group key={display.zone} position={[...display.center]}>
          <RoundedBox
            args={[3.7, 1.04, 1.65]}
            radius={0.16}
            smoothness={3}
            position={[0, 0.54, 0]}
          >
            <Surface color="#9c7850" finish="wood" />
          </RoundedBox>
          <RoundedBox
            args={[3.85, 0.12, 1.8]}
            radius={0.05}
            smoothness={3}
            position={[0, 1.09, 0]}
          >
            <Surface color="#f4ead6" finish="stone" roughness={0.25} />
          </RoundedBox>
          <Shadow
            position={[0, 0.006, 0]}
            scale={[4.25, 2.25, 1]}
            opacity={0.35}
            colorStop={0.55}
          />
          <RoundedBox
            args={[3.4, 0.12, 1.4]}
            position={[0, 0.065, 0]}
            radius={0.03}
            smoothness={2}
          >
            <meshStandardMaterial color="#3a3026" roughness={0.95} />
          </RoundedBox>
          <SceneLabel
            position={[0, 0.55, 0.835]}
            width={1.7}
            height={0.17}
            text={zones.find((z) => z.id === display.zone)!.name.toUpperCase()}
            background="#9c7850"
            color="#fff1d1"
            billboard={false}
          />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <planeGeometry args={[4.4, 2.4]} />
            <Surface color="#b4a58c" finish="fabric" roughness={1} />
          </mesh>
          <pointLight
            position={[0, 4, 0]}
            intensity={14}
            color="#ffdfb3"
            distance={7}
          />
          <mesh position={[0, 5.7, 0]}>
            <cylinderGeometry args={[0.14, 0.14, 0.18, 16]} />
            <meshStandardMaterial color="#282820" />
          </mesh>
        </group>
      ))}
      {[
        [-8.8, 0, -6.5],
        [8.8, 0, -6.5],
        [-8.8, 0, 3.2],
        [8.8, 0, 3.2],
      ].map((p, i) => (
        <group key={i} position={p as V} scale={1.3}>
          <ShopPlant />
        </group>
      ))}
    </group>
  );
});
