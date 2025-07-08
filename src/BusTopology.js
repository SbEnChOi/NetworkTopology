import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";

const BUS_LENGTH = 8;
const DATA_BALL_COUNT = 2;
const NODE_INSET = 0.72;  // 노드로 들어가는 깊이

function useFlashArray(length, duration = 0.32) {
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
  return [emissiveArr, flash, setEmissiveArr];
}

// ★ 데이터 구슬(버스선 따라감)
function BusDataBall({ offset = 0, isVisible, nodes, busLine, onBranch }) {
  const meshRef = useRef();
  const lastNodeIdx = useRef(-1);

  useFrame((state, delta) => {
    if (!isVisible) return;
    const speed = 0.29;
    const t = ((state.clock.getElapsedTime() * speed + offset) % 1);

    const ax = busLine[0][0], bx = busLine[1][0];
    const px = ax + (bx - ax) * t;

    if (meshRef.current) meshRef.current.position.set(px, 0, 0);

    // 노드 근처면 "분기" 트리거
    let found = null;
    nodes.forEach((n, idx) => {
      if (Math.abs(px - n.x) < 0.14) found = { node: n, idx };
    });
    if (found && lastNodeIdx.current !== found.idx) {
      lastNodeIdx.current = found.idx;
      if (onBranch) onBranch(found.idx, found.node, px);
    }
    // 구슬이 노드 구간 벗어나면 리셋
    if (!found) lastNodeIdx.current = -1;
  });

  if (!isVisible) return null;
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.19, 24, 24]} />
      <meshStandardMaterial color="#00ffcc" emissive="#00ffcc" emissiveIntensity={0.7} />
    </mesh>
  );
}

// ★ 간선을 따라 노드로 진입하는 "복제" 구슬 (노드 도달시 사라짐)
function BranchDataBall({ fromX, node, onArrive }) {
  const meshRef = useRef();
  const [progress, setProgress] = useState(0);

  useFrame((state, delta) => {
    setProgress(prev => {
      const next = Math.min(prev + delta * 1.2, 1);
      if (next === 1 && onArrive) onArrive();
      return next;
    });
    if (meshRef.current) {
      // fromX,0,0 → node.x,node.y,0
      const x = fromX + (node.x - fromX) * progress;
      const y = 0 + (node.y - 0) * progress;
      meshRef.current.position.set(x, y, 0);
    }
  });

  if (progress >= 1) return null;
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.18, 20, 20]} />
      <meshStandardMaterial color="#00ffcc" emissive="#00ffcc" emissiveIntensity={0.7} />
    </mesh>
  );
}

function getBusLinePoints() {
  return [
    [-BUS_LENGTH/2, 0, 0],
    [ BUS_LENGTH/2, 0, 0],
  ];
}
function clampToBus(x) {
  const min = -BUS_LENGTH/2, max = BUS_LENGTH/2;
  return Math.max(min, Math.min(max, x));
}

