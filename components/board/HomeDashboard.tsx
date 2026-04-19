// components/board/HomeDashboard.tsx
"use client";
import { useState, useEffect } from "react";
import { priorityConfig } from "@/lib/constants";
import { format, isBefore, startOfDay, addDays } from "date-fns";
import { vi, enUS } from "date-fns/locale"; // 👇 IMPORT enUS
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/lib/supabase";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { AlertTriangle, UserPlus, X, Briefcase, CalendarClock, ArrowRight } from "lucide-react";
import { translations, translatePriority, translateActivity } from "@/lib/translations";
import NotificationBell from "./NotificationBell";

export default function HomeDashboard({ 
  boards = [], 
  boardStats, 
  allBoardMembers, 
  allUsers, 
  navigateToBoard, 
  setIsAddingBoard, 
  currentUser,
  notifications=[],
  setNotifications,
  setActiveBoardId,
  setCurrentView,
  setAutoOpenTaskId,
  lang = "vi" // 👇 NHẬN BIẾN NGÔN NGỮ
}: any) {

  // KÍCH HOẠT TỪ ĐIỂN VÀ LOCALE NGÀY THÁNG
  const t = translations[lang as keyof typeof translations] || translations["vi"];
  const dateLocale = lang === "en" ? enUS : vi;

  const [filterPriority, setFilterPriority] = useState<string>("all");

  const [taskStatusData, setTaskStatusData] = useState<any[]>([]);
  const [workloadData, setWorkloadData] = useState<any[]>([]);
  const [localBoardStats, setLocalBoardStats] = useState<Record<string, { taskCount: number; progress: number }>>({});
  const [alerts, setAlerts] = useState({ overdue: 0, dueThisWeek: 0, unassigned: 0 });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [storedColumns, setStoredColumns] = useState<any[]>([]);
  const [overdueTasksList, setOverdueTasksList] = useState<any[]>([]);
  const [unassignedTasksList, setUnassignedTasksList] = useState<any[]>([]);
  const [dueThisWeekTasksList, setDueThisWeekTasksList] = useState<any[]>([]);
  const [activeModal, setActiveModal] = useState<"overdue" | "dueThisWeek" | "unassigned" | null>(null);

  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isGlobalManager, setIsGlobalManager] = useState(false);

  const filteredBoards = boards.filter((board: any) => {
    if (filterPriority === "all") return true;
    return (board.priority || "normal") === filterPriority;
  });

  const safeFormatDate = (dateString: string | undefined | null) => {
    if (!dateString) return t.noDueDate;
    try {
      const dateObj = new Date(dateString);
      if (isNaN(dateObj.getTime())) return t.invalidDate;
      return format(dateObj, 'dd/MM/yyyy');
    } catch (error) { return t.displayError; }
  };

  const getBoardNameByColumnId = (columnId: string) => {
    const col = storedColumns.find(c => c.id === columnId);
    if (!col) return t.unknown;
    const board = boards.find((b: any) => b.id === col.board_id);
    return board?.name || t.unknown;
  };

  useEffect(() => {
    const fetchGlobalAnalytics = async () => {
      if (!boards || boards.length === 0 || !currentUser) {
        setTaskStatusData([{ name: t.empty, value: 1, color: '#e2e8f0' }]);
        setWorkloadData([]); setIsLoadingStats(false); return;
      }

      const boardIds = boards.map((b: any) => b.id);

      let isSuperAdminUser = false;
      try {
        const { data: companyData } = await supabase.from('company_settings').select('super_admin_id').eq('id', 1).single();
        if (companyData) {
          isSuperAdminUser = companyData.super_admin_id === currentUser.id;
        }
      } catch (error) {
        console.error("Lỗi khi kiểm tra Super Admin:", error);
      }
      setIsSuperAdmin(isSuperAdminUser);

      const myRoles: Record<string, string> = {};
      let hasManagerRole = false;

      allBoardMembers.forEach((bm: any) => {
        if (bm.user_id === currentUser.id) {
          myRoles[bm.board_id] = bm.role;
          if (bm.role === "admin" || bm.role === "Quản lý" || bm.role === "manager") {
            hasManagerRole = true;
          }
        }
      });

      const isOwnerOfAnyBoard = boards.some((b: any) => b.user_id === currentUser.id);

      const isManagerOrAdmin = isSuperAdminUser || hasManagerRole || isOwnerOfAnyBoard;
      setIsGlobalManager(isManagerOrAdmin);

      const { data: acts } = await supabase.from("activities")
        .select(`*, users!user_id (name, avatar_url), tasks (content, column_id, assignee_ids)`)
        .order("created_at", { ascending: false }).limit(40);

      const { data: cols } = await supabase.from("columns").select("*").in("board_id", boardIds);
      if (cols) setStoredColumns(cols);
      const colIds = cols?.map(c => c.id) || [];

      let tsks: any[] = [];
      if (colIds.length > 0) {
        const { data } = await supabase.from("tasks").select("*").in("column_id", colIds);
        if (data) tsks = data;
      }

      if (cols && tsks) {
        const visibleTasks = tsks.filter(t => {
          const c = cols.find(col => col.id === t.column_id);
          if (!c) return false;
          const role = myRoles[c.board_id] || "member";
          const isBoardOwner = boards.find((b: any) => b.id === c.board_id)?.user_id === currentUser.id;
          const hasPower = isSuperAdminUser || isBoardOwner || role === "admin" || role === "Quản lý" || role === "manager";
          if (hasPower) return true; 

          const safeIds = t.assignee_ids ? (Array.isArray(t.assignee_ids) ? t.assignee_ids : [t.assignee_ids]) : (t.assignee_id ? [t.assignee_id] : []);
          return safeIds.includes(currentUser.id);
        });

        if (acts) {
          const visibleActs = acts.filter(act => {
            if (!act.tasks || !act.tasks.column_id) return false;
            const c = cols.find(col => col.id === act.tasks.column_id);
            if (!c) return false;
            const role = myRoles[c.board_id] || "member";
            const isBoardOwner = boards.find((b: any) => b.id === c.board_id)?.user_id === currentUser.id;
            const hasPower = isSuperAdminUser || isBoardOwner || role === "admin" || role === "Quản lý" || role === "manager";
            if (hasPower) return true;
            const safeIds = act.tasks.assignee_ids ? (Array.isArray(act.tasks.assignee_ids) ? act.tasks.assignee_ids : [act.tasks.assignee_ids]) : [];
            return safeIds.includes(currentUser.id);
          });
          setRecentActivities(visibleActs.slice(0, 15));
        }

        const today = startOfDay(new Date());
        const nextWeek = addDays(today, 7);
        let todo = 0, doing = 0, done = 0;
        let overdue = 0, dueThisWeek = 0, unassigned = 0;
        let overdueArr: any[] = []; let unassignedArr: any[] = []; let dueThisWeekArr: any[] = [];
        const userTasks: Record<string, { name: string; low: number; normal: number; high: number; urgent: number; total: number }> = {};

        visibleTasks.forEach(t => {
          const c = cols.find(col => col.id === t.column_id);
          const isDone = c && (c.title.toLowerCase().includes("done") || c.title.toLowerCase().includes("xong") || c.title.toLowerCase().includes("hoàn thành") || c.title.toLowerCase().includes("complete"));
          const safeIds = t.assignee_ids ? (Array.isArray(t.assignee_ids) ? t.assignee_ids : [t.assignee_ids]) : (t.assignee_id ? [t.assignee_id] : []);

          if (isDone) { done++; }
          else {
            if (c && (c.title.toLowerCase().includes("doing") || c.title.toLowerCase().includes("đang làm") || c.title.toLowerCase().includes("in progress"))) doing++;
            else todo++;

            if (safeIds.length === 0) {
              unassigned++;
              unassignedArr.push(t);
            }

            if (t.due_date) {
              const dueDate = startOfDay(new Date(t.due_date));
              if (isBefore(dueDate, today)) { overdue++; overdueArr.push(t); }
              else if (isBefore(dueDate, nextWeek) || dueDate.getTime() === today.getTime()) { dueThisWeek++; dueThisWeekArr.push(t); }
            }

            const p = t.priority || "normal";
            if (safeIds.length > 0) {
              safeIds.forEach((id: string) => {
                const role = c ? myRoles[c.board_id] || "member" : "member";
                const isBoardOwner = c ? boards.find((b: any) => b.id === c.board_id)?.user_id === currentUser.id : false;
                const hasPower = isSuperAdminUser || isBoardOwner || role === "admin" || role === "Quản lý" || role === "manager";

                if (hasPower || id === currentUser.id) {
                  const user = allUsers.find((u: any) => u.id === id);
                  const userName = user ? user.name.split(' ')[0] : t.anonymous;
                  if (!userTasks[userName]) userTasks[userName] = { name: userName, low: 0, normal: 0, high: 0, urgent: 0, total: 0 };
                  userTasks[userName][p as keyof typeof userTasks[string]]++;
                  userTasks[userName].total++;
                }

              });
            }
          }
        });

        setAlerts({ overdue, dueThisWeek, unassigned });
        setOverdueTasksList(overdueArr);
        setUnassignedTasksList(unassignedArr);
        setDueThisWeekTasksList(dueThisWeekArr);

        setTaskStatusData([
          { name: t.todoStatus, value: todo, color: '#94a3b8' },
          { name: t.doingStatus, value: doing, color: '#3b82f6' },
          { name: t.doneStatus, value: done, color: '#22c55e' }
        ]);

        setWorkloadData(Object.values(userTasks).sort((a, b) => b.total - a.total).slice(0, 10));

        const stats: Record<string, { taskCount: number; doneCount: number; progress: number }> = {};
        boards.forEach((b: any) => { stats[b.id] = { taskCount: 0, doneCount: 0, progress: 0 }; });

        visibleTasks.forEach(task => {
          const c = cols.find(col => col.id === task.column_id);
          if (c) {
            const isDone = c.title.toLowerCase().includes("done") || c.title.toLowerCase().includes("xong") || c.title.toLowerCase().includes("hoàn thành") || c.title.toLowerCase().includes("complete");
            stats[c.board_id].taskCount++;
            if (isDone) stats[c.board_id].doneCount++;
          }
        });

        Object.keys(stats).forEach(key => {
          stats[key].progress = stats[key].taskCount > 0 ? Math.round((stats[key].doneCount / stats[key].taskCount) * 100) : 0;
        });
        setLocalBoardStats(stats);
      }
      setIsLoadingStats(false);
    };

    fetchGlobalAnalytics();
  }, [boards, allUsers, refreshTrigger, allBoardMembers, currentUser, lang]);

  useEffect(() => {
    const dashboardChannel = supabase.channel('dashboard_global_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => setRefreshTrigger(prev => prev + 1))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activities' }, () => setRefreshTrigger(prev => prev + 1))
      .subscribe();
    return () => { supabase.removeChannel(dashboardChannel); };
  }, []);

  const StatusTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-[#1C1F26] p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
          <p className="font-semibold text-[13px] text-slate-800 dark:text-slate-200 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: payload[0].payload.color }}></span>{payload[0].name}</p>
          <p className="text-[12px] text-slate-500 font-medium ml-4 mt-1">{payload[0].value} {t.taskCount}</p>
        </div>
      );
    }
    return null;
  };

  const WorkloadTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
      return (
        <div className="bg-white dark:bg-[#1C1F26] p-3 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg min-w-[150px]">
          <p className="font-bold text-[13px] mb-2 text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">{label} ({t.totalLabel}: {total})</p>
          {payload.map((entry: any, index: number) => {
            if (entry.value === 0) return null;
            return (
              <div key={index} className="flex justify-between items-center text-[12px] mb-1">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: entry.color }}></span>{entry.name}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{entry.value}</span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const handleOpenTaskDetail = (task: any) => {
    setActiveModal(null);
    const col = storedColumns.find(c => c.id === task.column_id);
    if (col) {
      navigateToBoard(col.board_id, task.id);
    }
  };

  const pieChartTitle = isSuperAdmin
    ? t.progressOverviewCompany
    : isGlobalManager
      ? t.progressOverviewManager
      : t.yourTaskStatus;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 relative">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-1.5">
              {t.workspace}
            </h1>
            <p className="text-[13px] md:text-sm text-slate-500 dark:text-slate-400">
              {t.workspaceDesc1} {boards.length} {t.workspaceDesc2}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <NotificationBell
               notifications={notifications}
               setNotifications={setNotifications}
               currentUser={currentUser}
               setActiveBoardId={setActiveBoardId}
               setCurrentView={setCurrentView}
               setAutoOpenTaskId={setAutoOpenTaskId}
               lang={lang} // NHỚ TRUYỀN LANG CHO THÔNG BÁO Ở ĐÂY NỮA
            />
            
            <button onClick={() => setIsAddingBoard(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg> {t.createNewProject}
            </button>
          </div>
        </header>

        {!isLoadingStats && boards.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div onClick={() => alerts.overdue > 0 && setActiveModal("overdue")} className={`bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-4 rounded-xl flex items-center gap-4 group transition-all duration-200 ${alerts.overdue > 0 ? 'cursor-pointer hover:border-red-300 dark:hover:border-red-700 hover:shadow-sm hover:-translate-y-0.5' : ''}`}>
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform"><AlertTriangle size={20} /></div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-red-600/80 dark:text-red-400/80 uppercase tracking-wider mb-0.5">{t.overdue}</p>
                <p className="text-xl font-bold text-red-700 dark:text-red-400 leading-none">{alerts.overdue} <span className="text-[13px] font-medium text-red-500/70">{t.tasksWord}</span></p>
              </div>
            </div>

            <div onClick={() => alerts.dueThisWeek > 0 && setActiveModal("dueThisWeek")} className={`bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 p-4 rounded-xl flex items-center gap-4 group transition-all duration-200 ${alerts.dueThisWeek > 0 ? 'cursor-pointer hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-sm hover:-translate-y-0.5' : ''}`}>
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform"><CalendarClock size={20} /></div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-orange-600/80 dark:text-orange-400/80 uppercase tracking-wider mb-0.5">{t.dueThisWeek}</p>
                <p className="text-xl font-bold text-orange-700 dark:text-orange-400 leading-none">{alerts.dueThisWeek} <span className="text-[13px] font-medium text-orange-500/70">{t.tasksWord}</span></p>
              </div>
            </div>

            <div onClick={() => alerts.unassigned > 0 && setActiveModal("unassigned")} className={`bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4 rounded-xl flex items-center gap-4 group transition-all duration-200 ${alerts.unassigned > 0 ? 'cursor-pointer hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-sm hover:-translate-y-0.5' : ''}`}>
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:scale-110 transition-transform"><UserPlus size={20} /></div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">{t.unassigned}</p>
                <p className="text-xl font-bold text-slate-700 dark:text-slate-300 leading-none">{alerts.unassigned} <span className="text-[13px] font-medium text-slate-500/70">{t.tasksWord}</span></p>
              </div>
            </div>
          </div>
        )}

        {boards.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 md:p-20 bg-white/50 dark:bg-[#15171C]/50 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl text-slate-400 mt-6">
            <svg className="w-12 h-12 mb-4 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            <p className="text-sm font-medium">{t.noProjectsToShow}</p>
          </div>
        ) : (
          <>
            {!isLoadingStats && (
              <div className={`grid grid-cols-1 ${isGlobalManager ? 'lg:grid-cols-3' : 'lg:grid-cols-1 max-w-sm mx-auto'} gap-5 mb-8`}>

                {isGlobalManager && (
                  <div className="lg:col-span-2 bg-white dark:bg-[#1C1F26] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-semibold text-[14px] text-slate-800 dark:text-slate-200 flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                        {t.workload} {isSuperAdmin ? t.companyWide : t.managedProjects}
                      </h3>
                    </div>
                    <div className="h-[240px] w-full text-[12px] flex-1">
                      {workloadData.length === 0 ? (
                        <p className="text-slate-400 italic flex h-full items-center justify-center">{t.noActiveTasks}</p>
                      ) : (
                        <ResponsiveContainer width="100%"minHeight={240}>
                          <BarChart data={workloadData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                            <XAxis dataKey="name" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <RechartsTooltip content={<WorkloadTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                            <Bar dataKey="urgent" name={t.urgent} stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} maxBarSize={40} />
                            <Bar dataKey="high" name={t.high} stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} maxBarSize={40} />
                            <Bar dataKey="normal" name={t.normalPriority || t.normal} stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} maxBarSize={40} />
                            <Bar dataKey="low" name={t.low} stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                )}

                <div className={`${!isGlobalManager ? 'col-span-1' : ''} bg-white dark:bg-[#1C1F26] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col relative`}>
                  <h3 className="font-semibold text-[14px] text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2 z-10"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
                    {pieChartTitle}
                  </h3>
                  <div className="flex-1 min-h-[200px] w-full relative">
                    <ResponsiveContainer width="100%" minHeight={240}>
                      <PieChart>
                        <Pie data={taskStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                          {taskStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <RechartsTooltip content={<StatusTooltip />} wrapperStyle={{ zIndex: 100 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                      <span className="text-3xl font-bold text-slate-800 dark:text-slate-100 leading-none">{taskStatusData.reduce((a, c) => a + c.value, 0)}</span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{t.totalTasks}</span>
                    </div>
                  </div>
                  <div className="flex justify-center gap-4 mt-2 z-10">
                    {taskStatusData.map((d, i) => (
                      <div key={i} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></span><span className="text-[12px] font-medium text-slate-600 dark:text-slate-400">{d.name}</span></div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 px-1 -mx-1 scrollbar-hide">
              <button onClick={() => setFilterPriority("all")} className={`text-[12px] font-medium px-4 py-1.5 rounded-full border transition-all flex-shrink-0 ${filterPriority === "all" ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 border-slate-800 dark:border-slate-200 shadow-sm" : "bg-white text-slate-600 dark:bg-[#1C1F26] dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}>{t.allFilter}</button>
              {Object.entries(priorityConfig).map(([key, config]: any) => (
                <button key={key} onClick={() => setFilterPriority(key)} className={`text-[12px] font-medium px-4 py-1.5 rounded-full flex items-center gap-1.5 border transition-all flex-shrink-0 ${filterPriority === key ? `${config.color} shadow-sm border-transparent ring-1 ring-current` : "bg-white text-slate-600 dark:bg-[#1C1F26] dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}><span className={`w-2 h-2 rounded-full ${config.dotClass}`}></span>{translatePriority(config.label, lang)}</button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <h3 className="font-semibold text-[15px] text-slate-800 dark:text-slate-200 mb-4">{t.activeProjects} ({filteredBoards.length})</h3>
                {filteredBoards.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 bg-slate-50/50 dark:bg-[#15171C]/50 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl text-slate-400">
                    <p className="text-[13px] font-medium">{t.noProjectsMatchFilter}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredBoards.map((board: any) => {
                      const progress = localBoardStats[board.id]?.progress || 0;
                      const taskCount = localBoardStats[board.id]?.taskCount || 0;
                      const bMembers = allBoardMembers.filter((bm: any) => bm.board_id === board.id);
                      const actualMemberCount = bMembers.length > 0 ? bMembers.length : (board.members_count || 0);
                      const displayAvatars = bMembers.slice(0, 3).map((bm: any) => allUsers.find((u: any) => u.id === bm.user_id)?.avatar_url).filter(Boolean);
                      const pConfig = priorityConfig[board.priority || "normal"];

                      const myRoleInThisBoard = bMembers.find((bm: any) => bm.user_id === currentUser?.id)?.role || "member";
                      const isManagerRole = isSuperAdmin || board.user_id === currentUser?.id || myRoleInThisBoard === "admin" || myRoleInThisBoard === "Quản lý" || myRoleInThisBoard === "manager";

                      return (
                        <div key={board.id} onClick={() => navigateToBoard(board.id)} className="group bg-white dark:bg-[#1C1F26] p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md cursor-pointer transition-all duration-200 flex flex-col relative overflow-hidden">
                          <div className={`absolute top-0 left-0 w-full h-1 ${pConfig.dotClass}`}></div>

                          <div className="flex justify-between items-start mb-5 mt-1">
                            <div className="flex-1 min-w-0 mr-3">
                              <h3 className="font-bold text-[15px] text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate transition-colors">{board.name}</h3>
                              <p className="text-[11px] text-slate-500 mt-1 font-medium flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>{safeFormatDate(board.created_at)}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1.5">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${isManagerRole ? 'bg-[#4285F4]/10 text-[#4285F4] border-[#4285F4]/30 dark:bg-[#4285F4]/20 dark:border-[#4285F4]/40' : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}>
                                {isManagerRole ? t.managerRole : t.memberRole}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-auto mb-5">
                            <div className="flex items-center gap-2">
                              <div className="flex -space-x-2">
                                {displayAvatars.map((avatar: string, i: number) => <div key={i} className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-[#1C1F26] overflow-hidden"><img src={avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${board.id}-${i}`} className="w-full h-full object-cover" /></div>)}
                                {actualMemberCount > 3 && <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-[#1C1F26] flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-400 z-10">+{actualMemberCount - 3}</div>}
                              </div>
                            </div>
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700/50 flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>{taskCount}</span>
                          </div>
                          <div className="space-y-2 bg-slate-50/80 dark:bg-[#15171C]/80 p-3 rounded-lg border border-slate-100 dark:border-slate-800/50">
                            <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300"><span>{t.progressLabel}</span><span className={progress === 100 ? "text-emerald-600 dark:text-emerald-500 font-bold" : ""}>{progress}%</span></div>
                            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700/50 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }}></div></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="lg:col-span-1">
                <div className="bg-white dark:bg-[#1C1F26] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[500px]">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-2 bg-slate-50/50 dark:bg-[#15171C]/50"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg><h3 className="font-semibold text-[14px] text-slate-800 dark:text-slate-200">{t.recentActivitiesTitle}</h3></div>
                  <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide relative">
                    <div className="p-4 pb-8 space-y-5">
                      {recentActivities.length === 0 ? <p className="text-center text-[13px] text-slate-400 italic mt-10">{t.noActivities}</p> : recentActivities.map((act, idx) => (
                        <div key={act.id} className="flex gap-3 relative">
                          {idx !== recentActivities.length - 1 && <div className="absolute left-[15px] top-8 h-[calc(100%+16px)] w-[1.5px] bg-slate-200 dark:bg-slate-800 rounded-full"></div>}
                          <img src={act.users?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${act.user_id}`} className="w-8 h-8 rounded-full border-2 border-white dark:border-[#1C1F26] z-10 shadow-sm object-cover bg-slate-100 flex-shrink-0" />
                          <div className="flex-1 min-w-0 pt-0.5">
                            <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-snug"><span className="font-bold text-slate-900 dark:text-slate-100 mr-1">{act.users?.name || t.anonymous}</span>{translateActivity(act.content, lang)}</p>
                            {act.tasks && (
                              <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap"><span>{t.inCard}</span><span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[160px]" title={act.tasks.content}>"{act.tasks.content}"</span><span className="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded font-medium border border-blue-100 dark:border-blue-800/50">{t.projectLabel} {getBoardNameByColumnId(act.tasks.column_id)}</span></div>
                            )}
                            {/* DỊCH NGÀY GIỜ BẰNG ENUS NẾU LÀ TIẾNG ANH */}
                            <p className="text-[10px] font-medium text-slate-400 mt-1.5">{formatDistanceToNow(new Date(act.created_at), { addSuffix: true, locale: dateLocale })}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {activeModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity" onClick={() => setActiveModal(null)}>
          <div className="bg-white dark:bg-[#1C1F26] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden scale-in-center" onClick={(e) => e.stopPropagation()}>
            <div className={`p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center ${activeModal === 'overdue' ? 'bg-red-50 dark:bg-red-950/30' : activeModal === 'dueThisWeek' ? 'bg-orange-50 dark:bg-orange-950/30' : 'bg-slate-50 dark:bg-slate-900/50'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeModal === 'overdue' ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400' : activeModal === 'dueThisWeek' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                  {activeModal === 'overdue' ? <AlertTriangle size={22} /> : activeModal === 'dueThisWeek' ? <CalendarClock size={22} /> : <UserPlus size={22} />}
                </div>
                <div>
                  <h2 className="font-bold text-lg text-slate-900 dark:text-white">{activeModal === 'overdue' ? t.overdueTasksTitle : activeModal === 'dueThisWeek' ? t.dueThisWeekTasksTitle : t.unassignedTasksTitle}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {activeModal === 'overdue' ? t.totalOverdueDesc.replace("{0}", overdueTasksList.length.toString()) : activeModal === 'dueThisWeek' ? t.totalDueThisWeekDesc.replace("{0}", dueThisWeekTasksList.length.toString()) : t.totalUnassignedDesc.replace("{0}", unassignedTasksList.length.toString())}
                  </p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"><X size={20} /></button>
            </div>
            <div className="p-3 overflow-y-auto flex-1 space-y-2.5 bg-slate-50/50 dark:bg-[#15171C]/50 scrollbar-thin">
              {(activeModal === 'overdue' ? overdueTasksList : activeModal === 'dueThisWeek' ? dueThisWeekTasksList : unassignedTasksList).map((task) => {
                const boardName = getBoardNameByColumnId(task.column_id);
                const pConfig = priorityConfig[task.priority || "normal"];
                return (
                  <div key={task.id} className="bg-white dark:bg-[#1C1F26] p-4 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm transition-all flex gap-4 items-center group">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2"><p className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate flex-1">{task.content || t.noName}</p><span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1.5 flex-shrink-0 ${pConfig.color} border border-transparent dark:border-current/20`}><span className={`w-1 h-1 rounded-full ${pConfig.dotClass}`}></span>{translatePriority(pConfig.label, lang)}</span></div>
                      <div className="flex items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        <div className="flex items-center gap-1.5 min-w-0"><Briefcase size={13} className="text-slate-400 flex-shrink-0" /><span className="truncate">{t.projectLabel}: <span className="font-medium text-slate-700 dark:text-slate-300">{boardName}</span></span></div>
                        <div className="flex items-center gap-1.5"><CalendarClock size={13} className={`${activeModal === 'overdue' ? 'text-red-500' : activeModal === 'dueThisWeek' ? 'text-orange-500' : 'text-slate-400'}`} /><span className={activeModal === 'overdue' ? 'font-semibold text-red-600 dark:text-red-400' : activeModal === 'dueThisWeek' ? 'font-semibold text-orange-600 dark:text-orange-400' : ''}>{t.deadlineLabel} {safeFormatDate(task.due_date)}</span></div>
                      </div>
                    </div>
                    <button onClick={() => handleOpenTaskDetail(task)} className="flex-shrink-0 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm border border-slate-200 dark:border-slate-700">{t.openTask}<ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" /></button>
                  </div>
                )
              })}
            </div>
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1C1F26] text-center">
              <button onClick={() => setActiveModal(null)} className="px-4 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">{t.closeWindow}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}