import { recordSecurityEvent } from '../database/auditStore.js';

export async function notify(event, payload) {
  await recordSecurityEvent({
    type: `notifier:${event}`,
    payload,
    at: new Date().toISOString()
  });
}
