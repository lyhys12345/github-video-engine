export function checkGateV2(candidatePath: string, rulesPath: string, repo?: string): {
  milestone: string; candidateId: string; activeRoles: string[]; verdict: 'PASS'|'FAIL'|'UNVERIFIED';
  blocking: string[]; unverified: string[]; judges: Record<string,string>; humanFinalAcceptance: string;
};
export function evaluateGateV2(options: unknown): ReturnType<typeof checkGateV2>;
