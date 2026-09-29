import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

type Handler = (url: string, init?: RequestInit) => unknown;

/** Ganti fetch global: rute → data JSON (path tanpa host). */
export function mockApi(routes: Record<string, unknown | Handler>) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const key = `${init?.method ?? 'GET'} ${url.pathname}`;
    const hit = key in routes ? routes[key] : routes[url.pathname];
    if (hit === undefined)
      return new Response(JSON.stringify({ message: 'not found' }), { status: 404 });
    const body = typeof hit === 'function' ? (hit as Handler)(url.pathname, init) : hit;
    return new Response(JSON.stringify(body), { status: 200 });
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

export function renderAdmin(ui: ReactNode, path = '/admin') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/*" element={ui} />
        <Route path="*" element={ui} />
      </Routes>
    </MemoryRouter>,
  );
}
