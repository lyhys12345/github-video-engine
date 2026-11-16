/**
 * Focused unit tests for the real guide form controller.
 * Run: node --test tools/guide.test.mjs
 *
 * These use a minimal DOM stub, not a browser. They verify form state,
 * stale-output invalidation, copy-button disabling, validation and translated
 * output, and the real draft capture/restore helpers across languages.
 * They do NOT verify the clipboard, browser focus/tab behavior, native form
 * events, history/BFCache or the full language-switch render.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {bindGuideTools} from '../dist/assets/guide.js';
import {captureGuideDraft, restoreGuideDraft} from '../dist/assets/guide-draft.js';

const translations = {
  en: (en) => en,
  zh: (_en, zh) => zh,
};

function fixture(locale = 'en') {
  const listeners = new Map();
  let activeElement = null;
  function element(value = '') {
    const attributes = new Map();
    return {
      value, textContent: '', dataset: {}, disabled: false,
      setAttribute(name, value) { attributes.set(name, String(value)); },
      getAttribute(name) { return attributes.get(name) ?? null; },
      hasAttribute(name) { return attributes.has(name); },
      removeAttribute(name) { attributes.delete(name); },
      focus() { activeElement = this; },
    };
  }
  const form = element();
  form.dataset.state = 'example';
  form.submitCount = 0;
  form.addEventListener = (type, callback) => {
    const current = listeners.get(type) ?? [];
    current.push(callback);
    listeners.set(type, current);
  };
  // Events are deliberately dispatched at the form; this does not pretend
  // to implement browser bubbling or native HTML validation.
  form.dispatch = (type, target = form) => {
    if (type === 'submit') form.submitCount++;
    const event = {type, target, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }};
    for (const callback of listeners.get(type) ?? []) callback(event);
    return event;
  };
  form.dispatchEvent = event => !form.dispatch(event.type, form).defaultPrevented;
  form.requestSubmit = () => form.dispatch('submit');
  const elements = {
    'prompt-builder': form,
    'brief-repo': element('https://github.com/owner/first-project'),
    'brief-platform': element('tiktok'),
    'brief-duration': element('agent'),
    'brief-style': element('result'),
    'builder-status': element(),
    'starter-prompt': element(),
  };
  const copy = element();
  elements['builder-status'].textContent = translations[locale]('Example prompt. Replace OWNER/REPO.', '示例提示词。请替换 OWNER/REPO。');
  elements['starter-prompt'].textContent = translations[locale]('Example: https://github.com/OWNER/REPO', '示例：https://github.com/OWNER/REPO');
  const document = {
    getElementById: id => elements[id] ?? null,
    querySelector: selector => selector === '[data-copy="starter-prompt"]' ? copy : null,
    get activeElement() { return activeElement; },
  };
  return {
    document, elements, form, copy,
    repo: elements['brief-repo'],
    status: elements['builder-status'],
    prompt: elements['starter-prompt'],
    bind() { bindGuideTools({t: translations[locale]}); },
    edit(id, value, event = 'input') {
      elements[id].value = value;
      form.dispatch(event, elements[id]);
    },
    submit() { return form.requestSubmit(); },
  };
}

async function withFixture(locale, callback) {
  const oldDocument = globalThis.document;
  const context = fixture(locale);
  globalThis.document = context.document;
  try {
    context.bind();
    await callback(context);
  } finally {
    if (oldDocument === undefined) delete globalThis.document;
    else globalThis.document = oldDocument;
  }
}

test('the explicitly labelled example remains available before any edits', async () => {
  await withFixture('en', ({form, copy, prompt, status}) => {
    assert.equal(form.dataset.state, 'example');
    assert.equal(copy.disabled, false);
    assert.equal(copy.getAttribute('aria-describedby'), 'builder-status');
    assert.match(prompt.textContent, /OWNER\/REPO/);
    assert.match(status.textContent, /Example/);
  });
});

test('valid input is normalized and generates a review-only prompt', async () => {
  await withFixture('en', (f) => {
    f.repo.value = '  https://github.com/example/project.git/  ';
    const event = f.submit();
    assert.equal(event.defaultPrevented, true);
    assert.equal(f.form.dataset.state, 'ready');
    assert.equal(f.copy.disabled, false);
    assert.match(f.prompt.textContent, /https:\/\/github\.com\/example\/project\./);
    assert.doesNotMatch(f.prompt.textContent, /project\.git/);
    assert.match(f.prompt.textContent, /independent script review/);
    assert.match(f.prompt.textContent, /for approval/);
    assert.match(f.prompt.textContent, /Do not generate media or execute the target repository/);
    assert.match(f.prompt.textContent, /under five minutes/);
    assert.equal(f.repo.hasAttribute('aria-invalid'), false);
  });
});

test('every editable field invalidates the old prompt and disables its copy button', async (t) => {
  const cases = [
    ['brief-repo', 'https://github.com/owner/second-project', 'input', /owner\/second-project/],
    ['brief-platform', 'xiaohongshu', 'change', /Platform: Xiaohongshu/],
    ['brief-duration', '60', 'change', /around 60 seconds/],
    ['brief-style', 'problem', 'change', /Open with a familiar problem/],
  ];
  for (const [id, value, event, expected] of cases) {
    await t.test(id, async () => {
      await withFixture('en', (f) => {
        f.submit();
        const oldPrompt = f.prompt.textContent;
        f.edit(id, value, event);
        assert.equal(f.form.dataset.state, 'dirty');
        assert.equal(f.copy.disabled, true);
        assert.notEqual(f.prompt.textContent, oldPrompt);
        assert.doesNotMatch(f.prompt.textContent, /https:\/\/github\.com\/owner\/first-project/);
        assert.match(f.status.textContent, /Prepare the prompt again/);
        f.submit();
        assert.equal(f.form.dataset.state, 'ready');
        assert.equal(f.copy.disabled, false);
        assert.match(f.prompt.textContent, expected);
      });
    });
  }
});

test('invalid repository URLs cannot leave a previously valid prompt copyable', async (t) => {
  const invalid = [
    '', 'not a URL', 'javascript:alert(1)',
    'http://github.com/owner/repo', 'https://gitlab.com/owner/repo',
    'https://github.com.evil.example/owner/repo',
    'https://user:password@github.com/owner/repo',
    'https://github.com:8443/owner/repo',
    'https://github.com/owner/repo?token=private',
    'https://github.com/owner/repo#readme',
    'https://github.com/owner',
    'https://github.com/owner/repo/blob/main/README.md',
    'https://github.com/-invalid/repo',
    'https://github.com/owner/.git',
    'https://github.com/owner/%3Cscript%3E',
  ];
  for (const input of invalid) {
    await t.test(input || '(empty)', async () => {
      await withFixture('en', (f) => {
        f.submit();
        assert.equal(f.form.dataset.state, 'ready');
        // Set directly: invalid submit itself must clear old content even if
        // an input/change event was not delivered (e.g. programmatic restore).
        f.repo.value = input;
        f.submit();
        assert.equal(f.form.dataset.state, 'invalid');
        assert.equal(f.copy.disabled, true);
        assert.equal(f.repo.getAttribute('aria-invalid'), 'true');
        assert.equal(f.document.activeElement, f.repo);
        assert.doesNotMatch(f.prompt.textContent, /https:\/\/github\.com\/owner\/first-project/);
        assert.match(f.status.textContent, /Use a repository link/);
      });
    });
  }
});

test('correcting an invalid link stays uncopyable until successful regeneration', async () => {
  await withFixture('en', (f) => {
    f.repo.value = 'invalid';
    f.submit();
    f.edit('brief-repo', 'https://github.com/new-owner/new-repo');
    assert.equal(f.repo.hasAttribute('aria-invalid'), false);
    assert.equal(f.form.dataset.state, 'dirty');
    assert.equal(f.copy.disabled, true);
    f.submit();
    assert.equal(f.form.dataset.state, 'ready');
    assert.equal(f.copy.disabled, false);
    assert.match(f.prompt.textContent, /new-owner\/new-repo/);
  });
});

test('README output requests a suitable aspect ratio rather than fixed vertical video', async () => {
  await withFixture('en', (f) => {
    f.elements['brief-platform'].value = 'readme';
    f.submit();
    assert.match(f.prompt.textContent, /Platform: GitHub README/);
    assert.match(f.prompt.textContent, /suitable video aspect ratio/);
    assert.doesNotMatch(f.prompt.textContent, /Use a vertical short-video format/);
  });
});

test('Chinese generation, dirty state and errors preserve the same safety boundaries', async () => {
  await withFixture('zh', (f) => {
    f.elements['brief-platform'].value = 'xiaohongshu';
    f.elements['brief-duration'].value = '90';
    f.submit();
    assert.equal(f.form.dataset.state, 'ready');
    assert.match(f.prompt.textContent, /平台：小红书/);
    assert.match(f.prompt.textContent, /目标约 90 秒/);
    assert.match(f.prompt.textContent, /独立 Agent 审稿/);
    assert.match(f.prompt.textContent, /不要生成媒体，也不要运行目标仓库/);
    f.edit('brief-style', 'agent', 'change');
    assert.equal(f.copy.disabled, true);
    assert.match(f.status.textContent, /需求已修改/);
    f.repo.value = 'https://github.com/only-owner';
    f.submit();
    assert.equal(f.form.dataset.state, 'invalid');
    assert.match(f.status.textContent, /请输入/);
    assert.doesNotMatch(f.prompt.textContent, /first-project/);
  });
});

test('binding outside the guide is a safe no-op', () => {
  const oldDocument = globalThis.document;
  globalThis.document = {getElementById: () => null};
  try { assert.doesNotThrow(() => bindGuideTools({t: translations.en})); }
  finally {
    if (oldDocument === undefined) delete globalThis.document;
    else globalThis.document = oldDocument;
  }
});

test('real draft helpers preserve all four states across English/Chinese changes', async (t) => {
  for (const [sourceLocale, targetLocale] of [['en', 'zh'], ['zh', 'en']]) {
    for (const state of ['example', 'dirty', 'invalid', 'ready']) {
      await t.test(`${sourceLocale} → ${targetLocale}: ${state}`, async () => {
        let draft;
        await withFixture(sourceLocale, (f) => {
          if (state === 'example') {
            // A fresh real form has an empty URL and nonempty example status.
            // Switching languages must not turn this into an invalid submit.
            f.repo.value = '';
          } else {
            f.elements['brief-platform'].value = 'xiaohongshu';
            f.elements['brief-duration'].value = '60';
            f.elements['brief-style'].value = 'problem';
            f.submit();
            if (state === 'dirty') f.edit('brief-repo', 'https://github.com/next-owner/next-project');
            if (state === 'invalid') {
              f.repo.value = 'https://github.com/incomplete';
              f.submit();
            }
          }
          assert.equal(f.form.dataset.state, state);
          draft = captureGuideDraft();
          assert.equal(draft.state, state);
          assert.deepEqual(draft.fields, {
            'brief-repo': f.repo.value,
            'brief-platform': f.elements['brief-platform'].value,
            'brief-duration': f.elements['brief-duration'].value,
            'brief-style': f.elements['brief-style'].value,
          });
          // Captured values must not remain aliases into discarded DOM nodes.
          f.repo.value = 'https://github.com/irrelevant/discarded-dom';
          assert.notEqual(draft.fields['brief-repo'], f.repo.value);
        });
        await withFixture(targetLocale, (f) => {
          restoreGuideDraft(draft, f.document);
          assert.equal(f.form.dataset.state, state);
          for (const [id, value] of Object.entries(draft.fields)) assert.equal(f.elements[id].value, value);
          assert.equal(f.form.submitCount, ['ready', 'invalid'].includes(state) ? 1 : 0);
          assert.equal(f.copy.disabled, ['dirty', 'invalid'].includes(state));
          if (state === 'example') {
            assert.equal(f.repo.hasAttribute('aria-invalid'), false);
            assert.match(f.prompt.textContent, /OWNER\/REPO/);
            assert.match(f.status.textContent, targetLocale === 'en' ? /Example/ : /示例/);
          } else if (state === 'dirty') {
            assert.equal(f.repo.hasAttribute('aria-invalid'), false);
            assert.doesNotMatch(f.prompt.textContent, /first-project|next-project/);
            assert.match(f.status.textContent, targetLocale === 'en' ? /choices changed/ : /需求已修改/);
          } else if (state === 'invalid') {
            assert.equal(f.repo.getAttribute('aria-invalid'), 'true');
            assert.equal(f.document.activeElement, f.repo);
            assert.match(f.status.textContent, targetLocale === 'en' ? /Use a repository link/ : /请输入/);
            assert.doesNotMatch(f.prompt.textContent, /first-project/);
          } else {
            assert.equal(f.repo.hasAttribute('aria-invalid'), false);
            assert.match(f.prompt.textContent, /owner\/first-project/);
            assert.match(f.prompt.textContent, targetLocale === 'en' ? /^Use github-explainer/ : /^请用 github-explainer/);
            assert.match(f.prompt.textContent, targetLocale === 'en' ? /around 60 seconds/ : /目标约 60 秒/);
            assert.match(f.prompt.textContent, targetLocale === 'en' ? /Platform: Xiaohongshu/ : /平台：小红书/);
            assert.match(f.prompt.textContent, targetLocale === 'en' ? /Open with a familiar problem/ : /从一个熟悉的问题切入/);
          }
        });
      });
    }
  }
});
