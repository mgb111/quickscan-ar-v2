import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const uploadFile = async (file: File, bucket: string, path: string) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;
  return data;
};

export const getPublicUrl = (bucket: string, path: string) => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  
  return data.publicUrl;
};

export const createExperience = async (experience: Omit<ARExperience, 'id' | 'created_at'>) => {
  const { data, error } = await supabase
    .from('ar_experiences')
    .insert(experience)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getExperiences = async () => {
  const { data, error } = await supabase
    .from('ar_experiences')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const updateExperienceStatus = async (id: string, status: ARExperience['status']) => {
  const { data, error } = await supabase
    .from('ar_experiences')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};