import { supabase } from '../supabaseClient';
import { v4 as uuidv4 } from 'uuid';

export const BUCKET_NAME = 'app-files';

export interface UploadOptions {
  featureName: string;
  itemId: string;
  file: File | Blob;
  userId: string;
}

/**
 * Uploads a file to Supabase Storage with the path structure:
 * ${userId}/${featureName}/${itemId}/${uuid}.${extension}
 */
export async function uploadFile({ featureName, itemId, file, userId }: UploadOptions) {
  const fileExt = file instanceof File ? file.name.split('.').pop() : 'bin';
  const fileName = `${uuidv4()}.${fileExt}`;
  const filePath = `${userId}/${featureName}/${itemId}/${fileName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;
  return data.path;
}

/**
 * Generates a signed URL for a private file in Supabase Storage.
 */
export async function getSignedUrl(path: string, expiresIn = 3600) {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}

/**
 * Deletes a file from Supabase Storage.
 */
export async function deleteFile(path: string) {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path]);

  if (error) throw error;
}
