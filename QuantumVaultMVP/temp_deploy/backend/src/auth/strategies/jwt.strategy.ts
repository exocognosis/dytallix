import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
const extractJwtFromCookie = (req: any): string | null => {
  const rawCookieHeader = req?.headers?.cookie;
  if (!rawCookieHeader || typeof rawCookieHeader !== 'string') {
    return null;
  }

  const tokenPair = rawCookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('qv_access_token='));

  if (!tokenPair) {
    return null;
  }

  const token = tokenPair.slice('qv_access_token='.length);
  return token ? decodeURIComponent(token) : null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        extractJwtFromCookie,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
