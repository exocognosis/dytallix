import { Controller, Post, Get, Body, UseGuards, Request, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { FastifyReply } from 'fastify';
import { ConfigService } from '@nestjs/config';
import {
  buildAuthCookie,
  buildClearedAuthCookie,
  extractAuthTokenFromRequest,
} from './auth-token.util';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  private shouldUseSecureCookie(req: any): boolean {
    const override = this.configService.get<string>('AUTH_COOKIE_SECURE');
    if (typeof override === 'string') {
      const normalized = override.trim().toLowerCase();
      if (normalized === 'true') return true;
      if (normalized === 'false') return false;
    }

    const forwardedProtoHeader = req?.headers?.['x-forwarded-proto'];
    const forwardedProto = Array.isArray(forwardedProtoHeader)
      ? forwardedProtoHeader[0]
      : forwardedProtoHeader;
    const normalizedForwardedProto =
      typeof forwardedProto === 'string' ? forwardedProto.split(',')[0].trim().toLowerCase() : '';
    if (normalizedForwardedProto === 'https') {
      return true;
    }

    const hostHeader = req?.headers?.host;
    const host = typeof hostHeader === 'string' ? hostHeader.toLowerCase() : '';
    if (
      host.includes('localhost') ||
      host.startsWith('127.0.0.1') ||
      host.startsWith('[::1]') ||
      host.startsWith('::1')
    ) {
      return false;
    }

    return this.configService.get<string>('NODE_ENV') === 'production';
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(
    @Body() _loginDto: LoginDto,
    @Request() req,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const result = await this.authService.login(req.user, this.authService.buildLocalSessionContext(req));
    const secureCookie = this.shouldUseSecureCookie(req);

    res.header('Set-Cookie', buildAuthCookie(result.access_token, result.expiresAt, secureCookie));

    return {
      access_token: result.access_token,
      user: result.user,
      expiresAt: result.expiresAt,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req) {
    return this.authService.getProfileForRequest(req);
  }

  @Post('logout')
  async logout(@Request() req, @Res({ passthrough: true }) res: FastifyReply) {
    const token = extractAuthTokenFromRequest(req);
    const secureCookie = this.shouldUseSecureCookie(req);

    res.header('Set-Cookie', buildClearedAuthCookie(secureCookie));
    return this.authService.logout(token);
  }

  @Post('enterprise/exchange')
  async exchangeEnterpriseToken(
    @Body() body: { idToken: string },
    @Request() req,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const result = await this.authService.exchangeEnterpriseToken(body.idToken, req);
    const secureCookie = this.shouldUseSecureCookie(req);

    res.header('Set-Cookie', buildAuthCookie(result.access_token, result.expiresAt, secureCookie));

    return {
      access_token: result.access_token,
      user: result.user,
      expiresAt: result.expiresAt,
    };
  }

  @Post('service-account/token')
  async exchangeServiceAccountToken(
    @Body() body: { clientId: string; clientSecret: string },
    @Request() req,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const result = await this.authService.exchangeServiceAccountCredentials(body.clientId, body.clientSecret, req);
    const secureCookie = this.shouldUseSecureCookie(req);

    res.header('Set-Cookie', buildAuthCookie(result.access_token, result.expiresAt, secureCookie));

    return {
      access_token: result.access_token,
      user: result.user,
      expiresAt: result.expiresAt,
    };
  }
}
