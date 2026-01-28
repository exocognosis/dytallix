import { Controller, Get, UseGuards } from '@nestjs/common';
import { TransportService } from './transport.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('transport')
@UseGuards(JwtAuthGuard)
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
}
