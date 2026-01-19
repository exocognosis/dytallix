/**
 * Unit Tests - PDF/Formatters
 * Tests for server/pdf/formatters.js
 */

import { describe, it, expect } from 'vitest';
import { formatDate, formatValue, formatArray, getRiskMeta, COLORS } from '@server/pdf/formatters.js';

describe('PDF - Formatters', () => {
    describe('formatDate', () => {
        it('should format date in US locale', () => {
            const date = new Date('2026-01-19T14:00:00.000Z');
            const formatted = formatDate(date);

            expect(formatted).toMatch(/January/);
            expect(formatted).toMatch(/19/);
            expect(formatted).toMatch(/2026/);
        });

        it('should handle different dates', () => {
            const date = new Date('2025-12-25T00:00:00.000Z');
            const formatted = formatDate(date);

            expect(formatted).toMatch(/December/);
            expect(formatted).toMatch(/25/);
            expect(formatted).toMatch(/2025/);
        });
    });

    describe('formatValue', () => {
        it('should return value as string when provided', () => {
            expect(formatValue('Technology')).toBe('Technology');
            expect(formatValue('North America')).toBe('North America');
        });

        it('should trim whitespace', () => {
            expect(formatValue('  Technology  ')).toBe('Technology');
        });

        it('should return "Not provided" for empty string', () => {
            expect(formatValue('')).toBe('Not provided');
            expect(formatValue('   ')).toBe('Not provided');
        });

        it('should return "Not provided" for null/undefined', () => {
            expect(formatValue(null)).toBe('Not provided');
            expect(formatValue(undefined)).toBe('Not provided');
        });

        it('should handle numbers', () => {
            expect(formatValue(123)).toBe('123');
            expect(formatValue(0)).toBe('0');
        });
    });

    describe('formatArray', () => {
        it('should join array elements with commas', () => {
            const arr = ['PII', 'Financial', 'Healthcare'];
            expect(formatArray(arr)).toBe('PII, Financial, Healthcare');
        });

        it('should handle single element array', () => {
            expect(formatArray(['Technology'])).toBe('Technology');
        });

        it('should return "Not provided" for empty array', () => {
            expect(formatArray([])).toBe('Not provided');
        });

        it('should return "Not provided" for null/undefined', () => {
            expect(formatArray(null)).toBe('Not provided');
            expect(formatArray(undefined)).toBe('Not provided');
        });

        it('should return "Not provided" for non-array', () => {
            expect(formatArray('not an array')).toBe('Not provided');
            expect(formatArray(123)).toBe('Not provided');
        });
    });

    describe('getRiskMeta', () => {
        it('should return Critical for scores >= 90', () => {
            expect(getRiskMeta(90)).toEqual({ label: 'Critical', color: '#ff4d4d' });
            expect(getRiskMeta(95)).toEqual({ label: 'Critical', color: '#ff4d4d' });
            expect(getRiskMeta(100)).toEqual({ label: 'Critical', color: '#ff4d4d' });
        });

        it('should return High for scores 70-89', () => {
            expect(getRiskMeta(70)).toEqual({ label: 'High', color: '#f97316' });
            expect(getRiskMeta(80)).toEqual({ label: 'High', color: '#f97316' });
            expect(getRiskMeta(89)).toEqual({ label: 'High', color: '#f97316' });
        });

        it('should return Medium for scores 40-69', () => {
            expect(getRiskMeta(40)).toEqual({ label: 'Medium', color: '#fbbf24' });
            expect(getRiskMeta(50)).toEqual({ label: 'Medium', color: '#fbbf24' });
            expect(getRiskMeta(69)).toEqual({ label: 'Medium', color: '#fbbf24' });
        });

        it('should return Low for scores < 40', () => {
            expect(getRiskMeta(0)).toEqual({ label: 'Low', color: '#22c55e' });
            expect(getRiskMeta(20)).toEqual({ label: 'Low', color: '#22c55e' });
            expect(getRiskMeta(39)).toEqual({ label: 'Low', color: '#22c55e' });
        });

        it('should handle edge cases', () => {
            expect(getRiskMeta(-1)).toEqual({ label: 'Low', color: '#22c55e' });
            expect(getRiskMeta(101)).toEqual({ label: 'Critical', color: '#ff4d4d' });
        });
    });

    describe('COLORS', () => {
        it('should have all required color definitions', () => {
            expect(COLORS).toHaveProperty('background');
            expect(COLORS).toHaveProperty('backgroundDeep');
            expect(COLORS).toHaveProperty('accent');
            expect(COLORS).toHaveProperty('accent2');
            expect(COLORS).toHaveProperty('text');
            expect(COLORS).toHaveProperty('muted');
            expect(COLORS).toHaveProperty('card');
            expect(COLORS).toHaveProperty('track');
        });

        it('should have valid hex color codes', () => {
            Object.values(COLORS).forEach(color => {
                expect(color).toMatch(/^#[0-9a-f]{6}$/i);
            });
        });
    });
});
