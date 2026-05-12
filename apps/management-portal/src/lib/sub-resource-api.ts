import type { Phi, CultivationActivity, Certification } from '@qr-bc/shared';
import { hubFetch } from './api-client';

// ---------- Activities ----------

export type ActivityRecord = CultivationActivity & { _id?: string };

export async function listActivities(
  accessToken: string,
  phi: Phi,
): Promise<{ items: ActivityRecord[] }> {
  return hubFetch(`/projects/${phi}/activities`, {}, accessToken);
}

export async function createActivity(
  accessToken: string,
  phi: Phi,
  payload: Omit<CultivationActivity, 'activityDate'> & { activityDate: string },
): Promise<ActivityRecord> {
  return hubFetch(
    `/projects/${phi}/activities`,
    { method: 'POST', body: JSON.stringify(payload) },
    accessToken,
  );
}

export async function deleteActivity(
  accessToken: string,
  phi: Phi,
  activityId: string,
): Promise<void> {
  return hubFetch(`/projects/${phi}/activities/${activityId}`, { method: 'DELETE' }, accessToken);
}

// ---------- Certifications ----------

export type CertificationRecord = Certification & { _id?: string };

export async function listCertifications(
  accessToken: string,
  phi: Phi,
): Promise<{ items: CertificationRecord[] }> {
  return hubFetch(`/projects/${phi}/certifications`, {}, accessToken);
}

export async function createCertification(
  accessToken: string,
  phi: Phi,
  payload: Omit<Certification, 'issueDate' | 'expiryDate'> & {
    issueDate: string;
    expiryDate?: string;
  },
): Promise<CertificationRecord> {
  return hubFetch(
    `/projects/${phi}/certifications`,
    { method: 'POST', body: JSON.stringify(payload) },
    accessToken,
  );
}

export async function deleteCertification(
  accessToken: string,
  phi: Phi,
  certId: string,
): Promise<void> {
  return hubFetch(`/projects/${phi}/certifications/${certId}`, { method: 'DELETE' }, accessToken);
}

// ---------- Image upload (multipart) ----------

export interface ImageUploadProgress {
  done: number;
  total: number;
  cancelled: boolean;
}

/**
 * POST /projects/:phi/uploads/cert with one PDF file. Returns the
 * pinned IPFS URL. The hub validates magic bytes server-side and
 * rejects non-PDF payloads with UNSUPPORTED_MEDIA_TYPE.
 */
export function uploadCertPdf(
  accessToken: string,
  phi: Phi,
  file: File,
  onProgress?: (loaded: number, total: number) => void,
): { promise: Promise<{ url: string }>; abort: () => void } {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<{ url: string }>((resolve, reject) => {
    const form = new FormData();
    form.append('file', file, file.name);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded, e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error('upload returned invalid JSON'));
        }
      } else {
        reject(new Error(`cert upload failed: ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('upload network error'));
    xhr.onabort = () => reject(new Error('upload cancelled'));

    const base = process.env.NEXT_PUBLIC_HUB_BASE_URL ?? 'http://localhost:3000/api/v1';
    xhr.open('POST', `${base}/projects/${phi}/uploads/cert`);
    if (accessToken) xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.send(form);
  });
  return { promise, abort: () => xhr.abort() };
}

/**
 * POST /projects/:phi/images with progress + cancellation. Uses XHR
 * because fetch() in Next.js doesn't expose upload progress events.
 */
export function uploadImages(
  accessToken: string,
  phi: Phi,
  files: File[],
  onProgress?: (loaded: number, total: number) => void,
): { promise: Promise<{ items: { url: string }[] }>; abort: () => void } {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<{ items: { url: string }[] }>((resolve, reject) => {
    const form = new FormData();
    for (const f of files) form.append('files', f, f.name);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded, e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          resolve({ items: [] });
        }
      } else {
        reject(new Error(`upload failed: ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('upload network error'));
    xhr.onabort = () => reject(new Error('upload cancelled'));

    const base = process.env.NEXT_PUBLIC_HUB_BASE_URL ?? 'http://localhost:3000/api/v1';
    xhr.open('POST', `${base}/projects/${phi}/images`);
    if (accessToken) xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.send(form);
  });
  return { promise, abort: () => xhr.abort() };
}
