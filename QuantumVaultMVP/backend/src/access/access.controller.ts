import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AccessService } from './access.service';
import { AssetRegistryService } from './asset-registry.service';
import { AccessPolicyService } from './access-policy.service';
import { AuditLedgerService } from './audit-ledger.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AccessDecision, AccessSessionStatus, UserRole } from '@prisma/client';
import { RequestAccessDto } from './dto/request-access.dto';
import { ViewAccessSessionDto } from './dto/view-access-session.dto';
import { CloseAccessSessionDto } from './dto/close-access-session.dto';
import { SetLegalHoldDto } from './dto/set-legal-hold.dto';
import { CheckoutAccessSessionDto } from './dto/checkout-access-session.dto';
import { CheckinAccessSessionDto } from './dto/checkin-access-session.dto';
import { FastifyReply } from 'fastify';

@Controller('access')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccessController {
  constructor(
    private readonly accessService: AccessService,
    private readonly assetRegistryService: AssetRegistryService,
    private readonly accessPolicyService: AccessPolicyService,
    private readonly auditLedgerService: AuditLedgerService,
  ) {}

  @Get('policy-matrix')
  getPolicyMatrix() {
    return this.accessPolicyService.getPolicyMatrix();
  }

  @Get('assets')
  getAssets(
    @Query('classificationLevel') classificationLevel?: string,
    @Query('lifecycleState') lifecycleState?: string,
    @Query('legalHold') legalHold?: string,
    @Query('search') search?: string,
  ) {
    return this.assetRegistryService.listAssets({
      classificationLevel,
      lifecycleState,
      legalHold: typeof legalHold === 'string' ? legalHold === 'true' : undefined,
      search,
    });
  }

  @Get('assets/:id')
  getAsset(@Param('id') id: string) {
    return this.assetRegistryService.getAsset(id);
  }

  @Patch('assets/:id/legal-hold')
  @Roles(UserRole.ADMIN, UserRole.SECURITY_ENGINEER)
  setLegalHold(@Param('id') id: string, @Body() body: SetLegalHoldDto, @Request() req: any) {
    return this.assetRegistryService.setLegalHold(id, body.enabled, body.reason, req.user);
  }

  @Post('requests')
  requestAccess(@Body() body: RequestAccessDto, @Request() req: any) {
    return this.accessService.requestAccess(req.user, req, body);
  }

  @Get('requests')
  listRequests(@Request() req: any, @Query('decision') decision?: AccessDecision) {
    return this.accessService.listRequests(req.user, { decision });
  }

  @Post('requests/:id/activate')
  activateApprovedRequest(@Param('id') id: string, @Request() req: any) {
    return this.accessService.activateApprovedRequest(id, req.user, req);
  }

  @Get('sessions')
  listSessions(@Request() req: any, @Query('status') status?: AccessSessionStatus) {
    return this.accessService.listSessions(req.user, { status });
  }

  @Get('managed-credentials')
  listManagedCredentials(@Request() req: any, @Query('status') status?: string) {
    return this.accessService.listManagedCredentialsForUser(req.user, { status });
  }

  @Get('sessions/:id')
  getSession(@Param('id') id: string, @Request() req: any) {
    return this.accessService.getSession(id, req.user);
  }

  @Post('sessions/:id/view')
  viewSession(@Param('id') id: string, @Request() req: any, @Body() body: ViewAccessSessionDto) {
    return this.accessService.materializeSessionContent(id, req.user, body);
  }

  @Post('sessions/:id/checkout')
  checkoutSession(@Param('id') id: string, @Request() req: any, @Body() body: CheckoutAccessSessionDto) {
    return this.accessService.checkoutSessionContent(id, req.user, body);
  }

  @Post('sessions/:id/checkin')
  checkinSession(@Param('id') id: string, @Request() req: any, @Body() body: CheckinAccessSessionDto) {
    return this.accessService.checkinSessionContent(id, req.user, body);
  }

  @Get('sessions/:id/viewer')
  async renderControlledViewer(
    @Param('id') id: string,
    @Query('viewerToken') viewerToken: string,
    @Request() req: any,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const html = await this.accessService.renderSessionViewer(id, req.user, viewerToken);
    res.header('Cache-Control', 'no-store, private, max-age=0');
    res.header('Pragma', 'no-cache');
    res.header('X-Frame-Options', 'SAMEORIGIN');
    res.header(
      'Content-Security-Policy',
      "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; font-src 'self' data:; frame-ancestors 'self'; base-uri 'none'; form-action 'none'",
    );
    res.type('text/html; charset=utf-8');
    return html;
  }

  @Post('sessions/:id/close')
  closeSession(@Param('id') id: string, @Request() req: any, @Body() body: CloseAccessSessionDto) {
    return this.accessService.closeSession(id, req.user, body.reason);
  }

  @Get('monitoring/summary')
  getMonitoringSummary() {
    return this.accessService.getMonitoringSummary();
  }

  @Get('audit')
  listAuditEvents(@Query('eventType') eventType?: string, @Query('pipelineAssetId') pipelineAssetId?: string) {
    return this.auditLedgerService.listEvents({ eventType, pipelineAssetId });
  }
}
