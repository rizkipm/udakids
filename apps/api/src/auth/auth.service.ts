import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PIN_LOCK_MS, PIN_MAX_ATTEMPTS, type Role, type SessionUser } from '@little-coder/engine';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { uniqueEntryCode } from '../common/codes.js';
import { TOKEN_TTL } from '../common/config.js';
import { hashSecret, pinSecret, randomToken, verifySecret } from '../common/crypto.js';
import { RateLimiter } from '../common/rate-limit.js';
import { DB, type Db } from '../db/db.module.js';
import { children, classes, parentContacts, parents, staffUsers } from '../db/schema.js';

export type AuthResult = { token: string; user: SessionUser };

@Injectable()
export class AuthService {
  /** 10 percobaan gagal per 15 menit per email / kode keluarga. */
  readonly limiter = new RateLimiter(10, 15 * 60_000);

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly jwt: JwtService,
  ) {}

  private sign(user: SessionUser, ttl: string): Promise<string> {
    return this.jwt.signAsync(
      { sub: user.id, role: user.role, name: user.name },
      { expiresIn: ttl as never },
    );
  }

  private async issue(user: SessionUser, ttl: string): Promise<AuthResult> {
    return { token: await this.sign(user, ttl), user };
  }

  async staffLogin(email: string, password: string): Promise<AuthResult> {
    const key = `staff:${email}`;
    this.limiter.check(key);
    const [row] = await this.db.select().from(staffUsers).where(eq(staffUsers.email, email));
    if (!row || !row.active || !(await verifySecret(password, row.passwordHash))) {
      this.limiter.fail(key);
      throw new UnauthorizedException('Email atau password salah');
    }
    this.limiter.reset(key);
    return this.issue({ id: row.id, role: row.role as Role, name: row.name }, TOKEN_TTL.staff);
  }

  async parentRegister(input: {
    name: string;
    email: string;
    password: string;
  }): Promise<AuthResult & { familyCode: string }> {
    const [exists] = await this.db
      .select({ id: parents.id })
      .from(parents)
      .where(eq(parents.email, input.email));
    if (exists) throw new ConflictException('Email sudah terdaftar');
    const familyCode = await this.uniqueFamilyCode();
    const [row] = await this.db
      .insert(parents)
      .values({
        name: input.name,
        email: input.email,
        passwordHash: await hashSecret(input.password),
        familyCode,
        consentAt: new Date(),
      })
      .returning();
    const res = await this.issue(
      { id: row!.id, role: 'parent', name: row!.name },
      TOKEN_TTL.parent,
    );
    return { ...res, familyCode };
  }

  private uniqueFamilyCode(): Promise<string> {
    return uniqueEntryCode(this.db);
  }

  async parentLogin(email: string, password: string): Promise<AuthResult & { familyCode: string }> {
    const key = `parent:${email}`;
    this.limiter.check(key);
    const [row] = await this.db.select().from(parents).where(eq(parents.email, email));
    if (!row || !row.active || !(await verifySecret(password, row.passwordHash))) {
      this.limiter.fail(key);
      throw new UnauthorizedException('Email atau password salah');
    }
    this.limiter.reset(key);
    const res = await this.issue({ id: row.id, role: 'parent', name: row.name }, TOKEN_TTL.parent);
    return { ...res, familyCode: row.familyCode };
  }

  /** Daftar profil untuk layar masuk anak: hanya nama panggilan + warna Momo. */
  async familyProfiles(familyCode: string) {
    const key = `family:${familyCode}`;
    this.limiter.check(key);
    const [parent] = await this.db
      .select()
      .from(parents)
      .where(and(eq(parents.familyCode, familyCode), eq(parents.active, true)));
    if (!parent) {
      // Kode kelas workshop juga diterima di layar masuk anak (D-025).
      const cls = await this.openClass(familyCode);
      if (!cls) {
        this.limiter.fail(key);
        throw new NotFoundException('Kode tidak ditemukan');
      }
      const rows = await this.db
        .select({
          id: children.id,
          nickname: children.nickname,
          momoColor: children.momoColor,
          picturePinHash: children.picturePinHash,
        })
        .from(children)
        .where(and(eq(children.classId, cls.id), eq(children.active, true)))
        .orderBy(children.nickname);
      return rows
        .filter((r) => r.picturePinHash)
        .map(({ id, nickname, momoColor }) => ({ id, nickname, momoColor }));
    }
    const rows = await this.db
      .select({
        id: children.id,
        nickname: children.nickname,
        momoColor: children.momoColor,
        picturePinHash: children.picturePinHash,
      })
      .from(children)
      .where(and(eq(children.parentId, parent.id), eq(children.active, true)))
      .orderBy(children.createdAt);
    return rows
      .filter((r) => r.picturePinHash)
      .map(({ id, nickname, momoColor }) => ({ id, nickname, momoColor }));
  }

  async childLogin(
    familyCode: string,
    childId: string,
    pin: string[],
    now = new Date(),
  ): Promise<AuthResult> {
    const [row] = await this.db
      .select({
        child: children,
        parentActive: parents.active,
        familyCode: parents.familyCode,
        classCode: classes.code,
        classClosed: classes.closedAt,
      })
      .from(children)
      .leftJoin(parents, eq(children.parentId, parents.id))
      .leftJoin(classes, eq(children.classId, classes.id))
      .where(eq(children.id, childId));
    const viaFamily = row?.familyCode === familyCode && row.parentActive === true;
    const viaClass = row?.classCode === familyCode && row.classClosed === null;
    if (!row || !row.child.active || (!viaFamily && !viaClass))
      throw new NotFoundException('Profil tidak ditemukan');
    const { child } = row;
    if (child.pinLockedUntil && child.pinLockedUntil > now) {
      throw new HttpException(
        { message: 'Istirahat sebentar, ya. Coba lagi nanti.', lockedUntil: child.pinLockedUntil },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (!(await verifySecret(pinSecret(pin), child.picturePinHash))) {
      const attempts = child.failedPinAttempts + 1;
      const lock = attempts >= PIN_MAX_ATTEMPTS;
      await this.db
        .update(children)
        .set({
          failedPinAttempts: lock ? 0 : attempts,
          pinLockedUntil: lock ? new Date(now.getTime() + PIN_LOCK_MS) : null,
        })
        .where(eq(children.id, child.id));
      throw new UnauthorizedException({
        message: 'Sandi gambarnya belum pas',
        attemptsLeft: lock ? 0 : PIN_MAX_ATTEMPTS - attempts,
      });
    }
    await this.db
      .update(children)
      .set({ failedPinAttempts: 0, pinLockedUntil: null, lastActiveAt: now })
      .where(eq(children.id, child.id));
    return this.issue({ id: child.id, role: 'child', name: child.nickname }, TOKEN_TTL.child);
  }

  private async openClass(code: string) {
    const [cls] = await this.db
      .select({ id: classes.id, eventName: classes.eventName })
      .from(classes)
      .where(and(eq(classes.code, code), isNull(classes.closedAt)));
    return cls;
  }

  /** Info kelas untuk layar "gabung kelas" (tanpa daftar siswa). */
  async classInfo(code: string) {
    const key = `family:${code}`;
    this.limiter.check(key);
    const cls = await this.openClass(code);
    if (!cls) {
      this.limiter.fail(key);
      throw new NotFoundException('Kode kelas tidak ditemukan atau kelas sudah ditutup');
    }
    return { code, eventName: cls.eventName };
  }

  /**
   * Siswa gabung sendiri ke kelas (D-025): tanpa email orang tua; persetujuan diwakili fasilitator
   * kelas (dicatat di parent_contacts tanpa kontak). Nama panggilan unik di dalam satu kelas.
   */
  async classJoin(input: {
    classCode: string;
    nickname: string;
    momoColor: string;
    pin: string[];
  }): Promise<AuthResult & { classCode: string }> {
    const key = `join:${input.classCode}`;
    this.limiter.check(key);
    const cls = await this.openClass(input.classCode);
    if (!cls) {
      this.limiter.fail(key);
      throw new NotFoundException('Kode kelas tidak ditemukan atau kelas sudah ditutup');
    }
    const [dupe] = await this.db
      .select({ id: children.id })
      .from(children)
      .where(
        and(
          eq(children.classId, cls.id),
          eq(children.active, true),
          sql`lower(${children.nickname}) = lower(${input.nickname})`,
        ),
      );
    if (dupe)
      throw new ConflictException(
        'Nama ini sudah dipakai di kelas. Tambahkan huruf, mis. "Alya B".',
      );
    const child = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(children)
        .values({
          classId: cls.id,
          nickname: input.nickname,
          momoColor: input.momoColor,
          picturePinHash: await hashSecret(pinSecret(input.pin)),
          reportToken: randomToken(),
          lastActiveAt: new Date(),
        })
        .returning();
      await tx
        .insert(parentContacts)
        .values({ childId: row!.id, contact: null, consentAt: new Date() });
      return row!;
    });
    const res = await this.issue(
      { id: child.id, role: 'child', name: child.nickname },
      TOKEN_TTL.child,
    );
    return { ...res, classCode: input.classCode };
  }

  async me(user: SessionUser) {
    if (user.role === 'parent') {
      const [p] = await this.db
        .select({ familyCode: parents.familyCode, email: parents.email })
        .from(parents)
        .where(eq(parents.id, user.id));
      return { ...user, ...p };
    }
    if (user.role === 'child') {
      const [c] = await this.db
        .select({ momoColor: children.momoColor })
        .from(children)
        .where(eq(children.id, user.id));
      return { ...user, ...c };
    }
    const [s] = await this.db
      .select({ email: staffUsers.email })
      .from(staffUsers)
      .where(eq(staffUsers.id, user.id));
    return { ...user, ...s };
  }
}
