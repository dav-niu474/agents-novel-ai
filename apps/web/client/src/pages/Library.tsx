import { Link } from 'react-router-dom';
import { useBooks } from '../api';
import { Badge, Card, CardBody, Empty, ErrorBox, Spinner, statusTone } from '../ui';

export function Library() {
  const { data, isPending, isError, error } = useBooks();

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-semibold">Novel Studio</h1>
      <p className="mb-6 mt-1 text-sm text-zinc-500">
        {data ? `工作区：${data.workspace}` : '本地工作区'}
      </p>

      {isPending && <Spinner />}
      {isError && <ErrorBox error={error} />}
      {data && data.books.length === 0 && (
        <Empty>工作区里没有书。用 NOVEL_WORKSPACE 指向包含 novel.json 的目录后重启服务。</Empty>
      )}

      <div className="grid gap-3">
        {data?.books.map((b) => (
          <Link key={b.id} to={`/books/${b.id}`} className="block">
            <Card className="transition hover:shadow-md">
              <CardBody>
                <div className="flex items-center justify-between">
                  <div className="font-medium">{b.title}</div>
                  <div className="font-mono text-xs text-zinc-400">{b.id}</div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  {b.genre.map((g) => (
                    <Badge key={g}>{g}</Badge>
                  ))}
                  <Badge tone={statusTone(b.blueprintStatus)}>蓝图 {b.blueprintStatus}</Badge>
                  <Badge tone={statusTone(b.outlineStatus)}>大纲 {b.outlineStatus}</Badge>
                  <span className="text-zinc-400">
                    {b.currentChapter}/{b.targetChapters ?? '—'} 章
                  </span>
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
