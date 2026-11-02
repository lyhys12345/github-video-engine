/** Keep filenames, spoken numbers and key operation terms intact, avoiding a tiny final line. */
export function wrapCaption(value:string,limit:number){
 const raw=value.match(/[A-Za-z0-9]+(?:[._/-][A-Za-z0-9]+)*|[零一二三四五六七八九十百千万两]+(?:点[零一二三四五六七八九]+)?|助手|没撞上|模型|主体|前景|背景|蒙版|./gu)??[],tokens:string[]=[];
 for(const token of raw){if(/^[，。！？；：、）】”’.,!?;:]$/u.test(token)&&tokens.length)tokens[tokens.length-1]+=token;else tokens.push(token);}
 if(tokens.some(t=>Array.from(t).length>limit))throw Error('Caption token exceeds safe line width');
 const split=(width:number)=>{const result:string[]=[];let line='';for(const token of tokens){if(line&&Array.from(line+token).length>width){result.push(line);line='';}line+=token;}if(line)result.push(line);return result;};
 const result=split(limit);
 if(result.length>1&&Array.from(result.at(-1)!).length<Math.ceil(limit*.3)){
  const balanced=split(Math.min(limit,Math.ceil(Array.from(value).length/result.length)+2));if(balanced.length===result.length)return balanced;
 }
 return result;
}
