import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Không để app trắng trang nếu biến môi trường chưa được cấu hình.
// Khi đã cấu hình đúng trên Vercel/Netlify/etc., Supabase sẽ là nguồn dữ liệu chung.
export const supabase =
  supabaseUrl && supabasePublishableKey
    ? createClient(supabaseUrl, supabasePublishableKey)
    : null
