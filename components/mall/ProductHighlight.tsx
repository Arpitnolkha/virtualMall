export default function ProductHighlight() {
  return (
    <group name="selected-highlight">
      <mesh position={[0, -0.013, 0.337]}>
        <boxGeometry args={[1.2, 0.018, 0.008]} />
        <meshBasicMaterial color="#cfaa69" toneMapped={false} />
      </mesh>
    </group>
  );
}
