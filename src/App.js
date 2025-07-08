// App.js
import React, { useState } from "react";
import StarTopology from "./StarTopology";
import RingTopology from "./RingTopology";
import BusTopology from "./BusTopology";
import TreeTopology from "./TreeTopology";
import MeshTopology from "./MeshTopology";

const TOPOLOGY_LIST = [
  { key: "star", label: "성형" },
  { key: "ring", label: "링형" },
  { key: "bus",  label: "버스형" },
  { key: "tree", label: "계층형" },
  { key: "mesh", label: "그물형" },
];

const DESCRIPTIONS = {
  star: {
    title: "성형(Star) 토폴로지란?",
    items: [
      { color: "#99ccff", label: "파란색 노드:", text: "중앙 제어장치(허브). 모든 통신이 이 노드를 통해 이루어집니다." },
      { color: "#fff",     label: "흰색 노드:", text: "일반 컴퓨터(주변 노드)." },
      { color: "#fff",     label: "흰색 선:", text: "허브와 주변 노드를 연결하는 케이블." },
      { color: "#00ffcc",  label: "움직이는 구슬:", text: "데이터 패킷 전송 모습." },
    ],
    features: [
      "모든 노드는 중앙 허브에만 연결됩니다.",
      "허브를 통해서만 통신이 이루어집니다.",
      "허브 고장 시 전체 네트워크 마비.",
      "문제 발생 위치 파악이 용이합니다.",
      "확장과 관리가 쉽지만 케이블 사용량이 많을 수 있습니다."
    ]
  },
  ring: {
    title: "링형(Ring) 토폴로지란?",
    items: [
      { color: "#fff",    label: "흰색 노드:", text: "서로 순환 방식으로 연결된 노드." },
      { color: "#fff",    label: "흰색 간선:", text: "인접 노드 간의 직접 연결." },
      { color: "#00ffcc", label: "움직이는 구슬:", text: "데이터가 한 방향(또는 양방향)으로 순환하는 모습." },
    ],
    features: [
      "각 노드는 이웃 노드 두 곳과만 연결됩니다.",
      "데이터는 순환 방식으로 전달됩니다.",
      "한 구간 고장 시 전체 순환이 단절될 수 있습니다.",
      "이중 링으로 구성하면 고장 내성 향상 가능."
    ]
  },
  bus: {
    title: "버스형(Bus) 토폴로지란?",
    items: [
      { color: "#fff",    label: "흰색 노드:", text: "공유 매체(버스선)에 연결된 각 컴퓨터." },
      { color: "#fff",    label: "흰색 선(버스):", text: "모든 노드가 공유하는 단일 통신 채널." },
      { color: "#00ffcc", label: "움직이는 구슬:", text: "데이터가 버스선을 따라 전송되는 모습." },
    ],
    features: [
      "단일 케이블에 모든 노드가 연결됩니다.",
      "간단하고 구축 비용이 저렴합니다.",
      "버스선 고장 시 전체 네트워크 마비.",
      "추가 노드 연결이 용이하지만 충돌 관리 필요."
    ]
  },
  tree: {
    title: "계층형(Tree) 토폴로지란?",
    items: [
      { color: "#2261a9", label: "진한 파란 노드:", text: "상위 계층의 통신 제어 장치." },
      { color: "#65aee6", label: "연한 파란 노드:", text: "하위 계층 노드." },
      { color: "#fff",     label: "흰색 간선:", text: "부모-자식 간 연결." },
      { color: "#00ffcc",  label: "움직이는 구슬:", text: "상위→하위로 계층적 전송." },
    ],
    features: [
      "트리 구조로 확장성이 뛰어납니다.",
      "상위 노드 고장 시 해당 서브트리 전체가 마비됩니다.",
      "계층별 관리와 문제 파악이 용이합니다.",
      "버스형처럼 추가/삭제를 드래그 앤 드롭으로 구현합니다."
    ]
  },
  mesh: {
    title: "그물형(Mesh) 토폴로지란?",
    items: [
      { color: "#99ccff", label: "파란색 노드:", text: "모든 노드들이 융통성 있게 연결됨." },
      { color: "#fff",     label: "흰색 간선:", text: "노드 간 다대다 연결 구조." },
      { color: "#00ffcc",  label: "움직이는 구슬:", text: "모든 노드에서 양방향 전송." },
    ],
    features: [
      "각 노드는 네트워크의 다른 모든 노드와 직접 연결됩니다.",
      "경로의 개수가 가 높아 고장 내성이 강합니다.",
      "설치 비용과 케이블 양이 많을 수 있습니다.",
      "우클릭으로 노드·간선 활성/비활성 토글이 가능합니다."
    ]
  }
};

function App() {
  const [topology, setTopology] = useState("star");

  const desc = DESCRIPTIONS[topology];

  return (
    <div style={{
      display: "flex", background: "#000", minHeight: "100vh",
      color: "#fff", fontFamily: "Pretendard, sans-serif"
    }}>
      {/* 왼쪽: 3D 네트워크 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: "flex", gap: 16, padding: 24, justifyContent: "center"
        }}>
          {TOPOLOGY_LIST.map(item => (
            <button
              key={item.key}
              onClick={() => setTopology(item.key)}
              style={{
                background: topology === item.key ? "#fff" : "#222",
                color: topology === item.key ? "#000" : "#fff",
                border: "none", borderRadius: 12,
                fontSize: 20, padding: "10px 24px", fontWeight: 600,
                cursor: "pointer", transition: "all .2s"
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div style={{ width: "100%", height: "80vh" }}>
          {topology === "star" && <StarTopology />}
          {topology === "ring" && <RingTopology />}
          {topology === "bus"  && <BusTopology />}
          {topology === "tree" && <TreeTopology />}
          {topology === "mesh" && <MeshTopology />}
        </div>
      </div>

      {/* 오른쪽: 설명 패널 */}
      <div style={{
        width: 340, background: "#181818", borderLeft: "1px solid #222",
        padding: 28, boxSizing: "border-box", fontSize: 17, lineHeight: 1.7,
        minHeight: "100vh"
      }}>
        <h2 style={{ color: desc.items[0].color, marginTop: 0 }}>
          {desc.title}
        </h2>
        <ul style={{ paddingLeft: 20, color: "#fff" }}>
          {desc.items.map((it, i) => (
            <li key={i}>
              <b style={{ color: it.color }}>{it.label}</b> {it.text}
            </li>
          ))}
        </ul>
        <hr style={{ margin: "24px 0", borderColor: "#333" }} />
        <h3 style={{ color: "#fff" }}>특징</h3>
        <ul style={{ paddingLeft: 20, color: "#ccc" }}>
          {desc.features.map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      </div>
    </div>
  );
}

export default App;
