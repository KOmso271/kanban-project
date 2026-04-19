// components/modals/MembersModal.tsx
"use client";

export default function MembersModal({
  isOpen,
  onClose,
  currentBoard,
  searchQuery,
  setSearchQuery,
  searchResults,
  onAddMember,
  onRemoveMember,
  activeMembers,
  currentUser,
  currentUserRole,
  onChangeRole
}: any) {
  if (!isOpen || !currentBoard) return null;

  // Bắt an toàn cả 2 trường hợp lưu role trong database
  const isAdmin = currentUserRole === "admin" || currentUserRole === "Quản lý" || currentUserRole === "manager";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 transition-opacity" onClick={onClose}>
      <div className="bg-white dark:bg-[#15171C] w-full max-w-[460px] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>

        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-[#1C1F26]">
          <h3 className="font-semibold text-[15px] text-slate-800 dark:text-slate-100">Thành viên Dự án</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Khung Tìm Kiếm - CHỈ HIỂN THỊ NẾU LÀ ADMIN */}
        {isAdmin && (
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#15171C]">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" placeholder="Gõ tên hoặc email để mời..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#0E1116] border border-blue-400 rounded-lg text-[13px] outline-none focus:ring-1 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-200 placeholder-slate-400" />
            </div>
            {searchQuery.length > 0 && (
              <div className="mt-3 bg-white dark:bg-[#1C1F26] border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm max-h-[150px] overflow-y-auto">
                {searchResults.length === 0 ? (
                  <p className="text-[12px] text-slate-500 text-center py-3">Không tìm thấy người dùng nào hợp lệ.</p>
                ) : (
                  searchResults.map((u: any) => (
                    <div key={u.id} className="flex justify-between items-center p-2 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
                      <div className="flex items-center gap-2">
                        <img src={u.avatar_url} className="w-6 h-6 rounded-full border dark:border-slate-600" />
                        <div className="leading-none"><p className="text-[13px] font-medium dark:text-slate-200">{u.name}</p><p className="text-[10px] text-slate-400">{u.email}</p></div>
                      </div>
                      <button onClick={() => onAddMember(u.id)} className="text-[11px] bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 px-2 py-1 rounded font-medium hover:bg-blue-100 transition-colors">Thêm</button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Danh Sách Đã Tham Gia */}
        <div className="px-6 pb-6 pt-4">
          <p className="text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-3">Đã tham gia ({activeMembers.length})</p>
          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 scrollbar-hide">
            {activeMembers.length === 0 ? (
              <p className="text-[12px] text-slate-400 text-center">Dự án này chưa có ai.</p>
            ) : (
              activeMembers.map((member: any) => {
                const isMe = member.id === currentUser.id;
                // [ĐÃ SỬA] Chỉ Admin/Manager mới được quyền xóa người hoặc tự out. Member bị tước quyền.
                const canRemove = isAdmin;

                return (
                  <div key={member.id} className="flex items-center gap-3 p-1.5 -mx-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">

                    {/* Phần Trái: Avatar và Tên (flex-1 để đẩy phần Role qua sát bên phải) */}
                    <div className="flex-1 min-w-0 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex-shrink-0 shadow-sm border border-slate-200 dark:border-slate-600">
                        <img src={member.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${member.id}`} alt={member.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex items-center gap-2 truncate">
                        <p className="text-[14px] font-medium text-slate-900 dark:text-slate-100 truncate">{member.name}</p>
                        {isMe && <span className="text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">Bạn</span>}
                      </div>
                    </div>

                    {/* Phần Phải: Cụm Role và Nút Xóa (Kích thước CỐ ĐỊNH để chống xê dịch) */}
                    <div className="flex items-center gap-1 flex-shrink-0">

                      {/* Cột 1: Box chứa chức vụ (Cố định width là 95px để chứa mũi tên) */}
                      <div className="w-[95px] flex justify-end relative">
                        {isAdmin ? (
                          // NẾU LÀ ADMIN -> HIỂN THỊ DROPDOWN CHỌN QUYỀN
                          <div className="relative inline-block w-full">
                            <select
                              value={member.role === "admin" || member.role === "Quản lý" ? "admin" : "member"}
                              onChange={(e) => onChangeRole(member.id, e.target.value)}
                              className={`appearance-none w-full text-[10px] pl-2.5 pr-5 py-1.5 rounded-md font-medium cursor-pointer transition-all outline-none ${member.role === "admin" || member.role === "Quản lý" ? "bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800" : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"}`}
                            >
                              <option value="admin" className="text-slate-800 font-medium">Quản lý</option>
                              <option value="member" className="text-slate-800 font-medium">Thành viên</option>
                            </select>
                            {/* Icon mũi tên thả xuống (đè lên mũi tên mặc định) */}
                            <div className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center opacity-60">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </div>
                          </div>
                        ) : (
                          // NẾU LÀ MEMBER -> CHỈ LÀ CHỮ TEXT BÌNH THƯỜNG
                          <span className={`text-[10px] px-2 py-1.5 rounded-md font-medium ${member.role === "admin" || member.role === "Quản lý" ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
                            {member.role === "admin" || member.role === "Quản lý" ? "Quản lý" : "Thành viên"}
                          </span>
                        )}
                      </div>

                      {/* Cột 2: Box chứa nút xóa (Cố định width 28px - dù không có nút vẫn giữ khoảng trống) */}
                      <div className="w-[28px] flex justify-end">
                        {canRemove && (
                          <button
                            onClick={() => onRemoveMember(member.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
                            title={isMe ? "Rời khỏi dự án" : "Xóa thành viên"}
                          >
                            {isMe ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                            )}
                          </button>
                        )}
                      </div>

                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}