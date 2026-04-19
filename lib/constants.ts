export const priorityConfig: Record<string, any> = {
  urgent: { 
    label: "Khẩn cấp", 
    color: "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50", 
    dotClass: "bg-red-500" 
  },
  high: { 
    label: "Ưu tiên cao", 
    color: "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800/50", 
    dotClass: "bg-orange-500" 
  },
  medium: { 
    label: "Trung bình", 
    color: "bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50", 
    dotClass: "bg-purple-500" 
  },
  normal: { 
    label: "Bình thường", 
    color: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50", 
    dotClass: "bg-emerald-500" 
  },
  low: { 
    label: "Ưu tiên thấp", 
    color: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700", 
    dotClass: "bg-slate-400" 
  },
};

export const LABEL_COLORS = [
  "bg-red-500 text-white", "bg-orange-500 text-white", "bg-amber-500 text-white",
  "bg-green-500 text-white", "bg-emerald-500 text-white", "bg-teal-500 text-white",
  "bg-cyan-500 text-white", "bg-blue-500 text-white", "bg-indigo-500 text-white",
  "bg-violet-500 text-white", "bg-purple-500 text-white", "bg-fuchsia-500 text-white",
  "bg-pink-500 text-white", "bg-rose-500 text-white", "bg-slate-600 text-white"
];