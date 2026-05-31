import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  useAcceptWorldStep,
  useApproveWorld,
  useBuildEvents,
  useDraftWorldStep,
  useSkipWorldStep,
  useWorldBuild,
} from '../api';
import type { WorldStepKey, WorldStepState } from '../types';
import { Badge, Card, CardBody, CardHeader, Empty, ErrorBox, Spinner } from '../ui';

export function BuildWizard() {
  const { id = '' } = useParams();
  const build = useWorldBuild(id);
  const approve = useApproveWorld(id);
  const lastEvent = useBuildEvents(id);
  const [mock, setMock] = useState(true);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">建世界（worldforge）</h2>
        <label className="flex items-center gap-1.5 text-xs text-zinc-500">
          <input type="checkbox" checked={mock} onChange={(e) => setMock(e.target.checked)} />
          使用 mock LLM（不消耗 token）
        </label>
      </div>

      {lastEvent && (
        <div className="mb-3 text-xs text-zinc-500">
          活动：{lastEvent.type}
          {lastEvent.step ? ` · ${lastEvent.step}` : ''}
          {lastEvent.ok === false ? ' · 失败' : ''}
        </div>
      )}

      {build.isPending && <Spinner />}
      {build.isError && <ErrorBox error={build.error} />}

      {build.data && (
        <div className="space-y-4">
          {build.data.steps.map((s) => (
            <WorldStepCard key={s.key} bookId={id} step={s} mock={mock} />
          ))}

          <Card>
            <CardBody className="flex items-center justify-between">
              <div className="text-sm">
                {build.data.allPresent ? (
                  <span className="text-zinc-600">三件套齐备，可校验并定稿。</span>
                ) : (
                  <span className="text-zinc-400">三件套补齐后才能 approve。</span>
                )}
              </div>
              <button
                type="button"
                disabled={!build.data.allPresent || approve.isPending}
                onClick={() => approve.mutate()}
                className="rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {approve.isPending ? '校验中…' : 'approve（R2 校验）'}
              </button>
            </CardBody>
          </Card>
          {approve.isError && <ErrorBox error={approve.error} />}
          {approve.isSuccess && (
            <div className="text-sm text-green-700">✓ 已 approve，三件套 status=approved。</div>
          )}
        </div>
      )}
    </div>
  );
}

function WorldStepCard({
  bookId,
  step,
  mock,
}: {
  bookId: string;
  step: WorldStepState;
  mock: boolean;
}) {
  const draft = useDraftWorldStep(bookId);
  const accept = useAcceptWorldStep(bookId);
  const skip = useSkipWorldStep(bookId);

  const [text, setText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  async function onDraft(currentData?: unknown): Promise<void> {
    const args: { step: WorldStepKey; mock: boolean; currentData?: unknown } = {
      step: step.key,
      mock,
      ...(currentData !== undefined ? { currentData } : {}),
    };
    const result = await draft.mutateAsync(args);
    if (result.ok && result.data !== undefined) {
      setText(JSON.stringify(result.data, null, 2));
      setParseError(null);
    }
  }

  function onAccept(): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setParseError('JSON 解析失败，请检查语法。');
      return;
    }
    setParseError(null);
    accept.mutate({ step: step.key, data: parsed });
  }

  function refine(): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = undefined;
    }
    void onDraft(parsed);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <span>{step.label}（{step.key}）</span>
          <Badge tone={step.exists ? 'green' : 'zinc'}>{step.exists ? '已创建' : '未创建'}</Badge>
        </div>
      </CardHeader>
      <CardBody className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={draft.isPending}
            onClick={() => void onDraft()}
            className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-40"
          >
            {draft.isPending ? '起草中…' : 'AI 起草'}
          </button>
          <button
            type="button"
            disabled={skip.isPending}
            onClick={() => skip.mutate({ step: step.key })}
            className="rounded border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-100 disabled:opacity-40"
          >
            跳过（占位）
          </button>
        </div>

        {draft.isError && <ErrorBox error={draft.error} />}
        {draft.data && !draft.data.ok && (
          <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <div className="font-medium">草稿未通过校验：</div>
            <ul className="ml-4 list-disc">
              {(draft.data.issues ?? []).slice(0, 8).map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
            {draft.data.rawPreview && (
              <pre className="mt-1 overflow-auto text-[11px] text-amber-700">{draft.data.rawPreview}</pre>
            )}
          </div>
        )}

        {text && (
          <>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck={false}
              className="h-64 w-full rounded border border-zinc-200 bg-zinc-50 p-2 font-mono text-xs"
            />
            {parseError && <div className="text-xs text-red-600">{parseError}</div>}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={accept.isPending}
                onClick={onAccept}
                className="rounded bg-green-600 px-3 py-1.5 text-sm text-white disabled:opacity-40"
              >
                {accept.isPending ? '保存中…' : '接受并保存'}
              </button>
              <button
                type="button"
                disabled={draft.isPending}
                onClick={refine}
                className="rounded border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-100"
              >
                基于当前草稿重生成
              </button>
            </div>
            {accept.isError && <ErrorBox error={accept.error} />}
            {accept.isSuccess && <div className="text-xs text-green-700">✓ 已保存（drafting）</div>}
          </>
        )}

        {!text && !draft.data && step.exists && <Empty>已有内容，可在「世界三件套」页查看，或 AI 起草覆盖。</Empty>}
      </CardBody>
    </Card>
  );
}
