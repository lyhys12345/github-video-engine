import {z} from 'zod';
import {Id} from './video.js';

const reference = z.strictObject({claimId: Id, citationIndex: z.number().int().min(0).max(7)});
const assumption = z.number().int().min(0).max(19);
const capacityValue = z.number().int().min(1).max(4);
export const QueueModule = z.strictObject({
  id: z.literal('concurrency-queue/1'),
  unit: z.literal('in-flight-tasks'),
  entities: z.strictObject({waiting: Id, slots: Id, results: Id}),
  taskIds: z.array(Id).min(2).max(8),
  mechanismId: Id,
  capacity: z.discriminatedUnion('basis', [
    z.strictObject({value: capacityValue, evidence: reference, basis: z.literal('documented')}),
    z.strictObject({value: capacityValue, evidence: reference, basis: z.literal('illustrative'), assumptionIndex: assumption}),
  ]),
  rules: z.strictObject({
    admitUnderCapacity: reference,
    releaseOnFulfilledOrRejected: reference,
    waitingFunctionNotCalled: reference,
  }),
  scenario: z.strictObject({
    basis: z.literal('illustrative'),
    taskAndOrderAssumptionIndex: assumption,
    timingAssumptionIndex: assumption,
    outcomeAssumptionIndex: assumption,
    ending: z.enum(['all-completed', 'paused']),
  }),
});

const event = {
  atFrame: z.number().int().min(0).max(7199),
  motionFrames: z.number().int().min(6).max(72),
  claimIds: z.array(Id).min(1).max(20),
  mechanismId: Id,
};
export const QueueEvent = z.discriminatedUnion('kind', [
  z.strictObject({...event, kind: z.literal('enqueue'), taskIds: z.array(Id).min(1).max(8)}),
  z.strictObject({...event, kind: z.literal('start'), taskId: Id, slotId: z.number().int().min(0).max(3)}),
  z.strictObject({...event, kind: z.literal('settle'), taskId: Id, outcome: z.enum(['fulfilled', 'rejected'])}),
]);
export type QueueEvent = z.infer<typeof QueueEvent>;
