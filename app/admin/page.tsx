"use client";

import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient"; 



interface Candidate {
  id: string;
  name?: string;
  full_name?: string;
  fullName?: string;
  username?: string;
  applicant_name?: string;
  employment_status?: string;
  phone: string;
  email: string;
  category: string;
  experience_years: string;
  field: string;
  linkedin_url?: string;
  cv_file_url: string;
  ai_score?: number;
  ai_summary?: string;
  created_at: string;
}

export default function AdminPage() {
const [activeFieldFilter, setActiveFieldFilter] = useState("الكل");
const [activeEmploymentFilter, setActiveEmploymentFilter] = useState("الكل");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("الكل");

  useEffect(() => {
    if (isAuthenticated) {
      const fetchCandidates = async () => {
        try {
          const { data, error } = await supabase
            .from("candidates")
            .select("*")
            .order("created_at", { ascending: false });

          if (error) throw error;
          setCandidates(data || []);
        } catch (err: any) {
          console.error("Error fetching data:", err.message);
        } finally {
          setLoading(false);
        }
      };

      fetchCandidates();
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "hela2026") {
      setIsAuthenticated(true);
      setError("");
    } else {
      setError("❌ كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى.");
    }
  };

  const uniqueFields = ["الكل", ...Array.from(new Set(candidates.map(c => c.field).filter(Boolean)))];
const uniqueEmploymentStatuses = ["الكل", ...Array.from(new Set(candidates.map(c => c.employment_status).filter(Boolean)))];

const filteredCandidates = candidates.filter((candidate) => {
  const matchCategory = activeFilter === "الكل" || candidate.category === activeFilter;
     const matchField = activeFieldFilter === "الكل" || candidate.field === activeFieldFilter;
    const matchEmployment = activeEmploymentFilter === "الكل" || candidate.employment_status === activeEmploymentFilter;
    return matchCategory && matchField && matchEmployment;
  });


  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4" dir="rtl">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center space-y-6 shadow-2xl">
          <div className="text-5xl animate-pulse">🔒</div>
          <h2 className="text-2xl font-bold text-white">لوحة تحكم المسؤول الآمنة</h2>
          <p className="text-slate-300 text-sm">هذه المنطقة محمية. يرجى إدخال كلمة السر الخاصة بالأخصائية للمتابعة.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="أدخل كلمة المرور السرية"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/90 rounded-xl border-0 text-slate-900 font-medium text-center tracking-widest text-lg"
            />
            {error && <p className="text-red-400 text-xs font-medium bg-red-500/10 py-2 rounded-lg">{error}</p>}
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl transition duration-200 shadow-lg cursor-pointer">
              فتح لوحة التحكم 🔓
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📊</span>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-800">مجتمع المواهب - لوحة تحكم الأخصائية</h1>
              <p className="text-xs text-slate-400 mt-0.5">إدارة وفحص المتقدمين المدعومة بالذكاء الاصطناعي</p>
            </div>
          </div>
          <button 
            onClick={() => setIsAuthenticated(false)}
            className="text-sm bg-rose-50 hover:bg-rose-100 text-rose-600 px-5 py-2.5 rounded-xl transition font-medium cursor-pointer"
          >
            تسجيل الخروج 🚪
          </button>
        </div>

        {/* أزرار التصفية الفاخرة المحدثة */}
        <div className="flex gap-2 bg-white p-3 rounded-xl shadow-sm border border-slate-100 max-w-sm">
          <button
            onClick={() => setActiveFilter("الكل")}
            className={`flex-1 py-2 px-4 rounded-lg font-bold text-xs transition duration-200 cursor-pointer ${activeFilter === "الكل" ? "bg-slate-900 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
          >
            الكل ({candidates.length})
          </button>
          <button
            onClick={() => setActiveFilter("توظيف")}
            className={`flex-1 py-2 px-4 rounded-lg font-bold text-xs transition duration-200 cursor-pointer ${activeFilter === "توظيف" ? "bg-emerald-600 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
          >
            التوظيف ({candidates.filter(c => c.category === "توظيف").length})
          </button>
          <button
            onClick={() => setActiveFilter("إعارة")}
            className={`flex-1 py-2 px-4 rounded-lg font-bold text-xs transition duration-200 cursor-pointer ${activeFilter === "إعارة" ? "bg-amber-500 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
          >
            الإعارة ({candidates.filter(c => c.category === "إعارة").length})
          </button>
        </div>
<div className="space-y-1.5 w-full bg-white p-3 rounded-xl shadow-sm border border-slate-100 mt-4">
  <span className="text-xs font-bold text-slate-400 block mb-2">💼 تصفية حسب المجال المهني:</span>
  <div className="flex flex-wrap gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200/60">
    {uniqueFields.map((field) => (
      <button
        key={field}
        onClick={() => setActiveFieldFilter(field)}
        className={`py-1.5 px-3 rounded-lg font-bold text-xs transition duration-200 cursor-pointer ${activeFieldFilter === field ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-200/50"}`}
      >
        {field} {field === "الكل" ? `(${candidates.length})` : `(${candidates.filter(c => c.field === field).length})`}
      </button>
    ))}
  </div>
<div className="space-y-1.5 w-full bg-white p-3 rounded-xl shadow-sm border border-slate-100 mt-4">
  <span className="text-xs font-bold text-slate-400 block mb-2">🧾 تصفية حسب الوضع الوظيفي:</span>
  <div className="flex flex-wrap gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200/60">
    {uniqueEmploymentStatuses.map((status) => (
      <button
        key={status}
        onClick={() => setActiveEmploymentFilter(status)}
        className={`py-1.5 px-3 rounded-lg font-bold text-xs transition duration-200 cursor-pointer ${activeEmploymentFilter === status ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-200/50"}`}
      >
        {status} {status === "الكل" ? `(${candidates.length})` : `(${candidates.filter(c => c.employment_status === status).length})`}
      </button>
    ))}
  </div>
</div>
</div>


        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 font-medium animate-pulse">⏳ جاري تحميل الكفاءات والمواهب...</div>
          ) : filteredCandidates.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-medium">💡 لا يوجد متقدمون ضمن هذا المسار حالياً.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-slate-600 text-sm">
                <thead>
                  <tr className="bg-slate-900 text-white font-semibold border-b border-slate-800">
                    <th className="p-4">الاسم الكامل</th>
                    <th className="p-4">المسار المهني</th>
                    <th className="p-4">المجال / الخبرة</th>
                    <th className="p-4">بيانات التواصل</th>
                    <th className="p-4 text-center">تقييم AI</th>
                    <th className="p-4">الملخص الذكي للـ CV</th>
                    <th className="p-4 text-center">المستندات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredCandidates.map((candidate) => (
                    <tr key={candidate.id} className="hover:bg-slate-50/80 transition duration-150">
                      {/* فحص شامل لكافة مسميات حقول الاسم الممكنة في السيرفر */}
                      <td className="p-4 font-bold text-slate-900">
                        {candidate.name || candidate.full_name || candidate.fullName || candidate.username || candidate.applicant_name || "مرشح مسجل"}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 text-xs rounded-full font-bold ${candidate.category === "إعارة" ? "bg-amber-50 text-amber-600 border border-amber-200" : "bg-emerald-50 text-emerald-600 border border-emerald-200"}`}>
                          {candidate.category}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="text-slate-900">{candidate.field}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{candidate.experience_years} سنوات خبرة</div>
                      </td>
                      <td className="p-4 text-xs space-y-0.5">
                        <div className="text-slate-900">📞 {candidate.phone}</div>
                        <div>✉️ {candidate.email}</div>
                        {candidate.linkedin_url && (
                          <a href={candidate.linkedin_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline block mt-0.5">🔗 حساب LinkedIn</a>
                        )}
                      </td>
                      {/* تعديل التقييم ليظهر بنسبة مئوية واضحة واحترافية من 100 */}
                      <td className="p-4 text-center">
                        <span className="text-sm font-bold px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700">
                          {candidate.ai_score ? `${candidate.ai_score}/100` : "قيد التحليل..."}
                        </span>
                      </td>
                      <td className="p-4 text-xs max-w-xs truncate hover:whitespace-normal transition-all text-slate-500 leading-relaxed">
                        {candidate.ai_summary || "يتم استخراج الملخص البرمجي حالياً..."}
                      </td>
                      <td className="p-4 text-center">
                        <a 
                          href={candidate.cv_file_url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs transition font-semibold"
                        >
                          📄 عرض الـ CV
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
