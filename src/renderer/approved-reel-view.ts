export function activeReelSegment<T extends {start:number;end:number}>(frame:number,samples:T[],beats:T[]){const sample=samples.find(s=>frame>=s.start&&frame<s.end);return{sample,beat:sample?undefined:beats.find(b=>frame>=b.start&&frame<b.end)};}

