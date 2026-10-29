import {command} from '../../src/core/process.js';
import {EngineError,checkAbort} from '../../src/core/errors.js';
export async function normalizeSilent(input:string,output:string,expected:{frames:number;fps:number},signal:AbortSignal){
 checkAbort(signal);const ffmpeg=process.env.GVE_FFMPEG||'ffmpeg',ffprobe=process.env.GVE_FFPROBE||'ffprobe';
 const raw=JSON.parse(await command(ffprobe,['-v','error','-show_streams','-show_format','-of','json',input],{signal,timeout:30000}));
 const videos=raw.streams.filter((s:any)=>s.codec_type==='video');if(videos.length!==1||raw.streams.length!==1||videos[0].codec_name!=='h264')throw new EngineError('FINAL_RAW_MEDIA','Full renderer must produce one silent H264 stream');
 const full=videos[0].color_range==='pc'||String(videos[0].pix_fmt).startsWith('yuvj');
 await command(ffmpeg,['-v','error','-nostdin','-n','-i',input,'-map','0:v:0','-an','-vf',full?'scale=in_range=pc:out_range=tv,format=yuv420p':'format=yuv420p','-c:v','libx264','-crf','18','-preset','veryfast','-pix_fmt','yuv420p','-color_range','tv','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-movflags','+faststart',output],{signal,timeout:240000});
 const probe=JSON.parse(await command(ffprobe,['-v','error','-count_frames','-show_streams','-show_format','-of','json',output],{signal,timeout:90000})),v=probe.streams[0],[n,d]=String(v?.avg_frame_rate).split('/').map(Number);
 if(probe.streams.length!==1||v.codec_name!=='h264'||v.pix_fmt!=='yuv420p'||v.color_range!=='tv'||v.width!==1080||v.height!==1920||Math.abs(n!/d!-expected.fps)>.001||Number(v.nb_read_frames)!==expected.frames||Math.abs(Number(probe.format.duration)-expected.frames/expected.fps)>.06)throw new EngineError('FINAL_MEDIA','Normalized full silent media failed exact technical properties');
 await command(ffmpeg,['-v','error','-xerror','-i',output,'-map','0:v:0','-f','null','-'],{signal,timeout:90000});return{inputPixelFormat:videos[0].pix_fmt,inputRange:videos[0].color_range??'unspecified',convertedFullRange:full,probe};
}
