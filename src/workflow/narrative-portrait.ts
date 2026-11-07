import {CAPTION_FONT_SIZE} from '../presentation/caption-layout-style.js';
import {fontMetrics,layoutCaptions} from '../presentation/caption-layout.js';

export const PORTRAIT_STYLE = 'audience-portrait/1.0';
export const PORTRAIT_DISCLOSURE = '源码示意｜未运行目标项目';
export const PORTRAIT_SOURCE = {
  x:36,y:52,width:648,height:1152,completeFrame:false,
  // Preserve the diagram region of the existing audience source viewport.
  maskedTopEnd:282,maskedBottomStart:1070,maskedBottomEnd:1204,
} as const;

export const PORTRAIT_CAPTION = {
  x:32,y:1120,width:656,height:160,fontSize:34,lineHeight:42,maxLines:3,
  background:'0x0B1320',textColor:'0xFFF9EC',
} as const;

export function portraitCaptionLines(font:Buffer,transcripts:readonly string[]) {
  return layoutCaptions(font,transcripts,PORTRAIT_CAPTION).map((positions,i) => {
    const lines=positions.map(({startChar,endChar}) => transcripts[i]!.slice(startChar,endChar));
    const firstTextY=PORTRAIT_CAPTION.y+Math.floor((PORTRAIT_CAPTION.height-lines.length*PORTRAIT_CAPTION.lineHeight)/2);
    return {lines,lineYs:lines.map((_,j) => firstTextY+j*PORTRAIT_CAPTION.lineHeight)};
  });
}

export function portraitSceneText(font:Buffer,title:string,explanation?:string,boundary?:string) {
  const advance=fontMetrics(font);
  const line=(text:string,y:number,size:number,color:string,weight:number=0) => {
    const widthAtBase=[...text].reduce((sum,char) => sum+advance(char.codePointAt(0)!),0);
    const fontSize=Math.min(size,Math.floor(600*CAPTION_FONT_SIZE/widthAtBase));
    return {text,x:48,y,fontSize,color,weight};
  };
  return [
    line(PORTRAIT_DISCLOSURE,43,23,'0xFFCA75',1),
    line(title,100,46,'0xFFF9EC',1),
    ...(explanation?[line(explanation,170,33,'0xE8F0F8')]:[]),
    ...(boundary?[line(boundary,220,28,'0xB9CBDD')]:[]),
  ];
}
