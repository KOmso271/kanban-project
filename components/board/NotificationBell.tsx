"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { vi, enUS } from "date-fns/locale"; 
import { translations } from "@/lib/translations"; 

export default function NotificationBell({
  notifications,
  setNotifications,
  currentUser,
  setActiveBoardId,
  setCurrentView,
  setAutoOpenTaskId,
  lang = "vi" // NHẬN BIẾN NGÔN NGỮ
}: {
  notifications: any[];
  setNotifications: any;
  currentUser: any;
  setActiveBoardId: (id: string) => void;
  setCurrentView: (view: "home" | "board") => void;
  setAutoOpenTaskId: (id: string | null) => void;
  lang?: string;
}) {
  const [showNotiMenu, setShowNotiMenu] = useState(false);
  
  // KÍCH HOẠT TỪ ĐIỂN VÀ LOCALE NGÀY THÁNG
  const t = translations[lang as keyof typeof translations] || translations["vi"];
  const dateLocale = lang === "en" ? enUS : vi;

  const markNotiAsRead = async () => {
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", currentUser.id);
    setNotifications((prev: any[]) => prev.map(n => ({ ...n, is_read: true })));
  };

  // 👇 HÀM "GIẢI MÃ" VÀ DỊCH THÔNG BÁO TỰ ĐỘNG 👇
  const renderNotificationContent = (content: string) => {
    try {
      // Thử dịch từ JSON sang Object
      const data = JSON.parse(content);
      
      // Lấy mẫu câu từ từ điển (vd: "{actor} đã bình luận...")
      let template = t[data.type as keyof typeof t] || content;

      // Nhét dữ liệu vào các chỗ trống
      if (data.actor) template = template.replace("{actor}", data.actor);
      if (data.task) template = template.replace("{task}", data.task);
      if (data.board) template = template.replace("{board}", data.board);

      return template;
    } catch (e) {
      // Nếu bị lỗi (tức là thông báo cũ lưu kiểu text bình thường), thì cứ in ra như cũ
      return content;
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setShowNotiMenu(!showNotiMenu)} 
        className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors relative"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        {notifications.filter(n => !n.is_read).length > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-[#0E1116]">
            {notifications.filter(n => !n.is_read).length}
          </span>
        )}
      </button>

      {showNotiMenu && (
        <div className="absolute right-0 mt-2 w-[320px] bg-white dark:bg-[#1C1F26] rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-[120] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <span className="font-semibold text-sm">{t.notificationsTitle}</span>
            <button onClick={markNotiAsRead} className="text-[11px] text-blue-600 hover:text-blue-700 font-medium">{t.markAllRead}</button>
          </div>
          <div className="max-h-[350px] overflow-y-auto scrollbar-thin">
            {notifications.length === 0 ? (
              <p className="p-8 text-center text-slate-400 text-sm italic">{t.noNewNotifications}</p>
            ) : (
              notifications.map((n, idx) => (
                <div
                  key={`${n.id}-${idx}`}
                  onClick={async () => {
                    if (!n.is_read) {
                      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
                      setNotifications((prev: any[]) => prev.map(item => item.id === n.id ? { ...item, is_read: true } : item));
                    }
                    if (n.board_id) {
                      setActiveBoardId(n.board_id);
                      setCurrentView("board");
                      if (n.task_id) setAutoOpenTaskId(n.task_id);
                      setShowNotiMenu(false);
                    }
                  }}
                  className={`p-3 border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group ${!n.is_read ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''}`}
                >
                  {/* 👇 GỌI HÀM DỊCH NỘI DUNG VÀO ĐÂY 👇 */}
                  <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {renderNotificationContent(n.content)}
                  </p>
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-[10px] font-medium text-slate-400">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: dateLocale })}
                    </p>
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}