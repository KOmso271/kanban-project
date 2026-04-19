// components/auth/AuthScreen.tsx
"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUpSuccess, setIsSignUpSuccess] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErrorMsg("");

    if (!isLogin) {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{6,}$/;
      if (!passwordRegex.test(password)) {
        setErrorMsg("Mật khẩu phải có ít nhất 6 ký tự, bao gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.");
        setLoading(false); return;
      }
    }

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setErrorMsg(error.message === "Invalid login credentials" ? "Sai email hoặc mật khẩu!" : error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
      if (error) setErrorMsg(error.message.includes("User already registered") ? "Email này đã được sử dụng!" : error.message);
      else setIsSignUpSuccess(true);
    }
    setLoading(false);
  };

  if (isSignUpSuccess) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-[#0E1116] p-4 transition-colors">
        <div className="w-full max-w-md bg-white dark:bg-[#15171C] p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center mb-6"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">Kiểm tra email của bạn</h2>
          <p className="text-[14px] text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">Chúng tôi đã gửi một liên kết xác nhận đến <strong className="text-slate-800 dark:text-slate-200">{email}</strong>. Vui lòng kiểm tra hộp thư đến để kích hoạt.</p>
          <button onClick={() => { setIsSignUpSuccess(false); setIsLogin(true); setPassword(""); }} className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-[14px] font-medium rounded-lg shadow-sm transition-colors">Quay lại Đăng nhập</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-[#0E1116] p-4 transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-[#15171C] p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800">
        <div className="mb-8 text-center">
          <div className="w-12 h-12 bg-blue-600 rounded-xl mx-auto flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4"><span className="text-white text-xl font-bold">S</span></div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{isLogin ? "Chào mừng trở lại!" : "Tạo tài khoản mới"}</h2>
        </div>
        {errorMsg && (<div className="mb-4 p-3 text-[13px] text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg">{errorMsg}</div>)}
        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">Họ và tên</label>
              <input required type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full text-[14px] bg-slate-50 dark:bg-[#0E1116] border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500 dark:text-white" />
            </div>
          )}
          <div>
            <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full text-[14px] bg-slate-50 dark:bg-[#0E1116] border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500 dark:text-white" />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">Mật khẩu</label>
            <div className="relative">
              <input required type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full text-[14px] bg-slate-50 dark:bg-[#0E1116] border border-slate-200 dark:border-slate-700 rounded-lg pl-4 pr-10 py-2.5 outline-none focus:border-blue-500 dark:text-white" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                {showPassword ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>}
              </button>
            </div>
          </div>
          <button disabled={loading} type="submit" className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-[14px] font-medium rounded-lg mt-2 flex justify-center items-center">
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (isLogin ? "Đăng nhập" : "Đăng ký")}
          </button>
        </form>
        <div className="mt-6 text-center text-[13px] text-slate-500">
          {isLogin ? "Chưa có tài khoản? " : "Đã có tài khoản? "}
          <button onClick={() => { setIsLogin(!isLogin); setErrorMsg(""); setPassword(""); setShowPassword(false); }} className="text-blue-600 font-semibold hover:underline">{isLogin ? "Đăng ký ngay" : "Đăng nhập"}</button>
        </div>
      </div>
    </div>
  );
}