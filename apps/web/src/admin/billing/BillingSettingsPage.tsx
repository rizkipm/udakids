import { useState, type FormEvent } from 'react';
import type { ContactSettings } from '@little-coder/engine';
import { useApiCall, useFetch } from '../../auth/useApi';
import { resetContactLink } from '../../components/WhatsAppButton';
import { t } from '../../i18n';
import { Button, Card, Checkbox, PageHeader, TextField } from '../../ui/ui';
import { ActionNotice, Loadable, useAction } from '../common';
import type { BillingSettings } from './types';

function SettingsForm({ initial }: { initial: BillingSettings }) {
  const call = useApiCall('staff');
  const action = useAction();
  const [form, setForm] = useState(initial);
  const set = <K extends keyof BillingSettings>(k: K, v: BillingSettings[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const out = await action.run(
      () => call<BillingSettings>('/admin/billing/settings', { method: 'PUT', body: form }),
      t('admin.billing.saved'),
    );
    if (out) setForm(out);
  }

  return (
    <Card title={t('admin.billing.cardTitle')}>
      <ActionNotice error={action.error} done={action.done} />
      <form onSubmit={submit}>
        <Checkbox
          label={t('admin.billing.paywall')}
          checked={form.paywall}
          onChange={(e) => set('paywall', e.target.checked)}
        />
        <p className="ui-hint">{t('admin.billing.paywallHint')}</p>
        <div className="adm-fields">
          <TextField
            label={t('admin.billing.freeLevels')}
            hint={t('admin.billing.freeLevelsHint')}
            type="number"
            required
            min={0}
            max={10}
            value={String(form.freeLevels)}
            onChange={(e) => set('freeLevels', Number(e.target.value))}
          />
          <TextField
            label={t('admin.billing.expiry')}
            hint={t('admin.billing.expiryHint')}
            type="number"
            required
            min={1}
            max={168}
            value={String(form.orderExpiryHours)}
            onChange={(e) => set('orderExpiryHours', Number(e.target.value))}
          />
        </div>
        <Checkbox
          label={t('admin.billing.classFullAccess')}
          checked={form.classFullAccess}
          onChange={(e) => set('classFullAccess', e.target.checked)}
        />
        <p className="ui-hint">{t('admin.billing.classFullAccessHint')}</p>
        <Button type="submit" disabled={action.busy}>
          {t('admin.save')}
        </Button>
      </form>
    </Card>
  );
}

/** Kontak WhatsApp admin (tombol melayang) + link grup untuk email (D-064). */
function ContactForm({ initial }: { initial: ContactSettings }) {
  const call = useApiCall('staff');
  const action = useAction();
  const [form, setForm] = useState(initial);
  const set = <K extends keyof ContactSettings>(k: K, v: ContactSettings[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const out = await action.run(
      () => call<ContactSettings>('/admin/contact', { method: 'PUT', body: form }),
      t('admin.contact.saved'),
    );
    if (out) {
      setForm(out);
      resetContactLink();
    }
  }

  return (
    <Card title={t('admin.contact.cardTitle')}>
      <ActionNotice error={action.error} done={action.done} />
      <form onSubmit={submit}>
        <TextField
          label={t('admin.contact.adminWhatsapp')}
          hint={t('admin.contact.adminWhatsappHint')}
          inputMode="url"
          placeholder="08123456789"
          value={form.adminWhatsapp}
          onChange={(e) => set('adminWhatsapp', e.target.value)}
        />
        <TextField
          label={t('admin.contact.adminMessage')}
          hint={t('admin.contact.adminMessageHint')}
          maxLength={200}
          value={form.adminMessage}
          onChange={(e) => set('adminMessage', e.target.value)}
        />
        <TextField
          label={t('admin.contact.groupWhatsapp')}
          hint={t('admin.contact.groupWhatsappHint')}
          inputMode="url"
          placeholder="https://chat.whatsapp.com/…"
          value={form.groupWhatsapp}
          onChange={(e) => set('groupWhatsapp', e.target.value)}
        />
        <Button type="submit" disabled={action.busy}>
          {t('admin.save')}
        </Button>
      </form>
    </Card>
  );
}

export function BillingSettingsPage() {
  const s = useFetch<BillingSettings>('staff', '/admin/billing/settings');
  const c = useFetch<ContactSettings>('staff', '/admin/contact');
  return (
    <>
      <PageHeader title={t('admin.billing.title')} subtitle={t('admin.billing.subtitle')} />
      <Loadable loading={s.loading} error={s.error} hasData={!!s.data}>
        {() => <SettingsForm initial={s.data!} />}
      </Loadable>
      <Loadable loading={c.loading} error={c.error} hasData={!!c.data}>
        {() => <ContactForm initial={c.data!} />}
      </Loadable>
    </>
  );
}
