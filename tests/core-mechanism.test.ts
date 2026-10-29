import {describe,it,expect} from 'vitest';
import {mechanism,gameSpeed,gameDistance} from '../examples/rea/core-mechanism-v1/timeline.js';
describe('core mechanism cause and movement',()=>{
 it('returns evidence only after source collection and arrival',()=>{for(const t of [0,4,8,12,14,17,18,20,24,29]){const s=mechanism(t);if(s.evidence>0){expect(s.source).toBe(1);}if(s.reasoning>0){expect(s.evidence).toBe(1);expect(s.returned).toBe(1);}}});
 it('does not animate extraction before request delivery',()=>{expect(mechanism(7.5).source).toBe(0);expect(mechanism(10).request).toBe(1);expect(mechanism(10).source).toBe(0);expect(mechanism(14).source).toBe(1);});
 it('holds game speed until the rule object arrives',()=>{expect(mechanism(26.9).reasoning).toBeLessThan(1);expect(gameSpeed(26.9)).toBe(6);expect(gameSpeed(27)).toBe(6);expect(gameSpeed(29)).toBeGreaterThan(6);});
 it('game motion uses same speed as visible readout and accelerates only at analysis',()=>{expect(gameSpeed(24)).toBe(6);expect(gameSpeed(29)).toBeGreaterThan(gameSpeed(26));for(const frame of [1,750,810,899])expect(gameDistance(frame)-gameDistance(frame-1)).toBeCloseTo(gameSpeed(frame/30)*1.7,6);});
});
