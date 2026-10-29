/** Shared object-continuity motion: used by code extraction and image-mask extraction. */
export const unit=(n:number)=>Math.max(0,Math.min(1,n));
export function travel(u:number,from:{x:number;y:number;scale:number},to:{x:number;y:number;scale:number}){const t=unit(u),q=t*t*(3-2*t);return{x:from.x+(to.x-from.x)*q,y:from.y+(to.y-from.y)*q,scale:from.scale+(to.scale-from.scale)*q};}
export function assembly(u:number){return{shell:unit(u/.25),control:unit((u-.2)/.25),ready:unit((u-.45)/.1),play:unit((u-.5)/.5)};}
