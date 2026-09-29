import { t } from '../../i18n';
import { Notice } from '../../ui/ui';

export type Issue = { path: string; message: string };

/** Daftar masalah validasi; kosong → pesan "lolos". */
export function IssueList({
  issues,
  checking,
  okText,
}: {
  issues: Issue[];
  checking?: boolean;
  okText?: string;
}) {
  if (checking) return <Notice tone="info">{t('admin.validate.checking')}</Notice>;
  if (issues.length === 0)
    return <Notice tone="success">{okText ?? t('admin.validate.ok')}</Notice>;
  return (
    <Notice tone="error">
      <strong>{t('admin.validate.issues', { n: issues.length })}</strong>
      <ul className="adm-issues">
        {issues.slice(0, 20).map((i, k) => (
          <li key={k}>
            {i.path && <code>{i.path}</code>} {i.message}
          </li>
        ))}
      </ul>
    </Notice>
  );
}
