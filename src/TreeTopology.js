import React, { useState, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";

// 초기 트리 구조
const INIT_NODES = [
  { id: 0, parent: null, pos: [0, 2.5, 0], color: "#2261a9", active: true },
  { id: 1, parent: 0, pos: [-2, 0.8, 0], color: "#2261a9", active: true },
  { id: 2, parent: 0, pos: [2, 0.8, 0], color: "#2261a9", active: true },
  { id: 3, parent: 1, pos: [-3, -1.5, 0], color: "#65aee6", active: true },
  { id: 4, parent: 1, pos: [-1, -1.5, 0], color: "#65aee6", active: true },
  { id: 5, parent: 2, pos: [1, -1.5, 0], color: "#65aee6", active: true },
  { id: 6, parent: 2, pos: [3, -1.5, 0], color: "#65aee6", active: true },
];

// 자식 찾기
function findDescendants(nodes, parentId) {
  let result = [];
  function dfs(id) {
    nodes.forEach(n => {
      if (n.parent === id) {
        result.push(n.id);
        dfs(n.id);
      }
    });
  }
  dfs(parentId);
  return result;
}

// 데이터 구슬
function DataBall({ from, to, isActive, onArrive, delay = 0 }) {
  const meshRef = useRef();
  const [progress, setProgress] = useState(delay);

  useFrame((_, delta) => {
    if (!isActive) return;
    setProgress(prev => (prev < 1 ? Math.min(prev + delta * 0.7, 1) : prev));
    if (meshRef.current && progress < 1) {
      meshRef.current.position.set(
        from[0] + (to[0] - from[0]) * progress,
        from[1] + (to[1] - from[1]) * progress,
        from[2] + (to[2] - from[2]) * progress
      );
    }
    if (progress >= 1 && onArrive) onArrive();
  });

  if (progress >= 1) return null;
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.15, 20, 20]} />
      <meshStandardMaterial color="#00ffcc" emissive="#00ffcc" emissiveIntensity={0.7} />
    </mesh>
  );
}

