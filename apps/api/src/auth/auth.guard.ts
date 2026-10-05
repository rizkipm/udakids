import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Role, SessionUser } from '@little-coder/engine';
import { eq } from 'drizzle-orm';
import { DB, type Db } from '../db/db.module.js';
import { children, parents, staffUsers } from '../db/schema.js';
import { IS_PUBLIC, ROLES } from './decorators.js';

/** Cache singkat status akun (aktif + peran) agar guard tidak query DB di setiap request. */
const ACCOUNT_TTL_MS = 10_000;
type Account = { role: Role; name: string; passwordChangedAt?: number };
const accounts = new Map<string, { at: number; account: Account | null }>();
/** Lupakan cache akun (dipanggil saat akun dinonaktifkan, diubah perannya, atau dihapus). */
export const forgetAccount = (id: string) => {
  for (const k of accounts.keys()) if (k.endsWith(`:${id}`)) accounts.delete(k);
};

/**
 * Guard global: verifikasi JWT (Authorization: Bearer), lalu pastikan akunnya MASIH ada & aktif dan
 * pakai peran dari database — bukan dari token. Akun yang dinonaktifkan/diturunkan perannya langsung
 * kehilangan akses (audit keamanan H1).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    @Inject(DB) private readonly db: Db,
  ) {}

  private async account(id: string, role: Role): Promise<Account | null> {
    const key = `${role === 'admin' || role === 'facilitator' ? 'staff' : role}:${id}`;
    const hit = accounts.get(key);
    if (hit && Date.now() - hit.at < ACCOUNT_TTL_MS) return hit.account;
    let account: Account | null = null;
    if (role === 'admin' || role === 'facilitator') {
      const [r] = await this.db
        .select({ role: staffUsers.role, name: staffUsers.name, active: staffUsers.active })
        .from(staffUsers)
        .where(eq(staffUsers.id, id));
      if (r?.active) account = { role: r.role as Role, name: r.name };
    } else if (role === 'parent') {
      const [r] = await this.db
        .select({
          name: parents.name,
          active: parents.active,
          passwordChangedAt: parents.passwordChangedAt,
        })
        .from(parents)
        .where(eq(parents.id, id));
      if (r?.active)
        account = {
          role: 'parent',
          name: r.name,
          ...(r.passwordChangedAt && { passwordChangedAt: r.passwordChangedAt.getTime() }),
        };
    } else if (role === 'child') {
      const [r] = await this.db
        .select({ name: children.nickname, active: children.active })
        .from(children)
        .where(eq(children.id, id));
      if (r?.active) account = { role: 'child', name: r.name };
    }
    accounts.set(key, { at: Date.now(), account });
    if (accounts.size > 5000) accounts.delete(accounts.keys().next().value!);
    return account;
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers?.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException('Silakan masuk dulu');
    let payload: { sub: string; role: Role; name: string; iat?: number };
    try {
      payload = await this.jwt.verifyAsync<{ sub: string; role: Role; name: string; iat?: number }>(
        token,
      );
    } catch {
      throw new UnauthorizedException('Sesi berakhir, silakan masuk lagi');
    }
    const account = await this.account(payload.sub, payload.role);
    if (!account) throw new UnauthorizedException('Akun tidak aktif. Silakan masuk lagi.');
    // Password diganti (D-064): token yang terbit sebelumnya tidak berlaku lagi.
    if (account.passwordChangedAt && (payload.iat ?? 0) * 1000 < account.passwordChangedAt)
      throw new UnauthorizedException('Password sudah diganti. Silakan masuk lagi.');
    const user: SessionUser = { id: payload.sub, role: account.role, name: account.name };
    req.user = user;

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, targets);
    if (roles && !roles.includes(user.role)) throw new ForbiddenException('Tidak punya akses');
    return true;
  }
}
