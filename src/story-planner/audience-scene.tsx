
import React from 'react';
import {audienceFrame, type AudiencePlan} from './audience-plan.js';

const ink = '#102e31';
const muted = '#416267';
const accent = '#007464';
const coral = '#c94628';
const paper = '#f8f5ea';
const mono = 'Consolas, monospace';

function Packet({y, text, response = false}: {y: number; text: string; response?: boolean}) {
  const color = response ? coral : accent;
  const width = Math.max(216, text.length * 15 + 34);
  return <g data-packet={response ? 'response' : 'request'} transform={'translate(360 ' + y + ')'}>
    <rect x={-width / 2} y="-28" width={width} height="56" rx="28" fill={color} stroke={paper} strokeWidth="4"/>
    <text y="8" textAnchor="middle" fill="#fff" fontFamily={mono} fontWeight="bold" fontSize="24">{text}</text>
  </g>;
}

function HttpExchange({plan, frame, phase, motion}: {plan: Extract<AudiencePlan, {kind: 'http'}>; frame: number} & ReturnType<typeof audienceFrame>) {
  const [request, route, response] = motion;
  const returning = phase === 2;
  const responseStarted = frame >= plan.intervals[2]!.start;
  const delivered = response >= 1;
  const requestY = 485 + 177 * request + 223 * route;
  const handler = route >= 1;
  return <g data-scene="http">
    <path d="M360 480 V887" stroke="#adc2b8" strokeWidth="5" strokeDasharray="7 13"/>
    <path d={'M360 480 V' + requestY} stroke={accent} strokeWidth="5" opacity={returning ? 0.2 : 0.55}/>
    <rect x="104" y="310" width="512" height="177" rx="28" fill="#fffdf5" stroke={ink} strokeWidth="3"/>
    <path d="M104 379H616" stroke="#c5d4ca" strokeWidth="2"/>
    <circle cx="135" cy="345" r="7" fill={coral}/>
    <circle cx="160" cy="345" r="7" fill="#d09b42"/>
    <circle cx="185" cy="345" r="7" fill={accent}/>
    <text x="212" y="354" fontSize="25" fill={ink}>客户端</text>
    <text x="133" y="446" fontSize={delivered ? Math.min(47, 680 / plan.body.length) : 26} fontWeight={delivered ? 750 : 400} fill={delivered ? coral : muted}
      data-client-content={delivered ? 'response' : 'waiting'}>{delivered ? plan.body : '等待响应'}</text>

    <rect x="104" y="677" width="512" height="347" rx="28" fill="#e4ede3" stroke={ink} strokeWidth="3"/>
    <text x="135" y="731" fontSize="28" fontWeight="700" fill={ink}>服务端</text>
    <text x="585" y="729" fontSize="25" textAnchor="end" fill={muted} fontFamily={mono}>:{plan.port}</text>
    <path d="M360 754V850" stroke="#87aca1" strokeWidth="4" strokeDasharray="6 10"/>
    <rect x="135" y="764" width="450" height="76" rx="12" fill={route > 0 ? '#bfe9d7' : '#f6f8ee'} stroke={route > 0 ? accent : '#9fb6aa'} strokeWidth="2"/>
    <text x="155" y="811" fontFamily={mono} fontSize={Math.min(27, 500 / plan.request.length)} fill={ink}>{plan.request}</text>
    <text x="565" y="811" textAnchor="end" fontSize="24" fill={route > 0 ? accent : muted}>{route > 0 ? '匹配路径' : '路由'}</text>
    <rect x="135" y="855" width="450" height="132" rx="12" fill={handler ? ink : '#cfdfd4'}/>
    <text x="155" y="949" fontSize="24" fill={handler ? '#edf9ef' : ink}>处理函数</text>
    {returning && <text x="565" y="947" textAnchor="end" fontSize="22" fill="#ffd8c9" fontFamily={mono}>res.send(…)</text>}
    {!responseStarted && <Packet y={requestY} text={plan.request}/>}
    {responseStarted && !delivered && <>
      <path d={'M360 887V' + (887 - 405 * response)} stroke={coral} strokeWidth="5" opacity="0.65"/>
      <Packet y={887 - 405 * response} text={plan.body} response/>
    </>}
  </g>;
}

