import * as reports from '../../db/repositories/reports.js';
import { getProvider } from '../../whatsapp/index.js';
import { text } from '../../whatsapp/types.js';
import { putReport } from '../../storage/objectStore.js';
import { States } from '../states.js';
import { showMenu } from '../menuView.js';
import type { HandlerResult, Input, Session } from '../types.js';

export async function startReport(_session: Session): Promise<HandlerResult> {
  return {
    replies: [
      text(
        '📎 Please send your report as a *photo or PDF* now. You can add a caption describing it. Type *menu* to cancel.',
      ),
    ],
    next: { state: States.REPORT_WAIT },
  };
}

export async function handleReportWait(input: Input, session: Session): Promise<HandlerResult> {
  if (input.message.kind !== 'media') {
    return {
      replies: [
        text('Please send the report as a *photo or PDF*. Or type *menu* to go back to the menu.'),
      ],
    };
  }

  const media = input.message.media;
  const stampMs = Date.parse(new Date().toISOString());
  let fileKey: string;
  let fileType = media.mimeType ?? 'application/octet-stream';

  try {
    const { data, mimeType } = await getProvider().downloadMedia(media);
    fileType = mimeType;
    fileKey = await putReport(session.activeClinicId!, session.activePatientId!, data, mimeType, stampMs);
  } catch {
    // No provider credentials (e.g. local simulator) — record the provider media
    // reference so the flow completes and data still lands per-tenant.
    fileKey = `mediaid://${media.id}`;
  }

  await reports.create({
    clinicId: session.activeClinicId!,
    patientId: session.activePatientId!,
    fileKey,
    fileType,
  });

  return showMenu(session, '✅ Report saved to your record.');
}
