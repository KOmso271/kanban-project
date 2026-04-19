// app/page.tsx
"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import AuthScreen from "@/components/auth/AuthScreen";
import KanbanApp from "@/components/board/KanbanApp";

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-[#0E1116] transition-colors">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Nếu chưa đăng nhập -> Trả về màn hình Auth
  if (!session) {
    return <AuthScreen />;
  }

  // Nếu đã đăng nhập -> Trả về ứng dụng Kanban
  return <KanbanApp session={session} />;
}