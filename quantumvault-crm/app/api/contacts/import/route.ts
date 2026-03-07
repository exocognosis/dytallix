import { parse } from 'csv-parse/sync';
import { NextRequest, NextResponse } from 'next/server';

import { getApiSessionUser, unauthorizedJson } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';
import type { Industry, PipelineStage } from '@/types';

type CsvRecord = Record<string, string | undefined>;

const industryValues: Industry[] = [
  'finserv',
  'healthcare',
  'gov_defense',
  'energy',
  'high_tech',
  'crypto_web3',
];

const stageValues: PipelineStage[] = [
  'prospect',
  'discovery',
  'exposure_assessment',
  'poc_pilot',
  'proposal_sent',
  'negotiation',
  'closed_won',
  'closed_lost',
];

const industryAliases: Record<string, Industry> = {
  finance: 'finserv',
  financialservices: 'finserv',
  fintech: 'finserv',
  banking: 'finserv',
  healthcare: 'healthcare',
  health: 'healthcare',
  lifesciences: 'healthcare',
  government: 'gov_defense',
  gov: 'gov_defense',
  defense: 'gov_defense',
  publicsector: 'gov_defense',
  energy: 'energy',
  utilities: 'energy',
  oilgas: 'energy',
  hightech: 'high_tech',
  technology: 'high_tech',
  tech: 'high_tech',
  saas: 'high_tech',
  crypto: 'crypto_web3',
  blockchain: 'crypto_web3',
  web3: 'crypto_web3',
};

const stageAliases: Record<string, PipelineStage> = {
  lead: 'prospect',
  new: 'prospect',
  prospect: 'prospect',
  qualified: 'discovery',
  discovery: 'discovery',
  assessment: 'exposure_assessment',
  exposureassessment: 'exposure_assessment',
  pilot: 'poc_pilot',
  poc: 'poc_pilot',
  demo: 'poc_pilot',
  proposal: 'proposal_sent',
  proposalsent: 'proposal_sent',
  contract: 'negotiation',
  negotiation: 'negotiation',
  won: 'closed_won',
  closedwon: 'closed_won',
  lost: 'closed_lost',
  closedlost: 'closed_lost',
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function normalizeToken(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function getValue(record: CsvRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

function parseMoney(value: string) {
  if (!value) {
    return 0;
  }

  const normalized = value.replace(/[$,\s]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseRisk(value: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 3;
  }

  return Math.max(1, Math.min(5, Math.round(parsed)));
}

function parseDate(value: string) {
  if (!value) {
    return null;
  }

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const slashMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const month = slashMatch[1].padStart(2, '0');
    const day = slashMatch[2].padStart(2, '0');
    const year = slashMatch[3].length === 2 ? `20${slashMatch[3]}` : slashMatch[3];
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function parseList(value: string) {
  if (!value) {
    return [] as string[];
  }

  return value
    .split(/[;,|]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function mapIndustry(value: string): Industry {
  if (!value) {
    return 'high_tech';
  }

  const normalized = normalizeToken(value);
  return industryAliases[normalized] || industryValues.find((item) => item === value) || 'high_tech';
}

function mapStage(value: string): PipelineStage {
  if (!value) {
    return 'prospect';
  }

  const normalized = normalizeToken(value);
  return stageAliases[normalized] || stageValues.find((item) => item === value) || 'prospect';
}

function chunkRows<T>(rows: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }

  return chunks;
}

export async function POST(request: NextRequest) {
  const currentUser = await getApiSessionUser(request);

  if (!currentUser) {
    return unauthorizedJson();
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'A CSV file is required.' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json({ error: 'Only .csv files can be imported.' }, { status: 400 });
    }

    const csvText = await file.text();
    const parsed = parse(csvText, {
      bom: true,
      columns: (header: string[]) => header.map(normalizeHeader),
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }) as CsvRecord[];

    if (!parsed.length) {
      return NextResponse.json({ error: 'The CSV file is empty.' }, { status: 400 });
    }

    const warnings: string[] = [];
    const rows = parsed.flatMap((record, index) => {
      const name =
        getValue(record, 'contact_name', 'full_name', 'name') ||
        [getValue(record, 'first_name'), getValue(record, 'last_name')].filter(Boolean).join(' ');
      const company = getValue(record, 'company', 'account', 'account_name', 'organization');

      if (!name || !company) {
        warnings.push(`Row ${index + 2} skipped: name and company are required.`);
        return [];
      }

      return [
        {
          name,
          title: getValue(record, 'title', 'job_title', 'role') || 'CISO',
          company,
          industry: mapIndustry(getValue(record, 'industry', 'sector', 'vertical')),
          email: getValue(record, 'email', 'email_address') || null,
          linkedin: getValue(record, 'linkedin', 'linkedin_url') || null,
          phone: getValue(record, 'phone', 'phone_number', 'mobile') || null,
          stage: mapStage(getValue(record, 'stage', 'status', 'deal_stage', 'pipeline_stage')),
          quantum_risk: parseRisk(getValue(record, 'quantum_risk', 'risk', 'risk_score')),
          deal_value: parseMoney(
            getValue(record, 'deal_value', 'amount', 'opportunity_value', 'annual_contract_value')
          ),
          assigned_to: currentUser.id,
          next_follow_up: parseDate(
            getValue(record, 'next_follow_up', 'follow_up_date', 'next_step_date')
          ),
          expected_close: parseDate(
            getValue(record, 'expected_close', 'close_date', 'expected_close_date')
          ),
          notes: getValue(record, 'notes', 'description', 'context') || null,
          tags: parseList(getValue(record, 'tags')),
          competitors: parseList(getValue(record, 'competitors')),
        },
      ];
    });

    if (!rows.length) {
      return NextResponse.json(
        { error: 'No importable contacts were found in the CSV.', warnings },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    let imported = 0;

    for (const batch of chunkRows(rows, 250)) {
      const { data, error } = await supabase.from('contacts').insert(batch).select('id');

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      imported += data?.length || 0;
    }

    return NextResponse.json({
      imported,
      skipped: parsed.length - rows.length,
      total: parsed.length,
      warnings: warnings.slice(0, 25),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to import contacts';
    console.error('Error importing contacts from CSV:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}