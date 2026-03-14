import { Prisma } from '@prisma/client';

export function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(
        JSON.stringify(value, (_key, currentValue) =>
            typeof currentValue === 'bigint' ? currentValue.toString() : currentValue,
        ),
    ) as Prisma.InputJsonValue;
}

export function parseJsonObject(value: unknown): Record<string, any> {
    if (!value) return {};
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
                ? parsed as Record<string, any>
                : {};
        } catch {
            return {};
        }
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, any>;
    }
    return {};
}
