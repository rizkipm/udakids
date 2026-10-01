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
import { PIN_MAX_ATTEMPTS, pinLockMs, type Role, type SessionUser } from '@little-coder/engine';
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
  /** Per alamat IP (audit M2/M3/M6): login gagal, tebak kode, dan pendaftaran. */
  readonly ipFails = new RateLimiter(30, 15 * 60_000);
  readonly ipSignups = new RateLimiter(10, 60 * 60_000);
  /** Hash palsu agar waktu respons sama untuk email yang tidak terdaftar (audit L3). */
  private readonly dummyHash = hashSecret('tidak-ada-akun-ini');

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

  async staffLogin(email: string, password: string, ip = 'unknown'): Promise<AuthResult> {
    const key = `staff:${email}`;
    const ipKey = `ip:${ip}`;
    this.limiter.check(key);
    this.ipFails.check(ipKey);
    const [row] = await this.db
      .select()
      .from(staffUsers)
      .where(sql`lower(${staffUsers.email}) = ${email}`);
    const ok = await verifySecret(password, row?.passwordHash ?? (await this.dummyHash));
    if (!row || !row.active || !ok) {
      this.limiter.fail(key);
      this.ipFails.fail(ipKey);
      throw new UnauthorizedException('Email atau password salah');
    }
    this.limiter.reset(key);
    return this.issue({ id: row.id, role: row.role as Role, name: row.name }, TOKEN_TTL.staff);
  }

  async parentRegister(
    input: { name: string; email: string; password: string },
    ip = 'unknown',
  ): Promise<AuthResult & { familyCode: string }> {
    const ipKey = `signup:${ip}`;
    this.ipSignups.check(ipKey);
    const [exists] = await this.db
      .select({ id: parents.id })
      .from(parents)
      .where(sql`lower(${parents.email}) = ${input.email}`);
    if (exists) throw new ConflictException('Email sudah terdaftar. Silakan masuk.');
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
      .onConflictDoNothing()
      .returning();
    if (!row) throw new ConflictException('Email sudah terdaftar. Silakan masuk.');
    this.ipSignups.fail(ipKey);
    const res = await this.issue(
      { id: row!.id, role: 'parent', name: row!.name },
      TOKEN_TTL.parent,
    );
    return { ...res, familyCode };
  }

  private uniqueFamilyCode(): Promise<string> {
    return uniqueEntryCode(this.db);
  }

  async parentLogin(
    email: string,
    password: string,
    ip = 'unknown',
  ): Promise<AuthResult & { familyCode: string }> {
    const key = `parent:${email}`;
    const ipKey = `ip:${ip}`;
    this.limiter.check(key);
    this.ipFails.check(ipKey);
    const [row] = await this.db
      .select()
      .from(parents)
      .where(sql`lower(${parents.email}) = ${email}`);
    const ok = await verifySecret(password, row?.passwordHash ?? (await this.dummyHash));
    if (!row || !row.active || !ok) {
      this.limiter.fail(key);
      this.ipFails.fail(ipKey);
      throw new UnauthorizedException('Email atau password salah');
    }
    this.limiter.reset(key);
    const res = await this.issue({ id: row.id, role: 'parent', name: row.name }, TOKEN_TTL.parent);
    return { ...res, familyCode: row.familyCode };
  }

  /** Daftar profil untuk layar masuk anak: hanya nama panggilan + warna Momo. */
  async familyProfiles(familyCode: string, ip = 'unknown') {
    const key = `family:${familyCode}`;
    const ipKey = `ip:${ip}`;
    this.limiter.check(key);
    this.ipFails.check(ipKey);
    const [parent] = await this.db
      .select()
      .from(parents)
      .where(and(eq(parents.familyCode, familyCode), eq(parents.active, true)));
    if (!parent) {
      // Kode milik anak yang daftar sendiri (D-037): hanya profil anak itu.
      const [self] = await this.db
        .select({ id: children.id, nickname: children.nickname, momoColor: children.momoColor })
        .from(children)
        .where(and(eq(children.selfCode, familyCode), eq(children.active, true)));
      if (self) return [self];
      // Kode kelas workshop juga diterima di layar masuk anak (D-025).
      const cls = await this.openClass(familyCode);
      if (!cls) {
        this.limiter.fail(key);
        this.ipFails.fail(ipKey);
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
    ip = 'unknown',
  ): Promise<AuthResult> {
    const ipKey = `ip:${ip}`;
    this.ipFails.check(ipKey);
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
    const viaSelf = !!row?.child.selfCode && row.child.selfCode === familyCode;
    if (!row || !row.child.active || (!viaFamily && !viaClass && !viaSelf)) {
      this.ipFails.fail(ipKey);
      throw new NotFoundException('Profil tidak ditemukan');
    }
    const { child } = row;
    if (!(await this.checkPin(child, pin, now))) {
      this.ipFails.fail(ipKey);
      // checkPin melempar 429 saat terkunci; di sini berarti sandi salah.
      const left = PIN_MAX_ATTEMPTS - ((child.failedPinAttempts + 1) % PIN_MAX_ATTEMPTS);
      throw new UnauthorizedException({
        message: 'Sandi gambarnya belum pas',
        attemptsLeft: left === PIN_MAX_ATTEMPTS ? 0 : left,
      });
    }
    await this.db.update(children).set({ lastActiveAt: now }).where(eq(children.id, child.id));
    return this.issue({ id: child.id, role: 'child', name: child.nickname }, TOKEN_TTL.child);
  }

  /**
   * Periksa sandi gambar anak dengan kunci bertingkat (audit H3/H4): 5 salah → terkunci 1, 5, 30, lalu
   * 120 menit. Dipakai saat anak masuk DAN saat orang tua menautkan anak. Benar → hitungan direset.
   */
  async checkPin(
    child: Pick<
      typeof children.$inferSelect,
      'id' | 'picturePinHash' | 'failedPinAttempts' | 'pinLockedUntil' | 'pinLockCount'
    >,
    pin: readonly string[],
    now = new Date(),
  ): Promise<boolean> {
    if (child.pinLockedUntil && child.pinLockedUntil > now) {
      throw new HttpException(
        { message: 'Istirahat sebentar, ya. Coba lagi nanti.', lockedUntil: child.pinLockedUntil },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (await verifySecret(pinSecret([...pin]), child.picturePinHash)) {
      await this.db
        .update(children)
        .set({ failedPinAttempts: 0, pinLockedUntil: null, pinLockCount: 0 })
        .where(eq(children.id, child.id));
      return true;
    }
    const attempts = child.failedPinAttempts + 1;
    const lock = attempts >= PIN_MAX_ATTEMPTS;
    const locks = child.pinLockCount + (lock ? 1 : 0);
    await this.db
      .update(children)
      .set({
        failedPinAttempts: lock ? 0 : attempts,
        pinLockCount: locks,
        pinLockedUntil: lock ? new Date(now.getTime() + pinLockMs(locks)) : null,
      })
      .where(eq(children.id, child.id));
    return false;
  }

  private async openClass(code: string) {
    const [cls] = await this.db
      .select({ id: classes.id, eventName: classes.eventName })
      .from(classes)
      .where(and(eq(classes.code, code), isNull(classes.closedAt)));
    return cls;
  }

  /** Info kelas untuk layar "gabung kelas" (tanpa daftar siswa). */
  async classInfo(code: string, ip = 'unknown') {
    const key = `family:${code}`;
    const ipKey = `ip:${ip}`;
    this.limiter.check(key);
    this.ipFails.check(ipKey);
    const cls = await this.openClass(code);
    if (!cls) {
      this.limiter.fail(key);
      this.ipFails.fail(ipKey);
      throw new NotFoundException('Kode kelas tidak ditemukan atau kelas sudah ditutup');
    }
    return { code, eventName: cls.eventName };
  }

  /**
   * Siswa gabung sendiri ke kelas (D-025): tanpa email orang tua; persetujuan diwakili fasilitator
   * kelas (dicatat di parent_contacts tanpa kontak). Nama panggilan unik di dalam satu kelas.
   */
  async classJoin(
    input: {
      classCode: string;
      nickname: string;
      momoColor: string;
      pin: string[];
    },
    ip = 'unknown',
  ): Promise<AuthResult & { classCode: string }> {
    const key = `join:${input.classCode}`;
    const ipKey = `ip:${ip}`;
    this.limiter.check(key);
    this.ipFails.check(ipKey);
    this.ipSignups.check(`join:${ip}`);
    const cls = await this.openClass(input.classCode);
    if (!cls) {
      this.limiter.fail(key);
      this.ipFails.fail(ipKey);
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
    this.ipSignups.fail(`join:${ip}`);
    const res = await this.issue(
      { id: child.id, role: 'child', name: child.nickname },
      TOKEN_TTL.child,
    );
    return { ...res, classCode: input.classCode };
  }

  /**
   * Anak daftar sendiri tanpa orang tua (D-037). Yang disimpan hanya nama panggilan, warna Momo, dan
   * hash sandi gambar (PRD A17) — tanpa email/kontak. Anak mendapat kode keluarga sendiri untuk masuk
   * lagi; orang tua bisa menautkannya nanti (kode + sandi gambar). Dibatasi per alamat IP.
   */
  readonly registerLimiter = new RateLimiter(5, 60 * 60_000);

  async childRegister(
    input: { nickname: string; momoColor: string; pin: string[] },
    ip: string,
  ): Promise<AuthResult & { familyCode: string }> {
    const key = `register:${ip}`;
    this.registerLimiter.check(key);
    this.registerLimiter.fail(key);
    const familyCode = await uniqueEntryCode(this.db);
    const [child] = await this.db
      .insert(children)
      .values({
        nickname: input.nickname,
        momoColor: input.momoColor,
        picturePinHash: await hashSecret(pinSecret(input.pin)),
        reportToken: randomToken(),
        selfCode: familyCode,
        lastActiveAt: new Date(),
      })
      .returning();
    const res = await this.issue(
      { id: child!.id, role: 'child', name: child!.nickname },
      TOKEN_TTL.child,
    );
    return { ...res, familyCode };
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
        .select({
          momoColor: children.momoColor,
          selfCode: children.selfCode,
          parentId: children.parentId,
        })
        .from(children)
        .where(eq(children.id, user.id));
      return {
        ...user,
        momoColor: c?.momoColor,
        // Kode keluarga anak yang daftar sendiri — ditampilkan di profil agar bisa dicatat.
        selfCode: c?.selfCode ?? null,
        hasParent: !!c?.parentId,
      };
    }
    const [s] = await this.db
      .select({ email: staffUsers.email })
      .from(staffUsers)
      .where(eq(staffUsers.id, user.id));
    return { ...user, ...s };
  }
}
