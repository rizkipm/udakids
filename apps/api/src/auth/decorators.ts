import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';
import type { Role, SessionUser } from '@little-coder/engine';

export const IS_PUBLIC = 'isPublic';
export const ROLES = 'roles';

/** Endpoint tanpa login. */
export const Public = () => SetMetadata(IS_PUBLIC, true);
/** Hanya peran tertentu. Tanpa dekorator ini: semua pengguna yang login. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionUser => ctx.switchToHttp().getRequest().user,
);
