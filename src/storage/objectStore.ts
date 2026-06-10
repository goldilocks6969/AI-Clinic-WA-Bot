import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../config.js';

let s3: S3Client | undefined;

function client(): S3Client {
  if (!s3) {
    s3 = new S3Client({
      region: config.STORAGE_REGION,
      endpoint: config.STORAGE_ENDPOINT || undefined, // set for DO Spaces / other S3-compatible
      credentials:
        config.STORAGE_ACCESS_KEY_ID && config.STORAGE_SECRET_ACCESS_KEY
          ? {
              accessKeyId: config.STORAGE_ACCESS_KEY_ID,
              secretAccessKey: config.STORAGE_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
  }
  return s3;
}

// Store a patient report file under a per-tenant key. Returns the stored key.
// Falls back to local disk when STORAGE_BUCKET is unset (dev), so flows are
// testable without object-storage credentials.
export async function putReport(
  clinicId: string,
  patientId: string,
  data: Buffer,
  mimeType: string,
  stampMs: number,
): Promise<string> {
  const ext = extFor(mimeType);
  const key = `reports/${clinicId}/${patientId}/${stampMs}.${ext}`;

  if (!config.STORAGE_BUCKET) {
    const path = join(process.cwd(), '.data', key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
    return `local://${key}`;
  }

  await client().send(
    new PutObjectCommand({
      Bucket: config.STORAGE_BUCKET,
      Key: key,
      Body: data,
      ContentType: mimeType,
    }),
  );
  return key;
}

function extFor(mime: string): string {
  if (mime.includes('pdf')) return 'pdf';
  if (mime.includes('png')) return 'png';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('webp')) return 'webp';
  return 'bin';
}
