export const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export const smooth=(n:number)=>{n=clamp(n);return n*n*(3-2*n)};
export function between(t:number,start:number,end:number){return smooth((t-start)/(end-start));}
export const samples=[0,90,119,120,180,239,240,300,389,390,450,539,540,600,719,720,780,870,899];
export const gameSpeed=(t:number)=>6+4*clamp((t-27)/3);
export const gameDistance=(frame:number)=>{let distance=0;for(let i=0;i<=frame;i++)distance+=gameSpeed(i/30)*1.7;return distance;};
export function mechanism(t:number){
 return {request:between(t,4,8),selection:between(t,8,11),source:between(t,11,14),returned:between(t,14,18),evidence:between(t,14,16),reasoning:between(t,24,27),phase:t<4?'question':t<8?'request':t<14?'collect':t<24?'return':'reason'};
}
export const captions=[{from:0,to:4,text:'助手想知道：游戏为什么加速？'},{from:4,to:8,text:'通过 MCP，向 REA 请求分析。'},{from:8,to:14,text:'获准页面里，选取已加载脚本并采集源码。'},{from:14,to:24,text:'结果带着来源、位置和采集限制返回。'},{from:24,to:30,text:'助手据此找规则，再继续验证。'}];
