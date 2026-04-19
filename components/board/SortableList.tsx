// components/board/SortableList.tsx
"use client";
import { useState } from "react";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { priorityConfig } from "@/lib/constants";

// Hàm chuyển đổi ngày
const formatDate = (dateString: string | null) => {
  if (!dateString) return "";
  try {
    return format(new Date(dateString), 'dd/MM/yyyy');
  } catch (error) {
    return dateString; 
  }
};

// Component: Thẻ công việc trong danh sách
export function SortableListTask({ task, activeBoardMembers, boardLabels, taskLabels, onTaskClick, isManager }: any) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: task.id, data: { type: "Task", task },
  });
  const style = { transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.3 : 1 };

  const rawIds = task.assignee_ids || task.assignee_id;
  const safeAssigneeIds: string[] = rawIds ? (Array.isArray(rawIds) ? rawIds : [rawIds]) : [];
  const assignees = activeBoardMembers.filter((m: any) => safeAssigneeIds.includes(m.id)) || [];
  const pConfig = priorityConfig[task.priority || "normal"];
  const tLabels = boardLabels.filter((l: any) => taskLabels.some((tl: any) => tl.task_id === task.id && tl.label_id === l.id));

  return (
    <div ref={setNodeRef} style={style} onClick={() => onTaskClick(task)} className="flex items-center gap-3 p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group bg-white dark:bg-[#1C1F26] border-b border-slate-50 dark:border-slate-800/50 last:border-0 relative z-10">
      <div {...attributes} {...listeners} onClick={(e) => e.stopPropagation()} className="p-1 text-slate-300 dark:text-slate-600 hover:text-slate-500 cursor-grab active:cursor-grabbing">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="5" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="9" cy="19" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="19" r="1" /></svg>
      </div>

      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${pConfig?.dotClass}`} title={`Ưu tiên: ${pConfig?.label}`}></div>
      <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center gap-2">
        <p className="text-[13px] font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">{task.content}</p>
        {tLabels.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 md:mt-0">
            {tLabels.map((l: any) => <span key={l.id} className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${l.color}`}>{l.name}</span>)}
          </div>
        )}
      </div>

      {assignees.length > 0 && (
        <div className="hidden sm:flex -space-x-1.5 items-center mr-2">
          {assignees.slice(0, 3).map((member: any, index: number) => (
            <img key={`${member.id}-${index}`} src={member.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${member.id}`} className="w-6 h-6 rounded-full border-2 border-white dark:border-[#1C1F26] object-cover relative shadow-sm" style={{ zIndex: 10 - index }} title={member.name} />
          ))}
          {assignees.length > 3 && <div className="w-6 h-6 rounded-full border-2 border-white dark:border-[#1C1F26] bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-500 dark:text-slate-300 relative z-0">+{assignees.length - 3}</div>}
        </div>
      )}

      {task.start_date && <div className="hidden sm:block text-[11px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{formatDate(task.start_date)}</div>}
      {task.start_date && task.due_date && <span> - </span>}
      {task.due_date && <div className="hidden sm:block text-[11px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{formatDate(task.due_date)}</div>}
    </div>
  );
}

// Component: Cột danh sách
// [ĐÃ SỬA] Thêm editColumn, deleteColumn và isManager vào khai báo
export function SortableListColumn({ col, tasks, activeBoardMembers, boardLabels, taskLabels, onTaskClick, onAddTask, editColumn, deleteColumn, isManager }: any) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: col.id, data: { type: "Column", column: col },
  });
  const style = { transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.3 : 1 };

  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskContent, setNewTaskContent] = useState("");

  const handleSaveNewTask = () => {
    if (newTaskContent.trim()) { onAddTask(col.id, newTaskContent.trim()); setNewTaskContent(""); setIsAddingTask(false); }
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); handleSaveNewTask(); }
    if (e.key === "Escape") { setIsAddingTask(false); setNewTaskContent(""); }
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-white dark:bg-[#1C1F26] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col relative z-0">
      
      {/* [ĐÃ SỬA] Chỉ cấp quyền kéo thả cột cho Manager */}
      <div 
        {...(isManager ? attributes : {})} 
        {...(isManager ? listeners : {})} 
        className={`px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#15171C] flex justify-between items-center group ${isManager ? 'cursor-grab active:cursor-grabbing' : ''}`}
      >
        <h3 className="font-semibold text-[13px] text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          {col.title} <span className="text-slate-400 font-normal ml-1 normal-case">({tasks.length})</span>
        </h3>

        {/* [ĐÃ SỬA] Cụm nút Sửa/Xóa cột - Chỉ Manager mới thấy */}
        {isManager && (
          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => editColumn?.(col.id, col.title)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors" title="Đổi tên danh sách">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button onClick={() => deleteColumn?.(col.id, col.title)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors" title="Xóa danh sách">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        )}
      </div>

      <div className="min-h-[40px] bg-white dark:bg-[#1C1F26]">
        <SortableContext items={tasks.map((t: any) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <div className="p-4 flex items-center justify-center text-[12px] text-slate-400 italic">Kéo thả công việc vào đây.</div>
          ) : (
            tasks.map((task: any) => (
              <SortableListTask key={task.id} task={task} activeBoardMembers={activeBoardMembers} boardLabels={boardLabels} taskLabels={taskLabels} onTaskClick={onTaskClick} isManager={isManager} />
            ))
          )}
        </SortableContext>
      </div>
{isManager && (
      <div className="bg-slate-50/50 dark:bg-[#15171C] border-t border-slate-100 dark:border-slate-800 p-2">
        {isAddingTask ? (
          <div className="flex items-center gap-2">
            <input autoFocus value={newTaskContent} onChange={(e) => setNewTaskContent(e.target.value)} onKeyDown={handleKeyDown} placeholder="Nhập tên công việc..." className="flex-1 text-[13px] bg-white dark:bg-[#1C1F26] border border-blue-400 rounded-md px-3 py-1.5 outline-none dark:text-slate-200 focus:ring-2 focus:ring-blue-100 transition-all" />
            <button onClick={handleSaveNewTask} className="px-3 py-1.5 text-[12px] font-medium bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">Thêm</button>
            <button onClick={() => { setIsAddingTask(false); setNewTaskContent(""); }} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
          </div>
        ) : (
          <button onClick={() => setIsAddingTask(true)} className="w-full flex items-center gap-2 text-[13px] font-medium text-slate-500 hover:text-slate-800 p-2 rounded-md hover:bg-slate-200/50 transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Thêm công việc</button>
          )}
        </div>
      )}
    </div>

  );
}