/** Pure reusable motion recipes. Units and object meanings come from ExplanationPlan data. */
export const key=(at:number,x:number,y:number,opacity=1,scale=1)=>({at,x,y,opacity,scale});
export function handoffTrack(duration:number,start:number,end:number,points:readonly {x:number;y:number}[]){
 if(points.length<2||start<=0||end<=start||end>=duration)throw Error('Invalid handoff recipe');
 const first=points[0]!,last=points.at(-1)!;
 return [key(0,first.x,first.y,0),key(start-.1,first.x,first.y,0),...points.map((p,i)=>key(start+(end-start)*i/(points.length-1),p.x,p.y)),key(end+.3,last.x,last.y,0),key(duration,last.x,last.y,0)];
}
export function separationTrack(duration:number,start:number,end:number,x:number,y:number,scale=1){
 if(start<=0||end<=start||end>=duration)throw Error('Invalid separation recipe');
 return [key(0,x,y,1,scale),key(start,x,y,1,scale),key(end,x,y,0,scale),key(duration,x,y,0,scale)];
}
export function crossingTrack(duration:number,start:number,periods:readonly number[],from:number,to:number,y:number){
 const result=[key(0,from,y,0),key(start-.01,from,y,0),key(start,from,y)];let at=start;
 for(const period of periods){if(period<=.05)throw Error('Crossing period too short');at+=period;result.push(key(at,to,y));if(at+.03<duration)result.push(key(at+.01,from,y,0),key(at+.02,from,y));at+=.02;}
 if(at>=duration)throw Error('Crossing recipe exceeds duration');result.push(key(duration,from,y));return result;
}
