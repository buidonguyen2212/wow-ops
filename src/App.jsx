import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, setDoc, getDoc, getDocs, doc, updateDoc, query, where, deleteDoc } from 'firebase/firestore';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Firebase Configuration
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

// Position Definitions with Default KPIs and Tasks
const POSITIONS = {
  'GV': {
    name: 'Giáo viên',
    icon: '👨‍🏫',
    kpis: [
      { id: 'classes', name: 'Số buổi dạy', type: 'count', target: 5, unit: '/tuần' },
      { id: 'satisfaction', name: 'Điểm hài lòng học viên', type: 'score', target: 8, unit: '/10' },
      { id: 'attendance', name: 'Tỷ lệ học viên đi học', type: 'rate', target: 85, unit: '%' }
    ],
    tasks: [
      { name: 'Soạn giáo án', completed: false },
      { name: 'Dạy đúng giờ', completed: false },
      { name: 'Chấm bài/feedback', completed: false },
      { name: 'Báo cáo tình hình lớp', completed: false }
    ]
  },
  'MK': {
    name: 'Marketing',
    icon: '📱',
    kpis: [
      { id: 'content', name: 'Bài content đăng', type: 'count', target: 5, unit: '/tuần' },
      { id: 'engagement', name: 'Engagement rate', type: 'rate', target: 3, unit: '%' },
      { id: 'leads', name: 'Leads từ content', type: 'count', target: 10, unit: '/tuần' }
    ],
    tasks: [
      { name: 'Đăng bài social media', completed: false },
      { name: 'Chụp ảnh/quay video', completed: false },
      { name: 'Trả lời comment/inbox', completed: false },
      { name: 'Theo dõi ads', completed: false }
    ]
  },
  'SL': {
    name: 'Sales/Tư vấn',
    icon: '💼',
    kpis: [
      { id: 'calls', name: 'Số cuộc gọi tư vấn', type: 'count', target: 30, unit: '/tuần' },
      { id: 'conversion', name: 'Tỷ lệ chốt', type: 'rate', target: 20, unit: '%' },
      { id: 'revenue', name: 'Doanh thu', type: 'count', target: 50, unit: 'tr/tuần' }
    ],
    tasks: [
      { name: 'Gọi điện khách hàng mới', completed: false },
      { name: 'Follow-up khách cũ', completed: false },
      { name: 'Cập nhật CRM', completed: false },
      { name: 'Báo cáo kết quả cuối ngày', completed: false }
    ]
  },
  'AD': {
    name: 'Admin/Vận hành',
    icon: '⚙️',
    kpis: [
      { id: 'tasks', name: 'Công việc hoàn thành', type: 'count', target: 20, unit: '/tuần' },
      { id: 'response', name: 'Thời gian phản hồi', type: 'score', target: 9, unit: '/10' },
      { id: 'accuracy', name: 'Tỷ lệ chính xác', type: 'rate', target: 95, unit: '%' }
    ],
    tasks: [
      { name: 'Xử lý hồ sơ', completed: false },
      { name: 'Điều phối lịch học', completed: false },
      { name: 'Kiểm tra cơ sở vật chất', completed: false },
      { name: 'Báo cáo tổng hợp', completed: false }
    ]
  }
};

// Utility Functions
const getWeekKey = (date = new Date()) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const diff = d - yearStart;
  const week = Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric', year: '2-digit' });
};

const getStatusColor = (value, target, type) => {
  const percentage = (value / target) * 100;
  if (percentage >= 100) return '#059669';
  if (percentage >= 80) return '#f59e0b';
  return '#ef4444';
};

