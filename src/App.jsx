import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, updateDoc, arrayUnion, where, query } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

// Firebase config - EXACT AS PROVIDED
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

// Position KPI definitions - Leading → Lagging Framework
const positionKPIs = {
  'SL': {
    leading: [
      { id: 'calls', name: 'Số cuộc gọi', unit: 'cuộc', target: 8 },
      { id: 'posts', name: 'Số post đăng', unit: 'post', target: 2 },
      { id: 'zalo', name: 'Tin Zalo', unit: 'tin', target: 15 },
      { id: 'followup', name: 'Follow-up khách cũ', unit: 'khách', target: 5 },
      { id: 'tours', name: 'Khách tham quan', unit: 'khách', target: 2 }
    ],
    lagging: [
      { id: 'trial_appts', name: 'Hẹn học thử', unit: 'hẹn', target: 5 },
      { id: 'companion', name: 'Hẹn đồng hành', unit: 'hẹn', target: 3 },
      { id: 'new_students', name: 'HV mới chốt', unit: 'HV', target: 3 },
      { id: 'new_revenue', name: 'DT mới (triệu)', unit: 'M', target: 15 },
      { id: 'retention', name: 'HV tái ĐK', unit: 'HV', target: 5 },
      { id: 'retention_rev', name: 'DT tái ĐK (triệu)', unit: 'M', target: 25 },
      { id: 'churn', name: 'HV không tái ĐK', unit: 'HV', target: 0, lowerBetter: true },
      { id: 'close_rate', name: 'Tỷ lệ chốt', unit: '%', target: 25 }
    ],
    dailyTasks: [
      'Gọi điện khách mới',
      'Follow-up khách cũ',
      'Đăng bài/post',
      'Gửi tin Zalo',
      'Cập nhật báo cáo cuối ngày'
    ]
  },
  'MK': {
    leading: [
      { id: 'edit_video', name: 'Edit video', unit: 'video', target: 3 },
      { id: 'shoot', name: 'Quay sources', unit: 'shot', target: 2 },
      { id: 'chat', name: 'Chat/tin nhắn', unit: 'tin', target: 20 },
      { id: 'post', name: 'Số bài đăng', unit: 'bài', target: 3 },
      { id: 'reply_comment', name: 'Trả lời comment', unit: 'comment', target: 15 }
    ],
    lagging: [
      { id: 'videos_done', name: 'Video hoàn thành', unit: 'video', target: 5 },
      { id: 'leads', name: 'Leads chat', unit: 'lead', target: 20 },
      { id: 'trial_booked', name: 'Học thử hẹn', unit: 'HV', target: 8 },
      { id: 'trial_showed', name: 'Học thử đã lên', unit: 'HV', target: 5 },
      { id: 'engagement', name: 'Engagement rate', unit: '%', target: 5 },
      { id: 'cpl', name: 'Chi phí/lead (K)', unit: 'K', target: 50, lowerBetter: true }
    ],
    dailyTasks: [
      'Quay video/chụp ảnh',
      'Edit và đăng content',
      'Trả lời comment/inbox',
      'Theo dõi ads',
      'Báo cáo kết quả'
    ]
  },
  'GV': {
    leading: [
      { id: 'classes', name: 'Số buổi dạy', unit: 'buổi', target: 2 },
      { id: 'lesson_plans', name: 'Giáo án soạn', unit: 'giáo án', target: 1 },
      { id: 'parent_fb', name: 'Feedback phụ huynh', unit: 'feedback', target: 3 },
      { id: 'support', name: 'HV hỗ trợ riêng', unit: 'HV', target: 2 }
    ],
    lagging: [
      { id: 'satisfaction', name: 'Điểm hài lòng HV', unit: '/10', target: 8 },
      { id: 'attendance', name: 'Tỷ lệ đi học', unit: '%', target: 85 },
      { id: 'retention', name: 'Tỷ lệ tái ĐK', unit: '%', target: 70 }
    ],
    dailyTasks: [
      'Soạn giáo án',
      'Dạy đúng giờ',
      'Chấm bài/feedback',
      'Liên hệ phụ huynh',
      'Báo cáo tình hình lớp'
    ]
  },
  'AD': {
    leading: [
      { id: 'files', name: 'Hồ sơ xử lý', unit: 'hồ sơ', target: 10 },
      { id: 'schedule', name: 'Lịch học điều phối', unit: 'lịch', target: 8 },
      { id: 'facility', name: 'CSVC kiểm tra', unit: 'kiểm tra', target: 3 },
      { id: 'reports', name: 'Báo cáo gửi', unit: 'báo cáo', target: 2 }
    ],
    lagging: [
      { id: 'ontime', name: 'Hoàn thành đúng hạn', unit: '%', target: 95 },
      { id: 'internal_fb', name: 'Phản hồi nội bộ', unit: '/10', target: 8 },
      { id: 'accuracy', name: 'Tỷ lệ chính xác', unit: '%', target: 98 }
    ],
    dailyTasks: [
      'Xử lý hồ sơ',
      'Điều phối lịch học',
      'Kiểm tra cơ sở vật chất',
      'Gửi báo cáo tổng hợp'
    ]
  }
};

