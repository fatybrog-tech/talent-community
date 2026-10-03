import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// يُستخدم في الصفحات العامة (فورم التقديم) وفي لوحة التحكم بعد تسجيل الدخول
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
