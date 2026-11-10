// Liste des 19 plans : mêmes bornes que SHOTS dans moins50/scenes.py (synchro avec mix.wav).
import { A, s19 } from './shots_a.js';
import { B } from './shots_b.js';
const T = [0, 2, 5, 7, 10, 13, 16, 18, 21, 23, 26, 30, 34, 38, 42, 44, 50, 54, 58, 60];
const WARM = { 14: 0.15, 15: 0.25, 17: 1 };
const builders = [...A, ...B];
builders.push(s19);
export const SHOTS = builders.map((build, i) => ({ t0: T[i], t1: T[i + 1], build, warm: WARM[i] ?? 0 }));
