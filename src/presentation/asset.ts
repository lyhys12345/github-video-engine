import {canonical, sha256} from '../core/util.js';

// One engine-authored subject reused for input, cutout and monochrome mask diagrams.
export const PAPER_BIRD = {
  id: 'paper-bird/1', mediaType: 'application/json', viewport: [360, 200],
  creation: 'Engine-authored geometric SVG path data. No photographed or observed target output.',
  subject: [
    {fill: '#155e75', d: 'M37 154 139 103C157 51 205 26 256 54L286 79 325 89 279 110C269 151 224 178 172 170L90 185Z'},
    {fill: '#e36b4f', d: 'M146 128C174 91 214 93 264 109 244 154 206 164 172 157Z'},
    {fill: '#f1b05c', d: 'M277 78 325 89 278 109Z'},
    {fill: '#fff5d9', d: 'M260 69a11 11 0 1 1-22 0 11 11 0 0 1 22 0'},
    {fill: '#143646', d: 'M253 69a5 5 0 1 1-10 0 5 5 0 0 1 10 0'},
  ],
} as const;
export const PAPER_BIRD_SHA256 = sha256(canonical(PAPER_BIRD));
