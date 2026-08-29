import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from './lib/supabaseClient';
import { 
  Users, UserCheck, Calendar, ShieldCheck, Search, Plus, 
  Trash2, Edit3, UserPlus, FileSpreadsheet, CheckCircle2, 
  XCircle, Clock, AlertCircle, Phone, Award, ChevronDown, 
  BookOpen, HeartHandshake, Check, RefreshCw, Key, LogOut,
  Camera, Lock, Mail, Shield, User, GraduationCap, Home,
  MapPin, Heart, Sparkles
} from 'lucide-react';

// Cấu hình cố định của Xứ Đoàn
const BAN_LIST = [
  "Ban Điều Hành", "Ban Hành Chánh", "Ban Phụng Vụ", 
  "Ban Sinh Hoạt", "Ban Truyền Thông", "Ban Kỹ Thuật", "Ban Trực"
];

const LOP_LIST = [
  "Khai Tâm 1", "Khai Tâm 2", 
  "Rước Lễ 1", "Rước Lễ 2", 
  "Thêm Sức 1", "Thêm Sức 2", 
  "Bao Đồng 1", "Bao Đồng 2", "Bao Đồng 3", "Bao Đồng 4", 
  "Vào Đời 1", "Vào Đời 2", 
  "Dự Trưởng"
];

const CHUC_VU_LIST = [
  "Xứ Đoàn Trưởng", "Xứ Đoàn Phó", "Phó Nội Vụ", "Phó Ngoại Vụ",
  "Trưởng Ngành Chiên", "Phó Ngành Chiên",
  "Trưởng Ngành Ấu", "Phó Ngành Ấu",
  "Trưởng Ngành Thiếu", "Phó Ngành Thiếu",
  "Trưởng Ngành Nghĩa", "Phó Ngành Nghĩa",
  "Trưởng Ngành Hiệp", "Phó Ngành Hiệp",
  "Cha Tuyên Uý", "Sơ Phụ Trách", "Thầy Phụ Trách",
  "Huynh Trưởng", "Trợ Tá Giáo Lý", "Dự Trưởng"
];

const WEEKS_LIST = [
  'Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4', 'Tuần 5', 
  'Tuần 6', 'Tuần 7', 'Tuần 8', 'Tuần 9', 'Tuần 10'
];

const DEFAULT_LOGO = "https://api.iconify.design/emojione-v1:cross-mark.svg";
const DEFAULT_INITIAL_PASSWORD = "12345678";

// Mã ngành/lớp và sinh mã ID cố định
const BRANCH_CODE = {
  "Khối Chiên Con": "A",
  "Khối Ấu Nhi": "B",
  "Khối Thiếu Nhi": "C",
  "Khối Nghĩa Sĩ": "D",
  "Khối Hiệp Sĩ": "E",
  "Dự Trưởng": "F"
};

const padId = (number, digits = 2) => String(number).padStart(digits, "0");