const positionNames = {
  'SL': 'Sales/Tư vấn',
  'MK': 'Marketing',
  'GV': 'Giáo viên',
  'AD': 'Admin/Vận hành'
};

// Utility functions
const getWeekKey = (date = new Date()) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const week = Math.ceil((d.getDate() - d.getDay()) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
};

const getDateString = (date = new Date()) => {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

const getWeekDates = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + offset * 7);
  const start = new Date(d);
  start.setDate(start.getDate() + 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
};

const formatDate = (date) => {
  return date.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' });
};

// Loading Skeleton Component
function LoadingSkeleton() {
  return (
    <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
      <div style={{ fontSize: '14px', animation: 'pulse 2s infinite' }}>⏳ Đang tải...</div>
    </div>
  );
}

// Empty State Component
function EmptyState({ message, actionText, onAction }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
      <p style={{ fontSize: '16px', marginBottom: '16px' }}>{message}</p>
      {actionText && (
        <button onClick={onAction} style={styles.primaryBtn}>
          {actionText}
        </button>
      )}
    </div>
  );
}

// Login Screen
function LoginScreen({ onLogin }) {
  const [role, setRole] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (role === 'employee') {
      fetchEmployees();
    }
  }, [role]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const docRef = doc(db, 'wowops', 'employees');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setEmployees(docSnap.data().value || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    if (role === 'manager') {
      onLogin({ role: 'manager' });
    } else if (selectedEmployee) {
      onLogin({ role: 'employee', employeeId: selectedEmployee.id, employeeName: selectedEmployee.name });
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={styles.loginContainer}>
      <div style={styles.loginCard}>
        <div style={styles.logo}>WOW ART</div>
        <h1 style={styles.loginTitle}>Hệ thống quản lý hiệu suất</h1>

        {!role ? (
          <div style={styles.roleButtons}>
            <button
              onClick={() => setRole('manager')}
              style={{ ...styles.roleButton, backgroundColor: '#10b981' }}
            >
              Đăng nhập Quản lý
            </button>
            <button
              onClick={() => setRole('employee')}
              style={{ ...styles.roleButton, backgroundColor: '#3b82f6' }}
            >
              Đăng nhập Nhân viên
            </button>
          </div>
        ) : role === 'manager' ? (
          <div style={styles.formGroup}>
            <button
              onClick={handleLogin}
              style={{ ...styles.loginBtn, backgroundColor: '#10b981' }}
            >
              Vào Dashboard
            </button>
            <button
              onClick={() => setRole(null)}
              style={{ ...styles.loginBtn, backgroundColor: '#6b7280' }}
            >
              Quay lại
            </button>
          </div>
        ) : (
          <div style={styles.formGroup}>
            <label style={styles.label}>Tìm và chọn nhân viên:</label>
            <input
              type="text"
              placeholder="Tìm kiếm tên nhân viên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.input}
            />
            <select
              value={selectedEmployee?.id || ''}
              onChange={(e) => {
                const emp = employees.find(e => e.id === e.target.value);
                setSelectedEmployee(emp);
              }}
              style={styles.select}
            >
              <option value="">-- Chọn nhân viên --</option>
              {filteredEmployees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({positionNames[emp.position]})
                </option>
              ))}
            </select>
            <button
              onClick={handleLogin}
              disabled={!selectedEmployee}
              style={{ ...styles.loginBtn, backgroundColor: selectedEmployee ? '#3b82f6' : '#d1d5db', cursor: selectedEmployee ? 'pointer' : 'not-allowed' }}
            >
              Đăng nhập
            </button>
            <button
              onClick={() => { setRole(null); setSearchTerm(''); setSelectedEmployee(null); }}
              style={{ ...styles.loginBtn, backgroundColor: '#6b7280' }}
            >
              Quay lại
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Manager Dashboard
function ManagerDashboard({ onLogout, onSelectEmployee }) {
  const [employees, setEmployees] = useState([]);
  const [dateOffset, setDateOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeePosition, setNewEmployeePosition] = useState('SL');

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const docRef = doc(db, 'wowops', 'employees');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const emps = docSnap.data().value || [];
        const enrichedEmps = await Promise.all(
          emps.map(async (emp) => {
            try {
              const weekKey = getWeekKey();
              const leadingRef = doc(db, 'wowops', `emp_${emp.id}_leading_${weekKey}`);
              const laggingRef = doc(db, 'wowops', `emp_${emp.id}_lagging_${weekKey}`);
              const tasksRef = doc(db, 'wowops', `emp_${emp.id}_tasks_${getDateString()}`);

              const leadingSnap = await getDoc(leadingRef);
              const laggingSnap = await getDoc(laggingRef);
              const tasksSnap = await getDoc(tasksRef);

              const leadingData = leadingSnap.exists() ? leadingSnap.data().value || {} : {};
              const laggingData = laggingSnap.exists() ? laggingSnap.data().value || {} : {};
              const tasksData = tasksSnap.exists() ? tasksSnap.data().value || [] : [];

              const completedTasks = tasksData.filter(t => t.completed).length;
              const taskCompletion = tasksData.length > 0 ? Math.round((completedTasks / tasksData.length) * 100) : 0;

              const posKPIs = positionKPIs[emp.position];
              const leadingAvg = posKPIs.leading.length > 0
                ? Math.round(Object.values(leadingData).reduce((a, b) => a + b, 0) / posKPIs.leading.length)
                : 0;
              const laggingAvg = posKPIs.lagging.length > 0
                ? Math.round(Object.values(laggingData).reduce((a, b) => a + b, 0) / posKPIs.lagging.length)
                : 0;

              return {
                ...emp,
                taskCompletion,
                leadingAvg,
                laggingAvg,
                leadingData,
                laggingData
              };
            } catch (error) {
              console.error(`Error enriching employee ${emp.id}:`, error);
              return { ...emp, taskCompletion: 0, leadingAvg: 0, laggingAvg: 0, leadingData: {}, laggingData: {} };
            }
          })
        );
        setEmployees(enrichedEmps);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async () => {
    if (!newEmployeeName.trim()) return;

    try {
      const empId = `emp_${Date.now()}`;
      const newEmp = {
        id: empId,
        name: newEmployeeName,
        position: newEmployeePosition,
        createdAt: new Date().toISOString()
      };

      const docRef = doc(db, 'wowops', 'employees');
      const docSnap = await getDoc(docRef);
      const currentEmps = docSnap.exists() ? docSnap.data().value || [] : [];

      await setDoc(docRef, { value: [...currentEmps, newEmp] });

      // Auto-create daily tasks for today
      const dailyTasks = positionKPIs[newEmployeePosition].dailyTasks.map(name => ({
        name,
        completed: false
      }));

      const tasksRef = doc(db, 'wowops', `emp_${empId}_tasks_${getDateString()}`);
      await setDoc(tasksRef, { value: dailyTasks });

      // Initialize empty KPI records
      const weekKey = getWeekKey();
      const emptyLeading = {};
      const emptyLagging = {};

      positionKPIs[newEmployeePosition].leading.forEach(kpi => {
        emptyLeading[kpi.id] = 0;
      });
      positionKPIs[newEmployeePosition].lagging.forEach(kpi => {
        emptyLagging[kpi.id] = 0;
      });

      await setDoc(doc(db, 'wowops', `emp_${empId}_leading_${weekKey}`), { value: emptyLeading });
      await setDoc(doc(db, 'wowops', `emp_${empId}_lagging_${weekKey}`), { value: emptyLagging });
      await setDoc(doc(db, 'wowops', `emp_${empId}_targets`), { value: {} });

      setNewEmployeeName('');
      setNewEmployeePosition('SL');
      setShowAddEmployee(false);
      fetchEmployees();
    } catch (error) {
      console.error('Error adding employee:', error);
      alert('Lỗi: Không thể thêm nhân viên');
    }
  };

  const dateRangeText = dateOffset === 0 ? 'Tuần này' : dateOffset === -1 ? 'Tuần trước' : 'Tháng này';
  const totalTaskCompletion = employees.length > 0 ? Math.round(employees.reduce((a, b) => a + b.taskCompletion, 0) / employees.length) : 0;
  const totalLeadingAvg = employees.length > 0 ? Math.round(employees.reduce((a, b) => a + b.leadingAvg, 0) / employees.length) : 0;
  const totalLaggingAvg = employees.length > 0 ? Math.round(employees.reduce((a, b) => a + b.laggingAvg, 0) / employees.length) : 0;

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <div style={styles.sidebarLogo}>WOW ART Ops</div>
        <nav style={styles.nav}>
          <div style={styles.navItem}>📊 Dashboard</div>
          <div style={styles.navItem}>👥 Nhân viên</div>
          <div style={styles.navItem}>📈 Báo cáo</div>
        </nav>
        <div style={styles.divider} />
        <div style={styles.employeeList}>
          <h3 style={styles.sectionTitle}>Nhân viên</h3>
          {employees.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>Chưa có nhân viên</p>
          ) : (
            employees.map(emp => (
              <div
                key={emp.id}
                onClick={() => onSelectEmployee(emp)}
                style={styles.employeeListItem}
              >
                <span>{emp.name}</span>
                <span style={styles.badge}>{emp.position}</span>
              </div>
            ))
          )}
          <button
            onClick={() => setShowAddEmployee(true)}
            style={styles.addEmployeeBtn}
          >
            + Thêm nhân viên
          </button>
        </div>
        <button onClick={onLogout} style={styles.logoutBtn}>Đăng xuất</button>
      </div>

      <div style={styles.mainContent}>
        <div style={styles.header}>
          <h1 style={styles.pageTitle}>Dashboard</h1>
          <div style={styles.dateButtons}>
            <button
              onClick={() => setDateOffset(0)}
              style={{ ...styles.dateButton, backgroundColor: dateOffset === 0 ? '#10b981' : '#e5e7eb', color: dateOffset === 0 ? 'white' : '#374151' }}
            >
              Tuần này
            </button>
            <button
              onClick={() => setDateOffset(-1)}
              style={{ ...styles.dateButton, backgroundColor: dateOffset === -1 ? '#10b981' : '#e5e7eb', color: dateOffset === -1 ? 'white' : '#374151' }}
            >
              Tuần trước
            </button>
            <button
              onClick={() => setDateOffset(-4)}
              style={{ ...styles.dateButton, backgroundColor: dateOffset === -4 ? '#10b981' : '#e5e7eb', color: dateOffset === -4 ? 'white' : '#374151' }}
            >
              Tháng này
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton />
        ) : employees.length === 0 ? (
          <EmptyState
            message="Chưa có nhân viên nào"
            actionText="Thêm nhân viên đầu tiên"
            onAction={() => setShowAddEmployee(true)}
          />
        ) : (
          <>
            <div style={styles.summaryCards}>
              <div style={styles.summaryCard}>
                <div style={styles.cardLabel}>Tổng nhân viên</div>
                <div style={styles.cardValue}>{employees.length}</div>
              </div>
              <div style={styles.summaryCard}>
                <div style={styles.cardLabel}>Hoàn thành công việc</div>
                <div style={styles.cardValue}>{totalTaskCompletion}%</div>
              </div>
              <div style={styles.summaryCard}>
                <div style={styles.cardLabel}>KPI Hành động</div>
                <div style={styles.cardValue}>{totalLeadingAvg}</div>
              </div>
              <div style={styles.summaryCard}>
                <div style={styles.cardLabel}>KPI Kết quả</div>
                <div style={styles.cardValue}>{totalLaggingAvg}</div>
              </div>
            </div>

            <div style={styles.employeeGrid}>
              {employees.map(emp => (
                <div
                  key={emp.id}
                  onClick={() => onSelectEmployee(emp)}
                  style={styles.employeeCard}
                >
                  <div style={styles.cardHeader}>
                    <h3 style={styles.empName}>{emp.name}</h3>
                    <span style={styles.positionBadge}>{emp.position}</span>
                  </div>
                  <div style={styles.cardMetric}>
                    <span style={styles.metricLabel}>Công việc:</span>
                    <div style={{ ...styles.progressBar, flex: 1 }}>
                      <div
                        style={{
                          ...styles.progressFill,
                          width: `${emp.taskCompletion}%`,
                          backgroundColor: '#3b82f6'
                        }}
                      />
                    </div>
                    <span style={styles.metricValue}>{emp.taskCompletion}%</span>
                  </div>
                  <div style={styles.cardMetric}>
                    <span style={styles.metricLabel}>KPI Hành động:</span>
                    <span style={styles.metricValue}>{emp.leadingAvg}</span>
                  </div>
                  <div style={styles.cardMetric}>
                    <span style={styles.metricLabel}>KPI Kết quả:</span>
                    <span style={styles.metricValue}>{emp.laggingAvg}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showAddEmployee && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>Thêm nhân viên mới</h2>
            <input
              type="text"
              placeholder="Tên nhân viên"
              value={newEmployeeName}
              onChange={(e) => setNewEmployeeName(e.target.value)}
              style={styles.input}
            />
            <select
              value={newEmployeePosition}
              onChange={(e) => setNewEmployeePosition(e.target.value)}
              style={styles.select}
            >
              {Object.entries(positionNames).map(([key, name]) => (
                <option key={key} value={key}>{name}</option>
              ))}
            </select>
            <div style={styles.modalButtons}>
              <button onClick={handleAddEmployee} style={styles.primaryBtn}>
                Thêm nhân viên
              </button>
              <button onClick={() => setShowAddEmployee(false)} style={styles.secondaryBtn}>
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Manager Employee Detail
function EmployeeDetail({ employee, onBack, onLogout }) {
  const [activeTab, setActiveTab] = useState('leading');
  const [leadingData, setLeadingData] = useState({});
  const [laggingData, setLaggingData] = useState({});
  const [customTargets, setCustomTargets] = useState({});
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(5);
  const [editingKPI, setEditingKPI] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(true);

  const posKPIs = positionKPIs[employee.position];

  useEffect(() => {
    fetchData();
  }, [employee.id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const weekKey = getWeekKey();

      const leadingRef = doc(db, 'wowops', `emp_${employee.id}_leading_${weekKey}`);
      const laggingRef = doc(db, 'wowops', `emp_${employee.id}_lagging_${weekKey}`);
      const targetsRef = doc(db, 'wowops', `emp_${employee.id}_targets`);
      const reviewRef = doc(db, 'wowops', `emp_${employee.id}_review_${weekKey}`);

      const leadingSnap = await getDoc(leadingRef);
      const laggingSnap = await getDoc(laggingRef);
      const targetsSnap = await getDoc(targetsRef);
      const reviewSnap = await getDoc(reviewRef);

      setLeadingData(leadingSnap.exists() ? leadingSnap.data().value || {} : {});
      setLaggingData(laggingSnap.exists() ? laggingSnap.data().value || {} : {});
      setCustomTargets(targetsSnap.exists() ? targetsSnap.data().value || {} : {});

      if (reviewSnap.exists()) {
        const reviewData = reviewSnap.data().value;
        setFeedback(reviewData.feedback || '');
        setRating(reviewData.rating || 5);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTarget = (kpiId, currentValue) => {
    setEditingKPI(kpiId);
    setEditValue(currentValue.toString());
  };

  const handleSaveTarget = async (kpiId) => {
    try {
      const newTargets = { ...customTargets, [kpiId]: parseInt(editValue) || 0 };
      const targetsRef = doc(db, 'wowops', `emp_${employee.id}_targets`);
      await setDoc(targetsRef, { value: newTargets });
      setCustomTargets(newTargets);
      setEditingKPI(null);
    } catch (error) {
      console.error('Error saving target:', error);
      alert('Lỗi: Không thể lưu mục tiêu');
    }
  };

  const handleSaveFeedback = async () => {
    try {
      const weekKey = getWeekKey();
      const reviewRef = doc(db, 'wowops', `emp_${employee.id}_review_${weekKey}`);
      await setDoc(reviewRef, {
        value: {
          feedback,
          rating,
          date: new Date().toISOString()
        }
      });
      alert('Lưu feedback thành công!');
    } catch (error) {
      console.error('Error saving feedback:', error);
      alert('Lỗi: Không thể lưu feedback');
    }
  };

  const getTarget = (kpiId, defaultTarget) => {
    return customTargets[kpiId] !== undefined ? customTargets[kpiId] : defaultTarget;
  };

  const renderKPIGrid = (kpis, data) => (
    <div style={styles.kpiGrid}>
      {kpis.map(kpi => {
        const value = data[kpi.id] || 0;
        const target = getTarget(kpi.id, kpi.target);
        const percentage = target > 0 ? Math.min((value / target) * 100, 100) : 0;
        const isEditing = editingKPI === kpi.id;

        return (
          <div key={kpi.id} style={styles.kpiCard}>
            <div style={styles.kpiHeader}>
              <span style={styles.kpiName}>{kpi.name}</span>
              <button
                onClick={() => handleEditTarget(kpi.id, target)}
                style={styles.editBtn}
              >
                ✏️
              </button>
            </div>
            <div style={styles.kpiValue}>
              {value} / {target} {kpi.unit}
            </div>
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${percentage}%`,
                  backgroundColor: percentage >= 100 ? '#10b981' : '#f59e0b'
                }}
              />
            </div>
            {isEditing && (
              <div style={styles.editField}>
                <input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  style={styles.input}
                  placeholder="Nhập mục tiêu mới"
                />
                <button
                  onClick={() => handleSaveTarget(kpi.id)}
                  style={styles.saveBtn}
                >
                  ✓
                </button>
                <button
                  onClick={() => setEditingKPI(null)}
                  style={styles.cancelBtn}
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.sidebar} />
        <div style={styles.mainContent}>
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <div style={styles.sidebarLogo}>WOW ART Ops</div>
        <button onClick={onBack} style={styles.backBtn}>← Quay lại</button>
        <button onClick={onLogout} style={styles.logoutBtn}>Đăng xuất</button>
      </div>

      <div style={styles.mainContent}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.pageTitle}>{employee.name}</h1>
            <p style={styles.subtitle}>{positionNames[employee.position]}</p>
          </div>
        </div>

        <div style={styles.tabBar}>
          {['leading', 'lagging', 'tasks', 'feedback'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                ...styles.tabButton,
                borderBottom: activeTab === tab ? '3px solid #10b981' : 'none',
                color: activeTab === tab ? '#10b981' : '#6b7280'
              }}
            >
              {tab === 'leading' && '📈 KPI Hành động'}
              {tab === 'lagging' && '🎯 KPI Kết quả'}
              {tab === 'tasks' && '✓ Công việc'}
              {tab === 'feedback' && '💬 Feedback'}
            </button>
          ))}
        </div>

        <div style={styles.tabContent}>
          {activeTab === 'leading' && renderKPIGrid(posKPIs.leading, leadingData)}
          {activeTab === 'lagging' && renderKPIGrid(posKPIs.lagging, laggingData)}
          {activeTab === 'tasks' && (
            <EmptyState message="Xem công việc hàng ngày trong giao diện nhân viên" />
          )}
          {activeTab === 'feedback' && (
            <div style={styles.feedbackForm}>
              <h3 style={styles.formTitle}>Feedback cho tuần này</h3>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Nhập feedback cho nhân viên..."
                style={styles.textarea}
              />
              <div style={styles.formGroup}>
                <label style={styles.label}>Đánh giá (1-10):</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={rating}
                  onChange={(e) => setRating(Math.min(10, Math.max(1, parseInt(e.target.value))))}
                  style={styles.input}
                />
              </div>
              <button onClick={handleSaveFeedback} style={styles.primaryBtn}>
                Lưu Feedback
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Employee Interface
function EmployeeInterface({ employeeId, employeeName, onLogout }) {
  const [activeTab, setActiveTab] = useState('tasks');
  const [tasks, setTasks] = useState([]);
  const [leadingData, setLeadingData] = useState({});
  const [laggingData, setLaggingData] = useState({});
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(0);
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [debounceTimer, setDebounceTimer] = useState(null);

  useEffect(() => {
    fetchEmployeeData();
  }, [employeeId]);

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);
      const docRef = doc(db, 'wowops', 'employees');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const emps = docSnap.data().value || [];
        const emp = emps.find(e => e.id === employeeId);
        setEmployee(emp);

        if (emp) {
          const dateStr = getDateString();
          const weekKey = getWeekKey();

          const tasksRef = doc(db, 'wowops', `emp_${employeeId}_tasks_${dateStr}`);
          const leadingRef = doc(db, 'wowops', `emp_${employeeId}_leading_${weekKey}`);
          const laggingRef = doc(db, 'wowops', `emp_${employeeId}_lagging_${weekKey}`);
          const reviewRef = doc(db, 'wowops', `emp_${employeeId}_review_${weekKey}`);

          const tasksSnap = await getDoc(tasksRef);
          const leadingSnap = await getDoc(leadingRef);
          const laggingSnap = await getDoc(laggingRef);
          const reviewSnap = await getDoc(reviewRef);

          setTasks(tasksSnap.exists() ? tasksSnap.data().value || [] : []);
          setLeadingData(leadingSnap.exists() ? leadingSnap.data().value || {} : {});
          setLaggingData(laggingSnap.exists() ? laggingSnap.data().value || {} : {});

          if (reviewSnap.exists()) {
            const reviewData = reviewSnap.data().value;
            setFeedback(reviewData.feedback || '');
            setRating(reviewData.rating || 0);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskToggle = async (index) => {
    try {
      const updatedTasks = [...tasks];
      updatedTasks[index].completed = !updatedTasks[index].completed;

      const dateStr = getDateString();
      const tasksRef = doc(db, 'wowops', `emp_${employeeId}_tasks_${dateStr}`);
      await setDoc(tasksRef, { value: updatedTasks });

      setTasks(updatedTasks);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleKPIChange = async (kpiId, value, type) => {
    const numValue = parseInt(value) || 0;
    const weekKey = getWeekKey();

    if (type === 'leading') {
      const newData = { ...leadingData, [kpiId]: numValue };
      setLeadingData(newData);

      clearTimeout(debounceTimer);
      setDebounceTimer(
        setTimeout(async () => {
          try {
            const ref = doc(db, 'wowops', `emp_${employeeId}_leading_${weekKey}`);
            await setDoc(ref, { value: newData });
          } catch (error) {
            console.error('Error saving KPI:', error);
          }
        }, 500)
      );
    } else {
      const newData = { ...laggingData, [kpiId]: numValue };
      setLaggingData(newData);

      clearTimeout(debounceTimer);
      setDebounceTimer(
        setTimeout(async () => {
          try {
            const ref = doc(db, 'wowops', `emp_${employeeId}_lagging_${weekKey}`);
            await setDoc(ref, { value: newData });
          } catch (error) {
            console.error('Error saving KPI:', error);
          }
        }, 500)
      );
    }
  };

  if (!employee || loading) {
    return (
      <div style={styles.container}>
        <div style={styles.sidebar} />
        <div style={styles.mainContent}>
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  const posKPIs = positionKPIs[employee.position];
  const taskCompletion = tasks.length > 0
    ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100)
    : 0;

  const leadingChartData = posKPIs.leading.map(kpi => ({
    name: kpi.name.substring(0, 12),
    actual: leadingData[kpi.id] || 0,
    target: kpi.target
  }));

  const laggingChartData = posKPIs.lagging.map(kpi => ({
    name: kpi.name.substring(0, 12),
    actual: laggingData[kpi.id] || 0,
    target: kpi.target
  }));

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <div style={styles.sidebarLogo}>WOW ART Ops</div>
        <div style={styles.empHeader}>
          <div style={styles.empName}>{employee.name}</div>
          <div style={styles.empPosition}>{positionNames[employee.position]}</div>
        </div>
        <nav style={styles.nav}>
          <button
            onClick={() => setActiveTab('tasks')}
            style={{
              ...styles.navItem,
              backgroundColor: activeTab === 'tasks' ? 'rgba(255,255,255,0.2)' : 'transparent'
            }}
          >
            ✓ Tasks hôm nay
          </button>
          <button
            onClick={() => setActiveTab('kpi')}
            style={{
              ...styles.navItem,
              backgroundColor: activeTab === 'kpi' ? 'rgba(255,255,255,0.2)' : 'transparent'
            }}
          >
            📊 Nhập KPI
          </button>
          <button
            onClick={() => setActiveTab('progress')}
            style={{
              ...styles.navItem,
              backgroundColor: activeTab === 'progress' ? 'rgba(255,255,255,0.2)' : 'transparent'
            }}
          >
            📈 Tiến độ
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            style={{
              ...styles.navItem,
              backgroundColor: activeTab === 'feedback' ? 'rgba(255,255,255,0.2)' : 'transparent'
            }}
          >
            💬 Feedback
          </button>
        </nav>
        <button onClick={onLogout} style={styles.logoutBtn}>Đăng xuất</button>
      </div>

      <div style={styles.mainContent}>
        <div style={styles.header}>
          <h1 style={styles.pageTitle}>
            {activeTab === 'tasks' && 'Tasks hôm nay'}
            {activeTab === 'kpi' && 'Nhập KPI'}
            {activeTab === 'progress' && 'Tiến độ'}
            {activeTab === 'feedback' && 'Feedback'}
          </h1>
          <p style={styles.dateDisplay}>{formatDate(new Date())}</p>
        </div>

        {activeTab === 'tasks' && (
          <div style={styles.tasksSection}>
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${taskCompletion}%`,
                  backgroundColor: '#3b82f6'
                }}
              />
            </div>
            <p style={styles.progressText}>{taskCompletion}% hoàn thành</p>

            {tasks.length === 0 ? (
              <EmptyState message="Không có công việc hôm nay" />
            ) : (
              <div style={styles.tasksList}>
                {tasks.map((task, index) => (
                  <div key={index} style={styles.taskItem}>
                    <input
                      type="checkbox"
                      checked={tas
