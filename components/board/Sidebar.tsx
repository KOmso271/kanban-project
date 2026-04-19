// components/board/Sidebar.tsx
"use client";
import { useState, useRef, useEffect } from "react";
import { priorityConfig } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { toast } from "react-hot-toast";
import { translations, translatePriority } from "@/lib/translations";

export default function Sidebar({
  isSidebarOpen, setIsSidebarOpen, currentView, navigateToHome, boards, activeBoardId, navigateToBoard,
  isAddingBoard, setIsAddingBoard, onAddBoard, onEditBoard, onDeleteBoard, onChangePriority, onOpenMembers,
  isDarkMode, toggleDarkMode, lang, toggleLanguage, myProfile, currentUser, handleLogout, onOpenProfile
}: any) {

  // KÍCH HOẠT TỪ ĐIỂN
  const t = translations[lang as keyof typeof translations] || translations["vi"];

  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardPriority, setNewBoardPriority] = useState<string>("normal");
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [editBoardName, setEditBoardName] = useState("");
  const [deletingBoardId, setDeletingBoardId] = useState<string | null>(null);
  const editBoardInputRef = useRef<HTMLInputElement>(null);

  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [isEditingWorkspace, setIsEditingWorkspace] = useState(false);
  const [workspaceNameInput, setWorkspaceNameInput] = useState("");
  const [localCompanyName, setLocalCompanyName] = useState("...");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const fetchCompanySettings = async () => {
      if (!currentUser) return;
      const { data, error } = await supabase.from('company_settings').select('*').eq('id', 1).single();
      if (data) {
        setLocalCompanyName(data.company_name);
        setIsSuperAdmin(currentUser.id === data.super_admin_id);
      } else {
        const { data: newData } = await supabase.from('company_settings').insert([{ id: 1, company_name: "Không gian chung", super_admin_id: currentUser.id }]).select().single();
        if (newData) { setLocalCompanyName(newData.company_name); setIsSuperAdmin(true); }
      }
    };
    fetchCompanySettings();
  }, [currentUser]);

  const handleSaveNewBoard = () => {
    if (!newBoardName.trim()) return;
    onAddBoard(newBoardName.trim(), newBoardPriority);
    setNewBoardName(""); setNewBoardPriority("normal");
    setIsAddingBoard(false);
  };

  const executeEditBoardSave = (fallbackVal?: string) => {
    const val = fallbackVal !== undefined ? fallbackVal : editBoardName.trim();
    if (editingBoardId) {
      if (val) onEditBoard(editingBoardId, val);
      setEditingBoardId(null);
    }
  };

  const handleSaveWorkspaceName = async () => {
    if (!workspaceNameInput.trim() || !isSuperAdmin) return;
    const { error } = await supabase.from('company_settings').update({ company_name: workspaceNameInput.trim() }).eq('id', 1);
    if (!error) {
      setLocalCompanyName(workspaceNameInput.trim()); setIsEditingWorkspace(false); setShowWorkspaceMenu(false);
    } 
  };

  const companyInitial = localCompanyName ? localCompanyName.charAt(0).toUpperCase() : "W";

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 w-[240px] bg-slate-50 dark:bg-[#15171C] border-r border-slate-200 dark:border-slate-800 flex flex-col flex-shrink-0 transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
      
      <div className="relative h-14 px-4 flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50 md:border-transparent">
        <div onClick={() => { if (isSuperAdmin) setShowWorkspaceMenu(!showWorkspaceMenu); }} className={`flex items-center px-2 py-1.5 flex-1 min-w-0 ${isSuperAdmin ? 'cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-md transition-colors' : 'cursor-default'}`}>
          <div className="w-8 h-8 bg-slate-800 dark:bg-black rounded flex items-center justify-center mr-2.5 flex-shrink-0">
            <span className="text-[12px] text-white font-bold leading-none">{companyInitial}</span>
          </div>
          <div className="flex flex-col flex-1 min-w-0 pr-1.5">
            <span className="font-bold text-[14px] text-slate-800 dark:text-slate-200 truncate">{localCompanyName}</span>
            {isSuperAdmin && <span className="text-[9px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-0.5">{t.admin}</span>}
          </div>
          {isSuperAdmin && <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>}
        </div>

        {isSuperAdmin && showWorkspaceMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => { setShowWorkspaceMenu(false); setIsEditingWorkspace(false); }}></div>
            <div className="absolute top-full left-4 mt-1 w-[240px] bg-white dark:bg-[#1C1F26] rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 z-[100] animate-in fade-in slide-in-from-top-2">
              {isEditingWorkspace ? (
                <div className="p-2">
                  <input autoFocus value={workspaceNameInput} onChange={(e) => setWorkspaceNameInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveWorkspaceName(); if (e.key === 'Escape') setIsEditingWorkspace(false); }} className="w-full text-[13px] bg-slate-50 dark:bg-[#0E1116] border border-blue-400 rounded-md px-2.5 py-1.5 outline-none dark:text-white mb-2" />
                  <div className="flex justify-end gap-1.5">
                    <button onClick={() => setIsEditingWorkspace(false)} className="px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">{t.cancel}</button>
                    <button onClick={handleSaveWorkspaceName} className="px-2 py-1 text-[11px] font-medium bg-blue-600 text-white rounded hover:bg-blue-700">{t.save || "Lưu"}</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="px-2 py-1.5 mb-1"><p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{t.systemSettings}</p></div>
                  <button onClick={(e) => { e.stopPropagation(); setWorkspaceNameInput(localCompanyName); setIsEditingWorkspace(true); }} className="w-full text-left px-2 py-1.5 text-[13px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md flex items-center gap-2 transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>{t.changeCompanyName}</button>
                </div>
              )}
            </div>
          </>
        )}
        <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1 text-slate-400 ml-1"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg></button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto pb-20 scrollbar-hide mt-2">
        <button onClick={navigateToHome} className={`w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-md text-[13px] transition-colors mb-4 ${currentView === "home" ? "bg-slate-200/60 dark:bg-slate-800/60 font-medium text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/40 dark:hover:bg-slate-800/40"}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> {t.home}
        </button>
        <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 px-2 mb-2">{t.myProjects}</p>

        {boards.map((board: any) => {
          const priority = board.priority || "normal";
          const pConfig = priorityConfig[priority];
          const isActive = currentView === "board" && activeBoardId === board.id;

          if (editingBoardId === board.id) {
            return (<div key={board.id} className="px-2 py-1.5"><input ref={editBoardInputRef} autoFocus value={editBoardName} onChange={(e) => setEditBoardName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (!e.nativeEvent.isComposing) executeEditBoardSave(); } if (e.key === "Escape") setEditingBoardId(null); }} onBlur={() => setTimeout(() => executeEditBoardSave(editBoardInputRef.current?.value.trim()), 150)} className="w-full text-[13px] bg-white dark:bg-[#1C1F26] border border-blue-400 rounded-md px-2 py-1 outline-none dark:text-slate-200" /></div>);
          }

          if (deletingBoardId === board.id) {
            return (
              <div key={board.id} className="flex items-center gap-1.5 px-2 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md text-[13px] border border-red-100 dark:border-red-900/50">
                <span className="flex-1 truncate font-medium">{t.deleteProjectPrompt}</span>
                <button onClick={() => setDeletingBoardId(null)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg></button>
                <button onClick={() => { onDeleteBoard(board.id); setDeletingBoardId(null); }} className="p-1 hover:bg-red-200 dark:hover:bg-red-800/50 rounded"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg></button>
              </div>
            );
          }

          return (
            <div key={board.id} className="group flex items-center relative">
              <button onClick={() => navigateToBoard(board.id)} className={`flex-1 text-left px-2 py-1.5 rounded-md text-[13px] truncate transition-colors flex items-center gap-2 pr-8 ${isActive ? "bg-slate-200/60 dark:bg-slate-800/60 font-medium text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/40 dark:hover:bg-slate-800/40"}`}>
                <span className={`rounded-full transition-all ${pConfig.dotClass} ${isActive ? "w-2 h-2" : "w-2.5 h-2.5"}`}></span>{board.name}
              </button>
              <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity group/menu z-10">
                <button className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-200 dark:hover:bg-slate-700"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg></button>
                <div className="absolute right-0 top-full mt-1 w-[200px] bg-white dark:bg-[#1C1F26] rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all origin-top-right transform scale-95 group-hover/menu:scale-100">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">{t.priority}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.keys(priorityConfig).map((key) => (
                        <button key={key} onClick={(e) => { e.stopPropagation(); onChangePriority(board.id, key); }} className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors flex items-center gap-1 ${priority === key ? priorityConfig[key].color : "bg-slate-100 text-slate-500 border-transparent dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${priorityConfig[key].dotClass}`}></span>{priorityConfig[key].label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pt-1">
                    <button onClick={(e) => { e.stopPropagation(); setEditingBoardId(board.id); setEditBoardName(board.name); }} className="w-full text-left px-3 py-1.5 text-[13px] text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 dark:text-slate-300 transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg> {t.rename}</button>
                    <button onClick={(e) => { e.stopPropagation(); onOpenMembers(board.id); }} className="w-full text-left px-3 py-1.5 text-[13px] text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 dark:text-slate-300 transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg> {t.members}</button>
                    {isSuperAdmin && (
                      <button onClick={(e) => { e.stopPropagation(); setEditingBoardId(null); setDeletingBoardId(board.id); }} className="w-full text-left px-3 py-1.5 text-[13px] text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg> {t.deleteProject}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {isAddingBoard ? (
          <div className="mx-2 mt-2 px-3 py-2.5 bg-white dark:bg-[#1C1F26] border border-blue-400 dark:border-blue-500 rounded-lg shadow-sm">
            <input autoFocus value={newBoardName} onChange={(e) => setNewBoardName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSaveNewBoard(); if (e.key === "Escape") { setIsAddingBoard(false); setNewBoardName(""); } }} placeholder={t.newProjectName} className="w-full text-[13px] bg-transparent border-none p-0 focus:ring-0 outline-none mb-3 dark:text-white placeholder-slate-400" />
            <div className="flex flex-wrap gap-1.5 mb-4">
              {Object.entries(priorityConfig).map(([key, config]) => (
                <button key={key} onClick={() => setNewBoardPriority(key)} className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors flex items-center gap-1 ${newBoardPriority === key ? config.color : "bg-slate-100 text-slate-500 border-transparent dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`}></span>{translatePriority(config.label, lang)}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setIsAddingBoard(false); setNewBoardName(""); }} className="px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">{t.cancel}</button>
              <button onClick={handleSaveNewBoard} className="px-3 py-1 text-[11px] font-medium bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">{t.create}</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setIsAddingBoard(true)} className="w-full text-left px-2 py-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-[13px] mt-1 hover:bg-slate-200/40 dark:hover:bg-slate-800/40 rounded-md flex items-center gap-2 transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg> {t.addProject}
          </button>
        )}
      </nav>

      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#15171C]">
        <div className="flex items-center justify-between px-2 mb-3">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{t.language}</span>
          <button onClick={toggleLanguage} className="px-2 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-[#1C1F26] border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm">
            {lang === "vi" ? "🇻🇳 Tiếng Việt" : "🇺🇸 English"}
          </button>
        </div>

        <div className="flex items-center justify-between px-2 mb-3">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{t.darkMode}</span>
          <button onClick={toggleDarkMode} className={`w-8 h-4 rounded-full relative transition-colors shadow-inner ${isDarkMode ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"}`}>
            <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform shadow-sm ${isDarkMode ? "translate-x-4" : "translate-x-0.5"}`}></div>
          </button>
        </div>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
          <div onClick={onOpenProfile} className="flex-1 flex items-center gap-2.5 overflow-hidden px-2 py-1.5 rounded-md cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors" title={t.editProfile}>
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden border border-slate-300 dark:border-slate-600 flex-shrink-0">
              <img src={myProfile?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${currentUser?.id}`} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate dark:text-slate-200">{myProfile?.name || "Người dùng"}</p>
              <p className="text-[10px] text-slate-400 truncate">{currentUser?.email}</p>
            </div>
          </div>

          <button onClick={handleLogout} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors flex-shrink-0" title={t.logout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </div>
      </div>
    </aside>
  );
}