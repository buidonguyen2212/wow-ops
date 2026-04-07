import { useState, useEffect, useRef, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

// Firebase Config - THAY BẰNG CONFIG THỰC CỦA BẠN
const firebaseConfig = {
  apiKey: "AIzaSy0Wjpzvzb4FYsLkbX5ooKXa2kRwx911tyk",
  authDomain: "wowart-ops.firebaseapp.com",
  projectId: "wowart-ops",
  storageBucket: "wowart-ops.firebasestorage.app",
  messagingSenderId: "d0928855568",
  appId: "1:609288855688:web:5062c02da89cd70052c69d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Color Theme
const C = {
  navy: "#1D6B4A", yellow: "#F50B2F", purple: "#8B5CF6", orange: "#FD5B2F",
  danger: "#EF4444", warning: "#FF5900", success: "#22C55E", header: "#1D6B4A",
  textSec: "#64748B", input: "#F1F5F9", border: "#E2E8F0", danger: "#EF4444", warn: "#FF9800", success: "#22C55E",
  headerBg: "#1D6B4A"
};

// Storage Helper
const S = {
  toDocId: (k) => k.replace(/^wowops:/, "").replace(/:/g, "_"),
  get: async (k) => {
    try {
      const docRef = doc(db, "wowops", S.toDocId(k));
      const snap = await getDoc(docRef);
      return snap.exists() ? snap.data().value : null;
    } catch (e) {
      console.error("Get error:", e);
      return null;
    }
  },
  set: async (k, v) => {
    try {
      const docRef = doc(db, "wowops", S.toDocId(k));
      await setDoc(docRef, { value: v }, { merge: true });
    } catch (e) {
      console.error("Set error:", e);
    }
  }
};

// Department Config
const DEPTS = [
  { id: "TS", name: "Truyền Thông", color: C.navy, kpis: [
    { id: "KPI001", name: "Bài viết blog", type: "count", target: 4 },
    { id: "KPI002", name: "Email campaign", type: "rate", target: 80 },
    { id: "KPI003", name: "Social engagement", type: "score", target: 8 }
  ]},
  { id: "MK", name: "Marketing", color: C.yellow, kpis: [
    { id: "KPI004", name: "Lead generation", type: "count", target: 15 },
    { id: "KPI005", name: "Conversion rate", type: "rate", target: 3 },
    { id: "KPI006", name: "Campaign ROI", type: "score", target: 7 }
  ]},
  { id: "SL", name: "Sales", color: C.purple, kpis: [
    { id: "KPI007", name: "Deals closed", type: "count", target: 8 },
    { id: "KPI008", name: "Win rate", type: "rate", target: 45 },
    { id: "KPI009", name: "Customer satisfaction", type: "score", target: 9 }
  ]},
  { id: "CS", name: "Customer Success", color: C.orange, kpis: [
    { id: "KPI010", name: "Support tickets resolved", type: "count", target: 25 },
    { id: "KPI011", name: "Resolution time", type: "rate", target: 90 },
    { id: "KPI012", name: "NPS", type: "score", target: 8 }
  ]},
  { id: "HR", name: "HR", color: "#EC4899", kpis: [
    { id: "KPI013", name: "Hires completed", type: "count", target: 5 },
    { id: "KPI014", name: "Hiring accuracy", type: "rate", target: 85 },
    { id: "KPI015", name: "Employee engagement", type: "score", target: 8 }
  ]},
  { id: "OPS", name: "Operations", color: "#06B6D4", kpis: [
    { id: "KPI016", name: "Process improvements", type: "count", target: 3 },
    { id: "KPI017", name: "Efficiency gain", type: "rate", target: 15 },
    { id: "KPI018", name: "System uptime", type: "score", target: 9.5 }
  ]}
];

export default function WowOps() {
  const [role, setRole] = useState(null);
  const [dept, setDept] = useState(null);
  const [nvs, setNvs] = useState([]);
  const [selectedNv, setSelectedNv] = useState(null);
  const [tab, setTab] = useState("Results");
  const [data, setData] = useState({});
  const [review, setReview] = useState("");
  const [pinInput, setPinInput] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    const loadRole = async () => {
      const r = await S.get("wowops:role");
      const d = await S.get("wowops:dept");
      const nvList = await S.get("wowops:nvlist");
      if (r) { setRole(r); setDept(d); setNvs(nvList || []); }
    };
    loadRole();
  }, []);

  const getAlerts = useCallback(() => {
    if (!selectedNv) return [];
    const alerts = [];
    const nvData = data[selectedNv] || {};
    const deptData = DEPTS.find(d => d.id === dept);

    deptData?.kpis.forEach(kpi => {
      const val = nvData[kpi.id] || 0;
      const target = kpi.target;

      // Alert 1: Missing entries
      if (!val) alerts.push({ type: "missing", kpi: kpi.name, severity: "high" });

      // Alert 2: Below 50% target
      if (val > 0 && val < target * 0.5) alerts.push({ type: "low", kpi: kpi.name, val, target, severity: "high" });

      // Alert 3: Between 50-75%
      if (val >= target * 0.5 && val < target * 0.75) alerts.push({ type: "warning", kpi: kpi.name, val, target, severity: "medium" });
    });

    return alerts;
  }, [selectedNv, dept, data]);

  const saveSetting = async () => {
    if (role === "Manager") {
      if (pinInput === "1234") {
        await S.set("wowops:pin", "5678");
        alert("PIN changed to 5678");
        setPinInput("");
      } else {
        alert("Wrong PIN");
      }
    }
  };

  const addNv = async () => {
    const name = inputRef.current?.value || `NV_${Date.now()}`;
    if (!nvs.includes(name)) {
      const newList = [...nvs, name];
      setNvs(newList);
      await S.set("wowops:nvlist", newList);
      inputRef.current.value = "";
    }
  };

  if (!role) {
    return (
      <div style={{ padding: "20px", maxWidth: "600px", margin: "50px auto" }}>
        <h1>WOW OPS - Quản lý hiệu suất</h1>
        <div style={{ marginBottom: "20px" }}>
          <label>Chọn vai trò:</label>
          <button onClick={() => { setRole("Employee"); setDept("TS"); }} style={{ marginRight: "10px", padding: "8px 16px" }}>
            Nhân viên
          </button>
          <button onClick={() => { setRole("Manager"); setDept("TS"); }} style={{ padding: "8px 16px" }}>
            Quản lý
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ color: C.header }}>WOW OPS</h1>

      {role === "Manager" && (
        <div style={{ marginBottom: "20px", padding: "10px", backgroundColor: C.input, borderRadius: "8px" }}>
          <h3>Quản lý nhân viên</h3>
          <input ref={inputRef} placeholder="Tên nhân viên" style={{ padding: "8px", marginRight: "8px" }} />
          <button onClick={addNv} style={{ padding: "8px 16px", backgroundColor: C.header, color: "white", borderRadius: "4px", border: "none", cursor: "pointer" }}>
            Thêm
          </button>
          <div style={{ marginTop: "10px" }}>
            {nvs.map(nv => (
              <div key={nv} style={{ padding: "8px", backgroundColor: "white", margin: "5px 0", borderRadius: "4px", display: "flex", justifyContent: "space-between" }}>
                {nv}
                <button onClick={() => setSelectedNv(nv)} style={{ padding: "4px 8px", backgroundColor: C.header, color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
                  Xem
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {role === "Employee" && (
        <div style={{ marginBottom: "20px", padding: "10px", backgroundColor: C.input, borderRadius: "8px" }}>
          <h3>Thông tin cá nhân</h3>
          <p>Tên: {selectedNv || "Bạn"}</p>
          <p>Phòng ban: {DEPTS.find(d => d.id === dept)?.name}</p>
        </div>
      )}

      {selectedNv && (
        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", gap: "10px", borderBottom: `2px solid ${C.border}`, marginBottom: "20px" }}>
            {["Results", "Tasks", "Weekly Targets", "Progress"].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: "10px 15px",
                  backgroundColor: tab === t ? C.header : "white",
                  color: tab === t ? "white" : C.header,
                  border: "none",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: tab === t ? "bold" : "normal"
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "Results" && (
            <div>
              <h3>Kết quả KPI</h3>
              {DEPTS.find(d => d.id === dept)?.kpis.map(kpi => (
                <div key={kpi.id} style={{ marginBottom: "15px", padding: "10px", backgroundColor: C.input, borderRadius: "8px" }}>
                  <label>{kpi.name} (Target: {kpi.target})</label>
                  <input
                    type="number"
                    value={data[selectedNv]?.[kpi.id] || ""}
                    onChange={(e) => {
                      const newData = { ...data, [selectedNv]: { ...data[selectedNv], [kpi.id]: parseFloat(e.target.value) || 0 } };
                      setData(newData);
                      S.set(`wowops:${selectedNv}:data`, newData[selectedNv]);
                    }}
                    style={{ width: "100%", padding: "8px", marginTop: "5px", borderRadius: "4px", border: `1px solid ${C.border}` }}
                  />
                </div>
              ))}
            </div>
          )}

          {tab === "Progress" && role === "Manager" && (
            <div>
              <h3>Smart Alerts</h3>
              {getAlerts().length === 0 ? (
                <p style={{ color: C.success }}>✓ Không có cảnh báo</p>
              ) : (
                getAlerts().map((a, i) => (
                  <div key={i} style={{ padding: "10px", backgroundColor: a.severity === "high" ? "#FEE2E2" : "#FEF3C7", borderRadius: "4px", marginBottom: "8px", color: a.severity === "high" ? C.danger : C.warning }}>
                    ⚠ {a.kpi}: {a.type === "missing" ? "Chưa nhập" : `${a.val}/${a.target}`}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {role === "Manager" && (
        <div style={{ marginTop: "30px", padding: "15px", backgroundColor: C.input, borderRadius: "8px" }}>
          <h3>Cài đặt bảo mật</h3>
          <input
            type="password"
            placeholder="Nhập PIN"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            style={{ padding: "8px", marginRight: "8px", borderRadius: "4px", border: `1px solid ${C.border}` }}
          />
          <button onClick={saveSetting} style={{ padding: "8px 16px", backgroundColor: C.header, color: "white", borderRadius: "4px", border: "none", cursor: "pointer" }}>
            Cập nhật PIN
          </button>
        </div>
      )}
    </div>
  );
}
