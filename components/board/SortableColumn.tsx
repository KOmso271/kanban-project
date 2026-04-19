// components/board/SortableColumn.tsx
"use client";
import { useState, useRef, useEffect, memo } from "react";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import TaskCard from "./TaskCard";
import { translations } from "@/lib/translations"; // 👇 IMPORT TỪ ĐIỂN 👇

function SortableColumn({
  col, tasks, boardLabels, taskLabels, activeBoardMembers,
  deleteColumn, editColumn, deleteTask, onTaskClick, onAddTask, onQuickComplete, isLastColumn, isManager,
  lang // 👇 NHẬN BIẾN LANG TỪ NGOÀI VÀO 👇
}: any) {
  
  // KÍCH HOẠT TỪ ĐIỂN
  const t = translations[lang as keyof typeof translations] || translations["vi"];

  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: col.id,
    data: { type: "Column", column: col }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: transition || "transform 250ms cubic-bezier(0.25, 1, 0.5, 1)",
    zIndex: isDragging ? 999 : 1,
    opacity: isDragging ? 0.3 : 1,
  };

  const columnTasks = tasks.filter((t: any) => t.column_id === col.id);

  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskContent, setNewTaskContent] = useState("");
  const addTaskInputRef = useRef<HTMLTextAreaElement>(null);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState(col.title);
  const editTitleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingTitle) editTitleInputRef.current?.focus();
    if (isAddingTask) addTaskInputRef.current?.focus();
  }, [isEditingTitle, isAddingTask]);

  const handleSaveTitle = () => {
    setIsEditingTitle(false);
    if (editTitleValue.trim() && editTitleValue.trim() !== col.title) {
      editColumn(col.id, editTitleValue.trim());
    } else {
      setEditTitleValue(col.title);
    }
  };

  const handleSaveTask = () => {
    if (newTaskContent.trim()) {
      onAddTask(col.id, newTaskContent.trim());
    }
    setNewTaskContent("");
    setIsAddingTask(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`w-[260px] md:w-[280px] flex-shrink-0 flex flex-col bg-slate-50 dark:bg-[#15171C] rounded-xl border ${isDragging ? "border-blue-500 opacity-40 shadow-2xl" : "border-slate-200 dark:border-slate-800"}`}
    >
      {/* HEADER CỦA CỘT */}
      <div {...attributes} {...listeners} className="p-3 flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50 cursor-grab active:cursor-grabbing group">
        {isEditingTitle ? (
          <input
            ref={editTitleInputRef}
            value={editTitleValue}
            onChange={(e) => setEditTitleValue(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (!e.nativeEvent.isComposing) handleSaveTitle();
              }
              if (e.key === "Escape") { setIsEditingTitle(false); setEditTitleValue(col.title); }
            }}
            className="flex-1 text-[14px] font-semibold bg-white dark:bg-[#1C1F26] border border-blue-500 rounded px-2 py-1 outline-none text-slate-800 dark:text-slate-100"
            onPointerDown={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="flex items-center gap-2 flex-1" onDoubleClick={() => isManager && setIsEditingTitle(true)} title={isManager ? t.doubleClickToEdit : ""}>
            <h3 className="font-semibold text-[14px] text-slate-800 dark:text-slate-200">{col.title}</h3>
            <span className="text-[11px] font-medium bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded-full">{columnTasks.length}</span>
          </div>
        )}

        {isManager && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }} className="p-1 text-slate-400 hover:text-blue-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
            </button>
            <button onClick={(e) => { e.stopPropagation(); deleteColumn(col.id, col.title); }} className="p-1 text-slate-400 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
            </button>
          </div>
        )}
      </div>

      {/* DANH SÁCH TASK */}
      <div className="flex-1 p-2 overflow-y-auto min-h-[100px] flex flex-col gap-2 scrollbar-hide">
        <SortableContext items={columnTasks.map((t: any) => t.id)} strategy={verticalListSortingStrategy}>
          {columnTasks.map((task: any) => (
            <TaskCard
              key={task.id}
              task={task}
              boardMembers={activeBoardMembers}
              boardLabels={boardLabels}
              taskLabels={taskLabels}
              onTaskClick={onTaskClick}
              onQuickComplete={onQuickComplete}
              deleteTask={deleteTask}
              isDoneColumn={isLastColumn}
              isManager={isManager}
              lang={lang} // TRUYỀN NGÔN NGỮ XUỐNG TASK CARD
            />
          ))}
        </SortableContext>

        {/* FORM NHẬP THÊM TASK MỚI */}
        {isAddingTask && (
          <div className="mt-1 bg-white dark:bg-[#1C1F26] p-2 rounded-lg border border-blue-400 shadow-sm">
            <textarea
              ref={addTaskInputRef}
              value={newTaskContent}
              onChange={(e) => setNewTaskContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  handleSaveTask();
                }
                if (e.key === "Escape") { setIsAddingTask(false); setNewTaskContent(""); }
              }}
              placeholder={t.enterTaskTitle}
              className="w-full text-[13px] bg-transparent resize-none outline-none dark:text-slate-200"
              rows={2}
            />
            <div className="flex items-center gap-2 mt-2">
              <button onClick={handleSaveTask} className="px-3 py-1 bg-blue-600 text-white text-[11px] font-medium rounded hover:bg-blue-700">{t.add}</button>
              <button onClick={() => { setIsAddingTask(false); setNewTaskContent(""); }} className="px-2 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-[11px]">{t.cancel}</button>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER - NÚT THÊM TASK */}
      {!isAddingTask && (
        <div className="p-2 border-t border-slate-200/50 dark:border-slate-800/50">
          <button onClick={() => setIsAddingTask(true)} className="w-full flex items-center gap-2 text-[12px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-[#1C1F26] p-2 rounded-md transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg> {t.addTask}
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(SortableColumn);