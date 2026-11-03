
import {readFile} from 'node:fs/promises';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it} from 'vitest';
import {compileAnimation} from '../src/story-planner/animation.js';
import {audienceFrame, compileAudience} from '../src/story-planner/audience-plan.js';
import {AudienceScene} from '../src/story-planner/audience-scene.js';

const fixture = async (path: string) => JSON.parse(await readFile(path, 'utf8'));
const midpoint = ({start, end}: {start: number; end: number}) => Math.floor((start + end) / 2);

async function loadPlan(folder: string, name: string) {
  const story = await fixture('examples/' + folder + '/' + name + '-story.json');
  const animation = await fixture('examples/' + folder + '/' + name + '-animation.json');
  return {story, animation, plan: compileAudience(compileAnimation(story, animation))};
}

const render = (plan: ReturnType<typeof compileAudience>, frame: number) =>
  renderToStaticMarkup(React.createElement(AudienceScene, {plan, frame}));

it('tracks the HTTP request through the route and handler before displaying the sourced response', async () => {
  const {plan} = await loadPlan('http-story-v1', 'express');
  expect(plan).toMatchObject({kind: 'http', request: 'GET /', body: 'Hello World', port: '3000'});
  const [request, match, response] = plan.intervals;
  for (const {start, end} of plan.intervals) {
    expect(audienceFrame(plan, start).motion).not.toEqual(audienceFrame(plan, end).motion);
  }
  const before = render(plan, request!.start);
  const outgoing = render(plan, midpoint(request!));
  const matching = render(plan, midpoint(match!));
  const returning = render(plan, midpoint(response!));
  const delivered = render(plan, response!.end);
  for (const frame of [before, outgoing, matching, returning, delivered]) {
    expect(frame).toContain('示意·未执行');
    expect(frame).toContain('width="720" height="1280"');
    expect(frame).toContain('客户端');
    expect(frame).toContain('服务端');
    expect(frame).toContain('处理函数');
  }
  expect(outgoing).not.toEqual(before);
  expect(matching).toContain('匹配路径');
  const cut = plan.cuts[1]!;
  expect(cut).toBeLessThan(response!.start);
  for (const frame of [cut - 1, cut, cut + 1, response!.start - 1]) {
    expect(render(plan, frame)).toContain('data-packet="request"');
    expect(render(plan, frame)).not.toContain('data-packet="response"');
  }
  expect(render(plan, response!.start)).toContain('data-packet="response"');
  expect(render(plan, response!.start + 1)).toContain('data-packet="response"');
  expect(returning).toContain('data-packet="response"');
  expect(returning).toContain('data-client-content="waiting"');
  expect(delivered).toContain('data-client-content="response">Hello World');
  expect(delivered).not.toContain('data-packet="response"');
});

it('reuses the silhouette across input, transparent output and the mask-only output', async () => {
  const {plan} = await loadPlan('url-intake-v1', 'rembg');
  expect(plan.kind).toBe('image-outputs');
  const [, cutout, mask] = plan.intervals;
  const transparent = render(plan, cutout!.end);
  const maskOutput = render(plan, mask!.end);
  expect(transparent).toContain('data-picture="input"');
  expect(transparent).toContain('data-picture="cutout"');
  expect(transparent).toContain('fill="url(#audience-transparency)"');
  expect(maskOutput).toContain('data-picture="mask"');
  expect(maskOutput).toContain('>-om </tspan>');
  expect(maskOutput).toContain('fill="#080c0d" opacity="1"');
  expect(maskOutput).toContain('href="#audience-subject" fill="#fff" opacity="1"');
  const subject = /id="audience-subject" d="[^"]+"/;
  expect(subject.exec(transparent)?.[0]).toEqual(subject.exec(maskOutput)?.[0]);
  const cut = plan.cuts[1]!;
  for (const frame of [cut, cut + 1, mask!.start - 1, mask!.start, midpoint(mask!), mask!.end - 1]) {
    const transition = render(plan, frame);
    expect(transition).toContain('正在生成蒙版');
    expect(transition).toContain('过渡预览');
    expect(transition).not.toContain('只输出蒙版');
    expect(transition).not.toContain('白色为主体，黑色为背景');
  }
  expect(maskOutput).toContain('只输出蒙版');
  expect(maskOutput).toContain('白色为主体，黑色为背景');
  expect(audienceFrame(plan, cut - 1).motion).toEqual(audienceFrame(plan, cut).motion);
});

it('requires documented action excerpts and can adapt a second HTTP response literal', async () => {
  const {story, animation} = await loadPlan('http-story-v1', 'express');
  for (const claim of story.evidence.claims) {
    for (const citation of claim.citations) citation.quote = citation.quote.replace('Hello World', 'Second Body');
  }
  expect(compileAudience(compileAnimation(story, animation))).toMatchObject({body: 'Second Body'});
  const response = story.evidence.claims.find((claim: {id: string}) => claim.id === 'send-greeting');
  response.kind = 'inference';
  expect(() => compileAudience(compileAnimation(story, animation))).toThrow('matching source excerpts');
});

it('leaves a distinct unsupported mechanism on the existing diagnostic path', async () => {
  const story = await fixture('examples/story-planner-v1/rea.json');
  const animation = await fixture('examples/story-planner-v1/rea-animation.json');
  expect(() => compileAudience(compileAnimation(story, animation))).toThrow('Audience v1 needs a supported');
});
