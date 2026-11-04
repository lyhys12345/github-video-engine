import type {CompiledPresentation} from './compile.js';

export const ZH_VISUAL_PROFILE = 'presentation-ui-zh-cn/1';
export type VisualLocaleProfile = typeof ZH_VISUAL_PROFILE;

export const zh = {
  illustratedNarration: '本机旁白 · 流程示意 · 未运行目标项目',
  finalStage: '最后一步进行中',
  illustrationInProgress: '演示进行中',
  capacity: '并发上限',
  illustrativeCapacity: '示例并发上限',
  timing: '同时运行的任务数 · 时序为示意',
  paused: '演示在此暂停',
  settled: '所示任务均已结束',
  full: '槽位已满 · 排队任务等待',
  openSlot: (index: number) => '空闲槽位 ' + index,
  occupiedSlot: (index: number) => '槽位 ' + index,
  phase: {submitting: '正在入队', entering: '进入槽位', leaving: '离开槽位', shifting: '等待中'},
  running: '运行中',
  fulfilled: '正常结束',
  rejected: '异常结束',
  waiting: '等待中',
} as const;

export const ZH_TASK_LABEL_SIZE = 26;
export const ZH_TASK_STATE_SIZE = 22;
export const ZH_CARD_HEIGHT = 54;
export const ZH_TITLE_SIZE = 48;

type TextSlot = {field: string; text: string; size: number; width: number; weight: number; authored: boolean};

export function zhTextSlots(plan: CompiledPresentation): TextSlot[] {
  const slot = (field: string, text: string, size: number, width: number, weight: number, authored = true): TextSlot =>
    ({field, text, size, width, weight, authored});
  const titles = plan.beats.map(beat => slot('beat ' + beat.id + ' title', beat.title, ZH_TITLE_SIZE, 612, 800));
  const header = slot('illustration notice', zh.illustratedNarration, 25, 612, 700, false);
  if (plan.moduleId === 'concurrency-queue/1') {
    const queue = (field: string, value: string, count: string) => slot(field, value + ' · ' + count, 22, 180, 700);
    return [header, ...titles,
      queue('waiting column', plan.labels.waiting, '8'), queue('running column', plan.labels.slots, '4/4'),
      queue('results column', plan.labels.results, '8'),
      ...plan.tasks.map(task => slot('task ' + task.id + ' label', task.label, ZH_TASK_LABEL_SIZE, 158, 700)),
      ...[zh.finalStage, zh.illustrationInProgress].map(value => slot('queue interim heading', value, ZH_TITLE_SIZE, 612, 800, false)),
      ...[zh.capacity, zh.illustrativeCapacity].map(value => slot('queue capacity', value + ' · 4', 28, 612, 700, false)),
      slot('queue timing', zh.timing, 22, 612, 400, false),
      ...[zh.paused, zh.settled, zh.full].map(value => slot('queue note', value, 24, 612, 700, false)),
      ...[zh.openSlot(4), zh.occupiedSlot(4)].map(value => slot('queue slot', value, 22, 164, 400, false)),
      ...[...Object.values(zh.phase), zh.running + ' ···', zh.fulfilled, zh.rejected, zh.waiting]
        .map(value => slot('queue task state', value, ZH_TASK_STATE_SIZE, 158, 400, false)),
    ];
  }
  const roles: Record<string, [number, number, number]> = plan.moduleId === 'http-exchange/1'
    ? {request: [25, 548, 400], listener: [34, 450, 700], handler: [27, 512, 700], response: [27, 230, 700]}
    : {input: [25, 325, 400], cutout: [24, 220, 400], mask: [24, 220, 400]};
  return [header, ...titles, ...Object.entries(roles).map(([role, [size, width, weight]]) =>
    slot(role + ' label', plan.labels[role]!, size, width, weight))];
}
