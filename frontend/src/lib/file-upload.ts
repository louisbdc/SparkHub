import { supabaseAdmin } from './supabase/admin'

const BUCKET = 'attachements'

export interface UploadedFile {
  storageKey: string
  filename: string       // stored name with timestamp prefix
  originalname: string   // user's original filename
  mimeType: string
  size: number
}

/**
 * Upload a File (from FormData) to Supabase Storage.
 * Returns metadata needed to insert into the attachments table.
 */
export async function uploadFile(file: File): Promise<UploadedFile> {
  const ext = file.name.split('.').pop() ?? 'bin'
  const storedName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const storageKey = storedName

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storageKey, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })

  if (error) throw new Error(`Upload failed: ${error.message}`)

  return {
    storageKey,
    filename: storedName,
    originalname: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
  }
}

/**
 * Create a signed download URL valid for 60 seconds.
 */
export async function createSignedUrl(storageKey: string, expiresIn = 60): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(storageKey, expiresIn)

  if (error || !data) throw new Error(`Could not create signed URL: ${error?.message}`)

  return data.signedUrl
}

/**
 * Delete a file from storage.
 */
export async function deleteFile(storageKey: string): Promise<void> {
  await supabaseAdmin.storage.from(BUCKET).remove([storageKey])
}
