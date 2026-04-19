// components/board/TaskCard.tsx
"use client";
import React, { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { priorityConfig } from "@/lib/constants";
import { translatePriority, translations } from "@/lib/translations"; 

// HÀM FORMAT NGÀY THÁNG AN TOÀN
const formatDateVN = (dateString: string | null) => {
  if (!dateString) return "";
  if (dateString.includes('-') && dateString.length <= 10) {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  }
  return dateString; 
};

// THUẬT TOÁN TÍNH TOÁN CẢNH BÁO HẠN CHÓT
const getDeadlineStatus = (dueDateStr: string | null, isDone: boolean) => {
  if (!dueDateStr) return { class: "text-slate-400 font-medium", isUrgent: false };
  
  if (isDone) {
    return { class: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold", isUrgent: false };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(dueDateStr);
  dueDate.setHours(0, 0, 0, 0);

  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { class: "text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 font-bold px-1.5 py-0.5 rounded", isUrgent: true };
  if (diffDays === 0) return { class: "text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-500 font-bold px-1.5 py-0.5 rounded", isUrgent: true };
  if (diffDays <= 2) return { class: "text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 font-bold px-1.5 py-0.5 rounded", isUrgent: true };

  return { class: "text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-medium", isUrgent: false };
};

function TaskCard({
  task,
  boardMembers,
  boardLabels = [],
  taskLabels = [],
  isOverlay = false,
  onTaskClick,
  onQuickComplete,
  deleteTask,
  isDoneColumn,
  isManager, // 👇 NHẬN isManager ĐỂ GIẤU NÚT XÓA
  lang       // 👇 NHẬN BIẾN NGÔN NGỮ
}: any) {
  
  // KÍCH HOẠT TỪ ĐIỂN
  const t = translations[lang as keyof typeof translations] || translations["vi"];

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "Task", task },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1
  };

  const myLabelIds = taskLabels.filter((tl: any) => tl.task_id === task.id).map((tl: any) => tl.label_id);
  const myLabels = boardLabels.filter((l: any) => myLabelIds.includes(l.id));

  const rawIds = task.assignee_ids || task.assignee_id; 
  const safeAssigneeIds: string[] = rawIds ? (Array.isArray(rawIds) ? rawIds : [rawIds]) : [];
  const assignees = boardMembers?.filter((m: any) => safeAssigneeIds.includes(m.id)) || [];

  const pConfig = priorityConfig[task.priority || "normal"] || priorityConfig["normal"];
  const deadlineInfo = getDeadlineStatus(task.due_date, isDoneColumn);

  const handleQuickCompleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onQuickComplete) onQuickComplete(task.id);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(t.confirmDeleteTask)) {
      if (deleteTask) deleteTask(task.id);
    }
  };

  return (
    <div {...attributes} {...listeners}
      ref={setNodeRef}
      style={style}
      onClick={() => onTaskClick?.(task)}
      className={`group group/task relative bg-white dark:bg-[#1C1F26] p-3 mb-2 rounded-md shadow-sm border cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-all flex flex-col min-w-0
        ${deadlineInfo.isUrgent && !isDoneColumn ? 'border-red-200 dark:border-red-900/50 hover:border-red-400' : 'border-slate-200 dark:border-slate-800'}`}
    >

      {/* KHU VỰC CÁC NÚT THAO TÁC NHANH */}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-30">
        {!isDoneColumn && (
          <button
            onClick={handleQuickCompleteClick}
            className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md transition-colors outline-none"
            title={t.quickComplete}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </button>
        )}
        
        {/* 👇 CHỐT CHẶN: CHỈ MANAGER MỚI THẤY NÚT XÓA 👇 */}
        {isManager && (
          <button
            onClick={handleDeleteClick}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors outline-none"
            title={t.deleteTaskTitle}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
          </button>
        )}
      </div>

      {/* HIỂN THỊ BADGE ĐỘ ƯU TIÊN VÀ NHÃN */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2 pr-14">
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${pConfig?.color || "bg-slate-100 text-slate-500"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${pConfig?.dotClass || "bg-slate-400"}`}></span>
          {translatePriority(pConfig?.label || "Bình thường", lang)}
        </span>

        {myLabels?.map((l: any) => (
          <span key={l?.id} className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${l?.color || "bg-slate-200 text-slate-700"}`}>
            {l?.name || t.defaultLabel}
          </span>
        ))}
      </div>

      {/* VÙNG NẮM ĐỂ KÉO THẢ */}
      <div className="outline-none w-full overflow-hidden cursor-grab active:cursor-grabbing">
        <p className={`text-[13px] leading-relaxed break-words transition-all ${isDoneColumn ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
          {task.content}
        </p>
      </div>

      {/* FOOTER: NGÀY HẠN VÀ AVATAR STACK */}
      {(task.start_date || task.due_date || assignees.length > 0) && (
        <div className="mt-3 flex items-center justify-between border-t border-slate-50 dark:border-slate-800/50 pt-2.5">
          
          <div className={`text-[10px] flex items-center gap-1.5 transition-colors ${deadlineInfo.class}`}>
            {(task.start_date || task.due_date) && (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                {task.start_date && <span>{formatDateVN(task.start_date)}</span>}
                {task.start_date && task.due_date && <span className="mx-0.5">-</span>}
                {task.due_date && <span>{formatDateVN(task.due_date)}</span>}
              </>
            )}
          </div>

          {/* AVATAR STACK */}
          {assignees.length > 0 && (
            <div className="flex -space-x-1.5 justify-end items-center">
              {assignees.slice(0, 3).map((member: any, index: number) => (
                <img
                  key={member.id}
                  src={member.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${member.id}`}
                  className="w-5 h-5 rounded-full border border-white dark:border-[#1C1F26] object-cover relative shadow-sm transition-transform group-hover/task:-translate-y-0.5"
                  style={{ zIndex: 10 - index }}
                  title={member.name}
                />
              ))}

              {assignees.length > 3 && (
                <div
                  className="w-5 h-5 rounded-full border border-white dark:border-[#1C1F26] bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-500 dark:text-slate-300 relative z-0 shadow-sm transition-transform group-hover/task:-translate-y-0.5"
                  title={`${t.and} ${assignees.length - 3} ${t.others}`}
                >
                  +{assignees.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(TaskCard);