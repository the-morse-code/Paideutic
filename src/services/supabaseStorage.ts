import { getSupabaseClient } from './storage';

export const SUPABASE_BUCKET_NAME = 'Material Library';
export const SUPABASE_FOLDER_NAME = 'Uploaded Material';

export interface UploadResult {
  success: boolean;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  publicUrl: string;
  storageType: 'supabase' | 'server';
  supabasePath?: string;
  isRlsBlocked?: boolean;
  error?: string;
}

export interface CloudMaterialItem {
  name: string;
  size: number;
  updated_at: string;
  url: string;
  source: 'supabase' | 'server';
}

export const SUPABASE_STORAGE_RLS_SQL = `-- Run this in your Supabase Dashboard -> SQL Editor to allow direct bucket uploads:

-- 1. Ensure the bucket 'Material Library' is public
UPDATE storage.buckets SET public = true WHERE id = 'Material Library';

-- 2. Allow anyone to upload files into 'Material Library'
CREATE POLICY "Allow Public Uploads" ON storage.objects
FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'Material Library');

-- 3. Allow anyone to view & download files from 'Material Library'
CREATE POLICY "Allow Public Select" ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'Material Library');
`;

/**
 * Upload a file directly to the Supabase Storage bucket 'Material Library'
 * in folder 'Uploaded Material'. Falls back to central server storage if RLS blocks it.
 */
export async function uploadMaterialToBucket(file: File, authorName?: string, userId?: string): Promise<UploadResult> {
  // 1. Convert to dataUrl for immediate local preview and fallback
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const supabase = getSupabaseClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const safeAuthor = encodeURIComponent(authorName || 'Scholar');
  const safeUid = encodeURIComponent(userId || 'user');
  const remotePath = `${SUPABASE_FOLDER_NAME}/${Date.now()}__by__${safeAuthor}__uid__${safeUid}__${safeName}`;

  if (supabase) {
    try {
      // 1. Ensure the bucket 'Material Library' exists (public)
      try {
        await supabase.storage.createBucket(SUPABASE_BUCKET_NAME, { public: true });
      } catch {}

      // 2. Direct upload to Supabase Storage bucket
      let { data, error } = await supabase.storage
        .from(SUPABASE_BUCKET_NAME)
        .upload(remotePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'application/octet-stream',
        });

      if (error && (error.message?.toLowerCase().includes('mime type') || error.message?.toLowerCase().includes('not supported'))) {
        try {
          await supabase.storage.updateBucket(SUPABASE_BUCKET_NAME, { public: true, allowedMimeTypes: undefined as any });
        } catch {}
        const retryRes = await supabase.storage
          .from(SUPABASE_BUCKET_NAME)
          .upload(remotePath, file, {
            cacheControl: '3600',
            upsert: true,
            contentType: 'application/octet-stream',
          });
        data = retryRes.data;
        error = retryRes.error;
      }

      if (!error && data) {
        const { data: urlData } = supabase.storage
          .from(SUPABASE_BUCKET_NAME)
          .getPublicUrl(remotePath);

        // Backup to central server disk (skip mirroring to Supabase again since direct client upload succeeded)
        fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: file.name, type: file.type, dataUrl, author_name: authorName, user_id: userId, skipSupabaseMirror: true }),
        }).catch(() => {});

        return {
          success: true,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          dataUrl,
          publicUrl: urlData.publicUrl,
          storageType: 'supabase',
          supabasePath: remotePath,
        };
      }

      if (error) {
        console.warn('Direct Supabase storage upload notice:', error.message);
        const isRls =
          error.message?.toLowerCase().includes('row-level security') ||
          error.message?.toLowerCase().includes('bucket not found') ||
          (error as any)?.statusCode === '403' ||
          (error as any)?.code === 'AccessDenied';

        // Fallback to central server upload
        const serverRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: file.name, type: file.type, dataUrl, author_name: authorName, user_id: userId }),
        });

        let serverUrl = dataUrl;
        let isSupa = false;
        let supaPath: string | undefined = undefined;

        if (serverRes.ok) {
          const sJson = await serverRes.json();
          serverUrl = sJson.url || dataUrl;
          if (sJson.supabasePath) {
            isSupa = true;
            supaPath = sJson.supabasePath;
          }
        }

        return {
          success: true,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          dataUrl,
          publicUrl: serverUrl,
          storageType: isSupa ? 'supabase' : 'server',
          supabasePath: supaPath,
          isRlsBlocked: isRls,
          error: error.message,
        };
      }
    } catch (err: any) {
      console.warn('Supabase upload exception, using server fallback:', err);
    }
  }

  // Fallback to server upload
  try {
    const serverRes = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: file.name, type: file.type, dataUrl, author_name: authorName, user_id: userId }),
    });
    if (serverRes.ok) {
      const sJson = await serverRes.json();
      return {
        success: true,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        dataUrl,
        publicUrl: sJson.url || dataUrl,
        storageType: 'server',
      };
    }
  } catch (err) {
    console.warn('Server upload issue:', err);
  }

  return {
    success: true,
    name: file.name,
    size: file.size,
    type: file.type || 'application/octet-stream',
    dataUrl,
    publicUrl: dataUrl,
    storageType: 'server',
  };
}

/**
 * Fetch all materials residing in Supabase Storage bucket 'Material Library' -> 'Uploaded Material'
 */
export async function fetchBucketMaterials(): Promise<CloudMaterialItem[]> {
  try {
    const res = await fetch('/api/storage-status');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.files)) {
        return data.files.map((f: any) => ({
          name: f.name,
          size: f.size || 0,
          updated_at: f.updated_at || new Date().toISOString(),
          url: f.url,
          source: 'supabase',
        }));
      }
    }
  } catch (err) {
    console.warn('Error fetching from /api/storage-status:', err);
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data } = await supabase.storage
        .from(SUPABASE_BUCKET_NAME)
        .list(SUPABASE_FOLDER_NAME);

      if (data && Array.isArray(data)) {
        return data
          .filter((f) => f.name !== '.emptyFolderPlaceholder')
          .map((f) => {
            const { data: pu } = supabase.storage
              .from(SUPABASE_BUCKET_NAME)
              .getPublicUrl(`${SUPABASE_FOLDER_NAME}/${f.name}`);
            return {
              name: f.name,
              size: (f.metadata as any)?.size || 0,
              updated_at: f.updated_at || new Date().toISOString(),
              url: pu.publicUrl,
              source: 'supabase',
            };
          });
      }
    } catch (e) {
      console.warn('Error reading bucket via Supabase client:', e);
    }
  }

  return [];
}
