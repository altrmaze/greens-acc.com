import { mkdir, appendFile } from 'node:fs/promises';
import path from 'node:path';

const AUDIT_DIR = path.resolve(process.cwd(), 'database');
const AUDIT_FILE = path.join(AUDIT_DIR, 'security-events.log');

export async function recordSecurityEvent(event) {
  await mkdir(AUDIT_DIR, { recursive: true });
  await appendFile(AUDIT_FILE, `${JSON.stringify(event)}\n`, 'utf8');
}
