import { supabaseAdmin } from "@/lib/supabaseServer";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

type Analysis = {
  match_percentage: number;
  score: number;
  recommendation: string;
  summary: string;
  strengths: string[];
  concerns: string[];
  discrepancies: { item: string; form_value: string; cv_value: string; note: string }[];
  needs_manual_review: boolean;
};

const PROMPT = (c: any) => `أنت مساعد لأخصائية موارد بشرية تفحص سيرة ذاتية. دورك تقديم توصية مساندة فقط، والقرار النهائي للأخصائية.

بيانات أدخلها المتقدم في النموذج (قارنها بما في السيرة الذاتية):
- المجال: ${c.field}
- سنوات الخبرة: ${c.years_of_experience}
- المسمى الوظيفي الحالي: ${c.current_title || "غير مذكور"}
- جهة العمل الحالية: ${c.current_employer || "غير مذكورة"}
- نوع الوظيفة الحالية: ${c.employment_status || "غير مذكور"}
- المسار: ${c.category}

المطلوب:
1) استخرج من السيرة الذاتية: المسمى الحالي، جهة العمل، سنوات الخبرة الفعلية، المجال، المؤهلات.
2) قارنها ببيانات النموذج وسجّل أي تعارض في discrepancies (مثلاً: ذكر 10 سنوات والسيرة تدل على 3).
3) match_percentage: نسبة (0-100) لمدى اتساق السيرة مع بيانات النموذج.
4) score: تقييم (0-100) لقوة الملف المهني عموماً (الخبرة، التدرج، المؤهلات، وضوح السيرة) داخل المجال المذكور. لا تُخفض التقييم بشكل حاد لمجرد اختلاف المجال؛ اذكر ذلك في concerns.
5) recommendation: واحدة من: "مناسب جداً" | "مناسب" | "يحتاج مراجعة" | "غير مناسب".
6) تجاهل تماماً الاسم والجنس والعمر والجنسية والحالة الاجتماعية والصورة ولا تؤثر في التقييم.
7) اجعل needs_manual_review = true فقط إن كانت السيرة غير مقروءة أو فارغة أو لا تبدو سيرة ذاتية. وجود فروقات بين النموذج والسيرة لا يستدعي ذلك؛ في هذه الحالة اخفض match_percentage وسجّل الفروقات، وأعطِ دائماً رقماً لـ score و match_percentage.
8) لا تخترع معلومات غير موجودة في السيرة. اكتب بالعربية وباختصار.

سلّم النتيجة عبر الأداة submit_analysis فقط.`;

function clamp(n: any) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : 0;
}

export async function analyzeCandidate(candidateId: string) {
  const { data: c, error } = await supabaseAdmin
    .from("candidates").select("*").eq("id", candidateId).single();
  if (error || !c) throw new Error("المرشح غير موجود");

  try {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY غير مضبوط");

    const { data: file, error: dlErr } = await supabaseAdmin.storage
      .from("cvs").download(c.cv_file_path);
    if (dlErr || !file) throw new Error("تعذر تحميل ملف السيرة الذاتية");
    const buf = Buffer.from(await file.arrayBuffer());

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        tools: [{
          name: "submit_analysis",
          description: "تسليم نتيجة تحليل السيرة الذاتية",
          input_schema: {
            type: "object",
            properties: {
              match_percentage: { type: "number" },
              score: { type: "number" },
              recommendation: { type: "string", enum: ["مناسب جداً", "مناسب", "يحتاج مراجعة", "غير مناسب"] },
              summary: { type: "string" },
              strengths: { type: "array", items: { type: "string" } },
              concerns: { type: "array", items: { type: "string" } },
              discrepancies: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    item: { type: "string" }, form_value: { type: "string" },
                    cv_value: { type: "string" }, note: { type: "string" },
                  },
                  required: ["item", "form_value", "cv_value", "note"],
                },
              },
              needs_manual_review: { type: "boolean" },
            },
            required: ["match_percentage", "score", "recommendation", "summary",
              "strengths", "concerns", "discrepancies", "needs_manual_review"],
          },
        }],
        messages: [{
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: buf.toString("base64") } },
            { type: "text", text: PROMPT(c) },
          ],
        }],
      }),
    });
    if (!r.ok) throw new Error(`Claude ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const res = await r.json();
    const block = (res?.content || []).find((b: any) => b.type === "tool_use");
    let a: Analysis;
    if (block?.input) {
      a = block.input as Analysis;
    } else {
      // احتياط: لو رجّع نصاً بدل الأداة
      const text: string = (res?.content || []).map((b: any) => b.text || "").join("");
      const st = text.indexOf("{"), en = text.lastIndexOf("}");
      if (st < 0 || en < 0) throw new Error("رد غير مفهوم من نظام التحليل");
      a = JSON.parse(text.slice(st, en + 1)) as Analysis;
    }

    const hasNums = Number.isFinite(Number(a.score)) && Number.isFinite(Number(a.match_percentage))
      && (Number(a.score) > 0 || Number(a.match_percentage) > 0);
    // المراجعة اليدوية فقط عند تعذّر قراءة السيرة (لا أرقام صالحة)
    const manual = !!a.needs_manual_review && !hasNums;
    const row = {
      ai_score: manual ? null : clamp(a.score),
      ai_match_percentage: manual ? null : clamp(a.match_percentage),
      ai_recommendation: manual ? "يحتاج مراجعة يدوية" : String(a.recommendation || "يحتاج مراجعة"),
      ai_summary: String(a.summary || ""),
      ai_strengths: Array.isArray(a.strengths) ? a.strengths : [],
      ai_concerns: Array.isArray(a.concerns) ? a.concerns : [],
      ai_discrepancies: Array.isArray(a.discrepancies) ? a.discrepancies : [],
      status: manual ? "manual_review" : "analyzed",
      ai_error: null,
    };
    await supabaseAdmin.from("candidates").update(row).eq("id", candidateId);
    return row;
  } catch (e: any) {
    console.error("analyze error:", e);
    await supabaseAdmin.from("candidates")
      .update({ status: "failed", ai_error: String(e?.message || e).slice(0, 300) })
      .eq("id", candidateId);
    throw e;
  }
}
