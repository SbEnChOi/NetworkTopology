import React, { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";

const NODE_COUNT = 6;
const RADIUS = 3;
const CENTER = [0, 0, 0];

function getNodePositions() {
  const nodes = [[...CENTER]];
  for (let i = 0; i < NODE_COUNT; i++) {
    const theta = (i / NODE_COUNT) * Math.PI * 2;
    const x = Math.cos(theta) * RADIUS;
    const y = Math.sin(theta) * RADIUS;
    nodes.push([x, y, 0]);
  }
  return nodes;
}

// 데이터 구슬
function DataFlow({ from, to, isActive, onArrive, color = "#00ffcc" }) {
  const meshRef = useRef();
  const [progress, setProgress] = useState(Math.random());

  useFrame((state, delta) => {
    if (!isActive) return;
    setProgress((prev) => {
      let next = prev + delta * 0.5;
      if (next >= 1) {
        next = 0;
        if (onArrive) onArrive();
      }
      return next;
    });
    if (meshRef.current) {
      meshRef.current.position.set(
        from[0] + (to[0] - from[0]) * progress,
        from[1] + (to[1] - from[1]) * progress,
        from[2] + (to[2] - from[2]) * progress
      );
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.18, 16, 16]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} />
    </mesh>
  );
}

function StarTopology() {
  const nodes = getNodePositions();
  const [centerActive, setCenterActive] = useState(true);
  const [nodeLights, setNodeLights] = useState(Array(NODE_COUNT + 1).fill(0.2));

  function flashNode(idx) {
    setNodeLights((prev) => {
      const next = [...prev];
      next[idx] = 2.0;
      return next;
    });
    setTimeout(() => {
      setNodeLights((prev) => {
        const next = [...prev];
        next[idx] = 0.2;
        return next;
      });
    }, 300);
  }

  return (
    <div style={{
      width: "100vw",
      height: "80vh",
      background: "#000",
      display: "flex",
      justifyContent: "center",
      alignItems: "center"
    }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 70 }}
        style={{
          background: "transparent",
          width: "100%",
          height: "100%",
        }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 10]} intensity={0.7} />

        {/* 중앙 노드 */}
        <mesh
          position={nodes[0]}
          onClick={() => setCenterActive((prev) => !prev)}
          style={{ cursor: "pointer" }}
        >
          <sphereGeometry args={[0.6, 32, 32]} />
          <meshStandardMaterial
            color={"#99CCFF"}
            emissive={"#99CCFF"}
            emissiveIntensity={centerActive ? 0.6 : 0.08}
          />
        </mesh>

        {/* 간선, 데이터 흐름, 주변 노드 */}
        {nodes.slice(1).map((pos, i) => (
          <React.Fragment key={i}>
            <Line points={[nodes[0], pos]} color="white" lineWidth={5} />
            {centerActive && (
              <DataFlow
                from={nodes[0]}
                to={pos}
                isActive={centerActive}
                onArrive={() => flashNode(i + 1)}
              />
            )}
            <mesh position={pos}>
              <sphereGeometry args={[0.45, 32, 32]} />
              <meshStandardMaterial
                color={"#fff"}
                emissive={"#fff"}
                emissiveIntensity={nodeLights[i + 1]}
              />
            </mesh>
          </React.Fragment>
        ))}

        <OrbitControls enablePan enableZoom enableRotate />
      </Canvas>
    </div>
  );
}

export default StarTopology;
