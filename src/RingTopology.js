import React, { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";

const NODE_COUNT = 8;
const RX = 4.2;
const RY = 2.7;
const DATA_BALL_COUNT = 2;

function getNodePositions() {
  const nodes = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    const theta = (i / NODE_COUNT) * Math.PI * 2;
    const x = Math.cos(theta) * RX;
    const y = Math.sin(theta) * RY;
    nodes.push([x, y, 0]);
  }
  return nodes;
}

// 반짝임
function useFlashArray(length, duration = 0.3) {
  const [emissiveArr, setEmissiveArr] = useState(Array(length).fill(0.13));
  const timers = useRef(Array(length).fill(null));

  function flash(idx) {
    setEmissiveArr(arr => {
      const next = [...arr];
      next[idx] = 1.1;
      return next;
    });
    if (timers.current[idx]) clearTimeout(timers.current[idx]);
    timers.current[idx] = setTimeout(() => {
      setEmissiveArr(arr => {
        const next = [...arr];
        next[idx] = 0.13;
        return next;
      });
    }, duration * 1000);
  }
  return [emissiveArr, flash];
}

// 데이터 구슬
function DataBall({ offset = 0, isVisible, nodePositions, onPassNode, color = "#00ffcc" }) {
  const meshRef = useRef();
  const lastNodeIdx = useRef(-1);

  useFrame((state, delta) => {
    if (!isVisible) return; // 전체 멈춤!
    const speed = 0.32;
    const t = ((state.clock.getElapsedTime() * speed + offset) % 1);

    const total = nodePositions.length;
    const seg = Math.floor(t * total);
    const a = nodePositions[seg];
    const b = nodePositions[(seg + 1) % total];
    const localT = (t * total) - seg;
    const px = a[0] + (b[0] - a[0]) * localT;
    const py = a[1] + (b[1] - a[1]) * localT;
    const pz = a[2] + (b[2] - a[2]) * localT;

    if (meshRef.current) {
      meshRef.current.position.set(px, py, pz);
    }

    // 반짝임 트리거
    if (localT < 0.07 && seg !== lastNodeIdx.current) {
      lastNodeIdx.current = seg;
      if (onPassNode) onPassNode(seg);
    }
  });

  if (!isVisible) return null;
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.19, 24, 24]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} />
    </mesh>
  );
}

function RingTopology() {
  // 각 노드별 ON/OFF
  const [nodeActive, setNodeActive] = useState(Array(NODE_COUNT).fill(true));
  const nodePositions = getNodePositions();
  const [emissiveArr, flash] = useFlashArray(NODE_COUNT);

  // 간선
  const edgePairs = [];
  for (let i = 0; i < nodePositions.length; i++) {
    const a = nodePositions[i];
    const b = nodePositions[(i + 1) % nodePositions.length];
    edgePairs.push([a, b]);
  }

  // 노드 하나라도 꺼지면 전체 멈춤
  const isAllActive = nodeActive.every(Boolean);

  // 노드 개별 토글
  function handleNodeClick(idx) {
    setNodeActive(prev => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
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
        camera={{ position: [0, 0, 7], fov: 70 }}
        style={{
          background: "transparent",
          width: "100%",
          height: "100%"
        }}
      >
        {/* 간선 */}
        {edgePairs.map(([a, b], i) => (
          <Line key={i} points={[a, b]} color="#fff" lineWidth={7} />
        ))}

        {/* 노드 */}
        {nodePositions.map((pos, i) => (
          <mesh
            key={i}
            position={pos}
            onClick={() => handleNodeClick(i)}
            style={{ cursor: "pointer" }}
          >
            <sphereGeometry args={[0.5, 38, 38]} />
            <meshStandardMaterial
              color={nodeActive[i] ? "#99CCFF" : "##99CCFF"}
              roughness={0.32}
              metalness={0.33}  
              envMapIntensity={1}
              emissive={nodeActive[i] ? "#99CCFF" : "#99CCFF"}
              emissiveIntensity={nodeActive[i] ? emissiveArr[i] : 0.08}
              transparent
              opacity={nodeActive[i] ? 1 : 0.6}
            />
          </mesh>
        ))}

        {/* 데이터 구슬 - 노드 하나라도 꺼지면 모두 사라짐/멈춤 */}
        {isAllActive &&
          Array(DATA_BALL_COUNT).fill(0).map((_, i) => (
            <DataBall
              key={i}
              offset={i / DATA_BALL_COUNT}
              isVisible={isAllActive}
              nodePositions={nodePositions}
              onPassNode={flash}
            />
          ))}

        <ambientLight intensity={0.8} />
        <directionalLight position={[4, 8, 11]} intensity={1.08} />
        <OrbitControls enablePan enableZoom enableRotate />
      </Canvas>
    </div>
  );
}

export default RingTopology;
