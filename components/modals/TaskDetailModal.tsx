// components/modals/TaskDetailModal.tsx
"use client";
import { useRef, useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { vi, enUS } from "date-fns/locale"; // 👇 IMPORT THÊM enUS
import { priorityConfig, LABEL_COLORS } from "@/lib/constants";
import { translations, translatePriority, translateActivity } from "@/lib/translations";

export default function TaskDetailModal({
  selectedTask, onClose,
  editTaskContent, setEditTaskContent,

  editTaskAssignees = [], setEditTaskAssignees,

  editTaskDueDate, setEditTaskDueDate,
  editTaskStartDate, setEditTaskStartDate,
  editTaskPriority, setEditTaskPriority,
  editTaskDescription, setEditTaskDescription,
  activeBoardMembers = [], handleSaveTaskDetail,

  currentTaskLabels = [], toggleLabelForTask,
  showLabelMenu, setShowLabelMenu,
  boardLabels = [], currentTaskLabelIds = [],
  newLabelName = "", setNewLabelName,
  newLabelColor, setNewLabelColor, handleCreateLabel,
  handleDeleteLabel,

  taskChecklists = [], completedChecklists = 0,
  checklistProgress = 0, toggleChecklist, deleteChecklist,
  newChecklistTitle = "", setNewChecklistTitle, handleAddChecklist,

  taskComments = [], newCommentContent = "",
  setNewCommentContent, handleSendComment, isAddingComment,
  myProfile, currentUser,

  taskAttachments = [], isUploading, handleFileUpload, handleDeleteAttachment,
  taskActivities = [],
  lang = "vi" // 👇 NHẬN BIẾN NGÔN NGỮ
}: any) {

  // KÍCH HOẠT TỪ ĐIỂN VÀ LOCALE NGÀY THÁNG
  const t = translations[lang as keyof typeof translations] || translations["vi"];
  const dateLocale = lang === "en" ? enUS : vi;
  const dateFormatLang = lang === "en" ? "en-US" : "vi-VN";

  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAssigneeMenu, setShowAssigneeMenu] = useState(false);

  const [mentionState, setMentionState] = useState({
    isOpen: false,
    query: "",
    startIndex: -1
  });

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNewCommentContent(val);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const isStartOrSpace = lastAtIndex === 0 || textBeforeCursor[lastAtIndex - 1] === ' ' || textBeforeCursor[lastAtIndex - 1] === '\n';

      if (isStartOrSpace) {
        const query = textBeforeCursor.slice(lastAtIndex + 1);
        setMentionState({
          isOpen: true,
          query: query.toLowerCase(),
          startIndex: lastAtIndex
        });
        return;
      }
    }
    setMentionState({ isOpen: false, query: "", startIndex: -1 });
  };

  const handleSelectMention = (memberName: string) => {
    const beforeMention = newCommentContent.slice(0, mentionState.startIndex);
    const cursorPosition = commentInputRef.current?.selectionStart || 0;
    const textAfterCursor = newCommentContent.slice(cursorPosition);

    const newText = `${beforeMention}@${memberName} ${textAfterCursor}`;
    
    setNewCommentContent(newText);
    setMentionState({ isOpen: false, query: "", startIndex: -1 });
    
    setTimeout(() => { commentInputRef.current?.focus(); }, 0);
  };

  const filteredMentionMembers = activeBoardMembers.filter((m: any) => 
    m.name?.toLowerCase().includes(mentionState.query)
  );

  const assigneeMenuRef = useRef<HTMLDivElement>(null);
  const labelMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (assigneeMenuRef.current && !assigneeMenuRef.current.contains(event.target as Node)) {
        setShowAssigneeMenu(false);
      }
      if (labelMenuRef.current && !labelMenuRef.current.contains(event.target as Node)) {
        setShowLabelMenu(false);
        setShowCreateForm(false); 
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatMentionText = (text: string) => {
    if (!text) return text;
    const userMentions = activeBoardMembers.map((m: any) => m.name ? `@${m.name}` : null).filter(Boolean);
    if (userMentions.length === 0) return text;

    const matchedMentions = userMentions.filter((m: string) => text.includes(m));
    if (matchedMentions.length === 0) return text;

    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${matchedMentions.map(escapeRegExp).join('|')})`, 'g');
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (matchedMentions.includes(part)) {
        return <span key={index} className="font-bold text-black-600 dark:text-black-400">{part}</span>;
      }
      return part;
    });
  };

  if (!selectedTask) return null;

  const toggleAssignee = (memberId: string) => {
    if (editTaskAssignees.includes(memberId)) {
      setEditTaskAssignees(editTaskAssignees.filter((id: string) => id !== memberId));
    } else {
      setEditTaskAssignees([...editTaskAssignees, memberId]);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 transition-opacity" onClick={onClose}>
      <div className="bg-white dark:bg-[#15171C] w-full max-w-[650px] max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>

        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center flex-shrink-0">
          <span className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">{t.taskDetailTitle}</span>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1 relative">
          
          <div className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-slate-500 mb-1.5">{t.titleLabel}</label>
              <input value={editTaskContent} onChange={(e) => setEditTaskContent(e.target.value)} className="w-full text-[15px] font-medium bg-slate-50 dark:bg-[#0E1116] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 dark:text-white" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-medium text-slate-500 mb-1.5">{t.priorityLabel}</label>
                <select value={editTaskPriority} onChange={(e) => setEditTaskPriority(e.target.value)} className="w-full text-[13px] bg-slate-50 dark:bg-[#0E1116] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 outline-none text-slate-700 dark:text-slate-300">
                  {Object.entries(priorityConfig).map(([key, config]: any) => (
                    <option key={key} value={key}>{translatePriority(config.label, lang)}</option>
                  ))}
                </select>
              </div>

              <div className="relative" ref={assigneeMenuRef}>
                <label className="block text-[12px] font-medium text-slate-500 mb-1.5">{t.assigneeLabel}</label>

                <div className="flex flex-wrap gap-1.5 items-center bg-slate-50 dark:bg-[#0E1116] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 min-h-[42px]">
                  {editTaskAssignees.length === 0 ? (
                    <span className="text-[13px] text-slate-400 pl-1 italic">{t.unassigned}</span>
                  ) : (
                    editTaskAssignees.map((id: string, index: number) => {
                      const member = activeBoardMembers.find((m: any) => m.id === id);
                      if (!member) return null;
                      return (
                        <div key={`${id}-${index}`} className="flex items-center gap-1 bg-white dark:bg-[#1C1F26] border border-slate-200 dark:border-slate-600 rounded-full pl-1 pr-2 py-0.5 shadow-sm">
                          <img src={member.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${id}`} alt="avatar" className="w-5 h-5 rounded-full object-cover border border-slate-100 dark:border-slate-700" />
                          <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{member.name}</span>
                          <button onClick={(e) => { e.stopPropagation(); toggleAssignee(id); }} className="text-slate-400 hover:text-red-500 ml-0.5 outline-none">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                          </button>
                        </div>
                      )
                    })
                  )}

                  <button onClick={() => setShowAssigneeMenu(!showAssigneeMenu)} className="w-7 h-7 flex items-center justify-center rounded-full border border-dashed border-slate-300 dark:border-slate-500 text-slate-400 hover:text-blue-500 hover:border-blue-500 transition-colors bg-white dark:bg-transparent ml-1 outline-none" title={t.addRemoveAssignee}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  </button>
                </div>

                {showAssigneeMenu && (
                  <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-[#1C1F26] border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 py-2 max-h-[200px] overflow-y-auto">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase px-3 mb-1 tracking-wider">{t.selectMember}</p>
                    {activeBoardMembers.length === 0 ? (
                      <p className="text-[12px] text-slate-500 px-3 py-2 italic">{t.noMembersInProject}</p>
                    ) : (
                      activeBoardMembers.map((m: any) => {
                        const isSelected = editTaskAssignees.includes(m.id);
                        return (
                          <div key={m.id} onClick={() => toggleAssignee(m.id)} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors group">
                            <img src={m.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${m.id}`} alt="avatar" className="w-6 h-6 rounded-full object-cover border border-slate-100 dark:border-slate-700" />
                            <span className={`text-[13px] flex-1 truncate transition-colors ${isSelected ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300 group-hover:text-blue-600'}`}>{m.name}</span>
                            {isSelected && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-blue-600 dark:text-blue-400"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[12px] font-medium text-slate-500 mb-1.5">{t.startDateLabel}</label>
                <input type="date" value={editTaskStartDate || ""} max={editTaskDueDate} onChange={(e) => setEditTaskStartDate(e.target.value)} className="w-full text-[13px] bg-slate-50 dark:bg-[#0E1116] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 transition-colors text-slate-700 dark:text-slate-300" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-slate-500 mb-1.5">{t.dueDateLabel}</label>
                <input type="date" value={editTaskDueDate || ""} min={editTaskStartDate} onChange={(e) => setEditTaskDueDate(e.target.value)} className="w-full text-[13px] bg-slate-50 dark:bg-[#0E1116] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 transition-colors text-slate-700 dark:text-slate-300" />
              </div>
            </div>

            <div className="relative" ref={labelMenuRef}>
              <label className="block text-[12px] font-medium text-slate-500 mb-1.5">{t.labelsLabel}</label>
              <div className="flex flex-wrap gap-2 items-center">
                {currentTaskLabels.map((l: any) => (
                  <span key={l.id} className={`text-[12px] px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 ${l.color}`}>
                    {l.name}
                    <button onClick={() => toggleLabelForTask(l.id)} className="hover:opacity-70"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg></button>
                  </span>
                ))}
                <button onClick={() => setShowLabelMenu(!showLabelMenu)} className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                </button>
              </div>

              {showLabelMenu && (
                <div className="absolute top-full left-0 mt-2 w-[280px] bg-white dark:bg-[#1C1F26] rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-10 p-3 overflow-hidden">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">{t.existingLabels}</p>

                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 mb-3 scrollbar-hide">
                    {boardLabels.length === 0 ? <p className="text-[12px] text-slate-400 italic">{t.noLabelsInProject}</p> :
                      boardLabels.map((l: any) => {
                        const isSelected = currentTaskLabelIds.includes(l.id);
                        return (
                          <div key={l.id} className="flex items-center gap-1.5">
                            <div className={`flex-1 flex items-center justify-between px-3 py-1.5 rounded-md cursor-pointer hover:opacity-85 transition-opacity ${l.color}`} onClick={() => toggleLabelForTask(l.id)}>
                              <span className="text-[12px] font-medium truncate pr-2">{l.name || "\u00A0"}</span>
                              {isSelected && <svg className="flex-shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteLabel?.(l.id); }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors flex-shrink-0" title={t.deleteLabelTooltip}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                            </button>
                          </div>
                        );
                      })
                    }
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between cursor-pointer group mb-1" onClick={() => setShowCreateForm(!showCreateForm)}>
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors">{t.createNewLabel}</p>
                      <button className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                        {showCreateForm ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"></polyline></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>}
                      </button>
                    </div>

                    {showCreateForm && (
                      <div className="animate-in fade-in slide-in-from-top-1 duration-200 mt-2">
                        <input value={newLabelName} onChange={e => setNewLabelName(e.target.value)} placeholder={t.labelNamePlaceholder} className="w-full text-[12px] bg-slate-50 dark:bg-[#0E1116] border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 outline-none mb-2 dark:text-slate-200" />
                        <div className="flex flex-wrap gap-1 mb-3">
                          {LABEL_COLORS.map(color => (
                            <button key={color} onClick={() => setNewLabelColor(color)} className={`w-5 h-5 rounded-full border-2 transition-all ${color.split(' ')[0]} ${newLabelColor === color ? 'border-slate-800 dark:border-white scale-110' : 'border-transparent'}`} />
                          ))}
                        </div>
                        <button onClick={() => { handleCreateLabel(); setShowCreateForm(false); }} disabled={!newLabelColor} className="w-full py-1.5 bg-blue-600 text-white text-[12px] font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50">
                          {t.addLabelBtn}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[12px] font-medium text-slate-500 mb-1.5">{t.descriptionLabel}</label>
              <textarea value={editTaskDescription} onChange={(e) => setEditTaskDescription(e.target.value)} placeholder={t.addDescriptionPlaceholder} rows={3} className="w-full text-[13px] bg-slate-50 dark:bg-[#0E1116] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 resize-none dark:text-slate-200" />
            </div>
          </div>

          {/* TỆP ĐÍNH KÈM */}
          <div className="pt-5 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                {t.attachmentsLabel} ({taskAttachments?.length || 0})
              </label>
              <div>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="text-[12px] font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 flex items-center gap-1.5">
                  {isUploading ? <><div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div> {t.uploading}</> : t.addFile}
                </button>
              </div>
            </div>

            {taskAttachments && taskAttachments.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                {taskAttachments.map((file: any) => {
                  const isImage = file.file_name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                  return (
                    <div key={file.id} className="flex items-center gap-3 p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group/file">
                      {isImage ? (
                        <a href={file.file_url} target="_blank" rel="noreferrer" className="w-10 h-10 rounded overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-700"><img src={file.file_url} alt={file.file_name} className="w-full h-full object-cover" /></a>
                      ) : (
                        <div className="w-10 h-10 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 flex-shrink-0 border border-slate-200 dark:border-slate-700"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <a href={file.file_url} target="_blank" rel="noreferrer" className="text-[12px] font-medium text-slate-800 dark:text-slate-200 truncate hover:text-blue-600 block transition-colors" title={file.file_name}>{file.file_name}</a>
                        <p className="text-[10px] text-slate-500">{(file.file_size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button onClick={() => handleDeleteAttachment(file.id, file.file_url)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded opacity-0 group-hover/file:opacity-100 transition-all mr-1" title={t.delete || "Xóa"}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Checklist */}
          <div className="pt-5 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
              Checklist ({completedChecklists}/{taskChecklists.length})
            </label>

            {taskChecklists.length > 0 && (
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[11px] font-medium text-slate-500 w-8">{checklistProgress}%</span>
                <div className="h-1.5 flex-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-300 ${checklistProgress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${checklistProgress}%` }}></div>
                </div>
              </div>
            )}

            <div className="space-y-2.5 mb-3 max-h-[150px] overflow-y-auto pr-1">
              {taskChecklists.map((c: any) => (
                <div key={c.id} className="flex items-center gap-3 group/check hover:bg-slate-50 dark:hover:bg-[#1C1F26] p-1.5 -ml-1.5 rounded-md transition-colors">
                  <input type="checkbox" checked={c.is_completed} onChange={() => toggleChecklist(c.id, c.is_completed)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                  <span className={`text-[13px] flex-1 transition-all ${c.is_completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>{c.title}</span>
                  <button onClick={() => deleteChecklist(c.id)} className="opacity-0 group-hover/check:opacity-100 p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 rounded transition-all"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg></button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input value={newChecklistTitle} onChange={e => setNewChecklistTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddChecklist()} placeholder={t.addChecklistItemPlaceholder} className="flex-1 text-[13px] bg-white dark:bg-[#0E1116] border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 outline-none focus:border-blue-500 dark:text-slate-200" />
              <button onClick={handleAddChecklist} disabled={!newChecklistTitle?.trim()} className="px-3 py-2 text-[12px] font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-md transition-colors disabled:opacity-50">{t.addBtn}</button>
            </div>
          </div>

          {/* Bình luận */}
          <div className="pt-5 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              {t.commentsActivityLabel}
            </label>

            <div className="space-y-4 mb-4 max-h-[200px] overflow-y-auto pr-2">
              {taskComments.length === 0 ? (
                <p className="text-[12px] text-slate-400 text-center italic">{t.noComments}</p>
              ) : (
                taskComments.map((comment: any) => (
                  <div key={comment.id} className="flex gap-3">
                    <img src={comment.users?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${comment.user_id}`} alt="avatar" className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 dark:border-slate-600 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">{comment.users?.name || t.defaultUser}</span>
                        {/* 👇 TỰ ĐỘNG DỊCH NGÀY THÁNG 👇 */}
                        <span className="text-[10px] text-slate-400">{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: dateLocale })}</span>
                      </div>
                      <p className="text-[13px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#1C1F26] p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 inline-block whitespace-pre-wrap break-words">
                        {formatMentionText(comment.content)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-3 items-start mt-2">
              <img src={myProfile?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${currentUser?.id}`} alt="my-avatar" className="w-8 h-8 rounded-full border border-slate-300 dark:border-slate-600 flex-shrink-0" />
              
              <div className="relative flex-1 flex flex-col items-end gap-2">
                {mentionState.isOpen && filteredMentionMembers.length > 0 && (
                  <div className="absolute bottom-full mb-1 left-0 w-[240px] bg-white dark:bg-[#1C1F26] border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl z-[150] max-h-[160px] overflow-y-auto animate-in fade-in slide-in-from-bottom-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                      {t.mentionWho}
                    </p>
                    {filteredMentionMembers.map((m: any) => (
                      <div key={m.id} onClick={() => handleSelectMention(m.name)} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                        <img src={m.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${m.id}`} className="w-5 h-5 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                        <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">{m.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                <textarea 
                  ref={commentInputRef} value={newCommentContent} onChange={handleCommentChange} 
                  placeholder={t.writeCommentPlaceholder} rows={2} 
                  className="w-full text-[13px] bg-slate-50 dark:bg-[#0E1116] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:border-blue-500 resize-none dark:text-slate-200 transition-colors" 
                />
                <button onClick={handleSendComment} disabled={isAddingComment || !newCommentContent?.trim()} className="px-4 py-1.5 text-[12px] font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 rounded-md transition-colors disabled:opacity-50">
                  {isAddingComment ? t.sending : t.send}
                </button>
              </div>
            </div>
          </div>

          {/* LỊCH SỬ HOẠT ĐỘNG */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-[13px] font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2 uppercase tracking-wider">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
              {t.activityHistory}
            </h4>

            <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2 scrollbar-thin">
              {taskActivities?.length === 0 ? (
                <p className="text-[12px] text-slate-400 italic">{t.noActivity}</p>
              ) : (
                taskActivities?.map((act: any, idx: number) => (
                  <div key={act.id} className="flex gap-3 relative">
                    {idx !== taskActivities.length - 1 && <div className="absolute left-[13px] top-7 bottom-[-20px] w-[1.5px] bg-slate-100 dark:bg-slate-800"></div>}
                    <img src={act.users?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${act.user_id}`} className="w-7 h-7 rounded-full border-2 border-white dark:border-[#1C1F26] z-10 bg-slate-100 object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0 pt-1">
                      <p className="text-[12px] text-slate-600 dark:text-slate-300">
                        <span className="font-bold text-slate-900 dark:text-slate-100 mr-1">{act.users?.name || t.anonymous}</span>
                       {formatMentionText(translateActivity(act.content, lang))}
                      </p>
                      {/* 👇 TỰ ĐỘNG ĐỔI ĐỊNH DẠNG NGÀY GIỜ THEO NGÔN NGỮ 👇 */}
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(act.created_at).toLocaleString(dateFormatLang, { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 dark:bg-[#0E1116] border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">{t.closeBtn}</button>
          <button onClick={handleSaveTaskDetail} className="px-5 py-2 text-[13px] font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors">{t.saveChangesBtn}</button>
        </div>

      </div>
    </div>
  );
}