// The exact path is reused for the original foreground, transparent cutout and mask.
function IllustrationDefinitions() {
  return <defs>
    <path id="audience-subject" d="M151 67C152 48 167 32 188 33C204 34 217 45 219 61L244 68L219 79C215 91 210 99 204 104C211 116 213 130 204 143C192 159 164 165 137 159L98 183L82 178L106 152L67 167L58 160L100 129C105 107 127 94 151 90Z"/>
    <clipPath id="audience-subject-clip"><use href="#audience-subject"/></clipPath>
    <pattern id="audience-transparency" width="32" height="32" patternUnits="userSpaceOnUse">
      <rect width="32" height="32" fill="#faf8ec"/>
      <path d="M0 0H16V16H0ZM16 16H32V32H16Z" fill="#c9d2cd"/>
    </pattern>
    <g id="audience-bird-color">
      <use href="#audience-subject" fill="#18484f"/>
      <g clipPath="url(#audience-subject-clip)">
        <path d="M78 187Q108 110 161 99Q195 84 233 106V182Z" fill="#dd6d4e"/>
        <path d="M65 174Q101 105 166 102Q170 130 125 154Z" fill="#24646c"/>
        <path d="M211 62L249 59L252 82L216 83Z" fill="#f2af4b"/>
        <path d="M160 62Q173 39 195 39L202 57Z" fill="#2e7b79"/>
        <circle cx="201" cy="62" r="9" fill="#ffefd3"/>
        <circle cx="203" cy="63" r="4" fill="#102e31"/>
      </g>
    </g>
    <g id="audience-bird-background">
      <rect width="300" height="230" fill="#d9cb97"/>
      <circle cx="71" cy="64" r="43" fill="#f4df9e"/>
      <path d="M0 144Q63 112 144 159T300 133V230H0Z" fill="#82a998"/>
      <path d="M0 179Q77 139 166 185T300 171V230H0Z" fill="#478881"/>
      <path d="M0 205Q101 172 165 190T300 202V230H0Z" fill="#29645f"/>
      <path d="M35 191Q128 190 230 153M222 157L247 131" stroke="#523d33" strokeWidth="9" fill="none" strokeLinecap="round"/>
      <path d="M254 153Q276 126 287 147Q277 163 254 153ZM33 159Q13 127 1 142Q12 163 33 159Z" fill="#d6a24d"/>
    </g>
  </defs>;
}

function Picture({x, y, mode, background = 1, silhouette = 0}: {
  x: number; y: number; mode: 'input' | 'cutout' | 'mask'; background?: number; silhouette?: number;
}) {
  return <svg data-picture={mode} x={x} y={y} width="300" height="230" viewBox="0 0 300 230" overflow="hidden">
    <rect width="300" height="230" fill="url(#audience-transparency)"/>
    <use href="#audience-bird-background" opacity={background}/>
    <rect width="300" height="230" fill="#080c0d" opacity={silhouette}/>
    <use href="#audience-bird-color" opacity={1 - silhouette}/>
    <use href="#audience-subject" fill="#fff" opacity={silhouette}/>
  </svg>;
}

