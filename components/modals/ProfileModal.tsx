// components/modals/ProfileModal.tsx
"use client";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "react-hot-toast";
import { translations } from "@/lib/translations"; // 👇 IMPORT TỪ ĐIỂN 👇

export default function ProfileModal({ 
  isOpen, onClose, myProfile, onProfileUpdate,
  lang = "vi" // 👇 NHẬN BIẾN NGÔN NGỮ TỪ NGOÀI VÀO 👇
}: any) {

  // KÍCH HOẠT TỪ ĐIỂN
  const t = translations[lang as keyof typeof translations] || translations["vi"];

  // --- States cho Tab 1: Hồ sơ ---
  const [editName, setEditName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- States cho Tab 2: Bảo mật (Mật khẩu) ---
  const [oldPassword, setOldPassword] = useState(""); 
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // --- States Ẩn/Hiện con mắt ---
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // --- Quản lý Tab hiển thị ---
  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");

  useEffect(() => {
    if (isOpen && myProfile) {
      setEditName(myProfile.name || "");
      setPreviewUrl(myProfile.avatar_url || "");
      setAvatarFile(null);
      
      // Reset sạch sẽ form đổi pass
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowOldPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      
      setActiveTab("profile"); 
    }
  }, [isOpen, myProfile]);

  if (!isOpen || !myProfile) return null;

  // Xử lý đổi Avatar
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // NÚT LƯU 1: LƯU HỒ SƠ
  const handleSaveProfile = async () => {
    if (!editName.trim()) { toast.error("Tên không được để trống"); return; }
    setIsSavingProfile(true);
    let newAvatarUrl = myProfile.avatar_url;

    if (avatarFile) {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${myProfile.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, avatarFile);

      if (uploadError) {
        toast.error("Lỗi tải ảnh: " + uploadError.message);
        setIsSavingProfile(false); return;
      }
      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      newAvatarUrl = publicUrlData.publicUrl;
    }

    const { data, error } = await supabase.from("users")
      .update({ name: editName.trim(), avatar_url: newAvatarUrl })
      .eq("id", myProfile.id)
      .select();

    if (error) { toast.error("Lỗi: " + error.message); } 
    else if (data) {
      toast.success("Cập nhật hồ sơ thành công!");
      onProfileUpdate(data[0]); 
    }
    setIsSavingProfile(false);
  };

  // NÚT LƯU 2: ĐỔI MẬT KHẨU (ĐÃ THÊM ĐIỀU KIỆN CHẶT CHẼ)
  const handleUpdatePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error("Vui lòng điền đầy đủ các trường mật khẩu!"); 
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp!"); 
      return;
    }

    // Biểu thức Regex kiểm tra độ khó: Ít nhất 6 ký tự, có hoa, có thường, có số, có ký tự đặc biệt
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;
    if (!passwordRegex.test(newPassword)) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự, bao gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.", { duration: 4000 }); 
      return;
    }

    setIsSavingPassword(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.email) {
        toast.error("Không xác định được tài khoản!");
        setIsSavingPassword(false);
        return;
      }

      // Xác thực MẬT KHẨU CŨ
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPassword,
      });

      if (signInError) {
        toast.error("Mật khẩu hiện tại không chính xác!");
        setIsSavingPassword(false);
        return;
      }

      // Cập nhật MẬT KHẨU MỚI
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        toast.error("Lỗi cập nhật mật khẩu: " + updateError.message);
        setIsSavingPassword(false);
      } else {
        toast.success("Đổi mật khẩu thành công! Vui lòng đăng nhập lại.", { duration: 3000 });
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        onClose();

        await supabase.auth.signOut();
        
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (err) {
      toast.error("Đã xảy ra lỗi hệ thống!");
      setIsSavingPassword(false);
    }
  };

  const displayAvatar = previewUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${myProfile.id}`;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 transition-opacity" onClick={onClose}>
      <div className="bg-white dark:bg-[#15171C] w-full max-w-[400px] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col scale-in-center" onClick={e => e.stopPropagation()}>
        
        {/* HEADER MODAL */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-[#1C1F26]">
          <h3 className="font-semibold text-[15px] text-slate-800 dark:text-slate-100">{t.accountSettings}</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg></button>
        </div>

        {/* MENU TABS */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 pt-2 bg-slate-50/30 dark:bg-[#1C1F26]/30">
          <button onClick={() => setActiveTab("profile")} className={`pb-2.5 text-[13px] font-medium transition-colors mr-6 relative ${activeTab === 'profile' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}>
            {t.personalProfile}
            {activeTab === 'profile' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full"></span>}
          </button>
          <button onClick={() => setActiveTab("security")} className={`pb-2.5 text-[13px] font-medium transition-colors relative ${activeTab === 'security' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}>
            {t.securityTab}
            {activeTab === 'security' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full"></span>}
          </button>
        </div>

        {/* NỘI DUNG TỪNG TAB */}
        <div className="p-6">
          
          {/* NỘI DUNG TAB 1: HỒ SƠ */}
          {activeTab === "profile" ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-200">
              <div className="flex flex-col items-center gap-3">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-20 h-20 rounded-full border-4 border-white dark:border-[#15171C] shadow-md overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="text-white" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                  </div>
                  <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                </div>
                <p className="text-[11px] text-slate-500">{t.clickToChangeAvatar}</p>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-slate-500 mb-1.5">{t.displayName}</label>
                <input value={editName} onChange={e => setEditName(e.target.value)} placeholder={t.enterYourName} className="w-full text-[14px] font-medium bg-slate-50 dark:bg-[#0E1116] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 dark:text-white transition-colors" />
              </div>
              
              <button onClick={handleSaveProfile} disabled={isSavingProfile || !editName.trim()} className="w-full py-2.5 mt-2 text-[13px] font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {isSavingProfile ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> {t.saving}</> : t.saveProfile}
              </button>
            </div>
          ) : (
            
            // NỘI DUNG TAB 2: ĐỔI MẬT KHẨU
            <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
              <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 p-3 rounded-lg text-[12px] mb-4 border border-orange-100 dark:border-orange-800/50 flex gap-2">
                <svg className="flex-shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                <p>{t.passwordRequirements}</p>
              </div>

              {/* Mật khẩu hiện tại */}
              <div>
                <label className="block text-[12px] font-medium text-slate-500 mb-1.5">{t.currentPassword}</label>
                <div className="relative">
                  <input type={showOldPassword ? "text" : "password"} value={oldPassword} onChange={e => setOldPassword(e.target.value)} placeholder={t.enterOldPassword} className="w-full text-[14px] font-medium bg-slate-50 dark:bg-[#0E1116] border border-slate-200 dark:border-slate-700 rounded-lg pl-3 pr-10 py-2.5 outline-none focus:border-blue-500 dark:text-white transition-colors" />
                  <button type="button" onClick={() => setShowOldPassword(!showOldPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                    {showOldPassword ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>}
                  </button>
                </div>
              </div>

              {/* Mật khẩu mới */}
              <div>
                <label className="block text-[12px] font-medium text-slate-500 mb-1.5">{t.newPassword}</label>
                <div className="relative">
                  <input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full text-[14px] font-medium bg-slate-50 dark:bg-[#0E1116] border border-slate-200 dark:border-slate-700 rounded-lg pl-3 pr-10 py-2.5 outline-none focus:border-blue-500 dark:text-white transition-colors" />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                    {showNewPassword ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>}
                  </button>
                </div>
              </div>

              {/* Xác nhận mật khẩu */}
              <div>
                <label className="block text-[12px] font-medium text-slate-500 mb-1.5">{t.confirmPassword}</label>
                <div className="relative">
                  <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={t.reEnterNewPassword} className="w-full text-[14px] font-medium bg-slate-50 dark:bg-[#0E1116] border border-slate-200 dark:border-slate-700 rounded-lg pl-3 pr-10 py-2.5 outline-none focus:border-blue-500 dark:text-white transition-colors" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                    {showConfirmPassword ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>}
                  </button>
                </div>
              </div>
              
              <button onClick={handleUpdatePassword} disabled={isSavingPassword || !oldPassword || !newPassword || !confirmPassword} className="w-full py-2.5 mt-4 text-[13px] font-medium bg-slate-800 hover:bg-slate-900 dark:bg-slate-200 dark:hover:bg-white dark:text-slate-900 text-white rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {isSavingPassword ? <><div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div> {t.updating}</> : t.changePasswordBtn}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}