import { useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useAsset } from '../api';
import type { AssetEnvelope } from '../types';
import { Card, CardBody, CardHeader, Empty, ErrorBox, Spinner } from '../ui';
import type { UseQueryResult } from '@tanstack/react-query';

export type AssetSection = 'blueprint' | 'world' | 'characters' | 'outline';

function asRecord(x: unknown): Record<string, unknown> | null {
  return x !== null && typeof x === 'object' ? (x as Record<string, unknown>) : null;
}

function Page({
  title,
  children,
  className = '',
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <h2 className="mb-4 text-xl font-semibold">{title}</h2>
      <div className={className}>{children}</div>
    </div>
  );
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <details className="rounded border border-zinc-200" open={false}>
      <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-zinc-500">{label}</summary>
      <pre className="overflow-auto px-3 pb-3 text-xs leading-relaxed text-zinc-700">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}

/** Markdown-canonical assets carry a `.body` string → show it; else show JSON. */
function AssetBody({ data }: { data: unknown }) {
  const rec = asRecord(data);
  const body = rec && typeof rec.body === 'string' ? rec.body : null;
  if (body !== null) {
    return (
      <div className="space-y-3">
        <pre className="whitespace-pre-wrap rounded bg-zinc-50 p-3 text-sm leading-relaxed text-zinc-800">
          {body}
        </pre>
        {rec && rec.frontmatter != null && <JsonBlock label="frontmatter" value={rec.frontmatter} />}
      </div>
    );
  }
  return <JsonBlock label="data" value={data} />;
}

function EnvelopeCard({
  title,
  query,
}: {
  title: string;
  query: UseQueryResult<AssetEnvelope, Error>;
}) {
  return (
    <Card>
      <CardHeader>{title}</CardHeader>
      <CardBody>
        {query.isPending && <Spinner />}
        {query.isError && <ErrorBox error={query.error} />}
        {query.data &&
          (query.data.exists ? <AssetBody data={query.data.data} /> : <Empty>未创建</Empty>)}
      </CardBody>
    </Card>
  );
}

function BlueprintSection({ id }: { id: string }) {
  const q = useAsset(id, 'blueprint');
  return (
    <Page title="蓝图">
      <EnvelopeCard title="blueprint.md" query={q} />
    </Page>
  );
}

function WorldSection({ id }: { id: string }) {
  const worldview = useAsset(id, 'world/worldview');
  const powers = useAsset(id, 'world/powers');
  const cheat = useAsset(id, 'world/cheat-system');
  return (
    <Page title="世界三件套" className="space-y-4">
      <EnvelopeCard title="worldview" query={worldview} />
      <EnvelopeCard title="powers" query={powers} />
      <EnvelopeCard title="cheat-system" query={cheat} />
    </Page>
  );
}

function CharactersSection({ id }: { id: string }) {
  const chars = useAsset(id, 'characters');
  const rel = useAsset(id, 'relationships');
  return (
    <Page title="角色" className="space-y-4">
      <EnvelopeCard title="角色索引 + 状态" query={chars} />
      <EnvelopeCard title="关系网" query={rel} />
    </Page>
  );
}

function OutlineSection({ id }: { id: string }) {
  const summary = useAsset(id, 'outline');
  const master = useAsset(id, 'outline/master');
  const [chapter, setChapter] = useState<number | null>(null);
  const chap = useAsset(id, `outline/chapters/${chapter}`, chapter !== null);

  const stat: Record<string, unknown> = asRecord(asRecord(summary.data)?.data) ?? {};
  const chapterNumbers = Array.isArray(stat.chapterNumbers) ? (stat.chapterNumbers as number[]) : [];
  const volumeNumbers = Array.isArray(stat.volumeNumbers) ? (stat.volumeNumbers as number[]) : [];

  return (
    <Page title="三级大纲" className="space-y-4">
      <EnvelopeCard title="总纲 master" query={master} />

      <Card>
        <CardHeader>卷纲（{volumeNumbers.length}）/ 章纲（{chapterNumbers.length}）</CardHeader>
        <CardBody>
          {summary.isPending && <Spinner />}
          {summary.isError && <ErrorBox error={summary.error} />}
          {chapterNumbers.length === 0 ? (
            <Empty>还没有章纲</Empty>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {chapterNumbers.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setChapter(n)}
                  className={`rounded border px-2 py-1 text-xs ${
                    chapter === n
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-zinc-200 hover:bg-zinc-100'
                  }`}
                >
                  ch {n}
                </button>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {chapter !== null && <EnvelopeCard title={`章纲 chapter-${chapter}`} query={chap} />}
    </Page>
  );
}

export function AssetPage({ section }: { section: AssetSection }) {
  const { id = '' } = useParams();
  switch (section) {
    case 'blueprint':
      return <BlueprintSection id={id} />;
    case 'world':
      return <WorldSection id={id} />;
    case 'characters':
      return <CharactersSection id={id} />;
    case 'outline':
      return <OutlineSection id={id} />;
    default:
      return null;
  }
}
