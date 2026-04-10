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

// ========== AUTH HELPERS ==========
const hashPassword = async (password) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(`wowart_salt_${password}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

const getManagerAuth = async () => {
  try {
    const ref = doc(db, 'wowops', 'auth');
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data().value || null : null;
  } catch (e) {
    console.error('getManagerAuth error', e);
    return null;
  }
};

const setManagerAuth = async (passwordHash) => {
  const ref = doc(db, 'wowops', 'auth');
  await setDoc(ref, { value: { managerPasswordHash: passwordHash, updatedAt: new Date().toISOString() } });
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
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [managerAuthState, setManagerAuthState] = useState(null); // null | 'setup' | 'login'
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  // Khi chọn role, load data tương ứng
  useEffect(() => {
    setErrorMsg('');
    setPassword('');
    setConfirmPassword('');
    if (role === 'manager') {
      checkManagerAuth();
    } else if (role === 'employee') {
      fetchEmployees();
    }
  }, [role]);

  const checkManagerAuth = async () => {
    setLoading(true);
    const auth = await getManagerAuth();
    if (!auth || !auth.managerPasswordHash) {
      setManagerAuthState('setup');
    } else {
      setManagerAuthState('login');
    }
    setLoading(false);
  };

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

  const handleManagerSetup = async () => {
    setErrorMsg('');
    if (password.length < 6) {
      setErrorMsg('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp');
      return;
    }
    try {
      setSubmitting(true);
      const hash = await hashPassword(password);
      await setManagerAuth(hash);
      onLogin({ role: 'manager' });
    } catch (e) {
      console.error(e);
      setErrorMsg('Lỗi khi khởi tạo mật khẩu. Thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleManagerLogin = async () => {
    setErrorMsg('');
    if (!password) {
      setErrorMsg('Vui lòng nhập mật khẩu');
      return;
    }
    try {
      setSubmitting(true);
      const auth = await getManagerAuth();
      const hash = await hashPassword(password);
      if (auth?.managerPasswordHash === hash) {
        onLogin({ role: 'manager' });
      } else {
        setErrorMsg('Sai mật khẩu quản lý');
      }
    } catch (e) {
      setErrorMsg('Lỗi đăng nhập. Thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmployeeLogin = async () => {
    setErrorMsg('');
    const emp = employees.find(x => x.id === selectedEmployeeId);
    if (!emp) {
      setErrorMsg('Vui lòng chọn nhân viên');
      return;
    }
    if (!emp.passwordHash) {
      setErrorMsg('Tài khoản chưa được cấp mật khẩu. Liên hệ quản lý.');
      return;
    }
    if (!password) {
      setErrorMsg('Vui lòng nhập mật khẩu');
      return;
    }
    try {
      setSubmitting(true);
      const hash = await hashPassword(password);
      if (emp.passwordHash === hash) {
        onLogin({ role: 'employee', employeeId: emp.id, employeeName: emp.name });
      } else {
        setErrorMsg('Sai mật khẩu nhân viên');
      }
    } catch (e) {
      setErrorMsg('Lỗi đăng nhập. Thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetAll = () => {
    setRole(null);
    setSelectedEmployeeId('');
    setSearchTerm('');
    setPassword('');
    setConfirmPassword('');
    setErrorMsg('');
    setManagerAuthState(null);
  };

  return (
    <div style={styles.loginContainer}>
      <div style={styles.loginCard}>
        <div style={styles.logo}>WOW ART</div>
        <h1 style={styles.loginTitle}>Hệ thống quản lý hiệu suất</h1>

        {!role && (
          <div style={styles.roleButtons}>
            <button
              onClick={() => setRole('manager')}
              style={{ ...styles.roleButton, backgroundColor: '#10b981' }}
            >
              🛡️ Đăng nhập Quản lý
            </button>
            <button
              onClick={() => setRole('employee')}
              style={{ ...styles.roleButton, backgroundColor: '#3b82f6' }}
            >
              👤 Đăng nhập Nhân viên
            </button>
          </div>
        )}

        {role === 'manager' && loading && <LoadingSkeleton />}

        {role === 'manager' && !loading && managerAuthState === 'setup' && (
          <div style={styles.formGroup}>
            <div style={styles.infoBox}>
              🔐 Đây là lần đầu sử dụng. Vui lòng tạo mật khẩu quản lý.
            </div>
            <label style={styles.label}>Mật khẩu mới (tối thiểu 6 ký tự)</label>
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="••••••"
              autoFocus
            />
            <label style={styles.label}>Xác nhận mật khẩu</label>
            <input
              type={showPwd ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManagerSetup()}
              style={styles.input}
              placeholder="••••••"
            />
            <label style={styles.checkRow}>
              <input type="checkbox" checked={showPwd} onChange={() => setShowPwd(!showPwd)} /> Hiện mật khẩu
            </label>
            {errorMsg && <div style={styles.errorBox}>{errorMsg}</div>}
            <button
              onClick={handleManagerSetup}
              disabled={submitting}
              style={{ ...styles.loginBtn, backgroundColor: '#10b981' }}
            >
              {submitting ? 'Đang tạo...' : 'Tạo mật khẩu & Đăng nhập'}
            </button>
            <button onClick={resetAll} style={{ ...styles.loginBtn, backgroundColor: '#6b7280' }}>
              Quay lại
            </button>
          </div>
        )}

        {role === 'manager' && !loading && managerAuthState === 'login' && (
          <div style={styles.formGroup}>
            <label style={styles.label}>Mật khẩu quản lý</label>
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManagerLogin()}
              style={styles.input}
              placeholder="••••••"
              autoFocus
            />
            <label style={styles.checkRow}>
              <input type="checkbox" checked={showPwd} onChange={() => setShowPwd(!showPwd)} /> Hiện mật khẩu
            </label>
            {errorMsg && <div style={styles.errorBox}>{errorMsg}</div>}
            <button
              onClick={handleManagerLogin}
              disabled={submitting}
              style={{ ...styles.loginBtn, backgroundColor: '#10b981' }}
            >
              {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
            <button onClick={resetAll} style={{ ...styles.loginBtn, backgroundColor: '#6b7280' }}>
              Quay lại
            </button>
          </div>
        )}

        {role === 'employee' && (
          <div style={styles.formGroup}>
            <label style={styles.label}>Tìm và chọn nhân viên</label>
            <input
              type="text"
              placeholder="🔍 Tìm kiếm tên nhân viên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.input}
            />
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              style={styles.select}
            >
              <option value="">-- Chọn nhân viên --</option>
              {filteredEmployees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({positionNames[emp.position] || emp.position})
                </option>
              ))}
            </select>
            <label style={styles.label}>Mật khẩu</label>
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEmployeeLogin()}
              style={styles.input}
              placeholder="••••••"
            />
            <label style={styles.checkRow}>
              <input type="checkbox" checked={showPwd} onChange={() => setShowPwd(!showPwd)} /> Hiện mật khẩu
            </label>
            {errorMsg && <div style={styles.errorBox}>{errorMsg}</div>}
            <button
              onClick={handleEmployeeLogin}
              disabled={submitting || !selectedEmployeeId}
              style={{
                ...styles.loginBtn,
                backgroundColor: (selectedEmployeeId && !submitting) ? '#3b82f6' : '#d1d5db',
                cursor: (selectedEmployeeId && !submitting) ? 'pointer' : 'not-allowed'
              }}
            >
              {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
            <button onClick={resetAll} style={{ ...styles.loginBtn, backgroundColor: '#6b7280' }}>
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
  const [newEmployeePassword, setNewEmployeePassword] = useState('');

  const [search, setSearch] = useState('');
  const [activeView, setActiveView] = useState('dashboard'); // dashboard | employees | settings

  // Password modal state
  const [pwdModal, setPwdModal] = useState(null); // { employee }
  const [newPwd, setNewPwd] = useState('');
  const [pwdError, setPwdError] = useState('');

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { employee }

  // Settings - change manager password
  const [oldMgrPwd, setOldMgrPwd] = useState('');
  const [newMgrPwd, setNewMgrPwd] = useState('');
  const [confirmMgrPwd, setConfirmMgrPwd] = useState('');
  const [settingsMsg, setSettingsMsg] = useState('');

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
    if (!newEmployeeName.trim()) {
      alert('Vui lòng nhập tên nhân viên');
      return;
    }
    if (!newEmployeePassword || newEmployeePassword.length < 6) {
      alert('Mật khẩu nhân viên tối thiểu 6 ký tự');
      return;
    }

    try {
      const empId = `emp_${Date.now()}`;
      const passwordHash = await hashPassword(newEmployeePassword);
      const newEmp = {
        id: empId,
        name: newEmployeeName.trim(),
        position: newEmployeePosition,
        passwordHash,
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
      setNewEmployeePassword('');
      setShowAddEmployee(false);
      fetchEmployees();
    } catch (error) {
      console.error('Error adding employee:', error);
      alert('Lỗi: Không thể thêm nhân viên');
    }
  };

  const handleDeleteEmployee = async (emp) => {
    try {
      const docRef = doc(db, 'wowops', 'employees');
      const docSnap = await getDoc(docRef);
      const currentEmps = docSnap.exists() ? docSnap.data().value || [] : [];
      const updated = currentEmps.filter(e => e.id !== emp.id);
      await setDoc(docRef, { value: updated });
      setDeleteConfirm(null);
      fetchEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert('Lỗi: Không thể xóa nhân viên');
    }
  };

  const handleResetPassword = async () => {
    setPwdError('');
    if (!newPwd || newPwd.length < 6) {
      setPwdError('Mật khẩu tối thiểu 6 ký tự');
      return;
    }
    try {
      const passwordHash = await hashPassword(newPwd);
      const docRef = doc(db, 'wowops', 'employees');
      const docSnap = await getDoc(docRef);
      const currentEmps = docSnap.exists() ? docSnap.data().value || [] : [];
      const updated = currentEmps.map(e =>
        e.id === pwdModal.employee.id ? { ...e, passwordHash, passwordUpdatedAt: new Date().toISOString() } : e
      );
      await setDoc(docRef, { value: updated });
      setPwdModal(null);
      setNewPwd('');
      alert(`✅ Đã đặt mật khẩu mới cho ${pwdModal.employee.name}`);
      fetchEmployees();
    } catch (error) {
      console.error('Error resetting password:', error);
      setPwdError('Lỗi khi đặt mật khẩu');
    }
  };

  const handleChangeManagerPassword = async () => {
    setSettingsMsg('');
    if (!oldMgrPwd || !newMgrPwd || !confirmMgrPwd) {
      setSettingsMsg('❌ Vui lòng điền đầy đủ các trường');
      return;
    }
    if (newMgrPwd.length < 6) {
      setSettingsMsg('❌ Mật khẩu mới tối thiểu 6 ký tự');
      return;
    }
    if (newMgrPwd !== confirmMgrPwd) {
      setSettingsMsg('❌ Mật khẩu xác nhận không khớp');
      return;
    }
    try {
      const auth = await getManagerAuth();
      const oldHash = await hashPassword(oldMgrPwd);
      if (auth?.managerPasswordHash !== oldHash) {
        setSettingsMsg('❌ Mật khẩu cũ không đúng');
        return;
      }
      const newHash = await hashPassword(newMgrPwd);
      await setManagerAuth(newHash);
      setSettingsMsg('✅ Đã đổi mật khẩu quản lý thành công');
      setOldMgrPwd('');
      setNewMgrPwd('');
      setConfirmMgrPwd('');
    } catch (e) {
      setSettingsMsg('❌ Lỗi khi đổi mật khẩu');
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(search.toLowerCase())
  );

  const dateRangeText = dateOffset === 0 ? 'Tuần này' : dateOffset === -1 ? 'Tuần trước' : 'Tháng này';
  const totalTaskCompletion = employees.length > 0 ? Math.round(employees.reduce((a, b) => a + b.taskCompletion, 0) / employees.length) : 0;
  const totalLeadingAvg = employees.length > 0 ? Math.round(employees.reduce((a, b) => a + b.leadingAvg, 0) / employees.length) : 0;
  const totalLaggingAvg = employees.length > 0 ? Math.round(employees.reduce((a, b) => a + b.laggingAvg, 0) / employees.length) : 0;

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <div style={styles.sidebarLogo}>WOW ART Ops</div>
        <nav style={styles.nav}>
          <button
            onClick={() => setActiveView('dashboard')}
            style={{ ...styles.navItem, backgroundColor: activeView === 'dashboard' ? 'rgba(255,255,255,0.2)' : 'transparent' }}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => setActiveView('employees')}
            style={{ ...styles.navItem, backgroundColor: activeView === 'employees' ? 'rgba(255,255,255,0.2)' : 'transparent' }}
          >
            👥 Quản lý nhân viên
          </button>
          <button
            onClick={() => setActiveView('settings')}
            style={{ ...styles.navItem, backgroundColor: activeView === 'settings' ? 'rgba(255,255,255,0.2)' : 'transparent' }}
          >
            ⚙️ Cài đặt
          </button>
        </nav>
        <div style={styles.divider} />
        <div style={styles.employeeList}>
          <h3 style={styles.sectionTitle}>Danh sách nhanh</h3>
          {employees.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>Chưa có nhân viên</p>
          ) : (
            employees.slice(0, 8).map(emp => (
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
        {/* ====== DASHBOARD VIEW ====== */}
        {activeView === 'dashboard' && (
          <>
            <div style={styles.header}>
              <div>
                <h1 style={styles.pageTitle}>Dashboard</h1>
                <p style={styles.subtitle}>Tổng quan hiệu suất đội ngũ WOW ART</p>
              </div>
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
                    <div key={emp.id} style={styles.employeeCard}>
                      <div style={styles.cardHeader}>
                        <h3 style={styles.empName} onClick={() => onSelectEmployee(emp)}>{emp.name}</h3>
                        <span style={styles.positionBadge}>{emp.position}</span>
                      </div>
                      <div onClick={() => onSelectEmployee(emp)} style={{ cursor: 'pointer' }}>
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
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ====== EMPLOYEES VIEW ====== */}
        {activeView === 'employees' && (
          <>
            <div style={styles.header}>
              <div>
                <h1 style={styles.pageTitle}>Quản lý nhân viên</h1>
                <p style={styles.subtitle}>Thêm, xóa, đặt lại mật khẩu cho nhân viên</p>
              </div>
              <button onClick={() => setShowAddEmployee(true)} style={{ ...styles.primaryBtn, flex: 'none' }}>
                + Thêm nhân viên
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <input
                type="text"
                placeholder="🔍 Tìm kiếm tên nhân viên..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ ...styles.input, width: '100%', maxWidth: 400 }}
              />
            </div>

            {loading ? (
              <LoadingSkeleton />
            ) : filteredEmployees.length === 0 ? (
              <EmptyState message={employees.length === 0 ? "Chưa có nhân viên nào" : "Không tìm thấy nhân viên phù hợp"} />
            ) : (
              <div style={styles.empTable}>
                <div style={styles.empTableHeader}>
                  <div style={{ flex: 2 }}>Tên nhân viên</div>
                  <div style={{ flex: 1 }}>Vị trí</div>
                  <div style={{ flex: 1 }}>Mật khẩu</div>
                  <div style={{ flex: 1, textAlign: 'right' }}>Thao tác</div>
                </div>
                {filteredEmployees.map(emp => (
                  <div key={emp.id} style={styles.empTableRow}>
                    <div style={{ flex: 2, fontWeight: 600 }}>{emp.name}</div>
                    <div style={{ flex: 1 }}>
                      <span style={styles.positionBadge}>{positionNames[emp.position] || emp.position}</span>
                    </div>
                    <div style={{ flex: 1, fontSize: 12, color: emp.passwordHash ? '#10b981' : '#ef4444' }}>
                      {emp.passwordHash ? '✓ Đã cấp' : '✗ Chưa cấp'}
                    </div>
                    <div style={{ flex: 1, display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => onSelectEmployee(emp)}
                        style={styles.actionBtn}
                        title="Xem chi tiết"
                      >
                        👁 Xem
                      </button>
                      <button
                        onClick={() => { setPwdModal({ employee: emp }); setNewPwd(''); setPwdError(''); }}
                        style={{ ...styles.actionBtn, backgroundColor: '#fef3c7', color: '#92400e' }}
                        title="Đặt lại mật khẩu"
                      >
                        🔑 Đổi MK
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ employee: emp })}
                        style={{ ...styles.actionBtn, backgroundColor: '#fee2e2', color: '#991b1b' }}
                        title="Xóa nhân viên"
                      >
                        🗑 Xóa
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ====== SETTINGS VIEW ====== */}
        {activeView === 'settings' && (
          <>
            <div style={styles.header}>
              <div>
                <h1 style={styles.pageTitle}>Cài đặt</h1>
                <p style={styles.subtitle}>Quản lý mật khẩu và tùy chọn hệ thống</p>
              </div>
            </div>

            <div style={styles.settingsCard}>
              <h3 style={styles.formTitle}>🔐 Đổi mật khẩu quản lý</h3>
              <div style={styles.formGroup}>
                <label style={styles.label}>Mật khẩu hiện tại</label>
                <input
                  type="password"
                  value={oldMgrPwd}
                  onChange={(e) => setOldMgrPwd(e.target.value)}
                  style={styles.input}
                  placeholder="••••••"
                />
                <label style={styles.label}>Mật khẩu mới (tối thiểu 6 ký tự)</label>
                <input
                  type="password"
                  value={newMgrPwd}
                  onChange={(e) => setNewMgrPwd(e.target.value)}
                  style={styles.input}
                  placeholder="••••••"
                />
                <label style={styles.label}>Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  value={confirmMgrPwd}
                  onChange={(e) => setConfirmMgrPwd(e.target.value)}
                  style={styles.input}
                  placeholder="••••••"
                />
                {settingsMsg && (
                  <div style={settingsMsg.startsWith('✅') ? styles.successBox : styles.errorBox}>
                    {settingsMsg}
                  </div>
                )}
                <button onClick={handleChangeManagerPassword} style={{ ...styles.primaryBtn, maxWidth: 240 }}>
                  Đổi mật khẩu
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ====== ADD EMPLOYEE MODAL ====== */}
      {showAddEmployee && (
        <div style={styles.modalOverlay} onClick={() => setShowAddEmployee(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Thêm nhân viên mới</h2>
            <div style={styles.formGroup}>
              <label style={styles.label}>Tên nhân viên</label>
              <input
                type="text"
                placeholder="VD: Nguyễn Văn A"
                value={newEmployeeName}
                onChange={(e) => setNewEmployeeName(e.target.value)}
                style={styles.input}
                autoFocus
              />
              <label style={styles.label}>Vị trí</label>
              <select
                value={newEmployeePosition}
                onChange={(e) => setNewEmployeePosition(e.target.value)}
                style={styles.select}
              >
                {Object.entries(positionNames).map(([key, name]) => (
                  <option key={key} value={key}>{name}</option>
                ))}
              </select>
              <label style={styles.label}>Mật khẩu đăng nhập (tối thiểu 6 ký tự)</label>
              <input
                type="text"
                placeholder="••••••"
                value={newEmployeePassword}
                onChange={(e) => setNewEmployeePassword(e.target.value)}
                style={styles.input}
              />
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                💡 Hãy cung cấp mật khẩu này cho nhân viên để họ có thể đăng nhập.
              </div>
            </div>
            <div style={styles.modalButtons}>
              <button onClick={handleAddEmployee} style={styles.primaryBtn}>
                Thêm nhân viên
              </button>
              <button
                onClick={() => { setShowAddEmployee(false); setNewEmployeeName(''); setNewEmployeePassword(''); }}
                style={styles.secondaryBtn}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== PASSWORD RESET MODAL ====== */}
      {pwdModal && (
        <div style={styles.modalOverlay} onClick={() => setPwdModal(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>🔑 Đặt lại mật khẩu</h2>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
              Nhân viên: <strong style={{ color: '#1f2937' }}>{pwdModal.employee.name}</strong>
            </p>
            <div style={styles.formGroup}>
              <label style={styles.label}>Mật khẩu mới (tối thiểu 6 ký tự)</label>
              <input
                type="text"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                style={styles.input}
                placeholder="••••••"
                autoFocus
              />
              {pwdError && <div style={styles.errorBox}>{pwdError}</div>}
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                ⚠️ Sau khi lưu, hãy thông báo mật khẩu mới cho nhân viên.
              </div>
            </div>
            <div style={styles.modalButtons}>
              <button onClick={handleResetPassword} style={styles.primaryBtn}>
                Lưu mật khẩu
              </button>
              <button onClick={() => { setPwdModal(null); setNewPwd(''); setPwdError(''); }} style={styles.secondaryBtn}>
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== DELETE CONFIRM MODAL ====== */}
      {deleteConfirm && (
        <div style={styles.modalOverlay} onClick={() => setDeleteConfirm(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ ...styles.modalTitle, color: '#dc2626' }}>🗑 Xóa nhân viên</h2>
            <p style={{ fontSize: 14, color: '#374151', marginBottom: 20, lineHeight: 1.6 }}>
              Bạn có chắc muốn xóa <strong>{deleteConfirm.employee.name}</strong>?
              <br />
              <span style={{ color: '#dc2626', fontSize: 13 }}>
                ⚠️ Hành động này không thể hoàn tác. Dữ liệu KPI và task của nhân viên vẫn được giữ lại nhưng sẽ không thể truy cập.
              </span>
            </p>
            <div style={styles.modalButtons}>
              <button
                onClick={() => handleDeleteEmployee(deleteConfirm.employee)}
                style={{ ...styles.primaryBtn, backgroundColor: '#dc2626' }}
              >
                Xác nhận xóa
              </button>
              <button onClick={() => setDeleteConfirm(null)} style={styles.secondaryBtn}>
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
                      checked={task.completed}
                      onChange={() => handleTaskToggle(index)}
                      style={styles.checkbox}
                    />
                    <span style={{
                      ...styles.taskName,
                      textDecoration: task.completed ? 'line-through' : 'none',
                      color: task.completed ? '#9ca3af' : '#1f2937'
                    }}>
                      {task.name}
                    </span>
                    <span style={{
                      ...styles.taskStatus,
                      backgroundColor: task.completed ? '#d1fae5' : '#fef3c7',
                      color: task.completed ? '#065f46' : '#92400e'
                    }}>
                      {task.completed ? 'Xong' : 'Chưa'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'kpi' && (
          <div style={styles.kpiInputSection}>
            <div style={styles.kpiSection}>
              <h3 style={{
                ...styles.sectionTitle,
                borderLeft: '4px solid #3b82f6',
                paddingLeft: '12px',
                marginBottom: '16px'
              }}>
                📈 Chỉ số hành động (Leading)
              </h3>
              <div style={styles.inputGrid}>
                {posKPIs.leading.map(kpi => (
                  <div key={kpi.id} style={styles.inputCard}>
                    <label style={styles.label}>{kpi.name}</label>
                    <input
                      type="number"
                      value={leadingData[kpi.id] || ''}
                      onChange={(e) => handleKPIChange(kpi.id, e.target.value, 'leading')}
                      placeholder="0"
                      style={styles.input}
                    />
                    <div style={styles.targetDisplay}>
                      Mục tiêu: {kpi.target} {kpi.unit}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.kpiSection}>
              <h3 style={{
                ...styles.sectionTitle,
                borderLeft: '4px solid #10b981',
                paddingLeft: '12px',
                marginBottom: '16px'
              }}>
                🎯 Chỉ số kết quả (Lagging)
              </h3>
              <div style={styles.inputGrid}>
                {posKPIs.lagging.map(kpi => (
                  <div key={kpi.id} style={styles.inputCard}>
                    <label style={styles.label}>{kpi.name}</label>
                    <input
                      type="number"
                      value={laggingData[kpi.id] || ''}
                      onChange={(e) => handleKPIChange(kpi.id, e.target.value, 'lagging')}
                      placeholder="0"
                      style={styles.input}
                    />
                    <div style={styles.targetDisplay}>
                      Mục tiêu: {kpi.target} {kpi.unit}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'progress' && (
          <div style={styles.progressSection}>
            <h3 style={styles.chartTitle}>📈 Tiến độ KPI hành động</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={leadingChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" style={{ fontSize: '12px' }} />
                <YAxis />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px' }} />
                <Legend />
                <Bar dataKey="actual" fill="#3b82f6" name="Thực hiện" radius={[4, 4, 0, 0]} />
                <Bar dataKey="target" fill="#d1d5db" name="Mục tiêu" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            <h3 style={styles.chartTitle}>🎯 Tiến độ KPI kết quả</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={laggingChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" style={{ fontSize: '12px' }} />
                <YAxis />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px' }} />
                <Legend />
                <Bar dataKey="actual" fill="#10b981" name="Thực hiện" radius={[4, 4, 0, 0]} />
                <Bar dataKey="target" fill="#d1d5db" name="Mục tiêu" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'feedback' && (
          <div style={styles.feedbackSection}>
            {feedback ? (
              <>
                <h3 style={styles.sectionTitle}>Feedback từ quản lý</h3>
                <div style={styles.feedbackDisplay}>
                  <p style={styles.feedbackText}>{feedback}</p>
                  <div style={styles.feedbackRating}>
                    <span style={styles.ratingLabel}>Đánh giá:</span>
                    <span style={styles.ratingValue}>{rating}/10</span>
                  </div>
                </div>
              </>
            ) : (
              <EmptyState message="Chưa có feedback cho tuần này" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Main App Component
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  if (!currentUser) {
    return <LoginScreen onLogin={setCurrentUser} />;
  }

  if (currentUser.role === 'manager') {
    if (selectedEmployee) {
      return (
        <EmployeeDetail
          employee={selectedEmployee}
          onBack={() => setSelectedEmployee(null)}
          onLogout={() => setCurrentUser(null)}
        />
      );
    }
    return (
      <ManagerDashboard
        onLogout={() => setCurrentUser(null)}
        onSelectEmployee={setSelectedEmployee}
      />
    );
  }

  return (
    <EmployeeInterface
      employeeId={currentUser.employeeId}
      employeeName={currentUser.employeeName}
      onLogout={() => setCurrentUser(null)}
    />
  );
}

// Comprehensive Styles - All Inline
const styles = {
  // Login
  loginContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    padding: '20px'
  },
  loginCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '40px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    maxWidth: '400px',
    width: '100%'
  },
  logo: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#065f46',
    textAlign: 'center',
    marginBottom: '20px',
    letterSpacing: '2px'
  },
  loginTitle: {
    fontSize: '18px',
    color: '#374151',
    textAlign: 'center',
    marginBottom: '30px',
    fontWeight: '500'
  },
  roleButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  roleButton: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  loginBtn: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.3s',
    marginBottom: '8px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '4px'
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit'
  },
  select: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    backgroundColor: 'white',
    cursor: 'pointer'
  },

  // Layout
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  },
  sidebar: {
    width: '260px',
    backgroundColor: '#065f46',
    color: 'white',
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    left: 0,
    top: 0,
    height: '100vh',
    overflowY: 'auto'
  },
  sidebarLogo: {
    fontSize: '18px',
    fontWeight: '700',
    marginBottom: '32px',
    letterSpacing: '1px'
  },
  empHeader: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '24px'
  },
  empName: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '4px'
  },
  empPosition: {
    fontSize: '12px',
    opacity: '0.8'
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  navItem: {
    padding: '10px 12px',
    borderRadius: '6px',
    fontSize: '14px',
    color: 'white',
    cursor: 'pointer',
    border: 'none',
    background: 'transparent',
    textAlign: 'left',
    transition: 'all 0.2s'
  },
  divider: {
    height: '1px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    margin: '16px 0'
  },
  employeeList: {
    flex: 1
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '12px'
  },
  employeeListItem: {
    padding: '10px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    color: 'white',
    cursor: 'pointer',
    marginBottom: '6px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'all 0.2s'
  },
  badge: {
    fontSize: '11px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: '2px 6px',
    borderRadius: '4px'
  },
  addEmployeeBtn: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    border: '1px dashed rgba(255,255,255,0.3)',
    borderRadius: '6px',
    color: 'white',
    fontSize: '13px',
    cursor: 'pointer',
    marginTop: '12px'
  },
  backBtn: {
    padding: '10px 12px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    marginBottom: '12px',
    width: '100%',
    textAlign: 'center'
  },
  logoutBtn: {
    padding: '10px 12px',
    backgroundColor: '#dc2626',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    width: '100%',
    marginTop: 'auto'
  },
  mainContent: {
    flex: 1,
    marginLeft: '260px',
    padding: '32px'
  },
  header: {
    marginBottom: '32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  pageTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1f2937',
    margin: '0'
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '4px 0 0 0'
  },
  dateDisplay: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0'
  },
  dateButtons: {
    display: 'flex',
    gap: '8px'
  },
  dateButton: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },

  // Cards
  summaryCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '32px'
  },
  summaryCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  cardLabel: {
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px'
  },
  cardValue: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#10b981'
  },
  employeeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px'
  },
  employeeCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  positionBadge: {
    fontSize: '11px',
    fontWeight: '700',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    padding: '4px 8px',
    borderRadius: '4px'
  },
  cardMetric: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
    fontSize: '13px'
  },
  metricLabel: {
    color: '#6b7280',
    fontWeight: '600',
    minWidth: '90px'
  },
  metricValue: {
    fontWeight: '700',
    color: '#1f2937'
  },
  progressBar: {
    height: '6px',
    backgroundColor: '#e5e7eb',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    transition: 'width 0.3s'
  },

  // KPI Cards
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '16px'
  },
  kpiCard: {
    backgroundColor: 'white',
    padding: '16px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  kpiHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  kpiName: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151'
  },
  editBtn: {
    background: 'none',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '4px 8px'
  },
  kpiValue: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#10b981',
    marginBottom: '8px'
  },
  editField: {
    display: 'flex',
    gap: '4px',
    marginTop: '8px'
  },
  saveBtn: {
    padding: '6px 8px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600'
  },
  cancelBtn: {
    padding: '6px 8px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600'
  },

  // Tabs
  tabBar: {
    display: 'flex',
    gap: '24px',
    borderBottom: '1px solid #e5e7eb',
    marginBottom: '24px'
  },
  tabButton: {
    padding: '12px 0',
    background: 'none',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    color: '#6b7280',
    transition: 'all 0.2s'
  },
  tabContent: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    minHeight: '400px'
  },

  // Tasks
  tasksSection: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px'
  },
  progressText: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '24px'
  },
  tasksList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  taskItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    border: '1px solid #e5e7eb'
  },
  checkbox: {
    width: '20px',
    height: '20px',
    cursor: 'pointer'
  },
  taskName: {
    fontSize: '14px',
    fontWeight: '500',
    flex: 1
  },
  taskStatus: {
    fontSize: '12px',
    fontWeight: '600',
    padding: '4px 10px',
    borderRadius: '4px'
  },

  // KPI Input
  kpiInputSection: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px'
  },
  kpiSection: {
    marginBottom: '32px'
  },
  inputGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px'
  },
  inputCard: {
    backgroundColor: '#f9fafb',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  targetDisplay: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '8px'
  },

  // Charts
  progressSection: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px'
  },
  chartTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '16px',
    marginTop: '24px'
  },

  // Feedback
  feedbackSection: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px'
  },
  feedbackForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    backgroundColor: 'white'
  },
  formTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937'
  },
  textarea: {
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    minHeight: '120px',
    resize: 'vertical'
  },
  feedbackDisplay: {
    backgroundColor: '#f0fdf4',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #dcfce7'
  },
  feedbackText: {
    fontSize: '14px',
    color: '#374151',
    marginBottom: '12px',
    lineHeight: '1.6'
  },
  feedbackRating: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },
  ratingLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#6b7280'
  },
  ratingValue: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#10b981'
  },

  // Modal
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: 'white',
    padding: '32px',
    borderRadius: '12px',
    maxWidth: '400px',
    width: '90%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '20px'
  },
  modalButtons: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px'
  },
  primaryBtn: {
    flex: 1,
    padding: '12px 24px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  secondaryBtn: {
    flex: 1,
    padding: '12px 24px',
    backgroundColor: '#e5e7eb',
    color: '#374151',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },

  // Auth & Feedback
  infoBox: {
    backgroundColor: '#eff6ff',
    color: '#1e40af',
    padding: '12px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    border: '1px solid #bfdbfe',
    lineHeight: 1.5
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    padding: '10px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    border: '1px solid #fecaca',
    fontWeight: 500
  },
  successBox: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
    padding: '10px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    border: '1px solid #a7f3d0',
    fontWeight: 500
  },
  checkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    color: '#6b7280',
    cursor: 'pointer'
  },

  // Employee management table
  empTable: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  },
  empTableHeader: {
    display: 'flex',
    gap: 12,
    padding: '14px 20px',
    backgroundColor: '#f3f4f6',
    fontSize: 12,
    fontWeight: 700,
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid #e5e7eb'
  },
  empTableRow: {
    display: 'flex',
    gap: 12,
    padding: '16px 20px',
    fontSize: 14,
    color: '#1f2937',
    borderBottom: '1px solid #f3f4f6',
    alignItems: 'center',
    transition: 'background-color 0.15s'
  },
  actionBtn: {
    padding: '6px 10px',
    border: 'none',
    borderRadius: 5,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    backgroundColor: '#e0e7ff',
    color: '#3730a3',
    transition: 'all 0.2s'
  },
  settingsCard: {
    backgroundColor: 'white',
    padding: 28,
    borderRadius: 8,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    maxWidth: 520
  }
};