function BusTopology() {
  // 드래그 앤 드롭
  const [draggingNewNode, setDraggingNewNode] = useState(false);

  const [nodes, setNodes] = useState([
    { id: 1, x: -3, y: 0.8 },
    { id: 2, x: -1.5, y: -0.8 },
    { id: 3, x: 0, y: 0.8 },
    { id: 4, x: 1.5, y: -0.8 },
    { id: 5, x: 3, y: 0.8 },
  ]);
  const busLine = getBusLinePoints();
  const [dragIdx, setDragIdx] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  const [nodeActive, setNodeActive] = useState(() => nodes.map(()=>true));
  const [emissiveArr, flash, setEmissiveArr] = useFlashArray(nodes.length);
  const [isBusCut, setIsBusCut] = useState(false);

  // OrbitControls ref
  const orbitRef = useRef();

  // ★ 현재 나타난 "분기" 구슬 상태
  const [branchBalls, setBranchBalls] = useState([]);

  useEffect(()=>{
    setNodeActive(nodes.map(()=>true));
    setEmissiveArr(nodes.map(()=>0.13));
    // eslint-disable-next-line
  }, [nodes]);

  // 노드 인덱스 매칭
  const nodeIdxById = (id) => nodes.findIndex(n => n.id === id);

  // 모든 노드 On이고 버스선 연결 상태일 때만 데이터 흐름
  const isAllActive = !isBusCut && nodeActive.every(Boolean);
const isBusAlive = !isBusCut;
  function handleNodeContextMenu(e, idx) {
    setNodes(prev => prev.filter((_, i) => i !== idx));
  }
  // 드래그로 노드 이동
  function handlePointerDown(e, idx) {
    e.stopPropagation();
    setDragIdx(idx);
    setDragStart({ mouseX: e.clientX, nodeX: nodes[idx].x });
    if (orbitRef.current) orbitRef.current.enabled = false;
  }
  function handlePointerMove(e) {
    if (dragIdx === null) return;
    const dx = (e.clientX - dragStart.mouseX) / 60;
    setNodes(prev => prev.map((n, i) =>
      i === dragIdx
        ? { ...n, x: clampToBus(dragStart.nodeX + dx) }
        : n
    ));
  }
  function handlePointerUp() {
    setDragIdx(null);
    if (orbitRef.current) orbitRef.current.enabled = true;
  }
  useEffect(() => {
    if (dragIdx !== null) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      document.body.style.cursor = "grabbing";
    } else {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      document.body.style.cursor = "";
    }
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      document.body.style.cursor = "";
    };
    // eslint-disable-next-line
  }, [dragIdx]);

  function handleNodeClick(idx) {
    setNodeActive(prev => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
  }
  function handleCutBus() {
    setIsBusCut(val => !val);
  }

  // 드래그 앤 드롭 노드 추가
  function handleDragStart(e) { setDraggingNewNode(true); }
  function handleDragEnd(e) { setDraggingNewNode(false); }
  function handleCanvasDrop(e) {
    setDraggingNewNode(false);
    const canvasRect = e.target.getBoundingClientRect();
    const mouseX = e.clientX - canvasRect.left;
    const percentX = mouseX / canvasRect.width;
    const busX = (percentX - 0.5) * BUS_LENGTH;
    setNodes(prev => [
        ...prev,
      { id: Date.now(), x: clampToBus(busX), y: 0.8 * (Math.random() > 0.5 ? 1 : -1) }
    ]);
  }

  // 버스구슬이 노드에서 분기될 때마다 branchBalls에 추가
  function handleBranch(nodeIdx, node, px) {
    // 노드 활성 상태만 분기
    if (!nodeActive[nodeIdx]) return;
    setBranchBalls(prev => [
    ...prev,
    { id: Date.now() + Math.random(), node, fromX: px, nodeIdx }
    ]);
  }
  // 브랜치 구슬 노드 도달시: 반짝임&제거
  function handleBranchArrive(ballId, nodeIdx) {
    flash(nodeIdx);
    setBranchBalls(prev => prev.filter(b => b.id !== ballId));
  }
 // 버스 노선 끊기 버튼 
  const buttonStyle = {
    position: "absolute",
    right: 30, top: "50%", transform: "translateY(-50%)",
    zIndex: 12,
    background: isBusCut ? "#ff6161" : "#99ccff",
    color: "#fff", fontWeight: 700, fontSize: 18,
    borderRadius: "50%", width: 52, height: 52,
    border: "4px solid #fff", boxShadow: "0 0 16px #7bf",
    cursor: "pointer", transition: "all .2s",
    display: "flex", alignItems: "center", justifyContent: "center"
  };
  const addNodeBtnStyle = {
    position: "absolute", top: 28, left: "50%", transform: "translateX(-50%)", zIndex: 11
  };
  const addNodeCircleStyle = {
    width: 48, height: 48, borderRadius: "50%",
    background: "#99ccff", display: "flex", alignItems: "center", justifyContent: "center",
    color: "#fff", fontSize: 36, fontWeight: 700, boxShadow: "0 0 14px #7bf", cursor: "grab"
  };

  return (
    <div
      style={{
        position: "relative",
        width: "75vw",
        height: "80vh",
        background: "#000",
        display: "flex",
        justifyContent: "center",
        alignItems: "center"
      }}
    >
      {/* 상단 +버튼 */}
      <div style={addNodeBtnStyle}>
        <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            style={addNodeCircleStyle}
            title="드래그해서 버스선에 노드 추가"
        >+</div>
      </div>

      {/* 버스선 끊기/복구 버튼 */}
      <button
        style={buttonStyle}
        onClick={handleCutBus}
        title={isBusCut ? "버스선 복구" : "버스선 끊기"}
      >
        {isBusCut ? "복구" : "끊기"}
      </button>

      <Canvas
        camera={{ position: [0, 0, 5], fov: 70 }}
        style={{
          background: "transparent",
          width: "100%",
          height: "100%"
        }}
        onDrop={handleCanvasDrop}
        onDragOver={e => { if (draggingNewNode) e.preventDefault(); }}
      >
        {/* 버스 메인 라인 */}
        <Line points={busLine} color={isBusCut ? "#ff6161" : "#fff"} lineWidth={7} />

        {/* 노드와 연결선 */}
        {nodes.map((node, i) => (
          <React.Fragment key={node.id}>
            <Line points={[[node.x, node.y, 0], [node.x, 0, 0]]} color="#fff" lineWidth={4} />
            <mesh
              position={[node.x, node.y, 0]}
              onPointerDown={e => handlePointerDown(e, i)}
              onPointerUp={() => {
                setDragIdx(null);
                if (orbitRef.current) orbitRef.current.enabled = true;
              }}
              onClick={() => handleNodeClick(i)}
              onContextMenu={e => handleNodeContextMenu(e, i)}
              style={{ cursor: dragIdx === i ? "grabbing" : "pointer" }}
            >
              <sphereGeometry args={[0.5, 38, 38]} />
              <meshStandardMaterial
                color={nodeActive[i] ? "#99CCFF" : "#444"}
                roughness={0.32}
                metalness={0.33}
                envMapIntensity={1}
                emissive={nodeActive[i] ? "#99CCFF" : "#111"}
                emissiveIntensity={nodeActive[i] ? emissiveArr[i] : 0.03}
                transparent
                opacity={nodeActive[i] ? 1 : 0.55}
              />
            </mesh>
          </React.Fragment>
        ))}

        {/* ★ 버스선 데이터 구슬 (분기) */}
        {isBusAlive &&
          Array(DATA_BALL_COUNT).fill(0).map((_, i) => (
            <BusDataBall
              key={i}
              offset={i / DATA_BALL_COUNT}
              isVisible={isBusAlive}
              nodes={nodes.map(n => ({...n}))}
              busLine={busLine}
              onBranch={handleBranch}
            />
          ))
        }
        {/*  브랜치로 복제되어 노드로 들어가는 구슬들 */}
        {branchBalls.map(b =>
          <BranchDataBall
            key={b.id}
            fromX={b.fromX}
            node={b.node}
            onArrive={() => handleBranchArrive(b.id, nodeIdxById(b.node.id))}
          />
        )}

        <ambientLight intensity={0.8} />
        <directionalLight position={[4, 8, 11]} intensity={1.08} />
        <OrbitControls ref={orbitRef} enablePan enableZoom enableRotate />
      </Canvas>
    </div>
  );
}

export default BusTopology;