// Main App Component
export default function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(getWeekKey());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Load initial data
  useEffect(() => {
    const initApp = async () => {
      try {
        setLoading(true);
        const snapshot = await getDocs(collection(db, 'wowops'));

        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          const data = doc.data();
          setEmployees(data.employees || []);
          if (data.employees && data.employees.length > 0) {
            setSelectedEmployee(data.employees[0].id);
          }
        } else {
          const employeesData = [];
          await setDoc(doc(db, 'wowops', 'config'), {
            employees: employeesData,
            managerPin: '1234',
            weeklyTargets: {}
          });
          setEmployees(employeesData);
        }
        setUser({ name: 'Quản lý', id: 'manager-001' });
        setUserRole('manager');
      } catch (err) {
        setError('Lỗi tải dữ liệu: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    initApp();
  }, []);

  // Save employees to Firestore
  const saveEmployees = async (empList) => {
    try {
      const snapshot = await getDocs(collection(db, 'wowops'));
      if (!snapshot.empty) {
        await updateDoc(doc(db, 'wowops', snapshot.docs[0].id), {
          employees: empList
        });
      }
      setEmployees(empList);
    } catch (err) {
      setError('Lỗi lưu: ' + err.message);
    }
  };

  // Add new employee
  const addEmployee = async (name, position) => {
    const newId = `emp-${Date.now()}`;
    const newEmp = { id: newId, name, position, createdAt: new Date().toISOString() };

    // Initialize KPIs and tasks
    const weekKey = getWeekKey();
    const posConfig = POSITIONS[position];

    try {
      // Save KPIs
      await setDoc(doc(db, 'wowops', `employee_${newId}_kpis_${weekKey}`), {
        kpis: posConfig.kpis.map(kpi => ({ ...kpi, value: 0 })),
        weekKey
      });

      // Save tasks
      await setDoc(doc(db, 'wowops', `employee_${newId}_tasks_${weekKey}`), {
        tasks: posConfig.tasks.map(task => ({ ...task, date: new Date().toISOString() })),
        weekKey
      });

      const newList = [...employees, newEmp];
      await saveEmployees(newList);
      setCurrentPage('dashboard');
    } catch (err) {
      setError('Lỗi thêm nhân viên: ' + err.message);
    }
  };

  // Fetch employee KPIs
  const getEmployeeKPIs = async (empId, weekKey) => {
    try {
      const docRef = doc(db, 'wowops', `employee_${empId}_kpis_${weekKey}`);
      const snapshot = await getDoc(docRef);
      return snapshot.exists() ? snapshot.data().kpis : [];
    } catch {
      return [];
    }
  };

  // Fetch employee tasks
  const getEmployeeTasks = async (empId, weekKey) => {
    try {
      const docRef = doc(db, 'wowops', `employee_${empId}_tasks_${weekKey}`);
      const snapshot = await getDoc(docRef);
      return snapshot.exists() ? snapshot.data().tasks : [];
    } catch {
      return [];
    }
  };

  const renderPage = () => {
    if (loading) return <LoadingScreen />;
    if (!user) return <LoginScreen onLogin={() => setUserRole('manager')} />;

    switch (currentPage) {
      case 'dashboard':
        return <ManagerDashboard employees={employees} weekKey={currentWeek} getKpis={getEmployeeKPIs} getTasks={getEmployeeTasks} />;
      case 'add-employee':
        return <AddEmployeeForm onAdd={addEmployee} onClose={() => setCurrentPage('dashboard')} />;
      case 'weekly-setup':
        return <WeeklySetupPage employees={employees} weekKey={currentWeek} />;
      case 'employee-detail':
        return <EmployeeDetailPage empId={selectedEmployee} weekKey={currentWeek} employees={employees} />;
      case 'reports':
        return <ReportsPage employees={employees} />;
      default:
        return <ManagerDashboard employees={employees} weekKey={currentWeek} getKpis={getEmployeeKPIs} getTasks={getEmployeeTasks} />;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {userRole === 'manager' && (
        <Sidebar
          open={sidebarOpen}
          setOpen={setSidebarOpen}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          employees={employees}
          selectedEmployee={selectedEmployee}
          setSelectedEmployee={setSelectedEmployee}
        />
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header
          title={getPageTitle(currentPage)}
          user={user}
          onLogout={() => { setUser(null); setUserRole(null); }}
        />
        <div style={{ flex: 1, overflow: 'auto', padding: '24px', backgroundColor: '#fafafa' }}>
          {error && <ErrorBanner message={error} onClose={() => setError(null)} />}
          {renderPage()}
        </div>
      </div>
    </div>
  );

  function getPageTitle(page) {
    switch(page) {
      case 'dashboard': return 'Bảng điều khiển';
      case 'add-employee': return 'Thêm nhân viên';
      case 'weekly-setup': return 'Thiết lập tuần';
      case 'employee-detail': return 'Chi tiết nhân viên';
      case 'reports': return 'Báo cáo';
      default: return 'WOW ART Ops';
    }
  }
}

// Sidebar Component
function Sidebar({ open, setOpen, currentPage, setCurrentPage, employees, selectedEmployee, setSelectedEmployee }) {
  return (
    <div style={{
      width: open ? 280 : 80,
      backgroundColor: '#ffffff',
      borderRight: '1px solid #f3f4f6',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.3s ease',
      zIndex: 100
    }}>
      <div style={{ padding: '20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {open && <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#059669' }}>WOW ART</h1>}
        <button
          onClick={() => setOpen(!open)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '8px'
          }}
        >
          ☰
        </button>
      </div>

      <nav style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <NavItem icon="📊" label="Dashboard" active={currentPage === 'dashboard'} onClick={() => setCurrentPage('dashboard')} open={open} />
        <NavItem icon="➕" label="Thêm NV" active={currentPage === 'add-employee'} onClick={() => setCurrentPage('add-employee')} open={open} />
        <NavItem icon="🎯" label="Thiết lập" active={currentPage === 'weekly-setup'} onClick={() => setCurrentPage('weekly-setup')} open={open} />
        <NavItem icon="📈" label="Báo cáo" active={currentPage === 'reports'} onClick={() => setCurrentPage('reports')} open={open} />
      </nav>

      {open && employees.length > 0 && (
        <div style={{ padding: '16px', borderTop: '1px solid #f3f4f6', maxHeight: '200px', overflowY: 'auto' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280' }}>Nhân viên</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {employees.map(emp => (
              <button
                key={emp.id}
                onClick={() => { setSelectedEmployee(emp.id); setCurrentPage('employee-detail'); }}
                style={{
                  padding: '8px 12px',
                  backgroundColor: selectedEmployee === emp.id ? '#f3f4f6' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '13px',
                  color: '#111827',
                  transition: 'background-color 0.2s'
                }}
              >
                {emp.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Navigation Item
function NavItem({ icon, label, active, onClick, open }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        backgroundColor: active ? '#d1fae5' : 'transparent',
        color: active ? '#059669' : '#6b7280',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: active ? '600' : '500',
        fontSize: '14px',
        transition: 'all 0.2s',
        justifyContent: open ? 'flex-start' : 'center',
        whiteSpace: 'nowrap'
      }}
    >
      <span style={{ fontSize: '18px' }}>{icon}</span>
      {open && label}
    </button>
  );
}

// Header Component
function Header({ title, user, onLogout }) {
  return (
    <div style={{
      padding: '20px 24px',
      borderBottom: '1px solid #f3f4f6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#ffffff'
    }}>
      <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#111827' }}>{title}</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ fontSize: '14px', color: '#6b7280' }}>👤 {user?.name}</span>
        <button
          onClick={onLogout}
          style={{
            padding: '8px 16px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500'
          }}
        >
          Đăng xuất
        </button>
      </div>
    </div>
  );
}

// Loading Screen
function LoadingScreen() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
        <p style={{ color: '#6b7280' }}>Đang tải dữ liệu...</p>
      </div>
    </div>
  );
}

// Login Screen
function LoginScreen({ onLogin }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#fafafa'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        textAlign: 'center',
        maxWidth: '400px'
      }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px', color: '#059669' }}>WOW ART</h1>
        <p style={{ color: '#6b7280', marginBottom: '32px' }}>Performance Management</p>
        <button
          onClick={onLogin}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#059669',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Đăng nhập
        </button>
      </div>
    </div>
  );
}

// Error Banner
function ErrorBanner({ message, onClose }) {
  return (
    <div style={{
      padding: '12px 16px',
      backgroundColor: '#fee2e2',
      color: '#991b1b',
      borderRadius: '8px',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <span>{message}</span>
      <button
        onClick={onClose}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
      >
        ×
      </button>
    </div>
  );
}

// Manager Dashboard
function ManagerDashboard({ employees, weekKey, getKpis, getTasks }) {
  const [kpiData, setKpiData] = useState({});
  const [taskData, setTaskData] = useState({});

  useEffect(() => {
    const loadData = async () => {
      const kpis = {};
      const tasks = {};
      for (const emp of employees) {
        kpis[emp.id] = await getKpis(emp.id, weekKey);
        tasks[emp.id] = await getTasks(emp.id, weekKey);
      }
      setKpiData(kpis);
      setTaskData(tasks);
    };
    if (employees.length > 0) loadData();
  }, [employees, weekKey, getKpis, getTasks]);

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ color: '#059669', fontSize: '18px', marginBottom: '16px' }}>Tuần: {weekKey}</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {employees.map(emp => {
          const position = POSITIONS[emp.position];
          const empKpis = kpiData[emp.id] || [];
          const empTasks = taskData[emp.id] || [];
          const taskCompletion = empTasks.length > 0 ? Math.round((empTasks.filter(t => t.completed).length / empTasks.length) * 100) : 0;

          return (
            <Card key={emp.id}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', color: '#111827', fontSize: '16px', fontWeight: '600' }}>{emp.name}</h3>
                  <p style={{ margin: 0, color: '#6b7280', fontSize: '13px' }}>{position?.name}</p>
                </div>
                <span style={{ fontSize: '24px' }}>{position?.icon}</span>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>Tích lũy tác vụ</div>
                <div style={{ height: '8px', backgroundColor: '#f3f4f6', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${taskCompletion}%`, backgroundColor: '#059669', transition: 'width 0.3s' }} />
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{taskCompletion}% ({empTasks.filter(t => t.completed).length}/{empTasks.length})</div>
              </div>

              {empKpis.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {empKpis.slice(0, 2).map(kpi => (
                    <div key={kpi.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                      <span style={{ color: '#6b7280' }}>{kpi.name}</span>
                      <span style={{ fontWeight: '600', color: getStatusColor(kpi.value, kpi.target, kpi.type) }}>
                        {kpi.value}/{kpi.target}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// Add Employee Form
function AddEmployeeForm({ onAdd, onClose }) {
  const [name, setName] = useState('');
  const [position, setPosition] = useState('GV');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name, position);
      setName('');
    }
  };

  return (
    <div style={{ maxWidth: '500px' }}>
      <Card>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#111827' }}>Tên nhân viên</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập tên..."
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#111827' }}>Vị trí</label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            >
              {Object.entries(POSITIONS).map(([key, val]) => (
                <option key={key} value={key}>{val.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Thêm
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#f3f4f6',
                color: '#111827',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Hủy
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// Weekly Setup Page
function WeeklySetupPage({ employees, weekKey }) {
  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <p style={{ color: '#6b7280' }}>Thiết lập KPI và tác vụ cho tuần {weekKey}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
        {employees.map(emp => (
          <WeeklySetupCard key={emp.id} employee={emp} weekKey={weekKey} />
        ))}
      </div>
    </div>
  );
}

// Weekly Setup Card
function WeeklySetupCard({ employee, weekKey }) {
  const [kpis, setKpis] = useState(POSITIONS[employee.position].kpis);
  const [tasks, setTasks] = useState(POSITIONS[employee.position].tasks);
  const position = POSITIONS[employee.position];

  const handleKpiChange = (idx, value) => {
    const updated = [...kpis];
    updated[idx].target = parseFloat(value);
    setKpis(updated);
  };

  const handleSave = async () => {
    try {
      await setDoc(doc(db, 'wowops', `employee_${employee.id}_kpis_${weekKey}`), {
        kpis: kpis.map(k => ({ ...k, value: 0 })),
        weekKey
      });
      await setDoc(doc(db, 'wowops', `employee_${employee.id}_tasks_${weekKey}`), {
        tasks: tasks.map(t => ({ ...t, completed: false })),
        weekKey
      });
      alert('Đã lưu!');
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  return (
    <Card>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 4px 0', color: '#111827', fontSize: '16px', fontWeight: '600' }}>
          {position.icon} {employee.name}
        </h3>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '13px' }}>{position.name}</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ color: '#6b7280', fontSize: '12px', fontWeight: '600', marginBottom: '12px', textTransform: 'uppercase' }}>KPI Mục tiêu</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {kpis.map((kpi, idx) => (
            <div key={kpi.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ flex: 1, fontSize: '13px', color: '#111827' }}>{kpi.name}</span>
              <input
                type="number"
                value={kpi.target}
                onChange={(e) => handleKpiChange(idx, e.target.value)}
                style={{
                  width: '80px',
                  padding: '6px 8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}
              />
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>{kpi.unit}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ color: '#6b7280', fontSize: '12px', fontWeight: '600', marginBottom: '12px', textTransform: 'uppercase' }}>Tác vụ hàng ngày</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {tasks.map((task, idx) => (
            <div key={idx} style={{ padding: '10px', backgroundColor: '#f9fafb', borderRadius: '6px', fontSize: '13px', color: '#111827' }}>
              ✓ {task.name}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        style={{
          width: '100%',
          padding: '10px',
          backgroundColor: '#059669',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontWeight: '600',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        Lưu thiết lập
      </button>
    </Card>
  );
}

// Employee Detail Page
function EmployeeDetailPage({ empId, weekKey, employees }) {
  const [kpis, setKpis] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(true);

  const employee = employees.find(e => e.id === empId);
  const position = POSITIONS[employee?.position];

  useEffect(() => {
    const load = async () => {
      try {
        const kpiRef = doc(db, 'wowops', `employee_${empId}_kpis_${weekKey}`);
        const kpiSnap = await getDoc(kpiRef);
        if (kpiSnap.exists()) setKpis(kpiSnap.data().kpis);

        const taskRef = doc(db, 'wowops', `employee_${empId}_tasks_${weekKey}`);
        const taskSnap = await getDoc(taskRef);
        if (taskSnap.exists()) setTasks(taskSnap.data().tasks);

        const reviewRef = doc(db, 'wowops', `employee_${empId}_review_${weekKey}`);
        const reviewSnap = await getDoc(reviewRef);
        if (reviewSnap.exists()) {
          setFeedback(reviewSnap.data().feedback);
          setRating(reviewSnap.data().rating);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (empId) load();
  }, [empId, weekKey]);

  const handleKpiUpdate = async (kpiId, value) => {
    try {
      const kpiRef = doc(db, 'wowops', `employee_${empId}_kpis_${weekKey}`);
      const updated = kpis.map(k => k.id === kpiId ? { ...k, value: parseFloat(value) } : k);
      await updateDoc(kpiRef, { kpis: updated });
      setKpis(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTaskToggle = async (idx) => {
    try {
      const taskRef = doc(db, 'wowops', `employee_${empId}_tasks_${weekKey}`);
      const updated = [...tasks];
      updated[idx].completed = !updated[idx].completed;
      await updateDoc(taskRef, { tasks: updated });
      setTasks(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveFeedback = async () => {
    try {
      const reviewRef = doc(db, 'wowops', `employee_${empId}_review_${weekKey}`);
      await setDoc(reviewRef, { feedback, rating, date: new Date().toISOString() });
      alert('Đã lưu phản hồi!');
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  if (loading) return <div style={{ color: '#6b7280' }}>Đang tải...</div>;

  return (
    <div style={{ maxWidth: '1000px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '700', color: '#111827' }}>
          {position?.icon} {employee?.name}
        </h2>
        <p style={{ margin: 0, color: '#6b7280' }}>{position?.name} • Tuần {weekKey}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <Card>
          <h3 style={{ margin: '0 0 16px 0', color: '#111827', fontSize: '16px', fontWeight: '600' }}>KPI Tuần này</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {kpis.map(kpi => (
              <div key={kpi.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>{kpi.name}</label>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>{kpi.unit}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    value={kpi.value}
                    onChange={(e) => handleKpiUpdate(kpi.id, e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '13px'
                    }}
                  />
                  <span style={{ fontSize: '12px', color: '#6b7280', minWidth: '40px' }}>Mục: {kpi.target}</span>
                </div>
                <div style={{ height: '6px', backgroundColor: '#f3f4f6', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min((kpi.value / kpi.target) * 100, 100)}%`,
                    backgroundColor: getStatusColor(kpi.value, kpi.target, kpi.type)
                  }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 style={{ margin: '0 0 16px 0', color: '#111827', fontSize: '16px', fontWeight: '600' }}>Tác vụ hàng ngày</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tasks.map((task, idx) => (
              <label key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                backgroundColor: task.completed ? '#f0fdf4' : '#f9fafb',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}>
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => handleTaskToggle(idx)}
                  style={{ marginRight: '12px', cursor: 'pointer' }}
                />
                <span style={{
                  flex: 1,
                  fontSize: '13px',
                  color: task.completed ? '#059669' : '#111827',
                  textDecoration: task.completed ? 'line-through' : 'none'
                }}>
                  {task.name}
                </span>
              </label>
            ))}
          </div>
          <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '6px', fontSize: '12px', color: '#059669', fontWeight: '600' }}>
            {tasks.filter(t => t.completed).length}/{tasks.length} hoàn thành
          </div>
        </Card>
      </div>

      <Card>
        <h3 style={{ margin: '0 0 16px 0', color: '#111827', fontSize: '16px', fontWeight: '600' }}>Phản hồi tuần</h3>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500', color: '#111827' }}>Xếp hạng (1-10)</label>
          <input
            type="number"
            min="1"
            max="10"
            value={rating}
            onChange={(e) => setRating(parseInt(e.target.value))}
            style={{
              width: '80px',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500', color: '#111827' }}>Nhận xét</label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Nhập nhận xét..."
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '13px',
              fontFamily: 'inherit',
              resize: 'vertical',
              minHeight: '100px',
              boxSizing: 'border-box'
            }}
          />
        </div>
        <button
          onClick={handleSaveFeedback}
          style={{
            padding: '10px 20px',
            backgroundColor: '#059669',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Lưu phản hồi
        </button>
      </Card>
    </div>
  );
}

// Reports Page
function ReportsPage({ employees }) {
  const [selectedEmployee, setSelectedEmployee] = useState(employees[0]?.id || '');
  const [kpiHistory, setKpiHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      if (!selectedEmployee) return;
      try {
        setLoading(true);
        const mockData = [
          { week: 'W1', value: 3, target: 5 },
          { week: 'W2', value: 4, target: 5 },
          { week: 'W3', value: 5, target: 5 },
          { week: 'W4', value: 4, target: 5 }
        ];
        setKpiHistory(mockData);
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, [selectedEmployee]);

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#111827' }}>Chọn nhân viên</label>
        <select
          value={selectedEmployee}
          onChange={(e) => setSelectedEmployee(e.target.value)}
          style={{
            padding: '10px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            fontFamily: 'inherit',
            width: '200px'
          }}
        >
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>{emp.name}</option>
          ))}
        </select>
      </div>

      <Card>
        <h3 style={{ margin: '0 0 24px 0', color: '#111827', fontSize: '16px', fontWeight: '600' }}>Xu hướng KPI</h3>
        {loading ? (
          <div style={{ color: '#6b7280' }}>Đang tải...</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={kpiHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="week" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }} />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#059669" name="Thực tế" dot={{ fill: '#059669' }} />
              <Line type="monotone" dataKey="target" stroke="#d1d5db" name="Mục tiêu" strokeDasharray="5 5" dot={{ fill: '#d1d5db' }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}

// Card Component
function Card({ children, style }) {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      border: '1px solid #f3f4f6',
      padding: '20px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      ...style
    }}>
      {children}
    </div>
  );
}
