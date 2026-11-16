import {mkdir,writeFile} from 'node:fs/promises';
import {createContent} from '../dist/assets/content.js';
import {prepareMedia} from './prepare-media.mjs';

await prepareMedia();

const origin='https://github-video-engine-studio.luyuhao123qq.chatgpt.site';
const titles={home:['GitHub Video Engine — Give your code an audience','GitHub Video Engine — 让好项目被看见'],showcase:['Showcase — GitHub Video Engine','作品库 — GitHub Video Engine'],guide:['Get started — GitHub Video Engine','使用指南 — GitHub Video Engine']};
const descriptions={home:['Turn a GitHub repository into a video people want to watch. Research, script review and editable output, in your local Codex workspace.','把 GitHub 仓库变成让人愿意看的视频。在本地 Codex 中研究项目、审核脚本，保留可编辑的作品。'],showcase:['Five real project films. Watch ArtCraft, VoiceStudio, OpenMAIC and more, with source links and footage notes.','五条真实项目短片。观看 ArtCraft、VoiceStudio、OpenMAIC 等作品，了解来源与素材说明。'],guide:['Start with a GitHub link in Codex. Check your setup, prepare a prompt, review the script and export an editable video project.','从 GitHub 链接开始：在 Codex 中检查环境、准备需求、审核脚本，最后导出可编辑的视频项目。']};
const esc=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
for(const page of ['home','showcase','guide'])for(const lang of ['en','zh']){
 const i=lang==='zh'?1:0;
 const path=page==='home'?'/':`/${page}/`;
 const localized=(lang==='zh'?'/zh':'')+path;
 const directory=`dist${localized}`;
 const body=createContent(page,lang).body();
 const fallback=lang==='en'?'This page works without JavaScript. Video links open the original files; copy setup commands manually. Interactive filters and the prompt builder require JavaScript.':'页面可在没有 JavaScript 时阅读。视频链接打开原文件，请手动复制安装命令；筛选器与提示词生成器需要 JavaScript。';
 const html=`<!doctype html>
<html lang="${lang==='zh'?'zh-CN':'en'}" class="no-js"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#fafaf9">
<title>${titles[page][i]}</title><meta name="description" content="${esc(descriptions[page][i])}">
<link rel="canonical" href="${origin}${localized}"><link rel="alternate" hreflang="en" href="${origin}${path}"><link rel="alternate" hreflang="zh-CN" href="${origin}/zh${path}"><link rel="alternate" hreflang="x-default" href="${origin}${path}">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="preload" href="/assets/fonts/manrope-latin.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="/assets/fonts/fonts.css"><link rel="stylesheet" href="/assets/site.css"><link rel="stylesheet" href="/assets/refinement.css"><link rel="stylesheet" href="/assets/quality.css">
<meta property="og:type" content="website"><meta property="og:site_name" content="GitHub Video Engine"><meta property="og:title" content="${esc(titles[page][i])}"><meta property="og:description" content="${esc(descriptions[page][i])}"><meta property="og:url" content="${origin}${localized}"><meta property="og:locale" content="${lang==='zh'?'zh_CN':'en_US'}"><meta property="og:image" content="${origin}/assets/${lang==='zh'?'social-preview-zh':'social-preview'}.jpg"><meta property="og:image:alt" content="${lang==='zh'?'GitHub Video Engine 与真实 ArtCraft 视频示例':'GitHub Video Engine and a real ArtCraft video example'}"><meta property="og:image:width" content="1160"><meta property="og:image:height" content="608"><meta name="twitter:card" content="summary_large_image">
<script type="module" src="/assets/site.js"></script></head><body data-page="${page}"><div id="app">${body}</div><noscript><p class="noscript-note container">${fallback}</p></noscript></body></html>\n`;
 await mkdir(directory,{recursive:true});await writeFile(`${directory}index.html`,html);
 console.log(`Built ${localized} (${Buffer.byteLength(html)} bytes)`);
}
