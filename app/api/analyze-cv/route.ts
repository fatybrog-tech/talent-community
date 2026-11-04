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

    // 1) جلب بيانات المرشح ورابط السيرة الذاتية المرفوعة على الفايربيس/سوبابيس ستورج
    const { data: candidate, error } = await supabaseAdmin
      .from("candidates")
      .select("*")
      .eq("id", candidateId)
      .single();

    if (error || !candidate) {
      return NextResponse.json({ error: "المرشح غير موجود" }, { status: 404 });
    }

    const targetField = candidate.field || "غير محدد";
    const cvFileUrl = candidate.cv_file_url; // رابط الـ PDF المباشر المستقر

    // 🔴 حماية الحديدية: إذا لم يقم المتقدم برفع ملف السيرة الذاتية بشكل صحيح
    if (!cvFileUrl) {
      const failAnalysis = {
        score: 0,
        summary: "فشل التحليل الآلي: لم يتم العثور على رابط ملف السيرة الذاتية المرفوع في قاعدة البيانات.",
        strengths: [],
        concerns: ["ملف السيرة الذاتية مفقود أو تعذر تحميله"]
      };
      await updateCandidateScore(candidateId, failAnalysis);
      return NextResponse.json({ success: true, analysis: failAnalysis });
    }

    // 2) استدعاء الذكاء الاصطناعي (Gemini) ليقوم بتحميل وقراءة الـ PDF والفرز مباشرة
    // هذه الميزة السحابية تلغي تماماً الحاجة لمكتبات قراءة الـ PDF وتضمن عدم انهيار الموقع
    const prompt = `
    أنت نظام ATS محترف وخبير موارد بشرية صارم للغاية وقاسٍ في التقييم والفرز.
    المطلوب منك هو تحليل السيرة الذاتية المرفقة ومطابقتها مع المجال المستهدف التالي: [${targetField}].

    قواعد الفرز الإلزامية والصارمة لمنع التلاعب:
    1. قم بقراءة ملف الـ PDF المرفق بدقة وفحص الخلفية الأكاديمية والمهنية للمتقدم المكتوبة بداخل الملف.
    2. إذا ظهر لك من محتوى السيرة الذاتية أن المتقدم يعمل في مهنة حرفية أو ميدانية (مثل عامل، سائق، حارس)، أو لا يمتلك مؤهلاً أكاديمياً عالياً يناسب الوظيفة، أو تخلو سيرته تماماً من المصطلحات والمشاريع والخبرات المرتبطة بالمجال المستهدف المختار [${targetField}]، يجب تصفير النسبة فوراً بحيث لا تتجاوز 5% إلى 15% كحد أقصى، وتصنيف الحالة كـ (Not Fit) مهما كانت البيانات والخيارات الخارجية التي تم إدخالها يدويًا في الموقع.
    3. اكتب ملخصاً واقعياً وصريحاً باللغة العربية في سطر واحد يذكر سبب الاستبعاد أو التأهيل بكل أمانة ودون مجاملة.
    4. استخرج نقاط القوة والمخاوف كقائمة نصوص واضحة.

    يجب أن تكون الإجابة بصيغة JSON حصراً بهذا الهيكل البرمجي تماماً ودون أي نصوص إضافية:
    {
      "score": 0,
      "summary": "الملخص الصريح باللغة العربية هنا",
      "strengths": ["نقطة قوة إن وجدت"],
      "concerns": ["المخاوف الأساسية الصريحة هنا"]
    }
    `;

    // جلب ملف الـ PDF كـ Buffer وتمريره مباشرة لـ Gemini
    const fileResponse = await fetch(cvFileUrl);
    const arrayBuffer = await fileResponse.arrayBuffer();
    const base64File = Buffer.from(arrayBuffer).toString("base64");

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            mimeType: "application/pdf",
            data: base64File
          }
        },
        prompt
      ],
      config: { responseMimeType: 'application/json' }
    });

    const analysis = JSON.parse(response.text);

    // 3) تحديث قاعدة البيانات بالتقييم العادل الصارم
    await updateCandidateScore(candidateId, analysis);

    return NextResponse.json({ success: true, analysis });

  } catch (err: any) {
    console.error("analyze-cv error:", err);
    return NextResponse.json({ error: err.message || "حدث خطأ أثناء التحليل" }, { status: 500 });
  }
}

async function updateCandidateScore(candidateId: string, analysis: any) {
  await supabaseAdmin.from("candidates").update({
    ai_score: analysis.score,
    ai_summary: analysis.summary,
    ai_strengths: analysis.strengths,
    ai_concerns: analysis.concerns,
    status: "analyzed",
  }).eq("id", candidateId);
}
