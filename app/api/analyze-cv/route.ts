export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { candidateId } = await req.json();

    if (!supabaseAdmin) {
      throw new Error("Supabase Admin client is not initialized.");
    }

    // 1) جلب بيانات المرشح من قاعدة البيانات
    const { data: candidate, error } = await supabaseAdmin
      .from("candidates")
      .select("*")
      .eq("id", candidateId)
      .single();

    if (error || !candidate) {
      return NextResponse.json({ error: "المرشح غير موجود" }, { status: 404 });
    }

    const cvText = candidate.cv_text ? candidate.cv_text.trim() : "";
    const targetField = candidate.field || "غير محدد";

    // 🔴 حماية صارمة: إذا كان حقل النص فارغاً أو لم يتم استخراجه بعد، نمنع الـ AI من التخمين العشوائي
    if (cvText.length < 10) {
      const failAnalysis = {
        score: 5,
        summary: "فشل فحص الـ AI: لم يتم استخراج نصوص مقروءة من ملف السيرة الذاتية المرفوع حتى الآن.",
        strengths: [],
        concerns: ["ملف السيرة الذاتية فارغ أو يحتاج لإعادة استخراج النصوص"]
      };

      await supabaseAdmin.from("candidates").update({
        ai_score: failAnalysis.score,
        ai_summary: failAnalysis.summary,
        ai_strengths: failAnalysis.strengths,
        ai_concerns: failAnalysis.concerns,
        status: "analyzed",
      }).eq("id", candidateId);

      return NextResponse.json({ success: true, analysis: failAnalysis });
    }

    // 2) استدعاء الذكاء الاصطناعي الحقيقي الصارم جداً مع المؤهلات والخبرات
    const prompt = `
    أنت نظام ATS وخبير موارد بشرية صارم جداً. أمامك وظيفة في مجال: ${targetField}.
    ونص السيرة الذاتية الفعلي المستخرج من ملف المتقدم هو: ${cvText}.

    قواعد الفرز الإلزامية والصارمة لمنع التلاعب:
    1. تحقق من الخلفية الأكاديمية والمهنية؛ إذا كان ملف المتقدم يظهر أنه يعمل كـ (عامل، أو مهنة غير تقنية، أو لا يمتلك مؤهلاً عالياً، أو تخلو سيرته تماماً من مشاريع وخبرات علوم الحاسب وشبكات الأمن)، يجب تصفير النسبة فوراً بحيث لا تتجاوز 10% إلى 15% كحد أقصى، وتصنيف الحالة (Not Fit) مهما كانت الخانات اليدوية المدخلة.
    2. صياغة ملخص حقيقي وواقعي باللغة العربية في سطر واحد يوضح العيب الصريح بكل صراحة (مثال: المتقدم يعمل كعامل ولا يمتلك أي مؤهلات أكاديمية أو خبرات تقنية تؤهله للمجال المستهدف).
    3. استخرج نقاط القوة والمخاوف كقائمة نصوص.

    يجب أن تكون الإجابة بصيغة JSON حصراً بهذا الهيكل تماماً:
    {
      "score": 10,
      "summary": "الملخص الصريح باللغة العربية",
      "strengths": ["نقطة 1"],
      "concerns": ["تخوف 1"]
    }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const analysis = JSON.parse(response.text);

    // 3) تحديث قاعدة البيانات بالتقييم العادل الصارم
    await supabaseAdmin.from("candidates").update({
      ai_score: analysis.score,
      ai_summary: analysis.summary,
      ai_strengths: analysis.strengths,
      ai_concerns: analysis.concerns,
      status: "analyzed",
    }).eq("id", candidateId);

    return NextResponse.json({ success: true, analysis });
  } catch (err: any) {
    console.error("analyze-cv error:", err);
    return NextResponse.json({ error: err.message || "حدث خطأ أثناء التحليل" }, { status: 500 });
  }
}
