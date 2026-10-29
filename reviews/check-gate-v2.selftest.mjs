import {test} from 'node:test';
import assert from 'node:assert/strict';
import {evaluateGateV2} from './check-gate-v2.mjs';
const make = () => {
  const activeRoles = ['product','reliability','evidence','content_facts','security'];
  const rules = {schemaVersion: '2.0', milestone: 'M1', activeRoles, requiredCriteria: Object.fromEntries(activeRoles.map((r) => [r, [r+'-1']]))};
  const reports = Object.fromEntries(activeRoles.map((role) => [role, {role, candidateId:'x', candidateSha256:'hash', verdict:'PASS', criteria:[{id:role+'-1',status:'PASS',evidence:['proof']}],findings:[],executed:[{command:'independent',exitCode:0,evidencePath:'proof'}],limitations:[]}]));
  return {candidate:{id:'x',milestone:'M1'},candidateHash:'hash',rules,reports};
};
test('all five roles pass',()=>assert.equal(evaluateGateV2(make()).verdict,'PASS'));
test('missing fact specialist cannot be covered by three core approvals',()=>{const x=make();delete x.reports.content_facts;assert.equal(evaluateGateV2(x).verdict,'UNVERIFIED');});
test('security FAIL blocks four PASS',()=>{const x=make();x.reports.security.verdict='FAIL';assert.equal(evaluateGateV2(x).verdict,'FAIL');});
test('major blocks even incorrectly signed PASS',()=>{const x=make();x.reports.content_facts.findings.push({id:'bad',severity:'major'});assert.equal(evaluateGateV2(x).verdict,'FAIL');});
test('unknown, duplicated or missing core role invalidates policy',()=>{for(const roles of [['product','reliability'],['product','reliability','evidence','evidence'],['product','reliability','evidence','unknown']]){const x=make();x.rules.activeRoles=roles;assert.equal(evaluateGateV2(x).verdict,'UNVERIFIED');}});
test('changed file, stale report or missing evidence cannot pass',()=>{assert.equal(evaluateGateV2({...make(),changedFiles:['policy']}).verdict,'UNVERIFIED');const x=make();x.reports.security.candidateSha256='old';assert.equal(evaluateGateV2(x).verdict,'UNVERIFIED');assert.equal(evaluateGateV2({...make(),evidenceExists:()=>false}).verdict,'UNVERIFIED');});
test('inactive role cannot retain required criteria to bypass approval',()=>{const x=make();x.rules.activeRoles=x.rules.activeRoles.filter((r)=>r!=='security');assert.equal(evaluateGateV2(x).verdict,'UNVERIFIED');});
