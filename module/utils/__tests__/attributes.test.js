import {describe, expect, it} from 'vitest'
import {shiftValue} from "../attributes.mjs";

describe('shiftValue tests', () => {
    describe('boundary tests should', () => {
        it('shift 0 to equal itself ', () => {
            expect(shiftValue(1, 0)).toBe(1);
        });
    });

    describe('increment', () => {
        describe('without boundaries tests should', () => {

            it('increment by 1 ', () => {
                expect(shiftValue(1, 1)).toBe(2);
            });
            it('increment negative value by 1', () => {
                expect(shiftValue(-1, 1)).toBe(0);
            });
        });

        describe('with boundaries tests should', () => {
            it('increment by 5 from 5 max 5 ', () => {
                expect(shiftValue(5, 5, -5, 5)).toBe(5);
            });

            describe('return boundary if outside boundaries', () => {
                it('min boundary if value is less than min boundary', () => {
                    expect(shiftValue(5, 10, -5, 7)).toBe(7);
                });
                it('max boundary if value is greater than max boundary', () => {
                    expect(shiftValue(-10, 5, 2, 10)).toBe(2);
                });
            });
        });

    });

    describe('decrement', () => {
        describe('without boundaries tests should', () => {
            it('decrement by 1 ', () => {
                expect(shiftValue(-1, -1)).toBe(-2);
            });
            it('decrement by 1 ', () => {
                expect(shiftValue(1, -1)).toBe(0);
            });
        });
        describe('with boundaries tests should', () => {
            it('decrement by 5 from 5 min 5 ', () => {
                expect(shiftValue(5, -5, 5, 5)).toBe(5);
            });
        });

        describe('return boundary if outside boundaries', () => {
            it('min boundary if value is less than min boundary', () => {
                expect(shiftValue(5, -10, -2, 7)).toBe(-2);
            });
            it('max boundary if value is greater than max boundary', () => {
                expect(shiftValue(15, -5, 2, 7)).toBe(7);
            });
        });

    });

});
