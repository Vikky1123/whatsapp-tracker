import { snapshotEverything } from './db.js';
import { logAudit } from './audit.js';

export async function exportBackup() {
  const data = await snapshotEverything();
  const projectCount = Object.keys(data.projects || {}).length;
  const payload = {
    exportedAt: new Date().toISOString(),
    projectCount,
    data,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  await logAudit('export_backup');
  return { projectCount };
}
