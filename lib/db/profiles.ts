/**
 * Profile helpers for the signed-in Supabase user.
 */

import { requireSupabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const client = requireSupabase();
  const { data, error } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<Profile, 'username' | 'display_name' | 'avatar_art'>>,
): Promise<Profile> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
