import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";

// ─── Nodes & Full‐Mesh Edges ─────────────────────────────────────
const INIT_NODES = [
  { id: 0, pos: [0, 3, 0], active: true },
  { id: 1, pos: [3, 1, 0], active: true },
  { id: 2, pos: [2, -2.6, 0], active: true },
  { id: 3, pos: [-2, -2.6, 0], active: true },
  { id: 4, pos: [-3, 1, 0], active: true },
];
function getFullMeshEdges(nodes) {
  const edges = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      edges.push({ id: edges.length, from: i, to: j, active: true });
    }
  }
  return edges;
}
const INIT_EDGES = getFullMeshEdges(INIT_NODES);

// ─── DataBall Component ──────────────────────────────────────────
function DataBall({ from, to, isActive, onArrive, delay = 0 }) {
  const meshRef = useRef();
  const [progress, setProgress] = useState(delay);

  useFrame((_, delta) => {
    if (!isActive) return;
    setProgress(p => Math.min(p + delta * 0.7, 1));
    if (meshRef.current && progress < 1) {
      meshRef.current.position.set(
        from[0] + (to[0] - from[0]) * progress,
        from[1] + (to[1] - from[1]) * progress,
        0
      );
    }
    if (progress >= 1 && onArrive) onArrive();
  });

  if (!isActive || progress >= 1) return null;
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.13, 18, 18]} />
      <meshStandardMaterial color="#00ffcc" emissive="#00ffcc" emissiveIntensity={0.8} />
    </mesh>
  );
}

// ─── MeshTopology ────────────────────────────────────────────────
function MeshTopology() {
  const [nodes, setNodes] = useState(INIT_NODES);
  const [edges, setEdges] = useState(INIT_EDGES);
  const [balls, setBalls] = useState([]);
  const [flashNodeMap, setFlashNodeMap] = useState({});

  // 1) Periodic spawn: every active node → every active edge out of it
  useEffect(() => {
    const interval = setInterval(() => {
      setBalls(prev => [
        ...prev,
        ...nodes.flatMap((n, ni) =>
          !n.active
            ? []
            : edges
                .filter(e => e.active && (e.from === ni || e.to === ni))
                .map((e, idx) => {
                  const other = e.from === ni ? e.to : e.from;
                  return {
                    key: `${ni}-${other}-${Date.now()}-${Math.random()}`,
                    from: ni,
                    to: other,
                    edgeId: e.id,
                    delay: idx * 0.08
                  };
                })
        )
      ]);
    }, 2200);
    return () => clearInterval(interval);
  }, [nodes, edges]);

  // 2) onArrival: flash node only & remove packet
  function handleBallArrive(ball) {
    setFlashNodeMap(m => ({ ...m, [ball.to]: 1 }));
    setTimeout(() => setFlashNodeMap(m => ({ ...m, [ball.to]: 0 })), 250);
    setBalls(prev => prev.filter(b => b.key !== ball.key));
  }

  // toggle node / edge active on right‐click
  function toggleNode(idx, e) {
    e.preventDefault?.();
    setNodes(ns => ns.map((n, i) => (i === idx ? { ...n, active: !n.active } : n)));
  }
  function toggleEdge(id, e) {
    e.preventDefault?.();
    setEdges(es => es.map(x => (x.id === id ? { ...x, active: !x.active } : x)));
  }

  return (
    <div style={{ width: "75vw", height: "80vh", background: "#000", position: "relative" }}>
      <Canvas camera={{ position: [0, 0, 8], fov: 60 }} style={{ background: "transparent" }}>
        {/* Edges */}
        {edges.map(e => {
          const a = nodes[e.from].pos,
            b = nodes[e.to].pos;
          return (
            <Line
              key={e.id}
              points={[a, b]}
              color={e.active ? "#fff" : "#555"}
              lineWidth={e.active ? 4 : 2}
              dashed={!e.active}
              dashSize={0.15}
              gapSize={0.2}
              onContextMenu={ev => toggleEdge(e.id, ev)}
              style={{ cursor: "pointer" }}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((n, i) => (
          <mesh
            key={n.id}
            position={n.pos}
            onContextMenu={ev => toggleNode(i, ev)}
            style={{ cursor: "pointer" }}
          >
            <sphereGeometry args={[0.5, 32, 32]} />
            <meshStandardMaterial
              color={n.active ? "#99ccff" : "#444"}
              emissive={n.active ? "#99ccff" : "#111"}
              emissiveIntensity={flashNodeMap[n.id] ? 0.8 : n.active ? 0.2 : 0.06}
              opacity={n.active ? (flashNodeMap[n.id] ? 1 : 1) : 0.4}
              transparent
            />
          </mesh>
        ))}

        {/* Packets */}
        {balls
          .filter(ball => {
            const src = nodes[ball.from],
              dst = nodes[ball.to],
              ed = edges.find(x => x.id === ball.edgeId);
            return src.active && dst.active && ed.active;
          })
          .map(ball => (
            <DataBall
              key={ball.key}
              from={nodes[ball.from].pos}
              to={nodes[ball.to].pos}
              isActive={true}
              delay={ball.delay}
              onArrive={() => handleBallArrive(ball)}
            />
          ))}

        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 10]} intensity={1} />
        <OrbitControls enablePan enableZoom enableRotate />
      </Canvas>

      {/* 안내 텍스트 */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          color: "#ccc",
          background: "#111a",
          padding: "6px 18px",
          borderRadius: 12,
          fontSize: 16,
          pointerEvents: "none"
        }}
      >
        우클릭으로 노드·간선 활성/비활성 토글
      </div>
    </div>
  );
}

export default MeshTopology;
