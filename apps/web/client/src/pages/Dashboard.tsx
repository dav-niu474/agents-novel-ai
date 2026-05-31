import { Link, useParams } from 'react-router-dom';
import { useStatus } from '../api';
import { Badge, Card, CardBody, CardHeader, ErrorBox, Spinner } from '../ui';

const QUICK: { sec: string; label: string }[] = [
  { sec: 'blueprint', label: '蓝图' },
  { sec: 'world', label: '世界' },
  { sec: 'characters', label: '角色' },
  { sec: 'outline', label: '大纲' },
];

export function Dashboard() {
  const { id = '' } = useParams();
  const { data: status, isPending, isError, error } = useStatus(id);

  return (
    <div className="mx-auto max-w-3xl p-6">
      {isPending && <Spinner />}
      {isError && <ErrorBox error={error} />}
      {status && (
        <>
          <div className="mb-3">
            <Badge tone="zinc">阶段：{status.stage}</Badge>
          </div>
          <h2 className="mb-1 text-xl font-semibold">{status.headline ?? status.stage}</h2>
          {status.summary && <p className="mb-3 text-sm text-zinc-600">{status.summary}</p>}
          {(status.details ?? []).length > 0 && (
            <ul className="mb-4 list-inside list-disc text-sm text-zinc-600">
              {(status.details ?? []).map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          )}

          <Card>
            <CardHeader>下一步</CardHeader>
            <CardBody className="space-y-3">
              {(status.nextSteps ?? []).length === 0 && (
                <div className="text-sm text-zinc-400">—</div>
              )}
              {(status.nextSteps ?? []).map((s, i) => (
                <div key={i} className="text-sm">
                  <div className="font-medium">{s.title}</div>
                  {s.command && (
                    <code className="mt-1 block rounded bg-zinc-100 px-2 py-1 font-mono text-xs">
                      {s.command}
                    </code>
                  )}
                  {s.skill && <div className="mt-0.5 text-xs text-zinc-400">skill: {s.skill}</div>}
                </div>
              ))}
            </CardBody>
          </Card>

          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            {QUICK.map((q) => (
              <Link
                key={q.sec}
                to={`/books/${id}/${q.sec}`}
                className="rounded border border-zinc-200 px-3 py-1.5 hover:bg-zinc-100"
              >
                {q.label}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