// ID tài khoản là ID cố định, KHÔNG phụ thuộc tên/email.
// Ví dụ: 001 -> 002 -> 003... và không bị đổi khi sửa hồ sơ.
const getNextUserId = (users) => {
  const max = users.reduce((m, u) => {
    const rawId = String(u.id || "").trim();
    const n = /^\d+$/.test(rawId) ? Number.parseInt(rawId, 10) : NaN;
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  return padId(max + 1, 3);
};

// ID lớp theo ngành: Chiên=A, Ấu=B, Thiếu=C, Nghĩa=D, Hiệp=E, Dự Trưởng=F.
// Ví dụ: A1, A2, B1, B2...
const getClassCode = (classes, branch) => {
  const prefix = BRANCH_CODE[branch] || "X";
  const max = classes.reduce((m, c) => {
    if (c.branch !== branch) return m;
    const match = String(c.code || c.id || "").match(new RegExp(`^${prefix}(\\d+)$`));
    return match ? Math.max(m, Number(match[1])) : m;
  }, 0);
  return `${prefix}${max + 1}`;
};

// ID học viên luôn gắn với MÃ LỚP, không gắn với tên.
// Ví dụ lớp A1 -> A1-01, A1-02, A1-03...
// Nếu lớp B2 -> B2-01, B2-02...
const getNextStudentId = (cls) => {
  const prefix = cls.code || "A1";
  const max = (cls.students || []).reduce((m, s) => {
    const match = String(s.id || "").match(/-(\d+)$/);
    return match ? Math.max(m, Number(match[1])) : m;
  }, 0);
  return `${prefix}-${padId(max + 1, 2)}`;
};

// Khởi tạo danh sách tài khoản Huynh Trưởng ban đầu
const INITIAL_USERS = [
  {
    id: "001",
    email: "quynhtram@thanglong.vn",
    password: "12345678",
    tenThanh: "Maria",
    hoTen: "Quỳnh Trầm",
    ngaySinh: "1998-05-15",
    role: "admin",
    chucVu: ["Xứ Đoàn Trưởng"],
    ban: ["Ban Điều Hành"],
    nganh: "Nghĩa Sĩ",
    lop: ["Vào Đời 1", "Rước Lễ 1"],
    nienKhoa: "2023 - 2024",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
  }
];

// Khởi tạo danh sách Lớp Học & Học Viên ban đầu (Thêm trường SĐT Cha, Mẹ, Địa chỉ, Ngày Bí Tích)
// Các Box Secret hiển thị ở Trang Chủ.
// Mỗi Box liên kết với một tài khoản và có NGÀY MỞ + DANH SÁCH LỚP HIỂN THỊ do Admin cài đặt.
// Box chỉ xuất hiện cho đúng tài khoản từ ngày mở đã cài đặt.
const INITIAL_SECRET_BOXES = [
  {
    id: 'secret-001',
    title: 'Hộp Thư Bí Mật',
    userId: '001',
    openDate: '',
    className: '',
    classNames: []
  }
];

const INITIAL_CLASSES = [
  {
    id: 'class-ruoc-le-1',
    code: 'B1',
    name: 'Rước Lễ 1',
    branch: 'Khối Ấu Nhi',
    room: 'Phòng 102 - Nhà Mục Vụ',
    schedule: 'Chủ Nhật (07:30 - 09:30)',
    patron: 'Chúa Hài Đồng Jesus',
    leaders: [
      { id: 'l1', holyName: 'Sơ Maria', fullName: 'Nguyễn Thị Mơ', role: 'Sơ Phụ Trách', phone: '0903 123 456' },
      { id: 'l2', userId: '001', holyName: 'Maria', fullName: 'Quỳnh Trầm', role: 'Trưởng Lớp', phone: '0918 234 567' }
    ],
    students: [
      { 
        id: 's1', 
        holyName: 'Giuse', 
        fullName: 'Nguyễn An Bình', 
        dob: '2017-04-12', 
        gender: 'Nam', 
        phoneFather: '0988 111 222', 
        phoneMother: '0988 111 333', 
        address: '123 Đường Giáo Họ, Phường Bến Nghé, Quận 1',
        dateRuaToi: '2017-05-20',
        dateThanhThe: '2023-06-11',
        dateRuocLeTrongThe: '',
        dateThemSuc: '',
        notes: 'Năng nổ' 
      },
      { 
        id: 's2', 
        holyName: 'Maria', 
        fullName: 'Trần Thảo Chi', 
        dob: '2017-08-20', 
        gender: 'Nữ', 
        phoneFather: '0988 222 333', 
        phoneMother: '0988 222 444', 
        address: '45/2 Xóm Giáo, Phường Tân Định, Quận 1',
        dateRuaToi: '2017-09-10',
        dateThanhThe: '2023-06-11',
        dateRuocLeTrongThe: '',
        dateThemSuc: '',
        notes: '' 
      },
      { 
        id: 's3', 
        holyName: 'Phêrô', 
        fullName: 'Lê Quốc Cường', 
        dob: '2017-01-15', 
        gender: 'Nam', 
        phoneFather: '0988 333 444', 
        phoneMother: '0988 333 555', 
        address: '78 Đường Thánh Gia, Phường 3, Quận 3',
        dateRuaToi: '2017-02-10',
        dateThanhThe: '',
        dateRuocLeTrongThe: '',
        dateThemSuc: '',
        notes: 'Hay đùa' 
      },
      { 
        id: 's4', 
        holyName: 'Anna', 
        fullName: 'Phạm Minh Dung', 
        dob: '2017-11-05', 
        gender: 'Nữ', 
        phoneFather: '0988 444 555', 
        phoneMother: '0988 444 666', 
        address: '12 Đường Lê Lợi, Phường Bến Thành, Quận 1',
        dateRuaToi: '2017-12-01',
        dateThanhThe: '',
        dateRuocLeTrongThe: '',
        dateThemSuc: '',
        notes: '' 
      }
    ],
    attendance: {
      'Tuần 1': { 's1': 'present', 's2': 'present', 's3': 'late', 's4': 'excused' },
      'Tuần 2': { 's1': 'present', 's2': 'present', 's3': 'present', 's4': 'unexcused' }
    }
  },
  {
    id: 'class-vao-doi-1',
    code: 'E1',
    name: 'Vào Đời 1',
    branch: 'Khối Hiệp Sĩ',
    room: 'Hội Trường A',
    schedule: 'Chủ Nhật (14:30 - 16:30)',
    patron: 'Thánh Carlo Acutis',
    leaders: [
      { id: 'l3', userId: '001', holyName: 'Maria', fullName: 'Quỳnh Trầm', role: 'Trưởng Lớp', phone: '0918 234 567' }
    ],
    students: [
      { 
        id: 's5', 
        holyName: 'Phanxicô', 
        fullName: 'Vũ Đức Hòa', 
        dob: '2008-03-10', 
        gender: 'Nam', 
        phoneFather: '0977 123 456', 
        phoneMother: '0977 123 789', 
        address: '88 Nguyễn Trãi, Quận 5',
        dateRuaToi: '2008-04-01',
        dateThanhThe: '2016-05-20',
        dateRuocLeTrongThe: '2020-06-14',
        dateThemSuc: '2022-07-10',
        notes: '' 
      },
      { 
        id: 's6', 
        holyName: 'Têrêsa', 
        fullName: 'Đỗ Khánh Linh', 
        dob: '2008-07-22', 
        gender: 'Nữ', 
        phoneFather: '0977 654 321', 
        phoneMother: '0977 654 987', 
        address: '15/3 Trần Hưng Đạo, Quận 1',
        dateRuaToi: '2008-08-15',
        dateThanhThe: '2016-05-20',
        dateRuocLeTrongThe: '2020-06-14',
        dateThemSuc: '2022-07-10',
        notes: '' 
      }
    ],
    attendance: {
      'Tuần 1': { 's5': 'present', 's6': 'present' }
    }
  }
];

// Chuẩn hóa dữ liệu cũ và tạo liên kết theo ID cố định.
// Không dùng tên để nhận diện người vì tên có thể thay đổi.
const normalizeClasses = (rawClasses, rawUsers) => {
  const classes = Array.isArray(rawClasses) ? rawClasses : INITIAL_CLASSES;
  const users = Array.isArray(rawUsers) ? rawUsers : INITIAL_USERS;

  return classes.map((cls, classIndex) => {
    const branch = cls.branch || 'Khối Ấu Nhi';
    const code = cls.code || getClassCode(classes.slice(0, classIndex), branch);

    // Chuyển dữ liệu cũ sang liên kết userId một lần.
    // Từ đây tên/điện thoại/chức vụ của người có tài khoản sẽ lấy từ users.
    let leaders = (cls.leaders || []).map((leader, leaderIndex) => {
      if (leader.userId) {
        return {
          ...leader,
          id: leader.id || `ldr_user_${leader.userId}_${cls.id || classIndex}_${leaderIndex}`
        };
      }

      const match = users.find(u =>
        u.hoTen === leader.fullName ||
        `${u.tenThanh || ''} ${u.hoTen || ''}`.trim() === `${leader.holyName || ''} ${leader.fullName || ''}`.trim()
      );

      return match
        ? {
            ...leader,
            userId: match.id,
            id: `ldr_user_${match.id}_${cls.id || classIndex}`
          }
        : { ...leader, id: leader.id || `ldr_manual_${cls.id || classIndex}_${leaderIndex}` };
    });

    // Không cho cùng một tài khoản xuất hiện 2 lần trong cùng một lớp.
    const seenUserIds = new Set();
    leaders = leaders.filter(leader => {
      if (!leader.userId) return true;
      if (seenUserIds.has(leader.userId)) return false;
      seenUserIds.add(leader.userId);
      return true;
    });

    // Nếu hồ sơ tài khoản đã chọn lớp nhưng lớp chưa có liên kết, thêm đúng 1 lần.
    users.forEach(user => {
      if (!(user.lop || []).includes(cls.name)) return;
      if (leaders.some(l => l.userId === user.id)) return;
      leaders.push({
        id: `ldr_user_${user.id}_${cls.id || classIndex}`,
        userId: user.id,
        holyName: user.tenThanh || 'Trưởng',
        fullName: user.hoTen || '',
        role: user.chucVu?.[0] || 'Huynh Trưởng Phụ Trách',
        phone: user.phone || ''
      });
    });

    return { ...cls, code, leaders };
  });
};

export default function App() {
  // =============================
  // ĐỒNG BỘ DỮ LIỆU QUA SUPABASE
  // =============================
  // localStorage chỉ được dùng làm dữ liệu tạm/di trú lần đầu.
  // Supabase là nguồn dữ liệu chính để MacBook, điện thoại và các thiết bị khác dùng chung.
  const getLocalJson = (key, fallback) => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
    } catch {
      return fallback;
    }
  };

  const [users, setUsers] = useState(() =>
    getLocalJson("lms_acutis_users_v11", INITIAL_USERS)
  );

  const [logoUrl, setLogoUrl] = useState(() =>
    localStorage.getItem("lms_acutis_logo_v11") || DEFAULT_LOGO
  );

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedSession = localStorage.getItem("lms_acutis_session_v11");
      if (savedSession) {
        sessionStorage.setItem("lms_acutis_secret_seen_v1", "1");
        return JSON.parse(savedSession);
      }
    } catch {}
    return null;
  });

  const [classes, setClasses] = useState(() => {
    const parsedClasses = getLocalJson("lms_acutis_classes_v11", INITIAL_CLASSES);
    const parsedUsers = getLocalJson("lms_acutis_users_v11", INITIAL_USERS);
    return normalizeClasses(parsedClasses, parsedUsers);
  });

  const [secretBoxes, setSecretBoxes] = useState(() =>
    getLocalJson("lms_acutis_secret_boxes_v1", INITIAL_SECRET_BOXES)
  );

  const [activePage, setActivePage] = useState("home");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");

  const cloudReadyRef = useRef(false);
  const applyingCloudRef = useRef(false);
  const saveTimerRef = useRef(null);

  const buildCloudState = (nextUsers = users, nextClasses = classes, nextSecretBoxes = secretBoxes, nextLogoUrl = logoUrl) => ({
    users: nextUsers,
    classes: nextClasses,
    secretBoxes: nextSecretBoxes,
    logoUrl: nextLogoUrl,
  });

  const saveCloudState = async (nextState) => {
    if (!cloudReadyRef.current || applyingCloudRef.current) return;
    const payload = {
      id: 'main',
      users: nextState.users,
      classes: nextState.classes,
      secret_boxes: nextState.secretBoxes,
      logo_url: nextState.logoUrl,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('lms_app_state').upsert(payload, { onConflict: 'id' });
    if (error) console.error('Không thể lưu dữ liệu lên Supabase:', error);
  };

  // Tải dữ liệu chung từ Supabase. Nếu bảng chưa có dữ liệu, tự động đưa dữ liệu
  // đang có trên máy Admin (localStorage) lên Supabase để không mất dữ liệu hiện tại.
  useEffect(() => {
    let cancelled = false;

    const loadCloudState = async () => {
      const { data, error } = await supabase
        .from('lms_app_state')
        .select('id, users, classes, secret_boxes, logo_url')
        .eq('id', 'main')
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error('Không thể tải dữ liệu Supabase:', error);
        // Cho phép app tiếp tục chạy bằng dữ liệu local nếu Supabase chưa cấu hình xong.
        cloudReadyRef.current = false;
        return;
      }

      if (data) {
        applyingCloudRef.current = true;
        if (Array.isArray(data.users)) setUsers(data.users);
        if (Array.isArray(data.classes)) setClasses(normalizeClasses(data.classes, data.users || INITIAL_USERS));
        if (Array.isArray(data.secret_boxes)) setSecretBoxes(data.secret_boxes);
        if (data.logo_url) setLogoUrl(data.logo_url);
        setTimeout(() => { applyingCloudRef.current = false; }, 0);
      } else {
        // Cloud trống: lấy dữ liệu hiện có của máy đang mở app làm dữ liệu gốc.
        // Bật cờ trước khi ghi vì saveCloudState có kiểm tra cờ này.
        cloudReadyRef.current = true;
        await saveCloudState(buildCloudState());
      }

      cloudReadyRef.current = true;
    };

    loadCloudState();

    // Realtime: khi Admin sửa trên MacBook, thiết bị khác đang mở app sẽ nhận dữ liệu mới.
    const channel = supabase
      .channel('lms-app-state-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lms_app_state', filter: 'id=eq.main' }, (payload) => {
        const row = payload.new;
        if (!row || row.id !== 'main') return;
        applyingCloudRef.current = true;
        if (Array.isArray(row.users)) setUsers(row.users);
        if (Array.isArray(row.classes)) setClasses(normalizeClasses(row.classes, row.users || INITIAL_USERS));
        if (Array.isArray(row.secret_boxes)) setSecretBoxes(row.secret_boxes);
        if (row.logo_url) setLogoUrl(row.logo_url);
        setTimeout(() => { applyingCloudRef.current = false; }, 0);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') console.log('Supabase Realtime: đã kết nối đồng bộ.');
      });

    return () => {
      cancelled = true;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, []);

  // Ghi local cache để app vẫn mở được khi mạng chập chờn, nhưng dữ liệu chung nằm ở Supabase.
  useEffect(() => { localStorage.setItem("lms_acutis_users_v11", JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem("lms_acutis_logo_v11", logoUrl); }, [logoUrl]);
  useEffect(() => { localStorage.setItem("lms_acutis_classes_v11", JSON.stringify(classes)); }, [classes]);
  useEffect(() => { localStorage.setItem("lms_acutis_secret_boxes_v1", JSON.stringify(secretBoxes)); }, [secretBoxes]);

  // Mọi thay đổi dữ liệu chính đều được đẩy lên Supabase, có debounce để tránh ghi quá nhiều lần.
  useEffect(() => {
    if (!cloudReadyRef.current || applyingCloudRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveCloudState(buildCloudState()).catch(err => console.error(err));
    }, 250);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [users, classes, secretBoxes, logoUrl]);

  useEffect(() => {
    if (currentUser) localStorage.setItem("lms_acutis_session_v11", JSON.stringify(currentUser));
    else localStorage.removeItem("lms_acutis_session_v11");
  }, [currentUser]);

  // Xử lý Đăng Nhập
  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError("");

    let formattedEmail = loginEmail.trim().toLowerCase();
    if (!formattedEmail.includes("@")) {
      formattedEmail += "@thanglong.vn";
    }

    const user = users.find(u => u.email.toLowerCase() === formattedEmail);

    if (!user) {
      setLoginError("Tài khoản này chưa nằm trong danh sách Quản lý Huynh Trưởng! Vui lòng liên hệ Admin.");
      return;
    }

    if (user.password !== loginPass) {
      setLoginError("Mật khẩu không chính xác!");
      return;
    }

    // Mỗi lần đăng nhập thật sự sẽ nhận một lá thư bí mật mới.
    sessionStorage.removeItem("lms_acutis_secret_seen_v1");
    setCurrentUser(user);
    setActivePage("home");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginEmail("");
    setLoginPass("");
  };

  const handleAddUser = (newUser) => {
    // Luôn cấp ID mới tại thời điểm tạo tài khoản. Không lấy ID từ tên/email.
    const stableId = getNextUserId(users);
    const userWithStableId = { ...newUser, id: stableId };
    setUsers(prev => [...prev, userWithStableId]);
  };

  // Cập nhật theo ID cố định. Tên thay đổi chỉ sửa đúng bản ghi cũ,
  // tuyệt đối không tạo tài khoản mới và không tạo thêm người trong lớp.
  const handleUpdateUser = (updatedUserData) => {
    if (!updatedUserData?.id) return;

    setUsers(prev => prev.map(u =>
      u.id === updatedUserData.id ? { ...u, ...updatedUserData, id: u.id } : u
    ));

    setClasses(prevClasses => prevClasses.map(cls => {
      const shouldBeLeader = (updatedUserData.lop || []).includes(cls.name);
      const linkedLeaders = (cls.leaders || []).filter(l => l.userId === updatedUserData.id);
      const oldLeader = linkedLeaders[0];

      // Nếu hồ sơ bỏ lớp này -> gỡ liên kết, không để tự thêm lại.
      let leaders = (cls.leaders || []).filter(l =>
        !(l.userId === updatedUserData.id && !shouldBeLeader)
      );

      if (shouldBeLeader) {
        const leaderData = {
          id: oldLeader?.id || `ldr_user_${updatedUserData.id}_${cls.id}`,
          userId: updatedUserData.id,
          holyName: updatedUserData.tenThanh || '',
          fullName: updatedUserData.hoTen || '',
          phone: updatedUserData.phone || oldLeader?.phone || '',
          role: oldLeader?.role || updatedUserData.chucVu?.[0] || 'Huynh Trưởng Phụ Trách'
        };

        if (oldLeader) {
          // Giữ nguyên 1 bản ghi liên kết và cập nhật tên mới.
          let replaced = false;
          leaders = leaders.filter(l => {
            if (l.userId !== updatedUserData.id) return true;
            if (!replaced) { replaced = true; return true; }
            return false;
          }).map(l => l.userId === updatedUserData.id ? leaderData : l);
        } else {
          leaders.push(leaderData);
        }
      }

      return { ...cls, leaders };
    }));

    // Cập nhật phiên đăng nhập theo ID để giao diện hiện tên mới ngay lập tức.
    if (currentUser && currentUser.id === updatedUserData.id) {
      setCurrentUser(prev => ({ ...prev, ...updatedUserData, id: prev.id }));
    }
  };

  const handleDeleteUser = (userId) => {
    if (!currentUser || currentUser.role !== 'admin') {
      alert('Chỉ Admin mới có quyền xóa tài khoản.');
      return;
    }
    if (userId === currentUser.id) {
      alert("Bạn không thể xóa tài khoản Admin đang đăng nhập!");
      return;
    }
    if (!confirm("Bạn có chắc chắn muốn xóa tài khoản này? Người này sẽ được gỡ khỏi tất cả các lớp phụ trách.")) return;

    setUsers(prev => prev.filter(u => u.id !== userId));

    // Xóa toàn bộ liên kết userId khỏi tất cả lớp.
    setClasses(prevClasses => prevClasses.map(cls => ({
      ...cls,
      leaders: (cls.leaders || []).filter(leader => leader.userId !== userId)
    })));

    alert("Đã xóa tài khoản và gỡ người đó khỏi tất cả các lớp thành công!");
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result);
        alert("Đã cập nhật Logo Xứ Đoàn mặc định!");
      };
      reader.readAsDataURL(file);
    }
  };

  // 1. GIAO DIỆN ĐĂNG NHẬP
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-600 via-orange-600 to-amber-500 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md text-center border-t-8 border-red-600 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-amber-400 rounded-full opacity-30"></div>

          <div className="mb-6 flex flex-col items-center">
            <div className="w-24 h-24 rounded-full border-4 border-amber-400 p-1 bg-white shadow-md flex items-center justify-center overflow-hidden mb-2">
              <img src={logoUrl} alt="Logo Xứ Đoàn" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-xl font-bold text-red-900 uppercase tracking-wide">
              Xứ Đoàn Carlo Acutis
            </h1>
            <p className="text-xs text-slate-500 font-medium">Giáo Xứ Thăng Long</p>
            <div className="mt-1 px-3 py-1 bg-amber-100 text-orange-700 text-xs font-semibold rounded-full border border-amber-300">
              Hệ Thống LMS Huynh Trưởng
            </div>
          </div>

          {loginError && (
            <div className="mb-4 p-3 bg-rose-100 border-l-4 border-rose-500 text-rose-700 text-xs text-left rounded leading-relaxed flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Huynh Trưởng</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder=""
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mật Khẩu</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  placeholder=""
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition duration-200 flex items-center justify-center gap-2 mt-2"
            >
              <CheckCircle2 className="w-4 h-4" /> ĐĂNG NHẬP
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. GIAO DIỆN CHÍNH SAU KHI ĐĂNG NHẬP
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* NAVBAR */}
      <header className="bg-gradient-to-r from-red-600 via-orange-600 to-red-600 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActivePage("home")}>
              <div className="relative group">
                <img 
                  src={logoUrl} 
                  alt="Logo Xứ Đoàn" 
                  className="w-10 h-10 rounded-full border-2 border-amber-400 object-cover bg-white" 
                />
                {currentUser.role === 'admin' && (
                  <label className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer text-[10px]" title="Đổi Logo Mặc Định">
                    <Camera className="w-3 h-3 text-white" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                  </label>
                )}
              </div>
              <div>
                <h1 className="font-bold text-sm sm:text-base leading-tight">CARLO ACUTIS</h1>
                <p className="text-[10px] text-amber-200 uppercase tracking-wider">GX Thăng Long</p>
              </div>
            </div>

            {/* Menu chính */}
            <nav className="hidden md:flex space-x-1">
              <button 
                onClick={() => setActivePage("home")}
                className={`px-3 py-2 rounded-md text-sm font-medium transition flex items-center gap-1.5 ${activePage === 'home' ? 'bg-white/20 text-white font-bold' : 'hover:bg-white/10'}`}
              >
                <Home className="w-4 h-4" /> Trang Chủ
              </button>

              {/* NÚT VÀO QUẢN LÝ LỚP HỌC & ĐIỂM DANH */}
              <button 
                onClick={() => setActivePage("classManagement")}
                className={`px-3 py-2 rounded-md text-sm font-medium transition flex items-center gap-1.5 ${activePage === 'classManagement' ? 'bg-amber-400 text-slate-900 font-bold' : 'bg-white/10 hover:bg-white/20'}`}
              >
                <GraduationCap className="w-4 h-4" /> Quản Lý Lớp & Điểm Danh
              </button>

              <button 
                onClick={() => setActivePage("profile")}
                className={`px-3 py-2 rounded-md text-sm font-medium transition flex items-center gap-1.5 ${activePage === 'profile' ? 'bg-white/20 text-white font-bold' : 'hover:bg-white/10'}`}
              >
                <User className="w-4 h-4" /> Hồ Sơ Cá Nhân
              </button>
              
              <button 
                onClick={() => setActivePage("lms")}
                className={`px-3 py-2 rounded-md text-sm font-medium transition flex items-center gap-1.5 ${activePage === 'lms' ? 'bg-white/20 text-white font-bold' : 'hover:bg-white/10'}`}
              >
                <BookOpen className="w-4 h-4" /> Góc Học Tập
              </button>

              {currentUser.role === 'admin' && (
                <button 
                  onClick={() => setActivePage("members")}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition flex items-center gap-1.5 ${activePage === 'members' ? 'bg-amber-400 text-slate-900 font-bold' : 'bg-amber-400/80 text-slate-900 hover:bg-amber-400'}`}
                >
                  <ShieldCheck className="w-4 h-4" /> Quản Lý HT ({users.length})
                </button>
              )}
            </nav>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setActivePage("profile")}>
                <img 
                  src={currentUser.avatar || "https://via.placeholder.com/40"} 
                  alt="Avatar" 
                  className="w-8 h-8 rounded-full border border-white object-cover"
                />
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-semibold">{currentUser.tenThanh} {currentUser.hoTen}</div>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${currentUser.role === 'admin' ? 'bg-amber-400 text-slate-900' : 'bg-white/20 text-white'}`}>
                    {currentUser.role === 'admin' ? 'Admin' : 'Huynh Trưởng'}
                  </span>
                </div>
              </div>

              <button 
                onClick={handleLogout}
                title="Đăng xuất"
                className="p-2 text-white hover:text-amber-200 transition"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation trên Mobile */}
        <div className="md:hidden flex justify-around bg-red-900 py-2 text-xs border-t border-red-800 text-white">
          <button onClick={() => setActivePage("home")} className={`p-1 ${activePage === 'home' ? 'text-amber-300 font-bold' : ''}`}>
            <Home className="w-4 h-4 mx-auto mb-0.5" /> Trang Chủ
          </button>
          <button onClick={() => setActivePage("classManagement")} className={`p-1 ${activePage === 'classManagement' ? 'text-amber-300 font-bold' : ''}`}>
            <GraduationCap className="w-4 h-4 mx-auto mb-0.5" /> Lớp Học
          </button>
          <button onClick={() => setActivePage("profile")} className={`p-1 ${activePage === 'profile' ? 'text-amber-300 font-bold' : ''}`}>
            <User className="w-4 h-4 mx-auto mb-0.5" /> Hồ Sơ
          </button>
          {currentUser.role === 'admin' && (
            <button onClick={() => setActivePage("members")} className={`p-1 ${activePage === 'members' ? 'text-amber-300 font-bold' : 'text-amber-400'}`}>
              <ShieldCheck className="w-4 h-4 mx-auto mb-0.5" /> Quản Lý
            </button>
          )}
        </div>
      </header>

      {/* NỘI DUNG THEO TRANG */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activePage === "home" && <HomePage currentUser={currentUser} users={users} classes={classes} secretBoxes={secretBoxes} setActivePage={setActivePage} />}
        
        {/* HỢP NHẤT MODULE QUẢN LÝ LỚP & ĐIỂM DANH */}
        {activePage === "classManagement" && (
          <ClassManagementModule 
            currentUser={currentUser} 
            classes={classes} 
            setClasses={setClasses} 
            users={users}
            setUsers={setUsers}
          />
        )}

        {activePage === "profile" && <ProfilePage currentUser={currentUser} onUpdate={handleUpdateUser} />}
        {activePage === "lms" && <LMSPage />}
        {activePage === "members" && currentUser.role === "admin" && (
          <AdminMembersPage 
            users={users} 
            classes={classes}
            secretBoxes={secretBoxes}
            setSecretBoxes={setSecretBoxes}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser} 
            onDeleteUser={handleDeleteUser}
            currentUser={currentUser} 
          />
        )}
      </main>

      <footer className="bg-slate-800 text-slate-300 text-center py-4 text-xs border-t-4 border-orange-600 mt-8">
        <p className="font-semibold text-white">XỨ ĐOÀN CARLO ACUTIS - GIÁO XỨ THĂNG LONG</p>
        <p className="text-slate-400 mt-1">Hệ thống LMS Quản lý & Đào tạo Huynh Trưởng Nội Bộ</p>
        <p className="text-slate-500 text-[10px] mt-2">© 2026 Carlo Acutis LMS. All rights reserved.</p>
      </footer>
    </div>
  );
}

