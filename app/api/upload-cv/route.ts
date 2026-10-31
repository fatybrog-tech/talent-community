import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import pdf from 'pdf-parse';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as Blob | null;
    const candidateId = formData.get('candidateId') as string;

    if (!file || !candidateId) {
      return NextResponse.json({ error: 'الملف أو معرف المتقدم مفقود' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const pdfData = await pdf(buffer);
    const extractedText = pdfData.text;

    if (!supabaseAdmin) {
      throw new Error('قاعدة بيانات Supabase غير متصلة');
    }

    const { error: updateError } = await supabaseAdmin
      .from('candidates')
      .update({ cv_text: extractedText })
      .eq('id', candidateId);

    if (updateError) {
      throw new Error(`فشل حفظ النص في قاعدة البيانات: ${updateError.message}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'تم استخراج النص وحفظه بنجاح وجاهز للفرز بالذكاء الاصطناعي!' 
    });

  } catch (err: any) {
    console.error('PDF Extraction Error:', err);
    return NextResponse.json({ error: err.message || 'حدث خطأ أثناء قراءة الملف' }, { status: 500 });
  }
}

