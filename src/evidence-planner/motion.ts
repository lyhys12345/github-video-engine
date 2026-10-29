/** Pure visual rate integration; rates are pedagogical units, not target execution. */
export function sampleRule(initial:number,multiplier:number,u:number){return{rate:initial*(u<.35?1:u<.65?1+(multiplier-1)/2:multiplier),distance:initial*(Math.min(u,.35)+Math.max(0,Math.min(u,.65)-.35)*(1+(multiplier-1)/2)+Math.max(0,u-.65)*multiplier)};}

export function sampleManual(initial:number,u:number){const v=Math.min(.4,Math.max(0,u-.4));return{knob:740-v*1000,rate:initial*(3-v*2.3/.4),distance:initial*(3*Math.min(u,.4)+3*v-2.3*v*v/.8+Math.max(0,u-.8)*.7)};}
