export const dynamic = "force-dynamic";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { EXPERIENCE_OPTIONS, FIELD_OPTIONS, EMPLOYMENT_STATUS_OPTIONS } from "@/lib/formOptions";

const MAX = 4 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const fd = await req.formData();
    const g = (k: string) => String(fd.get(k) || "").trim();
    const file = fd.get("cv") as File | null;

    const email = g("email").toLowerCase();
    const phone = g("phone").replace(/[\s-]/g, "");
    const category = g("category");

    if (!g("full_name") || g("full_name").length < 3) return bad("الاسم غير صالح");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad("البريد الإلكتروني غير صالح");
    if (!/^05\d{8}$/.test(phone)) return bad("رقم الجوال يجب أن يكون 10 أرقام ويبدأ بـ 05");
    if (g("linkedin_url") && !/linkedin\.com/i.test(g("linkedin_url"))) return bad("رابط LinkedIn غير صالح");
    if (!g("current_title")) return bad("المسمى الوظيفي الحالي مطلوب");
    if (!g("current_employer")) return bad("جهة العمل الحالية مطلوبة");
    if (!["توظيف", "إعارة"].includes(category)) return bad("المسار غير صالح");
    if (!EXPERIENCE_OPTIONS.includes(g("years_of_experience"))) return bad("سنوات الخبرة غير صالحة");
    if (!FIELD_OPTIONS.includes(g("field"))) return bad("المجال غير صالح");
    if (!EMPLOYMENT_STATUS_OPTIONS.includes(g("employment_status"))) return bad("نوع الوظيفة الحالية غير صالح");
    if (g("consent") !== "true") return bad("يجب الموافقة على الإقرار");
    if (!file || typeof file === "string") return bad("ملف السيرة الذاتية مفقود");
    if (file.size > MAX) return bad("حجم الملف يتجاوز 4 ميجابايت");

    const name = file.name.toLowerCase();
    if (!name.endsWith(".pdf")) return bad("الصيغة المدعومة: PDF فقط");
    const ext = "pdf";

    const { data: existing } = await supabaseAdmin
      .from("candidates").select("id, cv_file_path").eq("email", email).limit(1);
    const prev = existing && existing[0];

    const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("cvs").upload(path, Buffer.from(await file.arrayBuffer()), {
        contentType: "application/pdf",
      });
    if (upErr) throw upErr;

    const fields = {
      full_name: g("full_name"),
      phone,
      linkedin_url: g("linkedin_url") || null,
      current_title: g("current_title") || null,
      current_employer: g("current_employer") || null,
      years_of_experience: g("years_of_experience"),
      field: g("field"),
      employment_status: g("employment_status"),
      cv_file_url: path, // نخزن المسار؛ الرابط الفعلي يُولَّد مؤقتاً داخل لوحة التحكم
      cv_file_path: path,
      consent_accepted: true,
      consent_at: new Date().toISOString(),
      status: "pending",
    };

    if (prev) {
      // نفس البريد: تحديث البيانات (المسار يبقى كما اختاره أول مرة)
      const { error } = await supabaseAdmin.from("candidates").update({
        ...fields,
        ai_score: null, ai_match_percentage: null, ai_recommendation: null,
        ai_summary: null, ai_strengths: [], ai_concerns: [], ai_discrepancies: [], ai_error: null,
      }).eq("id", prev.id);
      if (error) {
        await supabaseAdmin.storage.from("cvs").remove([path]);
        throw error;
      }
      if (prev.cv_file_path) await supabaseAdmin.storage.from("cvs").remove([prev.cv_file_path]);
      return NextResponse.json({ success: true, id: prev.id, updated: true });
    }

    const { data: row, error } = await supabaseAdmin
      .from("candidates").insert({ ...fields, email, category }).select("id").single();
    if (error) {
      await supabaseAdmin.storage.from("cvs").remove([path]);
      throw error;
    }
    return NextResponse.json({ success: true, id: row.id });
  } catch (e: any) {
    console.error("apply error:", e);
    return bad("حدث خطأ غير متوقع، حاول مرة أخرى", 500);
  }
}

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}
