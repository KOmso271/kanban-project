// components/board/KanbanApp.tsx
"use client";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { DndContext, closestCenter, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { Toaster, toast } from "react-hot-toast";
import { formatDistanceToNow, format } from "date-fns";
import { vi, enUS } from "date-fns/locale";
import { priorityConfig, LABEL_COLORS } from "@/lib/constants";
import Image from "next/image";
import NotificationBell from "./NotificationBell";
import { translations, translatePriority } from "@/lib/translations";

// Import Components Con
import SortableColumn from "./SortableColumn";
import TaskCard from "./TaskCard";
import TaskDetailModal from "../modals/TaskDetailModal";
import MembersModal from "../modals/MembersModal";
import ProfileModal from "../modals/ProfileModal";
import Sidebar from "./Sidebar";
import HomeDashboard from "./HomeDashboard";
import { SortableListColumn } from "./SortableList";
import { useRouter, useSearchParams } from "next/navigation";

export default function KanbanApp({ session }: { session: any }) {
  const currentUser = session.user;

  // 👇 STATE NGÔN NGỮ ĐƯỢC THÊM VÀO ĐÂY 👇
  const [lang, setLang] = useState<"vi" | "en">("vi");
  
  useEffect(() => {
    const savedLang = localStorage.getItem("app_lang") as "vi" | "en";
    if (savedLang) setLang(savedLang);
  }, []);

  const toggleLanguage = () => {
    const newLang = lang === "vi" ? "en" : "vi";
    setLang(newLang);
    localStorage.setItem("app_lang", newLang);
  };

  const t = translations[lang as keyof typeof translations] || translations["vi"];
  // 👆 KẾT THÚC CÀI ĐẶT NGÔN NGỮ 👆

  // --- UI & NAVIGATION STATES ---
  const [currentView, setCurrentView] = useState<"home" | "board">("home");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [taskViewMode, setTaskViewMode] = useState<"board" | "list">("board");
  const [activeItem, setActiveItem] = useState<any>(null);

  // --- STATE THEO DÕI TASK CẦN MỞ TỰ ĐỘNG ---
  const [autoOpenTaskId, setAutoOpenTaskId] = useState<string | null>(null);

  // --- CORE DATA STATES ---
  const [boards, setBoards] = useState<any[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [columns, setColumns] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [boardStats, setBoardStats] = useState<Record<string, { taskCount: number; progress: number }>>({});

  // --- BIẾN KÍCH HOẠT REALTIME CHO DASHBOARD ---
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // --- USER DATA STATES ---
  const [myProfile, setMyProfile] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allBoardMembers, setAllBoardMembers] = useState<any[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // --- MODALS & MENUS STATES ---
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAddingBoard, setIsAddingBoard] = useState(false);

  // --- COLUMN CREATION STATES ---
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const columnTitleRef = useRef("");
  const newColumnInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- TASK DETAIL STATES ---
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [editTaskContent, setEditTaskContent] = useState("");
  const [editTaskDescription, setEditTaskDescription] = useState("");
  const [editTaskAssignees, setEditTaskAssignees] = useState<string[]>([]);
  const [editTaskDueDate, setEditTaskDueDate] = useState<string>("");
  const [editTaskStartDate, setEditTaskStartDate] = useState<string>("");
  const [editTaskPriority, setEditTaskPriority] = useState<string>("normal");

  // --- TASK EXTRAS STATES ---
  const [boardLabels, setBoardLabels] = useState<any[]>([]);
  const [taskLabels, setTaskLabels] = useState<any[]>([]);
  const [showLabelMenu, setShowLabelMenu] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0]);
  const [taskChecklists, setTaskChecklists] = useState<any[]>([]);
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [taskComments, setTaskComments] = useState<any[]>([]);
  const [newCommentContent, setNewCommentContent] = useState("");
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [taskAttachments, setTaskAttachments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [taskActivities, setTaskActivities] = useState<any[]>([]);

  // --- FILTER STATES ---
  const [searchTaskQuery, setSearchTaskQuery] = useState("");
  const [filterAssigneeId, setFilterAssigneeId] = useState<string | "all">("all");
  const [filterLabelId, setFilterLabelId] = useState<string | "all">("all");
  const [filterPriority, setFilterPriority] = useState<string | "all">("all");
  const [searchMemberQuery, setSearchMemberQuery] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // ==========================================
  // MEMOIZED VALUES & QUYỀN HẠN
  // ==========================================
  const activeBoardMembers = useMemo(() => {
    if (!activeBoardId || allUsers.length === 0) return [];
    const uniqueMembers = new Map();
    allBoardMembers.filter(bm => bm.board_id === activeBoardId).forEach(bm => {
      const user = allUsers.find(u => u.id === bm.user_id);
      if (user && !uniqueMembers.has(user.id)) uniqueMembers.set(user.id, { ...user, role: bm.role });
    });
    return Array.from(uniqueMembers.values());
  }, [activeBoardId, allBoardMembers, allUsers]);

  const currentUserRole = useMemo(() => {
    if (!activeBoardId || !currentUser) return null;
    const myMembership = allBoardMembers.find(bm => bm.board_id === activeBoardId && bm.user_id === currentUser.id);
    return myMembership?.role || "member";
  }, [activeBoardId, allBoardMembers, currentUser.id]);

  const isManager = useMemo(() => {
    if (isSuperAdmin) return true;
    if (!activeBoardId || !currentUser) return false;
    const currentBoard = boards?.find((b: any) => b.id === activeBoardId);
    const isOwner = currentBoard && currentBoard.user_id === currentUser.id;
    const role = (currentUserRole || "").toLowerCase();
    const hasRole = role === "admin" || role === "manager" || role === "quản lý" || role === "owner";
    return isOwner || hasRole;
  }, [activeBoardId, boards, currentUser.id, currentUserRole, isSuperAdmin]);

  const memberSearchResults = useMemo(() => {
    if (!searchMemberQuery.trim()) return [];
    const query = searchMemberQuery.toLowerCase();
    return allUsers.filter((user) => {
      const isAlreadyMember = activeBoardMembers.some(m => m.id === user.id);
      if (isAlreadyMember) return false;
      return user.name?.toLowerCase().includes(query) || user.email?.toLowerCase().includes(query);
    });
  }, [allUsers, activeBoardMembers, searchMemberQuery]);

  const searchResults = useMemo(() => {
    if (!searchTaskQuery.trim()) return [];
    return tasks.filter(task => task.content.toLowerCase().includes(searchTaskQuery.toLowerCase()));
  }, [tasks, searchTaskQuery]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const safeIds = task.assignee_ids ? (Array.isArray(task.assignee_ids) ? task.assignee_ids : [task.assignee_ids]) : (task.assignee_id ? [task.assignee_id] : []);
      const matchesAssignee = filterAssigneeId === "all" || safeIds.includes(filterAssigneeId);
      const matchesLabel = filterLabelId === "all" || taskLabels.some(tl => tl.task_id === task.id && tl.label_id === filterLabelId);
      const matchesPriority = filterPriority === "all" || (task.priority || "normal") === filterPriority;
      return matchesAssignee && matchesLabel && matchesPriority;
    });
  }, [tasks, filterAssigneeId, filterLabelId, filterPriority, taskLabels]);

  // ==========================================
  // HÀM GHI NHẬT KÝ HOẠT ĐỘNG
  // ==========================================
  const logActivity = async (taskId: string, actionType: string, content: string) => {
    try {
      const { data } = await supabase.from("activities")
        .insert([{ task_id: taskId, user_id: currentUser.id, action_type: actionType, content }])
        .select(`*, users!user_id (name, avatar_url)`)
        .single();
      if (data) {
        setTaskActivities(prev => {
          if (prev.length > 0 && prev[0].task_id !== taskId) return prev;
          return [data, ...prev];
        });
      }
    } catch (error) { console.error("Lỗi ghi log:", error); }
  };

  const handleProfileUpdate = (updatedUser: any) => {
    setMyProfile(updatedUser);
    setAllUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) toast.error("Lỗi đăng xuất!");
  };

  const handleToggleDarkMode = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    if (newTheme) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const router = useRouter();
  const searchParams = useSearchParams();
  const boardIdFromUrl = searchParams.get("board");

  useEffect(() => {
    if (boardIdFromUrl) {
      setActiveBoardId(boardIdFromUrl);
      setCurrentView("board");
    } else {
      setActiveBoardId(null);
      setCurrentView("home");
    }
  }, [boardIdFromUrl]);

  // ==========================================
  // INITIALIZATION & REALTIME HOOKS
  // ==========================================
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") { setIsDarkMode(true); document.documentElement.classList.add("dark"); }

    const initData = async () => {
      const { data: uData } = await supabase.from("users").select("*");
      if (uData) { setAllUsers(uData); const me = uData.find(u => u.id === currentUser.id); if (me) setMyProfile(me); }
      const { data: bmData } = await supabase.from("board_members").select("*");
      if (bmData) setAllBoardMembers(bmData);
    };
    initData();
  }, [currentUser.id]);

  useEffect(() => {
    const checkSuperAdmin = async () => {
      try {
        const { data } = await supabase.from('company_settings').select('super_admin_id').limit(1).single();
        if (data && data.super_admin_id === currentUser.id) {
          setIsSuperAdmin(true);
        }
      } catch (error) { 
        console.error("Lỗi kiểm tra admin:", error); 
      }
    };
    checkSuperAdmin();
  }, [currentUser.id]);

  useEffect(() => {
    const fetchMyBoards = async () => {
      if (isSuperAdmin) {
        const { data } = await supabase.from("boards").select("*").order("created_at", { ascending: false });
        if (data) setBoards(data);
      } else {
        const myBoardIds = allBoardMembers.filter((bm: any) => bm.user_id === currentUser.id).map((bm: any) => bm.board_id);
        if (myBoardIds.length > 0) {
          const { data } = await supabase.from("boards").select("*").in("id", myBoardIds).order("created_at", { ascending: false });
          if (data) setBoards(data);
        } else { 
          setBoards([]); 
        }
      }
    };
    fetchMyBoards();
  }, [allBoardMembers, currentUser.id, isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    const adminBoardChannel = supabase.channel('super_admin_boards')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'boards' }, async () => {
         const { data } = await supabase.from("boards").select("*").order("created_at", { ascending: false });
         if (data) setBoards(data);
      })
      .subscribe();
    return () => { supabase.removeChannel(adminBoardChannel); };
  }, [isSuperAdmin]);

  useEffect(() => {
    const fetchBoardStats = async () => {
      if (boards.length === 0 || currentView !== "home") return;
      const boardIds = boards.map(b => b.id);
      const { data: allCols } = await supabase.from("columns").select("id, board_id, order, title").in("board_id", boardIds);
      if (!allCols || allCols.length === 0) return;
      const columnIds = allCols.map(c => c.id);
      const { data: allTasks } = await supabase.from("tasks").select("id, column_id").in("column_id", columnIds);
      if (!allTasks) return;

      const stats: Record<string, { taskCount: number; progress: number }> = {};
      boards.forEach(board => {
        const bCols = allCols.filter(c => c.board_id === board.id);
        const bTasks = allTasks.filter(t => bCols.some(c => c.id === t.column_id));
        if (bTasks.length === 0 || bCols.length === 0) { stats[board.id] = { taskCount: bTasks.length, progress: 0 }; return; }

        const lastCol = bCols.find(c => {
          const safeTitle = (c.title || "").toLowerCase();
          return safeTitle.includes("done") || safeTitle.includes("hoàn thành") || safeTitle.includes("xong") || safeTitle.includes("complete");
        }) || bCols.reduce((prev, current) => (prev.order > current.order) ? prev : current);

        const doneTasks = bTasks.filter(t => t.column_id === lastCol.id);
        stats[board.id] = { taskCount: bTasks.length, progress: Math.round((doneTasks.length / bTasks.length) * 100) };
      });
      setBoardStats(stats);
    };
    fetchBoardStats();
  }, [boards, currentView, refreshTrigger]);

  useEffect(() => {
    const dashboardChannel = supabase.channel('dashboard_global_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => { setRefreshTrigger(prev => prev + 1); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activities' }, () => { setRefreshTrigger(prev => prev + 1); })
      .subscribe();
    return () => { supabase.removeChannel(dashboardChannel); };
  }, []);

  useEffect(() => {
    const memberChannel = supabase.channel(`member_changes_${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'board_members', filter: `user_id=eq.${currentUser.id}` },
        async (payload) => {
          const { data } = await supabase.from("board_members").select("*");
          if (data) setAllBoardMembers(data);

          if (payload.eventType === 'INSERT') {
            const { data: boardInfo } = await supabase.from('boards').select('user_id').eq('id', payload.new.board_id).single();
            if (boardInfo && boardInfo.user_id !== currentUser.id) {
              toast.success("Bạn vừa được mời vào một dự án mới!", { icon: '🎉' });
            }
          } else if (payload.eventType === 'DELETE') {
            toast.error("Bạn đã bị gỡ khỏi một dự án.");
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(memberChannel); };
  }, [currentUser.id]);

  useEffect(() => {
    if (currentView === "board" && activeBoardId) {
      const stillHasAccess = boards.some(b => b.id === activeBoardId);
      if (boards.length > 0 && !stillHasAccess) {
        setActiveBoardId(null);
        setCurrentView("home");
      }
    }
  }, [boards, activeBoardId, currentView]);

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data } = await supabase.from("notifications").select("*").eq("user_id", currentUser.id).order("created_at", { ascending: false });
      if (data) setNotifications(data);
    };
    fetchNotifications();

    const notiChannel = supabase.channel(`noti_${currentUser.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.id}` }, (p) => {
        setNotifications(prev => [p.new, ...prev]); 
      }).subscribe();
    return () => { supabase.removeChannel(notiChannel); };
  }, [currentUser.id]);

  useEffect(() => {
    if (!activeBoardId) return;
    const tasksChannel = supabase.channel(`board_tasks_${activeBoardId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' }, (payload) => {
        setTasks(prev => { if (prev.find(t => t.id === payload.new.id)) return prev; return [...prev, payload.new]; });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks' }, (payload) => {
        setTasks(prev => prev.map(t => t.id === payload.new.id ? payload.new : t));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tasks' }, (payload) => {
        setTasks(prev => prev.filter(t => t.id !== payload.old.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(tasksChannel); };
  }, [activeBoardId]);

  useEffect(() => {
    const fetchData = async (boardId: string | null) => {
      if (!boardId) { setColumns([]); setTasks([]); setBoardLabels([]); setTaskLabels([]); return; }
      const { data: cols } = await supabase.from("columns").select("*").eq("board_id", boardId).order("order");
      setColumns(cols || []);
      if (cols && cols.length > 0) {
        const columnIds = cols.map(c => c.id);
        const { data: tsk } = await supabase.from("tasks").select("*").in("column_id", columnIds).order("order");
        setTasks(tsk || []);
      } else { setTasks([]); }

      const { data: lData } = await supabase.from("labels").select("*").eq("board_id", boardId);
      if (lData) {
        setBoardLabels(lData);
        if (lData.length > 0) {
          const { data: tlData } = await supabase.from("task_labels").select("*").in("label_id", lData.map(l => l.id));
          setTaskLabels(tlData || []);
        } else setTaskLabels([]);
      }
    };
    if (activeBoardId && currentView === "board") fetchData(activeBoardId);
  }, [activeBoardId, currentView]);

  useEffect(() => {
    const fetchTaskExtras = async () => {
      if (!selectedTask) return;
      const { data: cData } = await supabase.from("comments").select(`*, users!user_id (name, avatar_url)`).eq("task_id", selectedTask.id).order("created_at", { ascending: true });
      if (cData) setTaskComments(cData);
      const { data: clData } = await supabase.from("checklists").select("*").eq("task_id", selectedTask.id).order("position", { ascending: true });
      if (clData) setTaskChecklists(clData);
      const { data: aData } = await supabase.from("attachments").select("*").eq("task_id", selectedTask.id).order("created_at", { ascending: false });
      if (aData) setTaskAttachments(aData);
      const { data: actData } = await supabase.from("activities").select(`*, users!user_id (name, avatar_url)`).eq("task_id", selectedTask.id).order("created_at", { ascending: false });
      if (actData) setTaskActivities(actData);
    };
    fetchTaskExtras();
  }, [selectedTask]);

  useEffect(() => {
    if (autoOpenTaskId && currentView === "board" && tasks.length > 0) {
      const taskToOpen = tasks.find(t => t.id === autoOpenTaskId);
      if (taskToOpen) {
        handleTaskClick(taskToOpen);
        setAutoOpenTaskId(null);
      }
    }
  }, [autoOpenTaskId, tasks, currentView]);

  // ==========================================
  // EVENT HANDLERS
  // ==========================================
  const markNotiAsRead = async () => {
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", currentUser.id);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };
const createNotification = async (userId: string, type: string, metadata: any, boardId?: string | null, taskId?: string | null) => {
  if (userId === currentUser.id) return;
  const contentJSON = JSON.stringify({ type, ...metadata });
  await supabase.from("notifications").insert([{
    user_id: userId,
    content: contentJSON, // <--- Lưu cục JSON này
    board_id: boardId || null,
    task_id: taskId || null
  }]);
};

  const handleAddBoard = async (name: string, priority: string) => {
    try {
      const { data: newBoard, error } = await supabase.from("boards").insert([{ name, priority, user_id: currentUser.id }]).select().single();
      if (error) { toast.error(`Lỗi Database: ${error.message}`); return; }
      if (newBoard) {
        const { error: memberError } = await supabase.from("board_members").insert([{ board_id: newBoard.id, user_id: currentUser.id, role: "admin" }]);
        if (memberError) { toast.error(`Lỗi cấp quyền: ${memberError.message}`); return; }
        setBoards(prev => [...prev, newBoard]);
        setAllBoardMembers(prev => [...prev, { board_id: newBoard.id, user_id: currentUser.id, role: "admin" }]);
        toast.success("Đã tạo dự án thành công!");
        setIsAddingBoard(false);
      }
    } catch (err) { toast.error("Đã xảy ra sự cố không xác định!"); }
  };

  const handleAddMember = async (userId: string, role: string = "member") => {
    if (!activeBoardId) return;
    if (!isManager) { toast.error("Chỉ Quản trị viên mới được mời thêm người!"); return; }
    const { data, error } = await supabase.from("board_members").insert([{ board_id: activeBoardId, user_id: userId, role }]).select().single();
    if (!error && data) {
      setAllBoardMembers(prev => [...prev, data]);
      toast.success("Đã thêm thành viên!");
      setSearchMemberQuery("");
      createNotification(userId, "noti_add_board", { 
  actor: myProfile?.name || 'Ai đó', 
  board: boards.find(b => b.id === activeBoardId)?.name 
}, activeBoardId);
    } else { toast.error("Lỗi khi thêm thành viên!"); }
  };

  const handleRemoveMember = async (userId: string) => {
    const currentBoard = boards.find(b => b.id === activeBoardId);
    if (currentBoard && userId === currentBoard.user_id && currentUser.id !== currentBoard.user_id) { toast.error("Hỗn xược! Bạn không có quyền xóa Chủ dự án!"); return; }
    if (!activeBoardId) return;
    if (!isManager) { toast.error("Bạn không được phép tự rời dự án. Vui lòng liên hệ Quản lý!"); return; }
    const isMe = userId === currentUser.id;
    if (isMe) {
      const adminCount = activeBoardMembers.filter((m: any) => m.role === "admin" || m.role === "Quản lý" || m.role === "manager").length;
      if (adminCount <= 1) { toast.error("Bạn là Quản lý duy nhất! Hãy cấp quyền cho người khác trước khi rời đi, hoặc Xóa luôn dự án này.", { duration: 4000 }); return; }
      if (!confirm("Bạn có chắc chắn muốn TỰ RỜI KHỎI dự án này?")) return;
    } else { if (!confirm("Bạn có chắc muốn xóa thành viên này khỏi dự án?")) return; }

    const { error } = await supabase.from("board_members").delete().match({ board_id: activeBoardId, user_id: userId });
    if (!error) {
      try {
        const { data: cols } = await supabase.from("columns").select("id").eq("board_id", activeBoardId);
        if (cols && cols.length > 0) {
          const colIds = cols.map(c => c.id);
          const { data: tasks } = await supabase.from("tasks").select("id, assignee_ids").in("column_id", colIds);
          if (tasks) {
            for (const task of tasks) {
              let currentAssigneeIds: string[] = [];
              if (Array.isArray(task.assignee_ids)) currentAssigneeIds = [...task.assignee_ids];
              else if (typeof task.assignee_ids === "string") { try { currentAssigneeIds = JSON.parse(task.assignee_ids); } catch (e) { currentAssigneeIds = []; } }
              if (currentAssigneeIds.includes(userId)) {
                const newAssigneeIds = currentAssigneeIds.filter((id: string) => id !== userId);
                await supabase.from("tasks").update({ assignee_ids: newAssigneeIds }).eq("id", task.id);
              }
            }
          }
        }
      } catch (cleanupError) {}
      setAllBoardMembers(prev => prev.filter(bm => !(bm.board_id === activeBoardId && bm.user_id === userId)));
      toast.success(isMe ? "Bạn đã rời dự án!" : "Đã xóa thành viên!");
      if (isMe) {
        setBoards(prev => prev.filter(b => b.id !== activeBoardId));
        setActiveBoardId(null); setCurrentView("home"); setIsMembersModalOpen(false);
      } else { setTimeout(() => { window.location.reload(); }, 800); }
    } else { toast.error("Lỗi hệ thống khi thao tác!"); }
  };

  const handleChangeMemberRole = async (userId: string, selectedRole: string) => {
    const currentBoard = boards.find(b => b.id === activeBoardId);
    if (currentBoard && userId === currentBoard.user_id) { toast.error("Không thể giáng chức Chủ dự án!"); return; }
    if (!activeBoardId || !isManager) return;
    if (userId === currentUser.id && (selectedRole === "member" || selectedRole === "Thành viên")) {
      const adminCount = activeBoardMembers.filter((m: any) => m.role === "admin" || m.role === "Quản lý" || m.role === "manager").length;
      if (adminCount <= 1) { toast.error("Bạn là Quản lý duy nhất!", { duration: 4000 }); return; }
    }
    const { error } = await supabase.from("board_members").update({ role: selectedRole }).match({ board_id: activeBoardId, user_id: userId });
    if (!error) {
      setAllBoardMembers(prev => prev.map(bm => (bm.board_id === activeBoardId && bm.user_id === userId) ? { ...bm, role: selectedRole } : bm ));
      toast.success(`Đã đổi quyền thành công!`);
    } else { toast.error("Lỗi khi đổi quyền!"); }
  };

  const handleEditBoard = async (id: string, newName: string) => {
    if (!isManager) { toast.error("Chỉ Quản trị viên mới được đổi tên dự án!"); return; }
    const { error } = await supabase.from("boards").update({ name: newName }).eq("id", id);
    if (!error) { setBoards(prev => prev.map(b => b.id === id ? { ...b, name: newName } : b)); toast.success("Đã đổi tên!"); }
  };

  const handleDeleteBoard = async (boardId: string) => {
    if (!currentUser) return;
    const { data: companyData } = await supabase.from('company_settings').select('super_admin_id').limit(1);
    const isSuperAdmin = companyData && companyData.length > 0 && companyData[0].super_admin_id === currentUser.id;
    if (!isSuperAdmin) { toast.error("Chỉ Quản trị viên (Super Admin) mới được xóa dự án!"); return; }
    const { error } = await supabase.from("boards").delete().eq("id", boardId);
    if (!error) {
      setBoards(prev => prev.filter(b => b.id !== boardId));
      if (activeBoardId === boardId) { setCurrentView("home"); setActiveBoardId(null); }
      toast.success("Đã xóa dự án vĩnh viễn!");
    } else { toast.error("Lỗi khi xóa dự án dưới Database!"); }
  };

  const handleChangePriority = async (id: string, priority: string) => {
    const { error } = await supabase.from("boards").update({ priority }).eq("id", id);
    if (!error) { setBoards(prev => prev.map(b => b.id === id ? { ...b, priority } : b)); toast.success("Đã đổi độ ưu tiên!"); }
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const XLSX = await import("xlsx");
    if (!file || !activeBoardId) return;
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const lines: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const validLines = lines.filter(row => row && row.length > 0 && row.some(cell => cell));
        if (validLines.length < 2) { toast.error("File trống!"); return; }

        const parseExcelDate = (excelDate: any) => {
          const val = String(excelDate).trim();
          if (!excelDate || val === "" || val.toLowerCase() === "không có") return null;
          if (typeof excelDate === 'number') {
            const jsDate = new Date((excelDate - 25569) * 86400 * 1000);
            return `${jsDate.getUTCFullYear()}-${String(jsDate.getUTCMonth() + 1).padStart(2, '0')}-${String(jsDate.getUTCDate()).padStart(2, '0')}`;
          }
          const parsed = new Date(val);
          if (isNaN(parsed.getTime())) return null;
          return val;
        };

        const defaultColId = columns[0]?.id;
        if (!defaultColId) { toast.error("Dự án chưa có cột nào!"); return; }

        const newTasksToInsert = [];
        for (let i = 1; i < validLines.length; i++) {
          const row = validLines[i];
          const content = row[0] ? String(row[0]).trim() : "";
          if (!content) continue;

          let colId = defaultColId;
          const colName = row[1] ? String(row[1]).trim().toLowerCase() : "";
          if (colName) { const foundCol = columns.find(c => c.title.toLowerCase() === colName); if (foundCol) colId = foundCol.id; }

          const assigneeName = row[2] ? String(row[2]).trim().toLowerCase() : "";
          let assigneeId = null;
          if (assigneeName && assigneeName !== "chưa giao") { const foundMember = activeBoardMembers.find((m: any) => m.name?.toLowerCase() === assigneeName); if (foundMember) assigneeId = foundMember.id; }

          const maxOrder = tasks.filter(t => t.column_id === colId).length;
          newTasksToInsert.push({
            content,
            column_id: colId,
            assignee_ids: assigneeId ? [assigneeId] : [],
            priority: "normal",
            due_date: parseExcelDate(row[4]),
            order: maxOrder + i,
            user_id: currentUser.id
          });
        }

        if (newTasksToInsert.length > 0) {
          const { data: insertedData, error } = await supabase.from('tasks').insert(newTasksToInsert).select();
          if (error) { toast.error(`Lỗi từ database: ${error.message}`); } 
          else if (insertedData) { setTasks((prev: any) => [...prev, ...insertedData]); toast.success(`Đã tạo thành công ${insertedData.length} công việc!`); }
        }
      } catch (error: any) { toast.error(`Lỗi xử lý file: ${error.message}`); }
      finally { if (fileInputRef.current) fileInputRef.current.value = ""; }
    };
  };

  const handleExport = async (formatType: 'xlsx' | 'csv') => {
    if (filteredTasks.length === 0) { toast.error("Không có công việc nào để xuất!"); return; }
    const XLSX = await import("xlsx");
    const exportData = filteredTasks.map(task => {
      const safeIds = task.assignee_ids ? (Array.isArray(task.assignee_ids) ? task.assignee_ids : [task.assignee_ids]) : [];
      const assigneeNames = safeIds.map((id: string) => activeBoardMembers.find((m: any) => m.id === id)?.name).filter(Boolean);
      return {
        "Tên công việc": task.content,
        "Danh sách (Cột)": columns.find(c => c.id === task.column_id)?.title || "Không rõ",
        "Người thực hiện": assigneeNames.length > 0 ? assigneeNames.join(", ") : "Chưa giao",
        "Độ ưu tiên": translatePriority(priorityConfig[task.priority || "normal"]?.label || "Bình thường", lang),
        "Hạn chót": task.due_date || "Không có"
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "TienDo");
    const boardName = boards.find(b => b.id === activeBoardId)?.name || "Du-an";
    XLSX.writeFile(workbook, `tien_do_${boardName}_${format(new Date(), 'ddMMyyyy')}.${formatType}`);
    setShowExportMenu(false);
  };

  const currentTaskLabelIds = selectedTask ? taskLabels.filter(tl => tl.task_id === selectedTask.id).map(tl => tl.label_id) : [];

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;
    const { data: newLabel } = await supabase.from("labels").insert([{ board_id: activeBoardId, name: newLabelName.trim(), color: newLabelColor || "bg-blue-500 text-white" }]).select().single();
    if (newLabel) {
      setBoardLabels(prev => [...prev, newLabel]); setNewLabelName("");
      const { data: taskLabel } = await supabase.from("task_labels").insert([{ task_id: selectedTask.id, label_id: newLabel.id }]).select().single();
      if (taskLabel) setTaskLabels(prev => [...prev, taskLabel]);
    }
  };

  const toggleLabelForTask = async (labelId: string) => {
    const exists = taskLabels.find(tl => tl.task_id === selectedTask.id && tl.label_id === labelId);
    if (exists) {
      await supabase.from("task_labels").delete().match({ task_id: selectedTask.id, label_id: labelId });
      setTaskLabels(prev => prev.filter(tl => !(tl.task_id === selectedTask.id && tl.label_id === labelId)));
    } else {
      const { data } = await supabase.from("task_labels").insert([{ task_id: selectedTask.id, label_id: labelId }]).select().single();
      if (data) setTaskLabels(prev => [...prev, data]);
    }
  };

  const handleDeleteLabel = async (labelId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa nhãn này?")) return;
    await supabase.from("labels").delete().eq("id", labelId);
    setBoardLabels(prev => prev.filter(l => l.id !== labelId));
    setTaskLabels(prev => prev.filter(tl => tl.label_id !== labelId));
  };

  const handleTaskClick = useCallback((task: any) => {
    setSelectedTask(task);
    setEditTaskContent(task.content);
    setEditTaskDescription(task.description || "");
    setEditTaskDueDate(task.due_date || "");
    setEditTaskStartDate(task.start_date || "");
    setEditTaskPriority(task.priority || "normal");
    const rawIds = task.assignee_ids || task.assignee_id;
    setEditTaskAssignees(rawIds ? (Array.isArray(rawIds) ? rawIds : [rawIds]) : []);
  }, []);

  const handleAddChecklist = async () => {
    if (!newChecklistTitle.trim()) return;
    const { data } = await supabase.from("checklists").insert([{ task_id: selectedTask.id, title: newChecklistTitle.trim(), position: taskChecklists.length }]).select().single();
    if (data) { setTaskChecklists(prev => [...prev, data]); setNewChecklistTitle(""); logActivity(selectedTask.id, "checklist", `đã thêm mục kiểm tra mới`); }
  };

  const toggleChecklist = async (id: string, currentStatus: boolean) => {
    await supabase.from("checklists").update({ is_completed: !currentStatus }).eq("id", id);
    const item = taskChecklists.find(c => c.id === id);
    setTaskChecklists(prev => prev.map(c => c.id === id ? { ...c, is_completed: !currentStatus } : c));
    logActivity(selectedTask.id, "checklist", `đã đánh dấu ${!currentStatus ? "hoàn thành" : "chưa hoàn thành"} mục "${item?.title || 'kiểm tra'}"`);
  };

  const deleteChecklist = async (id: string) => {
    await supabase.from("checklists").delete().eq("id", id);
    setTaskChecklists(prev => prev.filter(c => c.id !== id));
  };

  const handleSendComment = async () => {
    if (!newCommentContent.trim()) return;
    setIsAddingComment(true);
    const { data, error } = await supabase.from("comments").insert([{ task_id: selectedTask.id, user_id: currentUser.id, content: newCommentContent.trim() }]).select(`*, users!user_id (name, avatar_url)`).single();
    setIsAddingComment(false);

    if (data) {
      setTaskComments(prev => [...prev, data]);
      logActivity(selectedTask.id, "comment", `đã gửi một bình luận mới`);
      
      const mentionedUserIds = new Set<string>();
      activeBoardMembers.forEach((member: any) => { 
        if (member.name && newCommentContent.includes(`@${member.name}`)) { 
          mentionedUserIds.add(member.id); 
        } 
      });
      
      // 👇 SỬA ĐOẠN GỬI THÔNG BÁO MENTION (@) 👇
      mentionedUserIds.forEach(userId => { 
        if (userId !== currentUser.id) { 
          createNotification(
            userId, 
            "noti_mention", 
            { actor: myProfile?.name || 'Ai đó', task: selectedTask.content }, 
            activeBoardId, 
            selectedTask.id
          ); 
        } 
      });
      
      const notifyIds = selectedTask.assignee_ids ? (Array.isArray(selectedTask.assignee_ids) ? selectedTask.assignee_ids : [selectedTask.assignee_ids]) : [];
      
      // 👇 SỬA ĐOẠN GỬI THÔNG BÁO BÌNH LUẬN BÌNH THƯỜNG 👇
      notifyIds.forEach((userId: string) => { 
        if (userId !== currentUser.id && !mentionedUserIds.has(userId)) { 
          createNotification(
            userId, 
            "noti_comment", 
            { actor: myProfile?.name || 'Ai đó', task: selectedTask.content }, 
            activeBoardId, 
            selectedTask.id
          ); 
        } 
      });
      
      setNewCommentContent("");
    } else { 
      toast.error(t.displayError || "Không thể gửi bình luận!"); 
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTask) return;
    setIsUploading(true);
    const fileName = `${selectedTask.id}-${Date.now()}.${file.name.split('.').pop()}`;
    const { error: uploadError } = await supabase.storage.from("task_attachments").upload(fileName, file);
    if (uploadError) { toast.error("Lỗi tải file!"); setIsUploading(false); return; }

    const { data: publicUrlData } = supabase.storage.from("task_attachments").getPublicUrl(fileName);
    const { data } = await supabase.from("attachments").insert([{ task_id: selectedTask.id, user_id: currentUser.id, file_name: file.name, file_url: publicUrlData.publicUrl, file_size: file.size }]).select().single();
    if (data) { setTaskAttachments(prev => [data, ...prev]); toast.success("Tải tệp lên thành công!"); logActivity(selectedTask.id, "attachment", `đã tải lên tệp đính kèm`); }
    setIsUploading(false);
  };

  const handleDeleteAttachment = async (id: string, fileUrl: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa tệp này?")) return;
    const fileName = fileUrl.split('/').pop();
    if (fileName) await supabase.storage.from("task_attachments").remove([fileName]);
    await supabase.from("attachments").delete().eq("id", id);
    setTaskAttachments(prev => prev.filter(a => a.id !== id));
  };

  const executeSaveColumn = async (title: string) => {
    const { data } = await supabase.from("columns").insert([{ title, board_id: activeBoardId, order: columns.length + 1 }]).select().single();
    if (data) setColumns(prev => [...prev, data]);
  };

  const editColumn = async (id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    await supabase.from("columns").update({ title: newTitle }).eq("id", id);
    setColumns(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c));
  };

  const handleAddColumnKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault(); if (e.nativeEvent.isComposing) return;
      const val = columnTitleRef.current.trim();
      if (val && activeBoardId) { columnTitleRef.current = ""; setNewColumnTitle(""); setIsAddingColumn(false); executeSaveColumn(val); }
    }
    if (e.key === "Escape") { columnTitleRef.current = ""; setNewColumnTitle(""); setIsAddingColumn(false); }
  };

  const handleAddColumnBlur = () => {
    const val = columnTitleRef.current.trim();
    columnTitleRef.current = ""; setNewColumnTitle(""); setIsAddingColumn(false);
    if (val && activeBoardId) executeSaveColumn(val);
  };

  const deleteColumn = async (id: string, title: string) => {
    if (confirm(`Xóa cột "${title}"?`)) {
      await supabase.from("columns").delete().eq("id", id);
      setColumns(prev => prev.filter(c => c.id !== id));
      setTasks(prev => prev.filter(t => t.column_id !== id));
    }
  };

  const handleAddTask = async (columnId: string, content: string) => {
    const columnTasks = tasks.filter(t => t.column_id === columnId);
    const { data, error } = await supabase.from("tasks").insert([{ content, column_id: columnId, order: columnTasks.length + 1, user_id: currentUser.id }]).select().single();
    if (data) { setTasks(prev => [...prev, data]); } 
    else { toast.error("Lỗi khi tạo công việc!"); }
  };

  const deleteTask = async (id: string) => {
    if (!isManager) { toast.error("Chỉ Quản trị viên mới được phép xóa công việc này!"); return; }
    if (confirm("Bạn có chắc chắn muốn xóa công việc này?")) {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (!error) { setTasks(prev => prev.filter(t => t.id !== id)); toast.success("Đã xóa công việc!"); } 
      else { toast.error("Lỗi khi xóa công việc!"); }
    }
  };

  const handleQuickComplete = async (taskId: string) => {
    let targetColumn = columns.find(c => {
      const title = (c.title || "").toLowerCase();
      return title.includes("done") || title.includes("hoàn thành") || title.includes("xong") || title.includes("complete");
    });
    if (!targetColumn) targetColumn = columns[columns.length - 1];
    if (!targetColumn) return;

    const { data } = await supabase.from("tasks").update({ column_id: targetColumn.id, priority: 'low' }).eq("id", taskId).select().single();
    if (data) {
      setTasks(prev => prev.map(t => t.id === taskId ? data : t));
      toast.success(`Đã chuyển sang: ${targetColumn.title}`, { icon: '✅' });
      logActivity(taskId, "move", `đã chuyển công việc sang cột "${targetColumn.title}"`);
    }
  };

  const handleSaveTaskDetail = async () => {
    if (!selectedTask) return;
    const finalDueDate = editTaskDueDate ? editTaskDueDate : null;
    const finalStartDate = editTaskStartDate ? editTaskStartDate : null;

    const changes = [];
    if (selectedTask.content !== editTaskContent) changes.push("tên công việc");
    if ((selectedTask.description || "") !== editTaskDescription.trim()) changes.push("mô tả");
    if ((selectedTask.start_date || null) !== finalStartDate) changes.push("ngày bắt đầu");
    if ((selectedTask.due_date || null) !== finalDueDate) changes.push("hạn chót");
    if ((selectedTask.priority || "normal") !== editTaskPriority) changes.push("độ ưu tiên");

    const oldAssignees = selectedTask.assignee_ids ? (Array.isArray(selectedTask.assignee_ids) ? selectedTask.assignee_ids : [selectedTask.assignee_ids]) : [];
    const newAssignees = editTaskAssignees || [];
    const assigneesChanged = oldAssignees.length !== newAssignees.length || !oldAssignees.every((id: string) => newAssignees.includes(id));
    if (assigneesChanged) changes.push("người thực hiện");

    if (changes.length === 0) { setShowLabelMenu(false); setSelectedTask(null); return; }

    const { data, error } = await supabase.from("tasks").update({ content: editTaskContent, description: editTaskDescription, start_date: finalStartDate, due_date: finalDueDate, priority: editTaskPriority, assignee_ids: editTaskAssignees }).eq("id", selectedTask.id).select().single();
    if (error) { toast.error("Lỗi cập nhật task!"); return; }

    if (data) {
      setTasks(prev => prev.map(t => t.id === selectedTask.id ? data : t));
      const changeText = changes.join(", ");
      logActivity(selectedTask.id, "update", `đã cập nhật ${changeText}`);

      if (assigneesChanged) {
        const newlyAdded = newAssignees.filter(id => !oldAssignees.includes(id));
        newlyAdded.forEach((userId) => {
          if (userId !== currentUser.id) { createNotification(userId, `${myProfile?.name || 'Quản lý'} đã giao cho bạn công việc: ${editTaskContent}`, activeBoardId, selectedTask.id); }
        });
      }
      setShowLabelMenu(false); setSelectedTask(null);
    }
  };

  const customCollisionDetection = (args: any) => {
    if (args.active?.data?.current?.type === "Column") {
      const columnDroppables = args.droppableContainers.filter((container: any) => container.data?.current?.type === "Column");
      return closestCenter({ ...args, droppableContainers: columnDroppables });
    }
    return closestCenter(args);
  };

  const onDragStart = (event: any) => {
    const { active } = event;
    setActiveItem({ type: active.data.current?.type, data: active.data.current?.type === "Column" ? active.data.current.column : active.data.current.task });
  };

  const onDragEnd = async (event: any) => {
    const { active, over } = event;
    setActiveItem(null);
    if (!over || active.id === over.id) return;

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    if (!isManager && activeType === "Column") { toast.error("Chỉ Quản trị viên mới được phép thay đổi vị trí Cột!"); return; }

    if (activeType === "Column") {
      const overColumnId = overType === "Column" ? over.id : over.data.current?.task?.column_id;
      if (!overColumnId || active.id === overColumnId) return;
      const oldIdx = columns.findIndex(c => c.id === active.id);
      const newIdx = columns.findIndex(c => c.id === overColumnId);
      if (oldIdx !== -1 && newIdx !== -1) {
        const newCols = arrayMove(columns, oldIdx, newIdx);
        setColumns(newCols);
        newCols.forEach((c, i) => supabase.from("columns").update({ order: i + 1 }).eq("id", c.id).then());
      }
      return;
    }

    if (activeType === "Task") {
      const overColumnId = overType === "Column" ? over.id : over.data.current?.task?.column_id;
      if (!overColumnId) return;
      const activeTaskId = active.id;
      const oldIndex = tasks.findIndex(t => t.id === activeTaskId);
      const oldColumnId = tasks[oldIndex].column_id;

      if (oldColumnId !== overColumnId) {
        const targetCol = columns.find(c => c.id === overColumnId);
        logActivity(activeTaskId, "move", `đã chuyển công việc sang cột "${targetCol?.title || 'mới'}"`);
      }

      let newTasks = [...tasks];
      if (tasks[oldIndex].column_id === overColumnId) { newTasks = arrayMove(newTasks, oldIndex, tasks.findIndex(t => t.id === over.id)); } 
      else {
        const taskToMove = newTasks[oldIndex];
        taskToMove.column_id = overColumnId;
        newTasks.splice(oldIndex, 1);
        const insertIndex = overType === "Column" ? newTasks.length : tasks.findIndex(t => t.id === over.id);
        newTasks.splice(insertIndex, 0, taskToMove);
      }
      setTasks(newTasks);
      await supabase.from("tasks").update({ column_id: overColumnId }).eq("id", activeTaskId);
      const targetColumnTasks = newTasks.filter(t => t.column_id === overColumnId);
      targetColumnTasks.forEach((t, index) => { supabase.from("tasks").update({ order: index + 1 }).eq("id", t.id).then(); });
    }
  };

  const completedChecklists = taskChecklists.filter(c => c.is_completed).length;
  const checklistProgress = taskChecklists.length > 0 ? Math.round((completedChecklists / taskChecklists.length) * 100) : 0;

  return (
    <div className="flex h-screen bg-white dark:bg-[#0E1116] overflow-hidden text-slate-800 dark:text-slate-200 relative transition-colors duration-300">
      <Toaster position="top-right" />

      <TaskDetailModal
        taskActivities={taskActivities} selectedTask={selectedTask}
        onClose={async () => { await handleSaveTaskDetail(); setShowLabelMenu(false); setSelectedTask(null); }}
        editTaskContent={editTaskContent} setEditTaskContent={setEditTaskContent} editTaskAssignees={editTaskAssignees} setEditTaskAssignees={setEditTaskAssignees}
        editTaskStartDate={editTaskStartDate} setEditTaskStartDate={setEditTaskStartDate} editTaskDueDate={editTaskDueDate} setEditTaskDueDate={setEditTaskDueDate}
        editTaskDescription={editTaskDescription} setEditTaskDescription={setEditTaskDescription} activeBoardMembers={activeBoardMembers} handleSaveTaskDetail={handleSaveTaskDetail}
        currentTaskLabels={boardLabels.filter(l => selectedTask && taskLabels.some(tl => tl.task_id === selectedTask.id && tl.label_id === l.id))}
        boardLabels={boardLabels} currentTaskLabelIds={currentTaskLabelIds} showLabelMenu={showLabelMenu} setShowLabelMenu={setShowLabelMenu}
        toggleLabelForTask={toggleLabelForTask} handleCreateLabel={handleCreateLabel} handleDeleteLabel={handleDeleteLabel}
        newLabelName={newLabelName} setNewLabelName={setNewLabelName} newLabelColor={newLabelColor} setNewLabelColor={setNewLabelColor}
        taskChecklists={taskChecklists} completedChecklists={completedChecklists} checklistProgress={checklistProgress} toggleChecklist={toggleChecklist} deleteChecklist={deleteChecklist} newChecklistTitle={newChecklistTitle} setNewChecklistTitle={setNewChecklistTitle} handleAddChecklist={handleAddChecklist}
        taskComments={taskComments} newCommentContent={newCommentContent} setNewCommentContent={setNewCommentContent} handleSendComment={handleSendComment} isAddingComment={isAddingComment} myProfile={myProfile} currentUser={currentUser}
        taskAttachments={taskAttachments} isUploading={isUploading} handleFileUpload={handleFileUpload} handleDeleteAttachment={handleDeleteAttachment}
        editTaskPriority={editTaskPriority} setEditTaskPriority={setEditTaskPriority}
        lang={lang} // <--- TRUYỀN NGÔN NGỮ XUỐNG MODAL (Sẽ sửa sau)
      />

      <MembersModal
        isOpen={isMembersModalOpen} onClose={() => setIsMembersModalOpen(false)} currentBoard={boards.find(b => b.id === activeBoardId)}
        activeMembers={activeBoardMembers} searchQuery={searchMemberQuery} setSearchQuery={setSearchMemberQuery} searchResults={memberSearchResults}
        onAddMember={handleAddMember} onRemoveMember={handleRemoveMember} currentUser={currentUser} currentUserRole={currentUserRole} onChangeRole={handleChangeMemberRole}
        lang={lang}
      />
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} myProfile={myProfile} onProfileUpdate={handleProfileUpdate} />

      {/* ĐÃ TRUYỀN NGÔN NGỮ VÀO SIDEBAR */}
      <Sidebar
        isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} currentView={currentView} navigateToHome={() => router.push("/")}
        boards={boards} activeBoardId={activeBoardId} navigateToBoard={(id: string) => { router.push(`/?board=${id}`); setIsSidebarOpen(false); setAutoOpenTaskId(null); }}
        isAddingBoard={isAddingBoard} setIsAddingBoard={setIsAddingBoard} onAddBoard={handleAddBoard} onEditBoard={handleEditBoard} onDeleteBoard={handleDeleteBoard} onChangePriority={handleChangePriority} onOpenMembers={(id: string) => { setActiveBoardId(id); setIsMembersModalOpen(true); }}
        isDarkMode={isDarkMode} toggleDarkMode={handleToggleDarkMode} myProfile={myProfile} currentUser={currentUser} handleLogout={handleLogout} onOpenProfile={() => setIsProfileModalOpen(true)}
        lang={lang} toggleLanguage={toggleLanguage}
      />

      <main className="flex-1 flex flex-col min-w-0 transition-all duration-500 bg-slate-50 dark:bg-[#0E1116]">
        {currentView === "home" ? (
          <HomeDashboard
            boards={boards} boardStats={boardStats} allBoardMembers={allBoardMembers} allUsers={allUsers} currentUser={currentUser}
            navigateToBoard={(id: string, taskId?: string) => { if (taskId) { router.push(`/?board=${id}&task=${taskId}`); } else { router.push(`/?board=${id}`); } }}
            setIsAddingBoard={setIsAddingBoard} notifications={notifications} setNotifications={setNotifications} setActiveBoardId={setActiveBoardId} setCurrentView={setCurrentView} setAutoOpenTaskId={setAutoOpenTaskId}
            lang={lang}
          />
        ) : (
          <>
            {/* ========================================== */}
            {/* KANBAN HEADER (ĐÃ SỬ DỤNG BIẾN {t...}) */}
            {/* ========================================== */}
            <header className="h-14 flex-shrink-0 border-b flex items-center justify-between px-6 bg-white dark:bg-[#0E1116] dark:border-slate-800">
              <div className="flex items-center gap-3">
                <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18" /></svg></button>
                <div className="flex flex-col">
                  <h2 className="font-semibold text-[15px] truncate max-w-[200px] md:max-w-[300px] text-slate-800 dark:text-slate-100 leading-tight">{boards.find(b => b.id === activeBoardId)?.name}</h2>
                  {boards.find(b => b.id === activeBoardId)?.created_at && <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{t.createdOn} {format(new Date(boards.find(b => b.id === activeBoardId)?.created_at), 'dd/MM/yyyy')}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <NotificationBell notifications={notifications} setNotifications={setNotifications} currentUser={currentUser} setActiveBoardId={setActiveBoardId} setCurrentView={setCurrentView} setAutoOpenTaskId={setAutoOpenTaskId} />

                <div onClick={() => setIsMembersModalOpen(true)} className="flex -space-x-2 mr-3 cursor-pointer hover:scale-105 transition-transform" title={t.memberBtn}>
                  {activeBoardMembers.slice(0, 3).map((m, idx) => (
                    <div key={`${m.id}-${idx}`} className="w-7 h-7 rounded-full border-2 border-white dark:border-[#0E1116] overflow-hidden relative shadow-sm" style={{ zIndex: 10 - idx }}>
                      <img src={m.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${m.id}`} className="w-full h-full object-cover bg-white dark:bg-slate-800" alt="avatar" />
                    </div>
                  ))}
                  {activeBoardMembers.length > 3 && (
                    <div className="w-7 h-7 rounded-full border-2 border-white dark:border-[#0E1116] bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[9px] font-bold text-slate-500 dark:text-slate-300 relative" style={{ zIndex: 0 }}>
                      +{activeBoardMembers.length - 3}
                    </div>
                  )}
                </div>
                <input type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" ref={fileInputRef} onChange={handleImportFile} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 text-[12px] font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 border border-green-200 dark:border-green-800/50 bg-white dark:bg-[#1C1F26] rounded-md transition-all flex items-center gap-1.5 hidden sm:flex"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg> {t.importFile}</button>

                <div className="relative hidden sm:block">
                  <button onClick={() => setShowExportMenu(!showExportMenu)} className="px-3 py-1.5 text-[12px] font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1C1F26] rounded-md transition-all hover:shadow-sm flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> {t.exportFile}</button>
                  {showExportMenu && (
                    <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-[#1C1F26] rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-[120] overflow-hidden">
                      <div className="py-1">
                        <button onClick={() => handleExport('xlsx')} className="w-full text-left px-4 py-2 text-[13px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors"><span className="text-green-600 font-bold">XLSX</span> {t.excelStandard}</button>
                        <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2 text-[13px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors"><span className="text-blue-600 font-bold">CSV</span> {t.rawData}</button>
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={() => setIsMembersModalOpen(true)} className="px-3 py-1.5 text-[12px] font-medium border rounded-md dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  {isManager ? t.invite : t.memberBtn}
                </button>
              </div>
            </header>

            {/* ========================================== */}
            {/* TOOLBAR (TÌM KIẾM / LỌC) */}
            {/* ========================================== */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/50 flex flex-wrap items-center gap-3 flex-shrink-0">
              <div className="relative flex-1 min-w-[220px] max-w-[320px] z-50 group">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input 
                  type="text" 
                  placeholder={t.searchPlaceholder} 
                  value={searchTaskQuery} 
                  onChange={(e) => setSearchTaskQuery(e.target.value)} 
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#1C1F26] border border-slate-200 dark:border-slate-700 rounded-lg text-[13px] font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:text-white transition-all shadow-sm placeholder:font-normal placeholder:text-slate-400" 
                />
                
                {searchTaskQuery.trim().length > 0 && (
                  <div className="absolute top-full left-0 mt-2 w-[350px] bg-white dark:bg-[#1C1F26] border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-h-[300px] overflow-y-auto py-1">
                      {searchResults.length === 0 ? (
                        <div className="p-6 text-center">
                          <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">{t.noTasksFound}</p>
                        </div>
                      ) : searchResults.map((task: any) => {
                        const col = columns.find(c => c.id === task.column_id);
                        return (
                          <div key={task.id} onClick={() => { handleTaskClick(task); setSearchTaskQuery(""); }} className="px-4 py-3 border-b border-slate-50 dark:border-slate-800/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors group">
                            <p className="text-[13px] font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{task.content}</p>
                            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                              {t.inColumn} {col?.title || t.unknown}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <select value={filterAssigneeId} onChange={(e) => setFilterAssigneeId(e.target.value)} className="text-[13px] font-medium bg-white dark:bg-[#1C1F26] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-sm cursor-pointer">
                  <option value="all">{t.allMembers}</option>
                  {activeBoardMembers.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>

                <select value={filterLabelId} onChange={(e) => setFilterLabelId(e.target.value)} className="text-[13px] font-medium bg-white dark:bg-[#1C1F26] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-sm cursor-pointer">
                  <option value="all">{t.allLabels}</option>
                  {boardLabels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>

                <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="text-[13px] font-medium bg-white dark:bg-[#1C1F26] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-sm cursor-pointer">
                  <option value="all">{t.allPriorities}</option>
                  {Object.entries(priorityConfig).map(([key, config]: any) => <option key={key} value={key}>{translatePriority(config.label, lang)}</option>)}
                </select>
              </div>

              {(searchTaskQuery || filterAssigneeId !== "all" || filterLabelId !== "all" || filterPriority !== "all") && (
                <button onClick={() => { setSearchTaskQuery(""); setFilterAssigneeId("all"); setFilterLabelId("all"); setFilterPriority("all"); }} className="text-[12px] text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 font-medium px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ml-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg> {t.clearFilter}
                </button>
              )}

              <div className="ml-auto flex bg-slate-100 dark:bg-[#0E1116] p-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                <button onClick={() => setTaskViewMode("board")} className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-md transition-all ${taskViewMode === "board" ? "bg-white dark:bg-[#1C1F26] text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg> {t.boardView}
                </button>
                <button onClick={() => setTaskViewMode("list")} className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-md transition-all ${taskViewMode === "list" ? "bg-white dark:bg-[#1C1F26] text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg> {t.listView}
                </button>
              </div>
            </div>

            {/* ========================================== */}
            {/* KANBAN BOARD AREA */}
            {/* ========================================== */}
            <DndContext sensors={sensors} collisionDetection={customCollisionDetection} onDragStart={onDragStart} onDragEnd={onDragEnd}>
              {taskViewMode === "board" ? (
                <div className="flex flex-1 gap-6 overflow-x-auto pb-4 hide-scrollbar snap-x items-start p-6">
                  <SortableContext items={columns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
                    {columns.map((col) => {
                      const colTasks = filteredTasks.filter((t) => t.column_id === col.id);
                      const safeTitle = (col.title || "").toLowerCase();
                      const isDoneCol = safeTitle.includes("done") || safeTitle.includes("hoàn thành") || safeTitle.includes("xong") || safeTitle.includes("complete");

                      return (
                        <SortableColumn key={col.id} col={col} tasks={colTasks} activeBoardMembers={activeBoardMembers} boardLabels={boardLabels} taskLabels={taskLabels} deleteColumn={deleteColumn} editColumn={editColumn} deleteTask={deleteTask} onTaskClick={handleTaskClick} onQuickComplete={handleQuickComplete} onAddTask={handleAddTask} isLastColumn={isDoneCol} isManager={isManager} lang={lang} />
                      );
                    })}
                  </SortableContext>

                  {activeBoardId && isManager && (
                    <div className="w-[260px] md:w-[280px] flex-shrink-0">
                      {isAddingColumn ? (
                        <div className="bg-slate-50 dark:bg-[#15171C] p-2 rounded-lg border border-blue-400">
                          <input ref={newColumnInputRef} autoFocus value={newColumnTitle} onChange={(e) => { setNewColumnTitle(e.target.value); columnTitleRef.current = e.target.value; }} onKeyDown={handleAddColumnKeyDown} onBlur={handleAddColumnBlur} placeholder={t.newColumnName} className="w-full text-[13px] bg-white dark:bg-[#1C1F26] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 outline-none dark:text-white" />
                        </div>
                      ) : (
                        <button onClick={() => setIsAddingColumn(true)} className="w-full flex items-center gap-2 text-[13px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-[#15171C]">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg> {t.addColumn}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 p-4 md:p-6 overflow-y-auto relative">
                  <div className="max-w-4xl mx-auto space-y-6 pb-10">
                    <SortableContext items={columns.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                      {columns.map(col => {
                        const colTasks = filteredTasks.filter(t => t.column_id === col.id);
                        return <SortableListColumn key={col.id} col={col} tasks={colTasks} activeBoardMembers={activeBoardMembers} boardLabels={boardLabels} taskLabels={taskLabels} onTaskClick={handleTaskClick} onAddTask={handleAddTask} editColumn={editColumn} deleteColumn={deleteColumn} isManager={isManager} lang={lang} />;
                      })}
                    </SortableContext>
                    {activeBoardId && isManager && (
                      <div className="pt-2">
                        {isAddingColumn ? (
                          <div className="bg-slate-50 dark:bg-[#15171C] p-3 rounded-xl border border-blue-400 shadow-sm"><input ref={newColumnInputRef} autoFocus value={newColumnTitle} onChange={(e) => { setNewColumnTitle(e.target.value); columnTitleRef.current = e.target.value; }} onKeyDown={handleAddColumnKeyDown} onBlur={handleAddColumnBlur} placeholder={t.newColumnName} className="w-full text-[13px] bg-white dark:bg-[#1C1F26] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 outline-none dark:text-white" /></div>
                        ) : (
                          <button onClick={() => setIsAddingColumn(true)} className="w-full flex items-center justify-center gap-2 text-[13px] font-medium text-slate-500 hover:text-slate-800 p-3.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#15171C] border border-dashed border-slate-300 dark:border-slate-700"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg> {t.addList}</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
                {activeItem?.type === "Column" ? (
                  <div className="bg-slate-50 dark:bg-[#15171C] p-3 rounded-xl w-[260px] md:w-[280px] shadow-2xl border-2 border-blue-500 scale-95 opacity-90 rotate-2 cursor-grabbing transition-transform duration-200">
                    <div className="flex items-center justify-between"><h3 className="font-semibold text-[14px] text-blue-600 dark:text-blue-400">{activeItem.data.title}</h3></div>
                  </div>
                ) : activeItem?.type === "Task" ? (
                  taskViewMode === "board" ? <TaskCard task={activeItem.data} boardMembers={activeBoardMembers} boardLabels={boardLabels} taskLabels={taskLabels} isOverlay lang={lang} /> : <div className="bg-white dark:bg-[#1C1F26] flex items-center gap-3 p-3 rounded-lg shadow-2xl border border-blue-500 scale-[1.02] w-[400px]"><div className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityConfig[activeItem.data.priority || "normal"].dotClass}`}></div><p className="text-[13px] font-medium text-slate-800 dark:text-slate-200">{activeItem.data.content}</p></div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </>
        )}
      </main>
    </div>
  );
}