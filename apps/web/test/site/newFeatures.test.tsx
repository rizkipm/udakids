import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '../../src/i18n';
import { NewFeaturesSection } from '../../src/site/NewFeatures';

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
const rules = (enabled: boolean) => ({
  enabled,
  signupBonus: 3500,
  commissionBp: 3300,
  minPayout: 15000,
  qualifyRounds: 3,
  maxChildren: 7,
});
const show = () =>
  render(
    <MemoryRouter>
      <NewFeaturesSection />
    </MemoryRouter>,
  );

afterEach(() => vi.unstubAllGlobals());

describe('landing: fitur terbaru (D-063)', () => {
  it('afiliasi aktif: angka dari server (bonus, persen, minimal) + ajakan daftar; info 7 anak', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(json(rules(true)))),
    );
    show();
    expect(await screen.findByText('Rp3.500')).toBeInTheDocument();
    expect(screen.getByText('33%')).toBeInTheDocument();
    expect(screen.getByText('Rp15.000')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('site.news.aff.cta') })).toHaveAttribute(
      'href',
      '/orang-tua/daftar',
    );
    expect(screen.getByText(t('site.news.kids.title', { n: 7 }))).toBeInTheDocument();
  });

  it('afiliasi dimatikan admin: kartu afiliasi hilang, info 7 anak tetap', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(json(rules(false))));
    vi.stubGlobal('fetch', fetchMock);
    show();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByText(t('site.news.aff.title'))).toBeNull();
    expect(screen.getByText(t('site.news.kids.title', { n: 7 }))).toBeInTheDocument();
  });
});