// ==========================================
// 1. TRANG CHỦ CHÍNH
// ==========================================
function HomePage({ currentUser, users, classes, secretBoxes, setActivePage }) {
  // Chỉ lấy Box Secret thuộc đúng tài khoản đang đăng nhập và đã đến ngày mở.
  // Ngày được so sánh theo múi giờ địa phương của thiết bị.
  const getTodayLocal = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const availableSecretBoxes = useMemo(() => {
    const today = getTodayLocal();
    return (secretBoxes || []).filter(box =>
      box.userId === currentUser.id &&
      box.openDate &&
      box.openDate <= today
    );
  }, [secretBoxes, currentUser.id]);

  // Lá thư chỉ bật lên một lần trong mỗi lần đăng nhập thật sự.
  // Khi chưa tới ngày Admin cài đặt thì tuyệt đối không hiện.
  const [showSecretEnvelope, setShowSecretEnvelope] = useState(false);
  const [openedBoxId, setOpenedBoxId] = useState(null);

  useEffect(() => {
    const alreadySeen = sessionStorage.getItem("lms_acutis_secret_seen_v1") === "1";
    setShowSecretEnvelope(!alreadySeen && availableSecretBoxes.length > 0);
  }, [availableSecretBoxes]);

  return (
    <>
      <style>{`
      @keyframes secretAppear {
        0% { opacity: 0; transform: translateY(35px) scale(.82) rotate(-2deg); }
        60% { opacity: 1; transform: translateY(-8px) scale(1.04) rotate(1deg); }
        100% { opacity: 1; transform: translateY(0) scale(1) rotate(0); }
      }
      @keyframes letterOpen {
        0% { opacity: 0; transform: translateY(35px) scale(.72) rotateX(12deg); }
        100% { opacity: 1; transform: translateY(0) scale(1) rotateX(0); }
      }
      `}</style>
      <div className="space-y-6">
      <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <span className="bg-amber-400 text-slate-900 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider mb-2 inline-block">
            Chào mừng Huynh Trưởng
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold mt-1">
            {currentUser.tenThanh} {currentUser.hoTen}
          </h2>
          <p className="text-sm text-amber-100 mt-2 max-w-2xl">
            Chúc bạn một ngày phụ sự tràn đầy niềm vui và thần khí trong Chúa Giêsu Thánh Thể.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setActivePage("classManagement")}
              className="bg-amber-400 text-slate-900 hover:bg-amber-300 font-bold px-4 py-2 rounded-lg text-xs shadow transition flex items-center gap-1.5"
            >
              <GraduationCap className="w-4 h-4" /> Vào Điểm Danh & Quản Lý Lớp
            </button>
            <button
              onClick={() => setActivePage("profile")}
              className="bg-white text-red-600 hover:bg-amber-100 font-bold px-4 py-2 rounded-lg text-xs shadow transition flex items-center gap-1.5"
            >
              <User className="w-4 h-4" /> Xem Hồ Sơ Cá Nhân
            </button>
          </div>
        </div>
      </div>

      {/* THƯ BÍ MẬT - chỉ xuất hiện ngay sau khi đăng nhập */}
      {availableSecretBoxes.length > 0 && showSecretEnvelope && !openedBoxId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-[2px]">
          <div className="relative w-full max-w-sm text-center animate-[secretAppear_.7s_ease-out]">
            <div className="absolute -inset-8 bg-amber-300/20 blur-3xl rounded-full"></div>

            <div className="relative">
              <div className="mb-5 text-white drop-shadow-lg">
                <div className="text-xs font-bold uppercase tracking-[0.3em] text-amber-200">
                  Bạn có một tin nhắn bí mật
                </div>
                <h3 className="text-2xl font-extrabold mt-2">Một lá thư dành cho bạn 💌</h3>
              </div>

              {/* Phong thư */}
              <button
                type="button"
                onClick={() => {
                  sessionStorage.setItem("lms_acutis_secret_seen_v1", "1");
                  setShowSecretEnvelope(false);
                  setOpenedBoxId(availableSecretBoxes[0].id);
                }}
                className="group relative mx-auto block w-full max-w-[330px] focus:outline-none"
                aria-label="Mở thư bí mật"
              >
                <div className="relative h-[205px] rounded-2xl bg-gradient-to-br from-amber-300 via-yellow-200 to-orange-300 shadow-[0_25px_60px_rgba(0,0,0,.35)] border-4 border-white/80 overflow-hidden transition duration-500 group-hover:scale-[1.03] group-hover:-translate-y-1">
                  {/* Nắp phong thư */}
                  <div className="absolute left-0 right-0 top-0 h-28 bg-gradient-to-br from-orange-400 to-amber-300 [clip-path:polygon(0_0,100%_0,50%_100%)] origin-top transition-transform duration-500 group-hover:scale-y-[0.88]"></div>
                  {/* Hai góc dưới */}
                  <div className="absolute inset-0 bg-white/25 [clip-path:polygon(0_100%,50%_48%,100%_100%)]"></div>
                  <div className="absolute inset-0 bg-white/20 [clip-path:polygon(0_0,50%_52%,100%_0,100%_18%,50%_70%,0_18%)]"></div>

                  <div className="absolute inset-0 flex flex-col items-center justify-center pt-5">
                    <div className="w-16 h-16 rounded-full bg-white/90 border-4 border-amber-400 shadow-lg flex items-center justify-center text-red-600 transition duration-500 group-hover:rotate-[-8deg] group-hover:scale-110">
                      <Mail className="w-8 h-8" />
                    </div>
                    <div className="mt-3 text-xs font-extrabold uppercase tracking-[0.2em] text-red-900">
                      BOX SECRET
                    </div>
                  </div>
                </div>

                <div className="mt-5 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-red-600 font-extrabold text-sm shadow-xl transition group-hover:bg-amber-300 group-hover:text-red-900 group-hover:scale-105">
                  <Mail className="w-4 h-4" />
                  NHẤN ĐỂ MỞ THƯ
                </div>
              </button>

              <p className="mt-5 text-[11px] text-white/80">Lá thư sẽ không hiện nội dung cho đến khi bạn mở.</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal: nội dung lá thư sau khi người dùng mở */}
      {openedBoxId && (() => {
        const openedBox = secretBoxes.find(box => box.id === openedBoxId);
        const openedUser = openedBox ? users.find(u => u.id === openedBox.userId) : null;
        const assignedClasses = Array.from(new Set(
          Array.isArray(openedBox?.classNames) && openedBox.classNames.length
            ? openedBox.classNames
            : (openedBox?.className
              ? [openedBox.className]
              : (openedUser?.lop || []))
        ));

        // Vai trò hiển thị trên thư lấy từ chức vụ của người nhận.
        const displayRole = openedBox?.leaderType
          ? `${openedBox.leaderType} phụ trách`
          : (openedUser?.chucVu?.length
            ? openedUser.chucVu.join(', ')
            : 'Huynh Trưởng Phụ Trách');
        if (!openedBox) return null;

        return (
          <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm z-[70] flex items-center justify-center p-4 overflow-y-auto">
            <div className="w-full max-w-md animate-[letterOpen_.55s_cubic-bezier(.16,1,.3,1)]">
              <div className="relative bg-[#fffdf5] rounded-[28px] shadow-2xl overflow-hidden border border-amber-200">
                <div className="absolute inset-2 border border-amber-200 rounded-[22px] pointer-events-none"></div>

                <div className="relative px-6 pt-7 pb-5 text-center">
                  <div className="inline-flex px-7 py-2 bg-gradient-to-r from-yellow-300 to-orange-400 text-red-900 font-extrabold text-xs tracking-[0.25em] rounded-sm shadow-sm [clip-path:polygon(0_0,92%_0,100%_50%,92%_100%,0_100%,8%_50%)]">
                    {openedBox.title || 'BỔ NHIỆM LỚP'}
                  </div>

                  {openedUser?.avatar ? (
                    <img
                      src={openedUser.avatar}
                      alt="Ảnh người được bổ nhiệm"
                      className="mx-auto mt-5 w-24 h-24 rounded-full object-cover border-4 border-amber-300 shadow-lg"
                    />
                  ) : (
                    <div className="mx-auto mt-5 w-24 h-24 rounded-full bg-amber-100 border-4 border-amber-300 flex items-center justify-center text-red-600 shadow-lg">
                      <User className="w-10 h-10" />
                    </div>
                  )}

                  <div className="mt-5 text-[10px] uppercase font-bold tracking-[0.22em] text-red-800">
                    Quyết định bổ nhiệm
                  </div>
                  <div className="mt-1 text-xs font-bold text-amber-700">
                    {openedUser?.chucVu?.[0] || 'Trưởng Lớp'}
                  </div>
                  <h3 className="mt-1 text-2xl font-extrabold text-orange-700 leading-tight">
                    {openedUser ? `${openedUser.tenThanh || ''} ${openedUser.hoTen || ''}`.trim() : 'Huynh Trưởng'}
                  </h3>

                  <div className="inline-flex items-center gap-1.5 mt-3 px-4 py-1.5 rounded-full bg-gradient-to-r from-yellow-300 to-amber-400 text-red-900 text-[11px] font-extrabold">
                    <Award className="w-3.5 h-3.5" />
                    Ngành {openedUser?.nganh || 'Huynh Trưởng'}
                  </div>
                </div>

                <div className="relative px-8 pb-5 text-sm text-slate-700">
                  <div className="space-y-2.5 border-t border-amber-100 pt-5">
                    <div className="flex gap-2"><span className="font-bold text-red-700 min-w-[76px]">Vai trò</span><span className="font-semibold">{openedUser?.chucVu?.[0] || 'Trưởng Lớp'}</span></div>
                    <div className="flex gap-2 items-start">
                      <span className="font-bold text-red-700 min-w-[76px]">Lớp</span>
                      <span className="font-semibold leading-relaxed">
                        {assignedClasses.length ? assignedClasses.join(', ') : 'Chưa phân công lớp'}
                      </span>
                    </div>
                    <div className="flex gap-2"><span className="font-bold text-red-700 min-w-[76px]">Năm học</span><span className="font-semibold">{openedUser?.nienKhoa || '2026 - 2027'}</span></div>
                  </div>

                  <p className="mt-6 text-center italic text-slate-500 leading-relaxed text-xs">
                    Xin Thiên Chúa nâng đỡ và ban ơn giúp Trưởng luôn hăng say phục vụ.
                  </p>

                  <button
                    type="button"
                    onClick={() => { setOpenedBoxId(null); setShowSecretEnvelope(false); }}
                    className="w-full mt-5 py-3 rounded-xl bg-gradient-to-r from-yellow-300 to-orange-400 hover:from-yellow-400 hover:to-orange-500 text-red-900 font-extrabold text-sm shadow-md transition"
                  >
                    ✓ ĐÃ NHẬN BỔ NHIỆM
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-orange-500">
        <h3 className="font-bold text-slate-800 text-base mb-3 flex items-center justify-between">
          <span>Thông Báo Xứ Đoàn</span>
          <span className="text-xs text-slate-400 font-normal">Niên khóa: {currentUser.nienKhoa || "2023 - 2024"}</span>
        </h3>
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold text-xs text-amber-900">Thông báo Ban Điều Hành</span>
            <span className="text-[10px] bg-amber-200 text-amber-800 px-2 py-0.5 rounded font-semibold">Mới</span>
          </div>
          <p className="text-xs text-slate-700">
            Mời tất cả Huynh trưởng dự họp chuẩn bị chương trình Lễ Bổn Mạng Xứ Đoàn Carlo Acutis.
          </p>
        </div>
      </div>

      </div>
    </>
  );
}

// ==========================================
// 2. PHÂN HỆ QUẢN LÝ LỚP HỌC & ĐIỂM DANH (MODULE TÍCH HỢP)
// ==========================================
function ClassManagementModule({ currentUser, classes, setClasses, users, setUsers }) {
  const [selectedClassId, setSelectedClassId] = useState(() => classes[0]?.id || '');
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance', 'students', 'leaders', 'summary'
  const [selectedWeek, setSelectedWeek] = useState('Tuần 1');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showAddLeaderModal, setShowAddLeaderModal] = useState(false);
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [showEditClassModal, setShowEditClassModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);

  // Initial Form student mẫu đầy đủ
  const EMPTY_STUDENT = { 
    holyName: '', 
    fullName: '', 
    dob: '', 
    gender: 'Nam', 
    phoneFather: '', 
    phoneMother: '', 
    address: '',
    dateRuaToi: '',
    dateThanhThe: '',
    dateRuocLeTrongThe: '',
    dateThemSuc: '',
    notes: '' 
  };

  // Forms
  const [newStudent, setNewStudent] = useState(EMPTY_STUDENT);
  const [newLeader, setNewLeader] = useState({ userId: '', holyName: '', fullName: '', role: 'Huynh Trưởng Phụ', phone: '' });
  const [newClass, setNewClass] = useState({ name: '', branch: 'Khối Ấu Nhi', room: '', schedule: 'Chủ Nhật (07:30 - 09:30)', patron: '' });
  const [editClassForm, setEditClassForm] = useState({ name: '', branch: 'Khối Ấu Nhi', room: '', schedule: 'Chủ Nhật (07:30 - 09:30)', patron: '' });

  const currentClass = useMemo(() => {
    return classes.find(c => c.id === selectedClassId) || classes[0];
  }, [classes, selectedClassId]);

  // Việc gán người phụ trách được đồng bộ trong handleUpdateUser/handleAddLeader,
  // nên không còn useEffect tự thêm theo tên (tránh tạo bản ghi trùng).

  // Xử lý điểm danh
  const handleSetAttendance = (studentId, status) => {
    if (!currentClass) return;
    setClasses(prevClasses => prevClasses.map(cls => {
      if (cls.id !== currentClass.id) return cls;
      const currentWeekAtt = cls.attendance?.[selectedWeek] || {};
      return {
        ...cls,
        attendance: {
          ...cls.attendance,
          [selectedWeek]: { ...currentWeekAtt, [studentId]: status }
        }
      };
    }));
  };

  const handleMarkAllPresent = () => {
    if (!currentClass || !currentClass.students.length) return;
    setClasses(prevClasses => prevClasses.map(cls => {
      if (cls.id !== currentClass.id) return cls;
      const currentWeekAtt = { ...(cls.attendance?.[selectedWeek] || {}) };
      cls.students.forEach(s => { currentWeekAtt[s.id] = 'present'; });
      return {
        ...cls,
        attendance: { ...cls.attendance, [selectedWeek]: currentWeekAtt }
      };
    }));
  };

  const handleSaveStudent = (e) => {
    e.preventDefault();
    if (!newStudent.fullName) return;

    if (editingStudent) {
      setClasses(prev => prev.map(cls => {
        if (cls.id !== currentClass.id) return cls;
        return {
          ...cls,
          students: cls.students.map(s => s.id === editingStudent.id ? { ...s, ...newStudent } : s)
        };
      }));
      setEditingStudent(null);
    } else {
      const studentObj = { ...newStudent, id: getNextStudentId(currentClass) };
      setClasses(prev => prev.map(cls => {
        if (cls.id !== currentClass.id) return cls;
        return { ...cls, students: [...cls.students, studentObj] };
      }));
    }

    setNewStudent(EMPTY_STUDENT);
    setShowAddStudentModal(false);
  };

  const handleDeleteStudent = (studentId) => {
    if (!confirm('Bạn có chắc muốn xóa học viên này khỏi lớp?')) return;
    setClasses(prev => prev.map(cls => {
      if (cls.id !== currentClass.id) return cls;
      return { ...cls, students: cls.students.filter(s => s.id !== studentId) };
    }));
  };

  const handleAddLeader = (e) => {
    e.preventDefault();
    if (!newLeader.fullName) return;

    if (newLeader.userId && (currentClass.leaders || []).some(l => l.userId === newLeader.userId)) {
      alert('Tài khoản này đã có trong lớp.');
      return;
    }

    const selectedUser = newLeader.userId ? users.find(u => u.id === newLeader.userId) : null;
    const leaderObj = selectedUser
      ? {
          id: `ldr_user_${selectedUser.id}_${currentClass.id}`,
          userId: selectedUser.id,
          holyName: selectedUser.tenThanh || '',
          fullName: selectedUser.hoTen || '',
          role: newLeader.role || selectedUser.chucVu?.[0] || 'Huynh Trưởng Phụ',
          phone: selectedUser.phone || ''
        }
      : {
          ...newLeader,
          id: 'ldr_manual_' + Date.now()
        };

    setClasses(prev => prev.map(cls => {
      if (cls.id !== currentClass.id) return cls;
      return { ...cls, leaders: [...(cls.leaders || []), leaderObj] };
    }));

    // Nếu chọn một tài khoản thật, lưu luôn lớp đó vào hồ sơ tài khoản.
    if (newLeader.userId && setUsers) {
      setUsers(prevUsers => prevUsers.map(u => u.id === newLeader.userId
        ? { ...u, lop: Array.from(new Set([...(u.lop || []), currentClass.name])) }
        : u
      ));
    }

    setNewLeader({ userId: '', holyName: '', fullName: '', role: 'Huynh Trưởng Phụ', phone: '' });
    setShowAddLeaderModal(false);
  };

  const handleDeleteLeader = (leaderId) => {
    if (currentUser.role !== 'admin') {
      alert('Chỉ Admin mới có quyền xóa Trưởng/Sơ khỏi lớp.');
      return;
    }
    if (!confirm('Bạn có muốn xóa người phụ trách này khỏi lớp?')) return;

    const leaderToRemove = (currentClass.leaders || []).find(l => l.id === leaderId);

    setClasses(prev => prev.map(cls => {
      if (cls.id !== currentClass.id) return cls;
      return { ...cls, leaders: (cls.leaders || []).filter(l => l.id !== leaderId) };
    }));

    // Nếu người bị xóa là tài khoản thật, bỏ luôn lớp này khỏi hồ sơ của họ
    // để hiệu ứng đồng bộ không tự thêm họ trở lại.
    if (leaderToRemove?.userId) {
      setUsers(prevUsers => prevUsers.map(u => u.id === leaderToRemove.userId
        ? { ...u, lop: (u.lop || []).filter(name => name !== currentClass.name) }
        : u
      ));
    }
  };

  const handleAddClass = (e) => {
    e.preventDefault();
    if (!newClass.name) return;
    const newClassObj = {
      ...newClass,
      code: getClassCode(classes, newClass.branch),
      id: 'cls_' + Date.now(),
      leaders: [],
      students: [],
      attendance: {}
    };
    setClasses(prev => [...prev, newClassObj]);
    setSelectedClassId(newClassObj.id);
    setNewClass({ name: '', branch: 'Khối Ấu Nhi', room: '', schedule: 'Chủ Nhật (07:30 - 09:30)', patron: '' });
    setShowAddClassModal(false);
  };

  // Admin có thể sửa lại ngành/khối của lớp nếu tạo nhầm.
  // Khi đổi ngành, mã lớp cũng được cấp lại theo ngành mới (A/B/C/D/E/F).
  // Khi đổi tên lớp, các hồ sơ phụ trách đang liên kết với tên lớp cũ cũng được cập nhật.
  const openEditClassModal = (cls) => {
    if (currentUser?.role !== 'admin') {
      alert('Chỉ Admin mới có quyền sửa thông tin lớp.');
      return;
    }
    setEditingClass(cls);
    setEditClassForm({
      name: cls.name || '',
      branch: cls.branch || 'Khối Ấu Nhi',
      room: cls.room || '',
      schedule: cls.schedule || 'Chủ Nhật (07:30 - 09:30)',
      patron: cls.patron || ''
    });
    setShowEditClassModal(true);
  };

  const handleEditClass = (e) => {
    e.preventDefault();
    if (currentUser?.role !== 'admin' || !editingClass || !editClassForm.name.trim()) return;

    const oldName = editingClass.name;
    const oldBranch = editingClass.branch;
    const nextName = editClassForm.name.trim();
    const nextBranch = editClassForm.branch;

    setClasses(prevClasses => {
      const code = nextBranch === oldBranch
        ? (editingClass.code || getClassCode(prevClasses, nextBranch))
        : getClassCode(prevClasses.filter(c => c.id !== editingClass.id), nextBranch);

      return prevClasses.map(cls => cls.id === editingClass.id
        ? {
            ...cls,
            name: nextName,
            branch: nextBranch,
            code,
            room: editClassForm.room.trim(),
            schedule: editClassForm.schedule.trim(),
            patron: editClassForm.patron.trim()
          }
        : cls
      );
    });

    // Đồng bộ tên lớp trong hồ sơ của mọi tài khoản đang phụ trách lớp này.
    if (setUsers) {
      setUsers(prevUsers => prevUsers.map(u => ({
        ...u,
        lop: (u.lop || []).map(name => name === oldName ? nextName : name)
      })));
    }

    setShowEditClassModal(false);
    setEditingClass(null);
    alert(`Đã cập nhật lớp "${nextName}" thuộc ${nextBranch}.`);
  };

  const filteredStudents = useMemo(() => {
    if (!currentClass) return [];
    return currentClass.students.filter(s => {
      const term = searchTerm.toLowerCase();
      return (
        (s.holyName || '').toLowerCase().includes(term) || 
        (s.fullName || '').toLowerCase().includes(term) ||
        (s.address || '').toLowerCase().includes(term) ||
        (s.phoneFather || '').includes(term) ||
        (s.phoneMother || '').includes(term)
      );
    });
  }, [currentClass, searchTerm]);

  const weekStats = useMemo(() => {
    if (!currentClass) return { present: 0, excused: 0, unexcused: 0, late: 0, total: 0, rate: 0 };
    const currentAtt = currentClass.attendance?.[selectedWeek] || {};
    const total = currentClass.students.length;
    let present = 0, excused = 0, unexcused = 0, late = 0;

    currentClass.students.forEach(s => {
      const st = currentAtt[s.id];
      if (st === 'present') present++;
      else if (st === 'excused') excused++;
      else if (st === 'unexcused') unexcused++;
      else if (st === 'late') late++;
    });

    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return { present, excused, unexcused, late, total, rate };
  }, [currentClass, selectedWeek]);

  if (!currentClass) return <div className="p-8 text-center text-slate-500">Đang tải dữ liệu lớp học...</div>;

  return (
    <div className="space-y-6">
      {/* KHỐI BỘ CHỌN LỚP & THÔNG TIN LỚP */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 via-orange-600 to-red-600 p-5 text-white">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="bg-amber-400 text-slate-900 font-bold text-xs px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {currentClass.branch}
                </span>
                <span className="text-amber-100 text-xs">Quan Thầy: <strong className="text-white">{currentClass.patron || 'Chưa chọn'}</strong></span>
              </div>

              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white">{currentClass.name}</h2>
                  <span className="text-[11px] font-mono font-bold text-amber-200">Mã lớp: {currentClass.code || '—'}</span>
                </div>
                
                {/* MENU THẢ CHỌN LỚP HỌC */}
                <div className="flex items-center bg-black/20 px-3 py-1.5 rounded-xl border border-white/30">
                  <span className="text-xs text-amber-200 me-2 font-medium">Đổi Lớp:</span>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="bg-transparent text-white font-bold text-sm focus:outline-none cursor-pointer"
                  >
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id} className="bg-slate-900 text-white">
                        {cls.code || "—"} · {cls.name} ({cls.branch})
                      </option>
                    ))}
                  </select>
                </div>

                {currentUser.role === 'admin' && (
                  <>
                    <button 
                      onClick={() => setShowAddClassModal(true)}
                      className="p-1.5 bg-amber-400 text-slate-900 hover:bg-amber-300 rounded-lg text-xs font-bold flex items-center gap-1"
                      title="Tạo Lớp Học Mới"
                    >
                      <Plus className="w-4 h-4" /> Tạo Lớp
                    </button>
                    <button
                      onClick={() => openEditClassModal(currentClass)}
                      className="p-1.5 bg-white text-red-700 hover:bg-amber-50 rounded-lg text-xs font-bold flex items-center gap-1 border border-white/50"
                      title="Sửa lớp / đổi ngành"
                    >
                      <Edit3 className="w-4 h-4" /> Sửa Lớp
                    </button>
                  </>
                )}
              </div>

              <p className="text-xs text-amber-100 mt-2 flex items-center gap-4 flex-wrap">
                <span>📍 {currentClass.room || 'Chưa xếp phòng'}</span>
                <span>⏰ {currentClass.schedule || 'Chủ Nhật'}</span>
                <span>👨‍🎓 Sĩ số: <strong>{currentClass.students.length} học viên</strong></span>
              </p>
            </div>

            {/* HIỂN THỊ DANH SÁCH TRƯỞNG & SƠ PHỤ TRÁCH */}
            <div className="bg-black/20 backdrop-blur border border-white/20 rounded-xl p-3.5 max-w-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase font-bold text-amber-300 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> Phụ Trách Lớp ({currentClass.leaders.length})
                </span>
                <button 
                  onClick={() => { setNewLeader({ userId: '', holyName: '', fullName: '', role: 'Huynh Trưởng Phụ', phone: '' }); setShowAddLeaderModal(true); }}
                  className="text-[11px] text-amber-200 hover:text-white underline font-medium"
                >
                  + Thêm Phụ Trách
                </button>
              </div>
              {currentClass.leaders.length === 0 ? (
                <p className="text-xs text-amber-100/70 italic">Chưa có thông tin Trưởng/Sơ phụ trách.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {currentClass.leaders.map(l => {
                    const linkedUser = l.userId ? users.find(u => u.id === l.userId) : null;
                    const holyName = linkedUser?.tenThanh ?? l.holyName ?? '';
                    const fullName = linkedUser?.hoTen ?? l.fullName ?? '';
                    const phone = linkedUser?.phone ?? l.phone ?? '';
                    return (
                      <div key={l.id} className="bg-white/10 border border-white/20 px-2 py-0.5 rounded text-xs flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span className="font-semibold text-amber-300">{l.role}:</span>
                        <span className="text-white">{holyName} {fullName}</span>
                        {l.userId && <span className="text-amber-200 font-mono text-[9px]">#{l.userId}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CÁC TAB CHỨC NĂNG */}
        <div className="flex border-b border-slate-200 bg-slate-100 px-4 overflow-x-auto text-xs sm:text-sm font-bold rounded-t-xl">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`py-3 px-4 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'attendance' ? 'border-red-600 text-red-600 bg-white' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" /> Điểm Danh Theo Tuần
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={`py-3 px-4 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'students' ? 'border-red-600 text-red-600 bg-white' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" /> Danh Sách Học Viên ({currentClass.students.length})
          </button>

          <button
            onClick={() => setActiveTab('leaders')}
            className={`py-3 px-4 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'leaders' ? 'border-red-600 text-red-600 bg-white' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Trưởng & Sơ Phụ Trách ({currentClass.leaders.length})
          </button>

          <button
            onClick={() => setActiveTab('summary')}
            className={`py-3 px-4 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'summary' ? 'border-red-600 text-red-600 bg-white' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" /> Bảng Tổng Kết Cả Năm
          </button>
        </div>
      </div>

      {/* TAB 1: ĐIỂM DANH HẰNG TUẦN */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Calendar className="w-4 h-4 text-red-600" /> Chọn tuần:
              </span>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="bg-slate-100 border font-bold text-red-600 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-red-600 focus:outline-none cursor-pointer"
              >
                {WEEKS_LIST.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleMarkAllPresent}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition"
            >
              <Check className="w-4 h-4" /> Đánh dấu tất cả "Có mặt"
            </button>
          </div>

          {/* Khối Thống kê */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-3 rounded-xl border text-center shadow-sm">
              <span className="text-[11px] text-slate-500 font-semibold block">Sĩ số</span>
              <span className="text-xl font-bold text-slate-800">{weekStats.total}</span>
            </div>
            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center shadow-sm">
              <span className="text-[11px] text-emerald-700 font-semibold block">Có mặt</span>
              <span className="text-xl font-bold text-emerald-700">{weekStats.present}</span>
            </div>
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-center shadow-sm">
              <span className="text-[11px] text-amber-700 font-semibold block">Đi trễ</span>
              <span className="text-xl font-bold text-amber-700">{weekStats.late}</span>
            </div>
            <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-center shadow-sm">
              <span className="text-[11px] text-blue-700 font-semibold block">Vắng có phép</span>
              <span className="text-xl font-bold text-blue-700">{weekStats.excused}</span>
            </div>
            <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-center shadow-sm col-span-2 sm:col-span-1">
              <span className="text-[11px] text-rose-700 font-semibold block">Vắng không phép</span>
              <span className="text-xl font-bold text-rose-700">{weekStats.unexcused}</span>
            </div>
          </div>

          {/* Bảng điểm danh */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-700 uppercase text-[11px] font-bold border-b">
                  <th className="p-3 w-10 text-center">STT</th>
                  <th className="p-3">Tên Thánh & Họ Tên Học Viên</th>
                  <th className="p-3 text-center">Trạng Thái Điểm Danh ({selectedWeek})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {currentClass.students.map((student, idx) => {
                  const currentAtt = currentClass.attendance?.[selectedWeek]?.[student.id] || '';
                  return (
                    <tr key={student.id} className="hover:bg-slate-50">
                      <td className="p-3 text-center text-slate-400">{idx + 1}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">
                          <span className="text-[10px] font-mono text-red-600 me-2">{student.id}</span>
                          <span className="text-orange-600 me-1">{student.holyName}</span>
                          <span>{student.fullName}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                          {student.phoneFather && (
                            <span><Phone className="w-3 h-3 inline text-slate-400 me-1" />Cha: {student.phoneFather}</span>
                          )}
                          {student.phoneMother && (
                            <span><Phone className="w-3 h-3 inline text-slate-400 me-1" />Mẹ: {student.phoneMother}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => handleSetAttendance(student.id, 'present')}
                            className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center gap-1 ${
                              currentAtt === 'present' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-emerald-50'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Có mặt
                          </button>

                          <button
                            onClick={() => handleSetAttendance(student.id, 'late')}
                            className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center gap-1 ${
                              currentAtt === 'late' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-amber-50'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" /> Trễ
                          </button>

                          <button
                            onClick={() => handleSetAttendance(student.id, 'excused')}
                            className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center gap-1 ${
                              currentAtt === 'excused' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-blue-50'
                            }`}
                          >
                            <AlertCircle className="w-3.5 h-3.5" /> VCP
                          </button>

                          <button
                            onClick={() => handleSetAttendance(student.id, 'unexcused')}
                            className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center gap-1 ${
                              currentAtt === 'unexcused' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-rose-50'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" /> VKP
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DANH SÁCH HỌC VIÊN CÓ ĐẦY ĐỦ BÍ TÍCH & SĐT CHA MẸ */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm tên, địa chỉ, SĐT Cha/Mẹ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-red-600 focus:outline-none"
              />
            </div>

            <button
              onClick={() => {
                setEditingStudent(null);
                setNewStudent(EMPTY_STUDENT);
                setShowAddStudentModal(true);
              }}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 shadow"
            >
              <UserPlus className="w-4 h-4" /> Thêm Học Viên Mới
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-700 uppercase text-[11px] font-bold border-b">
                  <th className="p-3 w-10 text-center">STT</th>
                  <th className="p-3">Tên Thánh & Họ Tên</th>
                  <th className="p-3">Ngày Sinh</th>
                  <th className="p-3">SĐT Cha / Mẹ</th>
                  <th className="p-3">Địa Chỉ Nhà</th>
                  <th className="p-3">Bí Tích Đã Nhận</th>
                  <th className="p-3 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredStudents.map((std, idx) => (
                  <tr key={std.id} className="hover:bg-slate-50">
                    <td className="p-3 text-center text-slate-400">{idx + 1}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">
                        <span className="text-[10px] font-mono text-red-600 me-2">{std.id}</span>
                        <span className="text-orange-600 me-1">{std.holyName}</span>
                        <span>{std.fullName}</span>
                      </div>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${std.gender === 'Nam' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                        {std.gender}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 font-medium">{std.dob || '—'}</td>
                    <td className="p-3 text-xs space-y-0.5">
                      <div><span className="text-slate-400 font-medium">Cha:</span> <span className="font-semibold text-slate-700">{std.phoneFather || '—'}</span></div>
                      <div><span className="text-slate-400 font-medium">Mẹ:</span> <span className="font-semibold text-slate-700">{std.phoneMother || '—'}</span></div>
                    </td>
                    <td className="p-3 text-xs text-slate-600 max-w-xs truncate" title={std.address}>
                      {std.address ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{std.address}</span>
                        </span>
                      ) : '—'}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {std.dateRuaToi ? (
                          <span className="bg-sky-100 text-sky-800 text-[10px] font-bold px-2 py-0.5 rounded" title={`Rửa Tội: ${std.dateRuaToi}`}>Rửa Tội</span>
                        ) : <span className="text-slate-300 text-[10px]">Chưa RT</span>}

                        {std.dateThanhThe ? (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded" title={`Thánh Thể: ${std.dateThanhThe}`}>Thánh Thể</span>
                        ) : <span className="text-slate-300 text-[10px]">Chưa TT</span>}

                        {std.dateRuocLeTrongThe ? (
                          <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded" title={`RL Trọng Thể: ${std.dateRuocLeTrongThe}`}>RL Trọng Thể</span>
                        ) : <span className="text-slate-300 text-[10px]">Chưa RLTT</span>}

                        {std.dateThemSuc ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded" title={`Thêm Sức: ${std.dateThemSuc}`}>Thêm Sức</span>
                        ) : <span className="text-slate-300 text-[10px]">Chưa TS</span>}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => {
                          setEditingStudent(std);
                          setNewStudent({ ...EMPTY_STUDENT, ...std });
                          setShowAddStudentModal(true);
                        }}
                        className="p-1 text-slate-500 hover:text-red-600 me-2"
                        title="Chỉnh sửa thông tin đầy đủ"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteStudent(std.id)}
                        className="p-1 text-slate-500 hover:text-rose-600"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TRƯỞNG & SƠ PHỤ TRÁCH */}
      {activeTab === 'leaders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border shadow-sm">
            <h3 className="font-bold text-slate-800 text-sm">Danh Sách Trưởng & Sơ Phụ Trách Lớp</h3>
            <button
              onClick={() => { setNewLeader({ userId: '', holyName: '', fullName: '', role: 'Huynh Trưởng Phụ', phone: '' }); setShowAddLeaderModal(true); }}
              className="bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold px-3 py-1.5 rounded-lg text-xs shadow flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Thêm Người Phụ Trách
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {currentClass.leaders.map((leader) => {
              const linkedUser = leader.userId ? users.find(u => u.id === leader.userId) : null;
              const holyName = linkedUser?.tenThanh ?? leader.holyName ?? '';
              const fullName = linkedUser?.hoTen ?? leader.fullName ?? '';
              const phone = linkedUser?.phone ?? leader.phone ?? '';
              return (
                <div key={leader.id} className="bg-white rounded-xl shadow-sm border p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                          {leader.role}
                        </span>
                        {leader.userId && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[9px] font-mono font-bold">
                            ID {leader.userId}
                          </span>
                        )}
                      </div>
                      {currentUser.role === 'admin' && (
                        <button onClick={() => handleDeleteLeader(leader.id)} className="text-slate-400 hover:text-rose-600 text-xs">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <h4 className="font-bold text-base text-slate-900">
                      <span className="text-orange-600 me-1">{holyName}</span>
                      <span>{fullName}</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {phone || 'Chưa có SĐT'}
                    </p>
                    {leader.userId && <p className="text-[10px] text-emerald-600 mt-1 font-medium">✓ Đang liên kết tài khoản — đổi hồ sơ sẽ tự cập nhật</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: BẢNG TỔNG KẾT */}
      {activeTab === 'summary' && (
        <div className="bg-white rounded-xl shadow-sm border p-4 space-y-3">
          <h3 className="font-bold text-slate-800 text-sm">Bảng Tổng Kết Hiện Diện Cả Năm</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold">
                  <th className="p-2 border w-8 text-center">STT</th>
                  <th className="p-2 border min-w-[150px]">Học Viên</th>
                  {WEEKS_LIST.map(week => (
                    <th key={week} className="p-2 border text-center min-w-[35px]">
                      {week.replace('Tuần ', 'T')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentClass.students.map((student, idx) => (
                  <tr key={student.id} className="hover:bg-slate-50">
                    <td className="p-2 border text-center text-slate-400">{idx + 1}</td>
                    <td className="p-2 border font-bold text-slate-900">
                      <span className="text-orange-600 me-1">{student.holyName}</span>
                      {student.fullName}
                    </td>
                    {WEEKS_LIST.map(week => {
                      const status = currentClass.attendance?.[week]?.[student.id];
                      let badge = "text-slate-300";
                      let label = "—";
                      if (status === 'present') { badge = "text-emerald-600 font-bold"; label = "✓"; }
                      else if (status === 'late') { badge = "text-amber-600 font-bold"; label = "T"; }
                      else if (status === 'excused') { badge = "text-blue-600 font-bold"; label = "P"; }
                      else if (status === 'unexcused') { badge = "text-rose-600 font-bold"; label = "V"; }

                      return (
                        <td key={week} className={`p-2 border text-center ${badge}`}>
                          {label}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL THÊM / SỬA ĐẦY ĐỦ THÔNG TIN HỌC VIÊN */}
      {showAddStudentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowAddStudentModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <XCircle className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-slate-800 text-base mb-4 border-b pb-2 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-red-600" />
              {editingStudent ? 'Sửa Hồ Sơ Chi Tiết Học Viên' : 'Thêm Học Viên Mới Vào Lớp'}
            </h3>

            <form onSubmit={handleSaveStudent} className="space-y-5 text-xs">
              {/* KHỐI 1: THÔNG TIN CÁ NHÂN */}
              <div className="space-y-3">
                <h4 className="font-bold text-red-600 uppercase text-[11px] tracking-wider flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> 1. Thông Tin Cá Nhân
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tên Thánh (*)</label>
                    <input type="text" required placeholder="VD: Maria, Giuse..." value={newStudent.holyName} onChange={e => setNewStudent({...newStudent, holyName: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-red-600 focus:outline-none" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Họ và Tên (*)</label>
                    <input type="text" required placeholder="VD: Nguyễn Văn A" value={newStudent.fullName} onChange={e => setNewStudent({...newStudent, fullName: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-red-600 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Ngày sinh (*)</label>
                    <input type="date" required value={newStudent.dob} onChange={e => setNewStudent({...newStudent, dob: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-red-600 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Giới tính</label>
                    <select value={newStudent.gender} onChange={e => setNewStudent({...newStudent, gender: e.target.value})} className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-red-600 focus:outline-none">
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* KHỐI 2: GIA ĐÌNH & ĐỊA CHỈ */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h4 className="font-bold text-orange-600 uppercase text-[11px] tracking-wider flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> 2. Gia Đình & Địa Chỉ
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">SĐT Cha</label>
                    <input type="tel" placeholder="VD: 0901 234 567" value={newStudent.phoneFather} onChange={e => setNewStudent({...newStudent, phoneFather: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-red-600 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">SĐT Mẹ</label>
                    <input type="tel" placeholder="VD: 0909 876 543" value={newStudent.phoneMother} onChange={e => setNewStudent({...newStudent, phoneMother: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-red-600 focus:outline-none" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Địa Chỉ Nhà</label>
                    <input type="text" placeholder="Số nhà, Tên đường, Phường/Xã, Quận/Huyện..." value={newStudent.address} onChange={e => setNewStudent({...newStudent, address: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-red-600 focus:outline-none" />
                  </div>
                </div>
              </div>

              {/* KHỐI 3: NGÀY LÃNH BÍ TÍCH */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h4 className="font-bold text-emerald-600 uppercase text-[11px] tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> 3. Ngày Lãnh Nhận Các Bí Tích
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Ngày Bí Tích Rửa Tội</label>
                    <input type="date" value={newStudent.dateRuaToi} onChange={e => setNewStudent({...newStudent, dateRuaToi: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-red-600 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Ngày Bí Tích Thánh Thể (Rước Lễ Lần Đầu)</label>
                    <input type="date" value={newStudent.dateThanhThe} onChange={e => setNewStudent({...newStudent, dateThanhThe: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-red-600 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Ngày Rước Lễ Trọng Thể</label>
                    <input type="date" value={newStudent.dateRuocLeTrongThe} onChange={e => setNewStudent({...newStudent, dateRuocLeTrongThe: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-red-600 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Ngày Bí Tích Thêm Sức</label>
                    <input type="date" value={newStudent.dateThemSuc} onChange={e => setNewStudent({...newStudent, dateThemSuc: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-red-600 focus:outline-none" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button type="button" onClick={() => setShowAddStudentModal(false)} className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300">Hủy</button>
                <button type="submit" className="px-5 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow">Lưu Hồ Sơ Học Viên</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddLeaderModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 relative shadow-2xl">
            <button onClick={() => setShowAddLeaderModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <XCircle className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-slate-800 text-base mb-3">Thêm Người Phụ Trách Lớp</h3>
            <form onSubmit={handleAddLeader} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Chọn tài khoản Huynh Trưởng/Dự Trưởng</label>
                <select
                  value={newLeader.userId || ''}
                  onChange={e => {
                    const userId = e.target.value;
                    const user = users.find(u => u.id === userId);
                    setNewLeader(user ? {
                      userId: user.id,
                      holyName: user.tenThanh || '',
                      fullName: user.hoTen || '',
                      role: user.chucVu?.[0] || 'Huynh Trưởng Phụ',
                      phone: user.phone || ''
                    } : { userId: '', holyName: '', fullName: '', role: 'Huynh Trưởng Phụ', phone: '' });
                  }}
                  className="w-full p-2 border rounded-lg bg-white"
                >
                  <option value="">-- Chọn tài khoản để đồng bộ --</option>
                  {users.filter(u => !(currentClass.leaders || []).some(l => l.userId === u.id)).map(u => (
                    <option key={u.id} value={u.id}>#{u.id} · {u.tenThanh} {u.hoTen}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">Chọn tài khoản là cách khuyến nghị: đổi tên hồ sơ sau này sẽ tự cập nhật trong lớp.</p>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Vai Trò (*)</label>
                <select value={newLeader.role} onChange={e => setNewLeader({...newLeader, role: e.target.value})} className="w-full p-2 border rounded-lg bg-white">
                  <option value="Sơ Phụ Trách">Sơ Phụ Trách</option>
                      <option value="Thầy Phụ Trách">Thầy Phụ Trách</option>
                      <option value="Cha Phụ Trách">Cha Phụ Trách</option>
                  <option value="Trưởng Lớp">Trưởng Lớp</option>
                  <option value="Huynh Trưởng Phụ">Huynh Trưởng Phụ</option>
                  <option value="Dự Trưởng">Dự Trưởng</option>
                </select>
              </div>
              {!newLeader.userId && <div>
                <label className="block font-bold text-slate-700 mb-1">Tên Thánh</label>
                <input type="text" placeholder="VD: Sơ Maria, Trưởng Giuse..." value={newLeader.holyName} onChange={e => setNewLeader({...newLeader, holyName: e.target.value})} className="w-full p-2 border rounded-lg" />
              </div>}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Họ và Tên (*)</label>
                <input type="text" required placeholder="VD: Nguyễn Thị Mơ" value={newLeader.fullName} onChange={e => setNewLeader({...newLeader, fullName: e.target.value})} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Số Điện Thoại</label>
                <input type="tel" placeholder="VD: 0901 234 567" value={newLeader.phone} onChange={e => setNewLeader({...newLeader, phone: e.target.value})} className="w-full p-2 border rounded-lg" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddLeaderModal(false)} className="px-3 py-1.5 bg-slate-200 text-slate-700 font-bold rounded">Hủy</button>
                <button type="submit" className="px-3 py-1.5 bg-amber-400 text-slate-900 font-bold rounded">Lưu Phụ Trách</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditClassModal && editingClass && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 relative shadow-2xl">
            <button onClick={() => { setShowEditClassModal(false); setEditingClass(null); }} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <XCircle className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-slate-800 text-base mb-1">Sửa Thông Tin Lớp</h3>
            <p className="text-[11px] text-slate-500 mb-4">
              Lớp hiện tại: <strong>{editingClass.code}</strong> · {editingClass.name}
            </p>
            <form onSubmit={handleEditClass} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Khối / Ngành (*)</label>
                <select value={editClassForm.branch} onChange={e => setEditClassForm({...editClassForm, branch: e.target.value})} className="w-full p-2 border rounded-lg bg-white">
                  <option value="Khối Chiên Con">Khối Chiên Con</option>
                  <option value="Khối Ấu Nhi">Khối Ấu Nhi</option>
                  <option value="Khối Thiếu Nhi">Khối Thiếu Nhi</option>
                  <option value="Khối Nghĩa Sĩ">Khối Nghĩa Sĩ</option>
                  <option value="Khối Hiệp Sĩ">Khối Hiệp Sĩ</option>
                  <option value="Dự Trưởng">Dự Trưởng</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên Lớp (*)</label>
                <input type="text" required value={editClassForm.name} onChange={e => setEditClassForm({...editClassForm, name: e.target.value})} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Phòng</label>
                <input type="text" placeholder="VD: Phòng 102 - Nhà Mục Vụ" value={editClassForm.room} onChange={e => setEditClassForm({...editClassForm, room: e.target.value})} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Thời khóa biểu</label>
                <input type="text" placeholder="VD: Chủ Nhật (07:30 - 09:30)" value={editClassForm.schedule} onChange={e => setEditClassForm({...editClassForm, schedule: e.target.value})} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Quan Thầy Lớp</label>
                <input type="text" placeholder="VD: Thánh Tarcisius" value={editClassForm.patron} onChange={e => setEditClassForm({...editClassForm, patron: e.target.value})} className="w-full p-2 border rounded-lg" />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-[11px] text-amber-800">
                Đổi ngành sẽ tự cập nhật mã lớp theo ngành mới. Học viên, điểm danh và người phụ trách vẫn được giữ nguyên.
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowEditClassModal(false); setEditingClass(null); }} className="px-3 py-1.5 bg-slate-200 text-slate-700 font-bold rounded">Hủy</button>
                <button type="submit" className="px-3 py-1.5 bg-red-600 text-white font-bold rounded flex items-center gap-1">
                  <Check className="w-4 h-4" /> Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddClassModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 relative shadow-2xl">
            <button onClick={() => setShowAddClassModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <XCircle className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-slate-800 text-base mb-3">Tạo Lớp Học Mới</h3>
            <form onSubmit={handleAddClass} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Khối Giới/Ngành (*)</label>
                <select value={newClass.branch} onChange={e => setNewClass({...newClass, branch: e.target.value})} className="w-full p-2 border rounded-lg bg-white">
                  <option value="Khối Chiên Con">Khối Chiên Con</option>
                  <option value="Khối Ấu Nhi">Khối Ấu Nhi</option>
                  <option value="Khối Thiếu Nhi">Khối Thiếu Nhi</option>
                  <option value="Khối Nghĩa Sĩ">Khối Nghĩa Sĩ</option>
                  <option value="Khối Hiệp Sĩ">Khối Hiệp Sĩ</option>
                  <option value="Dự Trưởng">Dự Trưởng</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên Lớp (*)</label>
                <input type="text" required placeholder="VD: Thêm Sức 1B" value={newClass.name} onChange={e => setNewClass({...newClass, name: e.target.value})} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Quan Thầy Lớp</label>
                <input type="text" placeholder="VD: Thánh Tarcisius" value={newClass.patron} onChange={e => setNewClass({...newClass, patron: e.target.value})} className="w-full p-2 border rounded-lg" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddClassModal(false)} className="px-3 py-1.5 bg-slate-200 text-slate-700 font-bold rounded">Hủy</button>
                <button type="submit" className="px-3 py-1.5 bg-red-600 text-white font-bold rounded">Tạo Lớp</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 3. TRANG HỒ SƠ CÁ NHÂN (PROFILE PAGE)
// ==========================================
function ProfilePage({ currentUser, onUpdate, isEditingOther = false }) {
  const isAdmin = currentUser.role === 'admin';

  const [formData, setFormData] = useState({ ...currentUser });
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [editingChucVu, setEditingChucVu] = useState(false);
  const [editingBan, setEditingBan] = useState(false);
  const [editingLop, setEditingLop] = useState(false);

  useEffect(() => {
    setFormData({ ...currentUser });
  }, [currentUser]);

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMultiSelect = (field, value, maxAllowed) => {
    if (!isAdmin && !isEditingOther) return; 

    const currentList = formData[field] || [];
    let updatedList = [];

    if (currentList.includes(value)) {
      updatedList = currentList.filter(item => item !== value);
    } else {
      if (currentList.length >= maxAllowed) {
        alert(`Chỉ được chọn tối đa ${maxAllowed} ${field === 'ban' ? 'ban' : field === 'lop' ? 'lớp' : 'chức vụ'}!`);
        return;
      }
      updatedList = [...currentList, value];
    }

    setFormData(prev => ({ ...prev, [field]: updatedList }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    let updatedData = { ...formData };
    let isPassChanged = false;

    if (newPassword.trim() !== "") {
      if (newPassword.length < 3) {
        alert("Mật khẩu mới phải từ 3 ký tự trở lên!");
        return;
      }
      if (newPassword !== confirmPassword) {
        alert("Xác nhận mật khẩu mới không khớp!");
        return;
      }
      updatedData.password = newPassword.trim();
      isPassChanged = true;
    }

    onUpdate(updatedData);

    setNewPassword("");
    setConfirmPassword("");

    if (isPassChanged) {
      alert("Cập nhật thành công! Mật khẩu mới đã được lưu.");
    } else {
      alert("Lưu thông tin hồ sơ thành công!");
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 p-6 text-white flex flex-col sm:flex-row items-center gap-6">
        <div className="relative group">
          <img 
            src={formData.avatar || "https://via.placeholder.com/120"} 
            alt="Avatar" 
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white object-cover shadow-lg"
          />
          <label className="absolute bottom-0 right-0 bg-slate-900 text-white p-2 rounded-full cursor-pointer hover:bg-red-600 transition shadow" title="Tải ảnh đại diện">
            <Camera className="w-3.5 h-3.5" />
            <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
          </label>
        </div>

        <div className="text-center sm:text-left flex-1">
          <h2 className="text-2xl font-bold">{formData.tenThanh} {formData.hoTen}</h2>
          <p className="text-amber-100 text-sm font-medium">{formData.email}</p>
          <p className="text-amber-200 text-xs font-mono font-bold mt-1">ID thành viên: {formData.id}</p>
          <div className="mt-2 flex flex-wrap justify-center sm:justify-start gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${formData.role === 'admin' ? 'bg-amber-400 text-slate-900' : 'bg-white/20 text-white'}`}>
              {formData.role === 'admin' ? 'Admin / Quản Trị' : 'Huynh Trưởng'}
            </span>
            <span className="px-3 py-1 bg-black/20 rounded-full text-xs text-white">
              Niên khoá: {formData.nienKhoa || "2023 - 2024"}
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {!isAdmin && !isEditingOther && (
          <div className="p-3 bg-amber-50 border-l-4 border-amber-500 text-amber-800 text-xs rounded flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Các mục <strong>Chức vụ, Ban, Ngành, Lớp</strong> do Admin quản lý. Bạn có thể tự đổi Tên thánh, Họ tên, Ngày sinh và Mật khẩu.</span>
          </div>
        )}

        <div>
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 border-b pb-1 flex items-center gap-2">
            <User className="w-4 h-4 text-red-600" /> Thông Tin Cá Nhân
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tên Thánh</label>
              <input 
                type="text" 
                value={formData.tenThanh || ''} 
                onChange={e => setFormData({ ...formData, tenThanh: e.target.value })}
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-red-600 focus:outline-none"
                placeholder="VD: Maria, Giuse..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Họ và Tên</label>
              <input 
                type="text" 
                value={formData.hoTen || ''} 
                onChange={e => setFormData({ ...formData, hoTen: e.target.value })}
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-red-600 focus:outline-none"
                placeholder="VD: Nguyễn Văn A"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Ngày Tháng Năm Sinh</label>
              <input 
                type="date" 
                value={formData.ngaySinh || ''} 
                onChange={e => setFormData({ ...formData, ngaySinh: e.target.value })}
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-red-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Email Đăng Nhập</label>
              <input 
                type="text" 
                disabled
                value={formData.email} 
                className="w-full p-2.5 border rounded-lg bg-slate-100 text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-xl border ${(isAdmin || isEditingOther) ? 'bg-orange-50/40 border-orange-200' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-orange-600" /> Phân Công Chức Vụ & Ban Lớp
            </h3>
          </div>

          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Vai Trò Hệ Thống</label>
                <select 
                  disabled={!isAdmin && !isEditingOther}
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  className="w-full p-2.5 border rounded-lg disabled:bg-slate-100 font-bold text-red-600"
                >
                  <option value="user">Thành Viên (Huynh Trưởng)</option>
                  <option value="admin">Admin (Quản Trị Viên)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Ngành Sinh Hoạt</label>
                <select 
                  disabled={!isAdmin && !isEditingOther}
                  value={formData.nganh || ''}
                  onChange={e => setFormData({ ...formData, nganh: e.target.value })}
                  className="w-full p-2.5 border rounded-lg disabled:bg-slate-100"
                >
                  <option value="">-- Chưa chọn ngành --</option>
                  <option value="Chiên Con">Chiên Con</option>
                  <option value="Ấu Nhi">Ấu Nhi</option>
                  <option value="Thiếu Nhi">Thiếu Nhi</option>
                  <option value="Nghĩa Sĩ">Nghĩa Sĩ</option>
                  <option value="Hiệp Sĩ">Hiệp Sĩ</option>
                  <option value="Dự Trưởng">Dự Trưởng</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Niên Khoá</label>
                <input 
                  type="text" 
                  disabled={!isAdmin && !isEditingOther}
                  value={formData.nienKhoa || ''} 
                  onChange={e => setFormData({ ...formData, nienKhoa: e.target.value })}
                  placeholder="VD: 2023 - 2024"
                  className="w-full p-2.5 border rounded-lg disabled:bg-slate-100"
                />
              </div>
            </div>

            {/* 1. CHỨC VỤ */}
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-slate-700">Chức Vụ Đang Phụ Trách:</label>
                {(isAdmin || isEditingOther) && (
                  <button type="button" onClick={() => setEditingChucVu(!editingChucVu)} className="text-xs text-red-600 font-semibold hover:underline">
                    {editingChucVu ? "Xác Nhận / Thu Gọn" : "+ Thay Đổi / Chỉnh Sửa"}
                  </button>
                )}
              </div>

              {editingChucVu ? (
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded border">
                  {CHUC_VU_LIST.map((cv) => {
                    const isSelected = (formData.chucVu || []).includes(cv);
                    return (
                      <button type="button" key={cv} onClick={() => handleMultiSelect("chucVu", cv, 2)} className={`text-xs px-2.5 py-1 rounded-md border font-medium ${isSelected ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-700'}`}>
                        {isSelected && <Check className="w-3 h-3 inline me-1" />}{cv}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  {formData.chucVu && formData.chucVu.length > 0 ? (
                    formData.chucVu.map((cv) => (
                      <span key={cv} className="bg-rose-100 text-red-900 font-semibold px-3 py-1 rounded-lg text-xs flex items-center gap-1 shadow-sm">
                        <ShieldCheck className="w-3.5 h-3.5 text-red-600" /> {cv}
                      </span>
                    ))
                  ) : <span className="text-slate-400 text-xs italic">Chưa chọn chức vụ</span>}
                </div>
              )}
            </div>

            {/* 2. BAN */}
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-slate-700">Ban Phụ Trách:</label>
                {(isAdmin || isEditingOther) && (
                  <button type="button" onClick={() => setEditingBan(!editingBan)} className="text-xs text-orange-600 font-semibold hover:underline">
                    {editingBan ? "Xác Nhận / Thu Gọn" : "+ Thay Đổi / Chỉnh Sửa"}
                  </button>
                )}
              </div>

              {editingBan ? (
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded border">
                  {BAN_LIST.map((b) => {
                    const isSelected = (formData.ban || []).includes(b);
                    return (
                      <button type="button" key={b} onClick={() => handleMultiSelect("ban", b, 2)} className={`text-xs px-2.5 py-1 rounded-md border font-medium ${isSelected ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-slate-700'}`}>
                        {isSelected && <Check className="w-3 h-3 inline me-1" />}{b}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  {formData.ban && formData.ban.length > 0 ? (
                    formData.ban.map((b) => (
                      <span key={b} className="bg-orange-100 text-orange-700 font-semibold px-3 py-1 rounded-lg text-xs flex items-center gap-1 shadow-sm">
                        <Users className="w-3.5 h-3.5" /> {b}
                      </span>
                    ))
                  ) : <span className="text-slate-400 text-xs italic">Chưa chọn ban</span>}
                </div>
              )}
            </div>

            {/* 3. LỚP */}
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-slate-700">Lớp Phụ Trách:</label>
                {(isAdmin || isEditingOther) && (
                  <button type="button" onClick={() => setEditingLop(!editingLop)} className="text-xs text-amber-800 font-semibold hover:underline">
                    {editingLop ? "Xác Nhận / Thu Gọn" : "+ Thay Đổi / Chỉnh Sửa"}
                  </button>
                )}
              </div>

              {editingLop ? (
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded border">
                  {LOP_LIST.map((l) => {
                    const isSelected = (formData.lop || []).includes(l);
                    return (
                      <button type="button" key={l} onClick={() => handleMultiSelect("lop", l, 3)} className={`text-xs px-2.5 py-1 rounded-md border font-medium ${isSelected ? 'bg-amber-400 text-slate-900 font-bold' : 'bg-white text-slate-700'}`}>
                        {isSelected && <Check className="w-3 h-3 inline me-1" />}{l}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  {formData.lop && formData.lop.length > 0 ? (
                    formData.lop.map((l) => (
                      <span key={l} className="bg-amber-100 text-amber-900 font-bold px-3 py-1 rounded-lg text-xs flex items-center gap-1 shadow-sm">
                        <GraduationCap className="w-3.5 h-3.5 text-amber-700" /> {l}
                      </span>
                    ))
                  ) : <span className="text-slate-400 text-xs italic">Chưa phân công lớp</span>}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-500" /> Đổi Mật Khẩu Đăng Nhập
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Mật Khẩu Mới</label>
              <input 
                type="password" 
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới..."
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-red-600 focus:outline-none text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Xác Nhận Mật Khẩu Mới</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới..."
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-red-600 focus:outline-none text-sm bg-white"
              />
            </div>
          </div>
        </div>

        <div className="text-right pt-2">
          <button
            type="submit"
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 ms-auto"
          >
            <Check className="w-4 h-4" /> LƯU THÔNG TIN HỒ SƠ
          </button>
        </div>
      </form>
    </div>
  );
}

// ==========================================
// 4. TRANG TÀI LIỆU & HỌC TẬP (LMS PAGE)
// ==========================================
function LMSPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-red-600" /> Thư Viện & Bài Học Huynh Trưởng LMS
        </h2>
        <p className="text-xs text-slate-500 mt-1">Góc học tập cá nhân, tài liệu giáo án Phong Trào TNTT và Giáo Lý Xứ Đoàn Thăng Long.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-red-600 to-orange-600 p-4 text-white">
            <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded text-white uppercase">Phong Trào</span>
            <h3 className="font-bold text-base mt-2">Kỹ Năng Nghiêm Tập & Đội Chúng</h3>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-xs text-slate-600">Phương pháp hàng đội, nghiêm tập, khẩu lệnh và phong thái Huynh Trưởng.</p>
            <button className="w-full py-2 bg-slate-100 hover:bg-red-600 hover:text-white text-slate-800 font-bold text-xs rounded transition flex items-center justify-center gap-1">
              Bắt đầu học
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-600 to-amber-500 p-4 text-white">
            <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded text-white uppercase">Giáo Lý</span>
            <h3 className="font-bold text-base mt-2">Sư Phạm Giáo Lý Thiếu Nhi</h3>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-xs text-slate-600">Kỹ năng đứng lớp, truyền đạt Lời Chúa cho thiếu nhi các ngành Chiên, Ấu, Thiếu, Nghĩa.</p>
            <button className="w-full py-2 bg-slate-100 hover:bg-red-600 hover:text-white text-slate-800 font-bold text-xs rounded transition flex items-center justify-center gap-1">
              Bắt đầu học
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-4 text-white">
            <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded text-white uppercase">Sinh Hoạt</span>
            <h3 className="font-bold text-base mt-2">Kỹ Năng Quản Trò & Lửa Trại</h3>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-xs text-slate-600">Kho trò chơi sinh hoạt, băng reo, bài hát sinh hoạt & tổ chức lửa trại.</p>
            <button className="w-full py-2 bg-slate-100 hover:bg-red-600 hover:text-white text-slate-800 font-bold text-xs rounded transition flex items-center justify-center gap-1">
              Bắt đầu học
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 5. TRANG QUẢN LÝ HỒ SƠ HUYNH TRƯỞNG (ADMIN)
// ==========================================
function AdminMembersPage({ users, classes, secretBoxes, setSecretBoxes, onAddUser, onUpdateUser, onDeleteUser, currentUser }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [editingSecret, setEditingSecret] = useState(null);
  const [secretTitle, setSecretTitle] = useState("");
  const [secretUserId, setSecretUserId] = useState("");
  const [secretOpenDate, setSecretOpenDate] = useState("");
  const [secretClassName, setSecretClassName] = useState("");
  const [secretClassNames, setSecretClassNames] = useState([]);
  const [secretLeaderType, setSecretLeaderType] = useState("Huynh Trưởng");

  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState(DEFAULT_INITIAL_PASSWORD); 
  const [newUserName, setNewUserName] = useState("");
  const [newUserHoly, setNewUserHoly] = useState("Giuse");

  const openSecretEditor = (box = null) => {
    setEditingSecret(box);
    setSecretTitle(box?.title || "");
    setSecretUserId(box?.userId || "");
    setSecretOpenDate(box?.openDate || "");
    const savedClasses = Array.isArray(box?.classNames)
      ? box.classNames
      : (box?.className ? [box.className] : []);
    setSecretClassNames(savedClasses);
    setSecretClassName(savedClasses[0] || "");
    setSecretLeaderType(box?.leaderType || "Huynh Trưởng");
    setShowSecretModal(true);
  };

  const handleSaveSecret = (e) => {
    e.preventDefault();
    if (!secretTitle.trim()) {
      alert("Vui lòng nhập tên Box Secret.");
      return;
    }
    if (!secretUserId) {
      alert("Vui lòng chọn người phụ trách.");
      return;
    }
    if (!secretOpenDate) {
      alert("Vui lòng chọn ngày mở Box Secret.");
      return;
    }
    const selectedClasses = Array.from(new Set(
      (Array.isArray(secretClassNames) ? secretClassNames : [])
        .filter(Boolean)
    ));

    if (!selectedClasses.length) {
      alert("Vui lòng chọn ít nhất một lớp hiển thị trong Box Secret.");
      return;
    }

    const secretData = {
      title: secretTitle.trim(),
      userId: secretUserId,
      openDate: secretOpenDate,
      // Lưu toàn bộ các lớp Admin chọn.
      classNames: selectedClasses,
      // Loại người phụ trách: Huynh Trưởng / Thầy / Sơ / Cha.
      leaderType: secretLeaderType,
      // Giữ className để tương thích dữ liệu Box Secret cũ.
      className: selectedClasses[0]
    };

    if (editingSecret) {
      setSecretBoxes(prev => prev.map(box =>
        box.id === editingSecret.id
          ? { ...box, ...secretData }
          : box
      ));
    } else {
      setSecretBoxes(prev => [
        ...prev,
        {
          id: `secret-${Date.now()}`,
          ...secretData
        }
      ]);
    }

    setShowSecretModal(false);
    setEditingSecret(null);
    setSecretTitle("");
    setSecretUserId("");
    setSecretOpenDate("");
    setSecretClassName("");
    setSecretClassNames([]);
    setSecretLeaderType("Huynh Trưởng");
  };

  const handleDeleteSecret = (boxId) => {
    if (!confirm("Bạn có chắc muốn xóa Box Secret này?")) return;
    setSecretBoxes(prev => prev.filter(box => box.id !== boxId));
  };

  const handleCreateUser = (e) => {
    e.preventDefault();
    let formattedEmail = newUserEmail.trim().toLowerCase();
    if (!formattedEmail.includes("@")) {
      formattedEmail += "@thanglong.vn";
    }

    if (users.some(u => u.email.toLowerCase() === formattedEmail)) {
      alert("Email này đã tồn tại trong danh sách!");
      return;
    }

    const newUser = {
      id: getNextUserId(users),
      email: formattedEmail,
      password: newUserPassword.trim() || DEFAULT_INITIAL_PASSWORD,
      tenThanh: newUserHoly.trim() || "Giuse",
      hoTen: newUserName.trim(),
      ngaySinh: "2000-01-01",
      role: "user",
      chucVu: ["Huynh Trưởng"],
      ban: [],
      nganh: "Thiếu Nhi",
      lop: [],
      nienKhoa: "2023 - 2024",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"
    };

    onAddUser(newUser);

    setShowAddModal(false);
    setNewUserEmail("");
    setNewUserPassword(DEFAULT_INITIAL_PASSWORD);
    setNewUserName("");
    setNewUserHoly("Giuse");
    
    alert(`Đã thêm thành công!\nID thành viên: ${newUser.id}\nEmail: ${formattedEmail}\nMật khẩu: ${newUser.password}`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-red-600" /> Quản Lý Hồ Sơ Huynh Trưởng (Admin)
          </h2>
          <p className="text-xs text-slate-500 mt-1">Mỗi tài khoản có ID cố định (001, 002, 003...). Đổi tên hồ sơ không tạo tài khoản mới; dữ liệu lớp được đồng bộ theo ID.</p>
        </div>

        <button 
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" /> Thêm Huynh Trưởng Mới
        </button>
      </div>

      {/* QUẢN LÝ BOX SECRET */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 p-5 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <Mail className="w-5 h-5" /> QUẢN LÝ BOX SECRET
              </h3>
              <p className="text-[11px] text-amber-100 mt-1">
                Admin tạo/chỉnh sửa Box và chọn người phụ trách. Box sẽ tự lấy đúng các lớp đang được phân công cho người đó.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openSecretEditor()}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-xs rounded-lg shadow flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Thêm Box Secret
            </button>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {secretBoxes.length === 0 ? (
            <div className="p-5 text-center text-slate-400 text-xs italic border border-dashed rounded-xl">
              Chưa có Box Secret.
            </div>
          ) : (
            secretBoxes.map(box => {
              const boxUser = users.find(u => u.id === box.userId);
              const boxClasses = boxUser?.lop || [];
              const displayClasses = Array.from(new Set(
                Array.isArray(box.classNames) && box.classNames.length
                  ? box.classNames
                  : (box.className ? [box.className] : boxClasses)
              ));

              return (
                <div key={box.id} className="border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-11 h-11 shrink-0 rounded-xl bg-amber-100 text-orange-700 flex items-center justify-center">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900">{box.title || 'Box Secret'}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Người phụ trách: <strong>{boxUser ? `${boxUser.tenThanh || ''} ${boxUser.hoTen || ''}`.trim() : 'Chưa gán'}</strong>
                        {boxUser?.id && <span className="font-mono ml-1">#{boxUser.id}</span>}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold">
                          Lớp: {displayClasses.length ? displayClasses.join(', ') : 'Chưa chọn lớp'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          box.openDate
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-600 border-rose-200'
                        }`}>
                          Ngày mở: {box.openDate ? box.openDate.split('-').reverse().join('/') : 'Chưa đặt ngày'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => openSecretEditor(box)}
                      className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-xs rounded-lg flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Chỉnh sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSecret(box.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                      title="Xóa Box Secret"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showSecretModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 relative shadow-2xl">
            <button
              type="button"
              onClick={() => {
                setShowSecretModal(false);
                setEditingSecret(null);
                setSecretTitle("");
                setSecretUserId("");
                setSecretOpenDate("");
                setSecretClassName("");
                setSecretClassNames([]);
                setSecretLeaderType("Huynh Trưởng");
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <XCircle className="w-6 h-6" />
            </button>

            <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
              <Mail className="w-5 h-5 text-orange-600" />
              {editingSecret ? 'Chỉnh Sửa Box Secret' : 'Thêm Box Secret'}
            </h3>
            <p className="text-[11px] text-slate-500 mb-5">
              Chọn người nhận, ngày mở và lớp sẽ hiển thị trong lá thư. Đến đúng ngày đã cài đặt, Box mới xuất hiện sau khi người đó đăng nhập.
            </p>

            <form onSubmit={handleSaveSecret} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên Box Secret (*)</label>
                <input
                  type="text"
                  required
                  value={secretTitle}
                  onChange={e => setSecretTitle(e.target.value)}
                  placeholder="VD: Hộp Thư Bí Mật 01"
                  className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-red-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Người phụ trách (*)</label>
                <select
                  required
                  value={secretUserId}
                  onChange={e => setSecretUserId(e.target.value)}
                  className="w-full p-2.5 border rounded-lg bg-white focus:ring-2 focus:ring-red-600 focus:outline-none"
                >
                  <option value="">-- Chọn Huynh Trưởng --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      #{u.id} · {u.tenThanh} {u.hoTen}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ngày mở Box Secret (*)</label>
                <input
                  type="date"
                  required
                  value={secretOpenDate}
                  onChange={e => setSecretOpenDate(e.target.value)}
                  className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-red-600 focus:outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">Người nhận chỉ thấy lá thư từ đúng ngày này trở đi.</p>
              </div>

              {secretUserId && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Người phụ trách (*)</label>
                  <select
                    required
                    value={secretLeaderType}
                    onChange={e => setSecretLeaderType(e.target.value)}
                    className="w-full p-2.5 border rounded-lg bg-white focus:ring-2 focus:ring-red-600 focus:outline-none"
                  >
                    <option value="Huynh Trưởng">Huynh Trưởng phụ trách</option>
                    <option value="Thầy">Thầy phụ trách</option>
                    <option value="Sơ">Sơ phụ trách</option>
                      <option value="Cha">Cha</option>
                    <option value="Cha">Cha phụ trách</option>
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Chọn đúng danh xưng của người phụ trách để hiển thị trên lá thư.
                  </p>
                </div>
              )}

              {secretUserId && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700">Lớp hiển thị trong thư (*)</label>
                    <span className="text-[10px] text-amber-700 font-bold">
                      {secretClassNames.length} lớp đã chọn
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2 max-h-52 overflow-y-auto">
                    {Array.from(new Set(
                      classes
                        .filter(cls =>
                          (users.find(u => String(u.id) === String(secretUserId))?.lop || []).includes(cls.name) ||
                          (cls.leaders || []).some(leader => String(leader.userId) === String(secretUserId))
                        )
                        .map(cls => cls.name)
                    )).map(lop => {
                      const checked = secretClassNames.includes(lop);
                      return (
                        <label
                          key={lop}
                          className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition ${
                            checked
                              ? 'bg-amber-100 border-amber-300'
                              : 'bg-white border-slate-200 hover:bg-amber-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setSecretClassNames(prev => {
                                const next = prev.includes(lop)
                                  ? prev.filter(name => name !== lop)
                                  : [...prev, lop];
                                setSecretClassName(next[0] || "");
                                return next;
                              });
                            }}
                            className="w-4 h-4 accent-orange-600"
                          />
                          <span className="text-xs font-bold text-slate-800">{lop}</span>
                        </label>
                      );
                    })}
                  </div>

                  <p className="text-[10px] text-slate-500 mt-1">
                    Admin có thể chọn <strong>một hoặc nhiều lớp</strong>. Tất cả các lớp được chọn sẽ cùng xuất hiện trên một lá thư.
                  </p>

                  {secretClassNames.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {secretClassNames.map(lop => (
                        <span key={lop} className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-1 rounded-lg text-[10px] font-bold">
                          {lop}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {secretUserId && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <div className="font-bold text-amber-900 mb-2">Lớp của người này:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(users.find(u => String(u.id) === String(secretUserId))?.lop || []).length > 0 ? (
                      (users.find(u => String(u.id) === String(secretUserId))?.lop || []).map((lop, idx) => (
                        <span key={idx} className="bg-white border border-amber-300 text-amber-900 px-2 py-1 rounded-lg font-bold">
                          {lop}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic">Chưa được phân công lớp</span>
                    )}
                  </div>
                  <p className="text-[10px] text-amber-700 mt-2">
                    Danh sách trên là các lớp người này đang phụ trách. Admin có thể chọn nhiều lớp ở mục “Lớp hiển thị trong thư”; các lớp đã chọn sẽ cùng xuất hiện trên một lá thư.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => {
                setShowSecretModal(false);
                setEditingSecret(null);
                setSecretTitle("");
                setSecretUserId("");
                setSecretOpenDate("");
                setSecretClassName("");
                 setSecretClassNames([]);
                 setSecretLeaderType("Huynh Trưởng");
              }}
                  className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg flex items-center gap-1"
                >
                  <Check className="w-4 h-4" /> Lưu Box
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 uppercase text-[11px] font-bold border-b">
              <th className="p-3">ID / Huynh Trưởng</th>
              <th className="p-3">Mật Khẩu</th>
              <th className="p-3">Chức Vụ Đã Chọn</th>
              <th className="p-3">Ban Đã Chọn</th>
              <th className="p-3">Lớp Đã Chọn</th>
              <th className="p-3 text-center">Hành Động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50 transition">
                <td className="p-3 flex items-center space-x-3">
                  <img src={u.avatar || "https://via.placeholder.com/40"} className="w-10 h-10 rounded-full object-cover border" />
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span className="font-mono text-[10px] text-red-600 mr-1">#{u.id}</span>
                      {u.tenThanh} {u.hoTen}
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${u.role === 'admin' ? 'bg-amber-400 text-slate-900' : 'bg-slate-100 text-slate-600'}`}>
                        {u.role === 'admin' ? 'Admin' : 'Thành viên'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </div>
                </td>
                <td className="p-3 font-mono text-xs text-red-800 font-bold">
                  {u.password}
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {u.chucVu && u.chucVu.length > 0 ? (
                      u.chucVu.map((cv, idx) => (
                        <span key={idx} className="bg-rose-50 text-red-600 text-[10px] px-2 py-0.5 rounded font-medium border border-rose-200">
                          {cv}
                        </span>
                      ))
                    ) : <span className="text-slate-400 text-xs italic">Chưa chọn</span>}
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {u.ban && u.ban.length > 0 ? (
                      u.ban.map((b, idx) => (
                        <span key={idx} className="bg-orange-50 text-orange-600 text-[10px] px-2 py-0.5 rounded font-medium border border-orange-200">
                          {b}
                        </span>
                      ))
                    ) : <span className="text-slate-400 text-xs italic">Chưa chọn</span>}
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {u.lop && u.lop.length > 0 ? (
                      u.lop.map((l, idx) => (
                        <span key={idx} className="bg-amber-50 text-amber-800 text-[10px] px-2 py-0.5 rounded font-medium border border-amber-200">
                          {l}
                        </span>
                      ))
                    ) : <span className="text-slate-400 text-xs italic">Chưa chọn</span>}
                  </div>
                </td>
                <td className="p-3 text-center">
                  <div className="flex justify-center items-center gap-2">
                    <button 
                      onClick={() => setSelectedUser(u)}
                      className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-xs rounded transition flex items-center gap-1 shadow-sm"
                      title="Sửa hồ sơ & phân công"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Sửa
                    </button>
                    {u.id !== currentUser.id && (
                      <button 
                        onClick={() => onDeleteUser(u.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                        title="Xóa Huynh Trưởng"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL SỬA HỒ SƠ */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
            <button 
              onClick={() => setSelectedUser(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <XCircle className="w-6 h-6" />
            </button>

            <div className="mb-4 pb-2 border-b">
              <h3 className="text-lg font-bold text-red-800">
                Chỉnh sửa hồ sơ: {selectedUser.tenThanh} {selectedUser.hoTen}
              </h3>
              <p className="text-xs text-slate-500">
                Email: <span className="font-semibold text-slate-700">{selectedUser.email}</span>
              </p>
            </div>

            <ProfilePage 
              currentUser={selectedUser} 
              isEditingOther={true}
              onUpdate={(updated) => {
                onUpdateUser(updated);
                setSelectedUser(null);
              }} 
            />
          </div>
        </div>
      )}

      {/* MODAL TẠO THÀNH VIÊN MỚI */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 relative shadow-2xl">
            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <XCircle className="w-6 h-6" />
            </button>

            <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-red-600" /> Thêm Huynh Trưởng Mới
            </h3>
            <p className="text-[10px] text-slate-500 mb-3">ID sẽ được hệ thống tự cấp theo thứ tự: 001, 002, 003...</p>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Thành Viên Mới</label>
                <input type="text" required placeholder="VD: giusevan" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mật Khẩu Khởi Tạo</label>
                <input type="text" required value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm font-mono" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tên Thánh</label>
                  <input type="text" required placeholder="VD: Maria, Giuse" value={newUserHoly} onChange={e => setNewUserHoly(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Họ và Tên</label>
                  <input type="text" required placeholder="VD: Nguyễn Văn A" value={newUserName} onChange={e => setNewUserName(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-slate-200 text-slate-700 font-bold text-xs rounded-lg">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-red-600 text-white font-bold text-xs rounded-lg shadow">Tạo & Kích Hoạt</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}