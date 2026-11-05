import {audienceFrame,type AudiencePlan} from './audience-plan.js';
export const AUDIENCE_RENDER_STATE_PROFILE='audience-render-state/1.0';
const ink='#102e31',accent='#007464',coral='#c94628';
export function audienceRenderState(plan:AudiencePlan,frame:number){
 const base=audienceFrame(plan,frame),{phase,motion}=base,[a,b,c]=motion,camera=1+0.014*(a+b+c);
 const http=plan.kind==='http'?(()=>{const returning=phase===2,responseStarted=frame>=plan.intervals[2]!.start,delivered=c>=1,requestY=485+177*a+223*b;return {requestY,returning,responseStarted,delivered,handler:b>=1,routeHighlighted:b>0,requestVisible:!responseStarted,responseVisible:responseStarted&&!delivered,responseY:887-405*c,requestPathOpacity:returning?.2:.55,clientText:delivered?plan.body:'等待响应',request:plan.request,body:plan.body,port:plan.port};})():null;
 const image=plan.kind==='image-outputs'?{setup:a,cutout:b,mask:c,maskMode:phase===2,outputOpacity:phase===0?0:1,setupVisible:phase===0,setupTranslateY:15*(1-a),pulseVisible:phase>0,pulseY:709+77*(phase===2?c:b),pulseFill:phase===2?coral:accent,background:1-b,silhouette:c}:null;
 const entities:Record<string,unknown>=http?{
  'http-request':{geometry:{x:360,y:http.requestY,width:Math.max(216,http.request.length*15+34),height:56},payload:http.request,visible:http.requestVisible,opacity:1,style:{fill:accent},origin:'illustrative-request-token'},
  'http-handler':{geometry:{x:135,y:855,width:450,height:132},payload:'处理函数',visible:true,opacity:1,style:{fill:http.handler?ink:'#cfdfd4',callLabelVisible:http.returning},origin:'registered-route-handler'},
  'http-response':{geometry:{x:360,y:http.responseY,width:Math.max(216,http.body.length*15+34),height:56},payload:http.body,visible:http.responseVisible,opacity:1,style:{fill:coral},origin:'distinct-illustrative-response-token'},
  'http-client':{geometry:{x:104,y:310,width:512,height:177},payload:http.clientText,visible:true,opacity:1,style:{fill:'#fffdf5'},origin:'illustrative-client-panel'}
 }:image?{
  'image-input':{geometry:{x:210,y:355,width:300,height:230},payload:'INPUT',visible:true,opacity:1,style:{background:1,silhouette:0},asset:'audience-subject-and-background/1',origin:'same-synthetic-input-photo'},
  'image-cutout':{geometry:{x:210,y:786,width:300,height:230},payload:'OUTPUT',visible:phase===1,opacity:image.outputOpacity,style:{background:image.background,silhouette:image.silhouette},asset:'audience-subject/1',origin:'distinct-derived-cutout-illustration'},
  'image-mask':{geometry:{x:210,y:786,width:300,height:230},payload:'OUTPUT',visible:phase===2,opacity:image.outputOpacity,style:{background:image.background,silhouette:image.silhouette},asset:'audience-subject/1',origin:'distinct-derived-mask-illustration'}
 }:{};
 return {profile:AUDIENCE_RENDER_STATE_PROFILE,frame,kind:plan.kind,phase,motion,camera,http,image,entities,annotationScope:'Scene headings/callouts may advance; entity maps assert only the explicitly named source identities. No target execution.'};
}
