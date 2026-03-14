import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AccessService } from './access.service';
import { CheckinAccessSessionDto } from './dto/checkin-access-session.dto';

@Controller('access/agent')
export class AccessAgentController {
  constructor(private readonly accessService: AccessService) {}

  @Get('trust-bundle')
  getTrustBundle() {
    return this.accessService.getManagedEndpointTrustBundle();
  }

  @Post('sessions/:id/checkin')
  checkinSession(@Param('id') id: string, @Body() body: CheckinAccessSessionDto) {
    return this.accessService.agentCheckinSessionContent(id, body);
  }
}
