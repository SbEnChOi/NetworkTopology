import React, { useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";

const BUS_LENGTH = 8;         // 버스선 길이
const DATA_BALL_COUNT = 2;    // 구슬 개수

// 반짝임 관리
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
  return [emissiveArr, flash, setEmissiveArr];
}

// 데이터 구슬
function DataBall({ offset = 0, isVisible, onPassNode, nodes, busLine }) {
  const meshRef = useRef();
  const lastNodeIdx = useRef(-1);

  useFrame((state, delta) => {
    if (!isVisible) return;
    const speed = 0.32;
    const t = ((state.clock.getElapsedTime() * speed + offset) % 1);

    // 버스 선분에서 위치 계산
    const ax = busLine[0][0], ay = busLine[0][1], az = busLine[0][2];
    const bx = busLine[1][0], by = busLine[1][1], bz = busLine[1][2];
    const px = ax + (bx - ax) * t;
    const py = ay + (by - ay) * t;
    const pz = az + (bz - az) * t;

    if (meshRef.current) {
      meshRef.current.position.set(px, py, pz);
    }

    // 노드 근처 반짝임
    nodes.forEach((node, idx) => {
      if (Math.abs(px - node[0]) < 0.35 && Math.abs(py - node[1]) < 0.35) {
        if (lastNodeIdx.current !== idx) {
          lastNodeIdx.current = idx;
          if (onPassNode) onPassNode(idx);
        }
      }
    });
    // 아무 노드 근처 아니면 리셋
    if (!nodes.some(node => Math.abs(px - node[0]) < 0.35 && Math.abs(py - node[1]) < 0.35)) {
      lastNodeIdx.current = -1;
    }
  });

  if (!isVisible) return null;
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.19, 24, 24]} />
      <meshStandardMaterial color="#00ffcc" emissive="#00ffcc" emissiveIntensity={0.7} />
    </mesh>
  );
}

// 버스선 좌표(고정)
function getBusLinePoints() {
  return [
    [-BUS_LENGTH/2, 0, 0],
    [ BUS_LENGTH/2, 0, 0],
  ];
}

// 버스선 위에서 x만 결정(y=0)
function clampToBus(x) {
  const min = -BUS_LENGTH/2, max = BUS_LENGTH/2;
  return Math.max(min, Math.min(max, x));
}

function BusTopology() {
  // 노드: {x, y, id} 객체로 관리(고유id)
  const [nodes, setNodes] = useState([
    { id: 1, x: -3, y: 0.8 },
    { id: 2, x: -1.5, y: -0.8 },
    { id: 3, x: 0, y: 0.8 },
    { id: 4, x: 1.5, y: -0.8 },
    { id: 5, x: 3, y: 0.8 },
  ]);
  const busLine = getBusLinePoints();
  const [dragIdx, setDragIdx] = useState(null);
  const [dragStart, setDragStart] = useState(null); // 마우스 좌표
  const [nodeActive, setNodeActive] = useState(() => nodes.map(()=>true));
  const [emissiveArr, flash, setEmissiveArr] = useFlashArray(nodes.length);

  // id 기반으로 nodeActive/emissiveArr도 동기화
  React.useEffect(()=>{
    setNodeActive(nodes.map(()=>true));
    setEmissiveArr(nodes.map(()=>0.13));
  }, [nodes, setEmissiveArr]);

  // 하나라도 꺼지면 전체 구슬 멈춤
  const isAllActive = nodeActive.every(Boolean);

  // 노드 추가: 버스선 더블클릭 위치에
  function handleCanvasDoubleClick(e) {
    e.stopPropagation();
    // 3D좌표 변환
    const { camera, size } = e.target.__reactThreeFiber?.current?.getState?.() || useThree();
    let [x, y] = [0,0];
    if (e.unprojectedPoint) { // drei v10 이상 지원
      x = clampToBus(e.unprojectedPoint.x);
      y = 0.8 * ((Math.random() > 0.5) ? 1 : -1); // 위아래 랜덤
    } else if (e.point) {
      x = clampToBus(e.point.x);
      y = 0.8 * ((Math.random() > 0.5) ? 1 : -1);
    } else {
      // fallback: 중앙
      x = 0;
      y = 0.8;
    }
    setNodes(prev => ([...prev, { id: Date.now(), x, y }]));
  }

  // 노드 삭제(우클릭)
  function handleNodeContextMenu(e, idx) {
    e.preventDefault();
    setNodes(prev => prev.filter((_, i) => i !== idx));
  }

  // 노드 드래그: pointerDown~pointerUp
  function handlePointerDown(e, idx) {
    e.stopPropagation();
    setDragIdx(idx);
    setDragStart({ mouseX: e.clientX, nodeX: nodes[idx].x });
  }
  function handlePointerMove(e) {
    if (dragIdx === null) return;
    const dx = (e.clientX - dragStart.mouseX) / 60; // 감도 보정
    setNodes(prev => prev.map((n, i) =>
      i === dragIdx
        ? { ...n, x: clampToBus(dragStart.nodeX + dx) }
        : n
    ));
  }
  function handlePointerUp() {
    setDragIdx(null);
  }

  // 이벤트 등록/해제
  React.useEffect(() => {
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

  // 노드 클릭 토글(좌클릭)
  function handleNodeClick(idx) {
    setNodeActive(prev => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
  }

  return (
    <div
      style={{
        width: "100vw",
        height: "80vh",
        background: "#000",
        display: "flex",
        justifyContent: "center",
        alignItems: "center"
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 9], fov: 70 }}
        style={{
          background: "transparent",
          width: "100%",
          height: "100%"
        }}
        onDoubleClick={handleCanvasDoubleClick}
      >
        {/* 버스 메인 라인 */}
        <Line points={busLine} color="#fff" lineWidth={7} />

        {/* 노드와 연결선 */}
        {nodes.map((node, i) => (
          <React.Fragment key={node.id}>
            {/* 노드-버스 연결선 */}
            <Line points={[[node.x, node.y, 0], [node.x, 0, 0]]} color="#fff" lineWidth={4} />
            {/* 노드 */}
            <mesh
            position={[node.x, node.y, 0]}
            onPointerDown={e => handlePointerDown(e, i)}
            onPointerUp={() => setDragIdx(null)}
            onClick={() => handleNodeClick(i)}
            onContextMenu={e => handleNodeContextMenu(e, i)}
            style={{ cursor: dragIdx === i ? "grabbing" : "pointer" }}
            >
              <sphereGeometry args={[0.5, 38, 38]} />
              <meshStandardMaterial
                color={nodeActive[i] ? "#000" : "#444"}
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

        {/* 데이터 구슬 */}
        {isAllActive &&
          Array(DATA_BALL_COUNT).fill(0).map((_, i) => (
            <DataBall
              key={i}
              offset={i / DATA_BALL_COUNT}
              isVisible={isAllActive}
              nodes={nodes.map(n => [n.x, n.y, 0])}
              busLine={busLine}
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

export default BusTopology;