function ImageOutputs({phase, motion}: ReturnType<typeof audienceFrame>) {
  const [setup, cutout, mask] = motion;
  const maskMode = phase === 2;
  const outputOpacity = phase === 0 ? 0 : 1;
  return <g data-scene="image-outputs">
    <IllustrationDefinitions/>
    <path d="M360 574V797" stroke="#adc2b8" strokeWidth="5" strokeDasharray="7 13"/>
    <Picture x={210} y={355} mode="input"/>
    <text x="210" y="335" fill={ink} fontSize="27" fontFamily={mono}>INPUT</text>
    <rect x="107" y="624" width="506" height="82" rx="20" fill={ink}/>
    <text x="360" y="675" textAnchor="middle" fill="#fffdf5" fontFamily={mono} fontSize="26">
      {phase === 0 ? 'rembg i' : 'rembg i '}{maskMode && <tspan fill="#ffc28e" fontWeight="bold">-om </tspan>}
      {phase > 0 && 'INPUT OUTPUT'}
    </text>
    <g opacity={outputOpacity}>
      <Picture x={210} y={786} mode={maskMode ? 'mask' : 'cutout'} background={1 - cutout} silhouette={mask}/>
      <text x="210" y="762" fill={ink} fontSize="27" fontFamily={mono}>OUTPUT</text>
      <text x="510" y="762" textAnchor="end" fill={muted} fontSize="25">{maskMode ? (mask < 1 ? '过渡预览' : '蒙版') : (cutout < 1 ? '处理中' : '透明背景')}</text>
    </g>
    {phase === 0 && <g opacity={setup} transform={'translate(0 ' + (15 * (1 - setup)) + ')'}>
      <text x="360" y="860" textAnchor="middle" fill={muted} fontSize="31">同一张原图</text>
      <text x="360" y="921" textAnchor="middle" fill={ink} fontSize="39" fontWeight="700">两种输出</text>
    </g>}
    {phase > 0 && <circle cx="360" cy={709 + 77 * (maskMode ? mask : cutout)} r="10" fill={maskMode ? coral : accent} stroke={paper} strokeWidth="4"/>}
  </g>;
}

const titles = {
  http: ['请求发往服务端', '匹配请求路径', '响应回到客户端'],
  'image-outputs': ['从同一张图出发', '保留主体', '只输出蒙版'],
};

export function AudienceScene({plan, frame}: {plan: AudiencePlan; frame: number}) {
  const state = audienceFrame(plan, frame);
  const camera = 1 + 0.014 * state.motion.reduce((sum, progress) => sum + progress, 0);
  const maskTransition = plan.kind === 'image-outputs' && state.phase === 2 && state.motion[2] < 1;
  return <svg width="720" height="1280" viewBox="0 0 720 1280" aria-label="示意·未执行">
    <rect width="720" height="1280" fill={paper}/>
    <path d="M0 270H720M0 1085H720" stroke="#cbd6cc" strokeWidth="2"/>
    <text x="56" y="92" fontSize="28" fontWeight="700" fill={accent}>{plan.kind === 'http' ? 'HTTP 请求与响应' : '原图、抠图与蒙版'}</text>
    <rect x="494" y="55" width="172" height="53" rx="26.5" fill="#fce6d8" stroke="#e4a58b"/>
    <text x="580" y="89" textAnchor="middle" fontSize="24" fontWeight="700" fill="#7f311d">示意·未执行</text>
    <text x="56" y="200" fontSize="56" fontWeight="750" fill={ink}>{maskTransition ? '正在生成蒙版' : titles[plan.kind][state.phase]}</text>
    <g data-camera={camera} transform={'translate(360 665) scale(' + camera + ') translate(-360 -665)'}>
      {plan.kind === 'http' ? <HttpExchange plan={plan} frame={frame} {...state}/> : <ImageOutputs {...state}/>}
    </g>
    <g transform="translate(56 1127)">
      {[0, 1, 2].map(index => <rect key={index} x={index * 206} width="196" height="8" rx="4" fill={index <= state.phase ? accent : '#ced8cc'}/>)}
    </g>
    <text x="56" y="1201" fontSize="26" fill={muted}>
      {maskTransition ? '彩色为过渡预览' : (plan.kind === 'http' ? ['客户端 → 服务端', '路径 → 处理函数', '处理函数 → 客户端'] :
        ['一个输入文件', '棋盘格表示透明区域', '白色为主体，黑色为背景'])[state.phase]}
    </text>
  </svg>;
}
