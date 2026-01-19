/**
 * Unit Tests - Services/Demo Ledger
 * Tests for server/services/demo-ledger.js
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { creditDemo, getDemoBalances, clearDemoLedger } from '@server/services/demo-ledger.js';

describe('Services - Demo Ledger', () => {
    beforeEach(() => {
        // Clear ledger before each test
        clearDemoLedger();
    });

    describe('creditDemo', () => {
        it('should credit DGT tokens to an address', () => {
            const address = 'dytallix1test123';

            creditDemo(address, 'DGT', 1000000);

            const balances = getDemoBalances(address);
            expect(balances).toEqual({ udgt: 1000000, udrt: 0 });
        });

        it('should credit DRT tokens to an address', () => {
            const address = 'dytallix1test123';

            creditDemo(address, 'DRT', 500000);

            const balances = getDemoBalances(address);
            expect(balances).toEqual({ udgt: 0, udrt: 500000 });
        });

        it('should accumulate credits for the same address', () => {
            const address = 'dytallix1test123';

            creditDemo(address, 'DGT', 1000000);
            creditDemo(address, 'DGT', 500000);

            const balances = getDemoBalances(address);
            expect(balances.udgt).toBe(1500000);
        });

        it('should handle multiple token types for same address', () => {
            const address = 'dytallix1test123';

            creditDemo(address, 'DGT', 1000000);
            creditDemo(address, 'DRT', 500000);

            const balances = getDemoBalances(address);
            expect(balances).toEqual({ udgt: 1000000, udrt: 500000 });
        });

        it('should handle empty address gracefully', () => {
            expect(() => creditDemo('', 'DGT', 1000000)).not.toThrow();

            const balances = getDemoBalances('');
            expect(balances).toBeNull();
        });

        it('should handle null address gracefully', () => {
            expect(() => creditDemo(null, 'DGT', 1000000)).not.toThrow();
        });

        it('should handle invalid amounts gracefully', () => {
            const address = 'dytallix1test123';

            expect(() => creditDemo(address, 'DGT', 'invalid')).not.toThrow();
        });
    });

    describe('getDemoBalances', () => {
        it('should return null for unknown address', () => {
            const balances = getDemoBalances('dytallix1unknown');

            expect(balances).toBeNull();
        });

        it('should return balances for known address', () => {
            const address = 'dytallix1test123';
            creditDemo(address, 'DGT', 1000000);

            const balances = getDemoBalances(address);

            expect(balances).toEqual({ udgt: 1000000, udrt: 0 });
        });

        it('should return null for empty address', () => {
            const balances = getDemoBalances('');

            expect(balances).toBeNull();
        });

        it('should handle whitespace in address', () => {
            const address = '  dytallix1test123  ';
            creditDemo(address, 'DGT', 1000000);

            const balances = getDemoBalances(address);

            expect(balances).toEqual({ udgt: 1000000, udrt: 0 });
        });
    });

    describe('clearDemoLedger', () => {
        it('should clear all balances', () => {
            const addr1 = 'dytallix1test1';
            const addr2 = 'dytallix1test2';

            creditDemo(addr1, 'DGT', 1000000);
            creditDemo(addr2, 'DRT', 500000);

            clearDemoLedger();

            expect(getDemoBalances(addr1)).toBeNull();
            expect(getDemoBalances(addr2)).toBeNull();
        });
    });

    describe('Integration scenarios', () => {
        it('should handle multiple addresses independently', () => {
            const addr1 = 'dytallix1alice';
            const addr2 = 'dytallix1bob';

            creditDemo(addr1, 'DGT', 1000000);
            creditDemo(addr2, 'DGT', 2000000);
            creditDemo(addr1, 'DRT', 500000);

            expect(getDemoBalances(addr1)).toEqual({ udgt: 1000000, udrt: 500000 });
            expect(getDemoBalances(addr2)).toEqual({ udgt: 2000000, udrt: 0 });
        });

        it('should persist balances across multiple operations', () => {
            const address = 'dytallix1test';

            creditDemo(address, 'DGT', 100);
            creditDemo(address, 'DGT', 200);
            creditDemo(address, 'DRT', 300);
            creditDemo(address, 'DGT', 400);

            const balances = getDemoBalances(address);
            expect(balances).toEqual({ udgt: 700, udrt: 300 });
        });
    });
});
