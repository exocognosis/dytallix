import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MonitoringGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  private extractClientIp(req: any) {
    const forwardedFor = req?.headers?.['x-forwarded-for'];
    const forwarded = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    const candidate = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req?.ip || req?.socket?.remoteAddress || '';
    return String(candidate || '').replace(/^::ffff:/, '');
  }

  private isPrivateAddress(ip: string) {
    const normalized = ip.trim().toLowerCase();
    if (!normalized) return false;
    if (normalized === '127.0.0.1' || normalized === '::1') return true;
    if (normalized.startsWith('10.')) return true;
    if (normalized.startsWith('192.168.')) return true;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(normalized)) return true;
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
    return false;
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const configuredToken = (this.configService.get<string>('MONITORING_BEARER_TOKEN') || '').trim();

    if (configuredToken) {
      const authHeader = request?.headers?.authorization;
      const token = typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')
        ? authHeader.slice(7).trim()
        : typeof request?.headers?.['x-monitoring-token'] === 'string'
          ? request.headers['x-monitoring-token'].trim()
          : '';

      if (token === configuredToken) {
        return true;
      }

      throw new UnauthorizedException('Monitoring token is invalid');
    }

    const clientIp = this.extractClientIp(request);
    if (this.isPrivateAddress(clientIp)) {
      return true;
    }

    throw new UnauthorizedException('Monitoring access requires MONITORING_BEARER_TOKEN or a private network source');
  }
}
