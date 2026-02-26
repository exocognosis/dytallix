import { Controller, Get, UseGuards } from '@nestjs/common';
import { ThreatsService } from './threats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('threats')
@UseGuards(JwtAuthGuard)
export class ThreatsController {
    constructor(private readonly threatsService: ThreatsService) { }

    @Get('mappings')
    getMappings() {
        return this.threatsService.getMappings();
    }
}