function TreeTopology() {
  const [nodes, setNodes] = useState(INIT_NODES);
  const [balls, setBalls] = useState([]);
  const [nodeFlash, setNodeFlash] = useState({});
  const [draggingNode, setDraggingNode] = useState(false);
  const [hoveredParentId, setHoveredParentId] = useState(null);

  // 지속적으로 활성화된 노드들에서 구슬 생성
  React.useEffect(() => {
    const interval = setInterval(() => {
      setNodes(currentNodes => {
        setBalls(currentBalls => {
          const activeNodes = currentNodes.filter(n => n.active);
          let newBalls = [...currentBalls];
          
          activeNodes.forEach(node => {
            const children = currentNodes.filter(n => n.parent === node.id && n.active);
            const existingBalls = currentBalls.filter(b => b.parent === node.id);
            
            // 자식이 있고 현재 진행 중인 구슬이 없는 경우에만 생성
            if (children.length > 0 && existingBalls.length === 0) {
              const nodeBalls = children.map((child, idx) => ({
                from: node.pos,
                to: child.pos,
                parent: node.id,
                target: child.id,
                key: `${node.id}-${child.id}-${Date.now()}-${Math.random()}`,
                isActive: true,
                delay: idx * 0.15,
              }));
              
              newBalls = [...newBalls, ...nodeBalls];
            }
          });
          
          return newBalls;
        });
        return currentNodes;
      });
    }, 500); // 0.5초마다 체크
    
    return () => clearInterval(interval);
  }, []);

  // 활성/비활성 토글 (상위노드가 꺼지면 자식도 비활성)
  function handleNodeClick(idx) {
    const node = nodes[idx];
    if (node.color !== "#2261a9") return;
    const isActive = !node.active;
    const descendantIds = findDescendants(nodes, node.id);
    setNodes(prev =>
      prev.map(n =>
        n.id === node.id || descendantIds.includes(n.id)
          ? { ...n, active: isActive }
          : n
      )
    );
  }

  // 우클릭: 노드 삭제 (자식도 같이)
  function handleNodeContextMenu(e, idx) {
    e.preventDefault?.();
    const node = nodes[idx];
    const descendants = findDescendants(nodes, node.id);
    setNodes(prev => prev.filter(n => n.id !== node.id && !descendants.includes(n.id)));
  }

  // 반짝임
  function flashNode(id) {
    setNodeFlash(f => ({ ...f, [id]: 1 }));
    setTimeout(() => setNodeFlash(f => ({ ...f, [id]: 0 })), 250);
  }

  // 구슬 도착시 분기 - 더 이상 자동으로 새 구슬 생성하지 않음
  function handleBallArrive(ball) {
    const thisNode = nodes.find(n => n.id === ball.target);
    if (!thisNode || !thisNode.active) return;
    
    flashNode(thisNode.id);
    setBalls(prev => prev.filter(b => b !== ball));
  }

  // 노드 상태 변경시 관련 구슬 정리
  React.useEffect(() => {
    setBalls(prev => prev.filter(ball => {
      const fromNode = nodes.find(n => n.id === ball.parent);
      const toNode = nodes.find(n => n.id === ball.target);
      return fromNode && toNode && fromNode.active && toNode.active;
    }));
  }, [nodes]);

  // 드래그 시작/종료
  function handleAddNodeMouseDown(e) {
    e.preventDefault();
    setDraggingNode(true);
    document.body.style.cursor = "grabbing";
  }
  function handleMeshPointerUp(node) {
    if (draggingNode) {
      // 이미 있는 자식들
      const siblings = nodes.filter(n => n.parent === node.id);
      if (siblings.length >= 2) {
        setDraggingNode(false);
        setHoveredParentId(null);
        document.body.style.cursor = "";
        return;
      }
      // 번갈아 좌/우로 배치
      const parent = nodes.find(n => n.id === node.id);
      const spacing = 2.1;
      const siblingIdx = siblings.length; // 0, 1

      let xOffset = 0;
      if (siblingIdx > 0) {
        // 1개면 오른쪽, 2개째면 왼쪽
        xOffset = siblingIdx === 1 ? spacing : -spacing;
      }
      const x = parent.pos[0] + xOffset;
      const y = parent.pos[1] - 2;

      setNodes(prev => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          parent: node.id,
          pos: [x, y, 0],
          color: "#65aee6",
          active: parent.active,
        }
      ]);
      setDraggingNode(false);
      setHoveredParentId(null);
      document.body.style.cursor = "";
    }
  }
  // 드래그 중 취소
  function handleCanvasPointerUp() {
    setDraggingNode(false);
    setHoveredParentId(null);
    document.body.style.cursor = "";
  }

  // 간선
  const EDGES = nodes.filter(n => n.parent !== null).map(n => [n.parent, n.id]);
  
  // 수정된 함수: 특정 구슬의 경로가 활성화되어 있는지 확인
  function isBallPathActive(ball) {
    const fromNode = nodes.find(n => n.id === ball.parent);
    const toNode = nodes.find(n => n.id === ball.target);
    
    // 출발점과 도착점 노드가 모두 활성화되어 있어야 함
    return fromNode && toNode && fromNode.active && toNode.active;
  }

  return (
    <div style={{
      width: "75vw", height: "80vh", background: "#000",
      display: "flex", justifyContent: "center", alignItems: "center"
    }}>
        
      {/* 상단 +노드 구슬 */}
      <div
        style={{
            position: "absolute",
            right: "50%", top: "20%", transform: "translateY(-50%)",
            zIndex: 12,
            background: "#99ccff",
            color: "#fff", fontWeight: 700, fontSize: 18,
            borderRadius: "50%", width: 52, height: 52,
            cursor: "pointer", transition: "all .2s",
            display: "flex", alignItems: "center", justifyContent: "center"
        }}
        title="드래그해서 부모노드 위에 놓으면 하위노드 추가"
        onMouseDown={handleAddNodeMouseDown}
      >+</div>
      <Canvas camera={{ position: [0, 0, 6], fov: 70 }}
        style={{ background: "transparent", width: "100%", height: "100%" }}
        onPointerUp={handleCanvasPointerUp}
      >
        {/* 간선 */}
        {EDGES.map(([aId, bId], i) => {
          const a = nodes.find(n => n.id === aId);
          const b = nodes.find(n => n.id === bId);
          return (
            <Line key={i} points={[a.pos, b.pos]} color="#fff" lineWidth={5} />
          );
        })}
        {/* 노드 + 드롭 */}
        {nodes.map((node, idx) => (
          <group key={node.id}>
            <mesh
              position={node.pos}
              onClick={() => handleNodeClick(idx)}
              onContextMenu={e => handleNodeContextMenu(e, idx)}
              onPointerOver={e => {
                if (draggingNode) setHoveredParentId(node.id);
              }}
              onPointerOut={e => {
                if (draggingNode) setHoveredParentId(null);
              }}
              onPointerUp={e => handleMeshPointerUp(node)}
              style={{
                cursor: draggingNode ? "copy"
                  : node.color === "#2261a9" ? "pointer"
                  : "default"
              }}
            >
              <sphereGeometry args={[0.55, 38, 38]} />
              <meshStandardMaterial
                color={hoveredParentId === node.id && draggingNode
                  ? "#ffcc00"
                  : node.color}
                emissive={node.active ? node.color : "#222"}
                emissiveIntensity={node.active ? (nodeFlash[node.id] ? 0.67 : 0.18) : 0.02}
                opacity={node.active ? 1 : 0.48}
                transparent
              />
            </mesh>
          </group>
        ))}
        {/* 데이터 구슬 - 수정된 필터링 */}
        {balls
          .filter(ball => isBallPathActive(ball))
          .map(ball => (
            <DataBall
              key={ball.key}
              from={ball.from}
              to={ball.to}
              isActive={isBallPathActive(ball)}
              delay={ball.delay}
              onArrive={() => handleBallArrive(ball)}
            />
          ))}
        <ambientLight intensity={0.9} />
        <directionalLight position={[8, 6, 11]} intensity={1.08} />
        <OrbitControls enablePan enableZoom enableRotate />
      </Canvas>
      {/* 드래그 중일 때 안내 텍스트 */}
      {draggingNode &&
        <div style={{
          position: "absolute", top: 70, left: "50%", transform: "translateX(-50%)",
          color: "#ffe450", background: "#111a", borderRadius: 16, padding: "8px 24px",
          zIndex: 30, fontWeight: 600, fontSize: 18, pointerEvents: "none"
        }}>노드를 추가할 부모노드 위에서 놓으세요</div>
      }
    </div>
  );
}

export default TreeTopology;