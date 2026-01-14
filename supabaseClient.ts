import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lqsjgmkzzqvbicadlkaa.supabase.co';
const supabaseKey = 'sb_publishable_Z7TdwE5Jjo1iKNLxh-ncFg_T6uY55UQ';

export const supabase = createClient(supabaseUrl, supabaseKey);