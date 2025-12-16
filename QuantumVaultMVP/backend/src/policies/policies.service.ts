import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PoliciesService {
  constructor(private prisma: PrismaService) {}

  async getPolicies() {
    return this.prisma.policy.findMany({
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: {
        _count: { select: { policyAssets: true, wrappingJobs: true } },
      },
    });
  }

  async getPolicy(id: string) {
    return this.prisma.policy.findUnique({
      where: { id },
      include: {
        policyAssets: { include: { asset: true } },
        wrappingJobs: true,
      },
    });
  }

  async createPolicy(data: {
    name: string;
    description?: string;
    ruleDefinition: any;
    targetScope?: any;
    priority?: number;
  }) {
    return this.prisma.policy.create({ data });
  }

  async updatePolicy(id: string, data: any) {
    return this.prisma.policy.update({ where: { id }, data });
  }

  async deletePolicy(id: string) {
    return this.prisma.policy.delete({ where: { id } });
  }

  async activatePolicy(id: string) {
    return this.prisma.policy.update({
      where: { id },
      data: {
        isActive: true,
        activatedAt: new Date(),
      },
    });
  }

  async deactivatePolicy(id: string) {
    return this.prisma.policy.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async evaluatePolicy(policyId: string) {
    const policy = await this.prisma.policy.findUnique({ where: { id: policyId } });
    if (!policy) throw new Error('Policy not found');

    // Get assets matching the target scope
    const assets = await this.prisma.asset.findMany();
    
    const results = [];
    for (const asset of assets) {
      const result = this.evaluateAssetAgainstPolicy(asset, policy.ruleDefinition);
      results.push({
        assetId: asset.id,
        matches: result,
      });

      // Store evaluation result
      await this.prisma.policyAsset.upsert({
        where: {
          policyId_assetId: {
            policyId: policy.id,
            assetId: asset.id,
          },
        },
        create: {
          policyId: policy.id,
          assetId: asset.id,
          result,
        },
        update: {
          result,
          evaluatedAt: new Date(),
        },
      });
    }

    return { policyId, evaluated: results.length, matched: results.filter(r => r.matches).length };
  }

  private evaluateAssetAgainstPolicy(asset: any, rules: any): boolean {
    // Simple rule evaluation - can be expanded
    if (rules.riskLevel && asset.riskLevel !== rules.riskLevel) return false;
    if (rules.status && asset.status !== rules.status) return false;
    if (rules.type && asset.type !== rules.type) return false;
    return true;
  }
}
