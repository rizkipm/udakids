import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Role, SessionUser } from '@little-coder/engine';
import { IS_PUBLIC, ROLES } from './decorators.js';

/** Guard global: verifikasi JWT (Authorization: Bearer) lalu periksa peran. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers?.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException('Silakan masuk dulu');
    let user: SessionUser;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; role: Role; name: string }>(token);
      user = { id: payload.sub, role: payload.role, name: payload.name };
    } catch {
      throw new UnauthorizedException('Sesi berakhir, silakan masuk lagi');
    }
    req.user = user;

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, targets);
    if (roles && !roles.includes(user.role)) throw new ForbiddenException('Tidak punya akses');
    return true;
  }
}
