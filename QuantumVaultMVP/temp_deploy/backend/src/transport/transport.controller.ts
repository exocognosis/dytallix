import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { TransportService } from './transport.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('transport')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransportController {
    constructor(private readonly transportService: TransportService) { }

    @Get('sessions')
    getSessions() {
        return this.transportService.getSessions();
    }

    @Get('tunnels')
    getTunnels() {
        return this.transportService.getTunnels();
    }

    @Get('traffic')
    getTraffic() {
        return this.transportService.getTraffic();
    }

    // PQC Secure Transport Layer (application-layer encryption on top of classical TLS)
    @Get('pqc/server-info')
    getPqcServerInfo() {
        return this.transportService.getPqcServerInfo();
    }

    @Post('pqc/handshake')
    startPqcSession(
        @Body()
        body: {
            kemCiphertextB64: string;
            saltB64: string;
            ttlSeconds?: number;
            scope?: { cryptoDomain?: string; region?: string; regulatoryDomain?: string; tenantId?: string };
        },
    ) {
        return this.transportService.startPqcSession(body);
    }

    @Post('pqc/secure-echo')
    secureEcho(
        @Body()
        body: { sessionId: string; counter: number; nonceB64: string; ciphertextB64: string; tagB64: string },
    ) {
        return this.transportService.secureEcho(body);
    }

    @Post('pqc/close')
    closeSession(@Body() body: { sessionId: string }) {
        return this.transportService.closeSession(body.sessionId);
    }

    @Post('pqc/rotate')
    @Roles(UserRole.ADMIN)
    rotateTransportKeys() {
        return this.transportService.rotateTransportKeys();
    }
}
