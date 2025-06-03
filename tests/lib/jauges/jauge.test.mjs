import {describe, expect, it} from 'vitest';

import {AbstractJauge} from '../../../module/lib/jauges/abstract-jauge.mjs';
import WoundsJauge from '../../../module/lib/jauges/wounds-jauge.mjs';
import StrainJauge from '../../../module/lib/jauges/strain-jauge.mjs';
import EncumbranceJauge from '../../../module/lib/jauges/encumbrance-jauge.mjs';
import JaugeFactory from '../../../module/lib/jauges/jauge-factory.mjs';

describe('Jauge Unit Tests', () => {
    describe('AbstractJauge', () => {
        it('should throw when instantiated directly', () => {
            expect(() => new AbstractJauge(3, 10)).toThrow(TypeError);
        });

        it('should return correct data when using create() in subclass', () => {
            const j = new WoundsJauge(3, 5);
            const data = j.create();

            expect(data).toEqual({
                extraCss: 'wounds',
                value: 3,
                max: 5,
                blocks: [
                    {cssClass: 'active'},
                    {cssClass: 'active'},
                    {cssClass: 'active'},
                    {cssClass: 'inactive'},
                    {cssClass: 'inactive'}
                ]
            });
        });
    });

    describe('WoundsJauge', () => {
        it('should set correct type and values', () => {
            const j = new WoundsJauge(2, 4);
            const d = j.create();
            expect(d.extraCss).toBe('wounds');
            expect(d.blocks.filter(b => b.cssClass === 'active')).toHaveLength(2);
        });
    });

    describe('StrainJauge', () => {
        it('should behave like other jauges', () => {
            const j = new StrainJauge(1, 3);
            const d = j.create();
            expect(d.extraCss).toBe('strain');
            expect(d.blocks.filter(b => b.cssClass === 'inactive')).toHaveLength(2);
        });
    });

    describe('EncumbranceJauge', () => {
        it('should show no active blocks if value is 0', () => {
            const j = new EncumbranceJauge(0, 4);
            const d = j.create();
            expect(d.blocks.every(b => b.cssClass === 'inactive')).toBe(true);
        });
    });

    describe('JaugeFactory', () => {
        it('should return WoundsJauge instance', () => {
            const j = JaugeFactory.build('wounds', 1, 3);
            expect(j).toBeInstanceOf(WoundsJauge);
        });

        it('should return StrainJauge instance', () => {
            const j = JaugeFactory.build('strain', 2, 5);
            expect(j).toBeInstanceOf(StrainJauge);
        });

        it('should throw on unknown type', () => {
            expect(() => JaugeFactory.build('foo', 1, 1)).toThrow();
        });
    });
});
