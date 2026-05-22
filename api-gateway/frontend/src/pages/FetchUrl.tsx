import { useState, useRef, useEffect } from 'react';
import { api } from '../lib/api';
import { Loader2, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function FetchUrl() {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [sourceName, setSourceName] = useState('手动抓取');
  const [category, setCategory] = useState('军事');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [pollingId, setPollingId] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const startPolling = (articleId: string) => {
    setPollingId(articleId);
    setPollCount(0);
    let count = 0;

    pollRef.current = setInterval(async () => {
      count++;
      setPollCount(count);
      try {
        const res = await api.adminGetNews(articleId);
        if (res.ok) {
          const data = await res.json();
          if (data.summary !== '正在抓取全文并 AI 翻译中...') {
            // Done
            clearInterval(pollRef.current!);
            pollRef.current = null;
            setPollingId(null);
            setFetching(false);
            setResult(data);
            setSuccess('文章已抓取并入库');
          }
        }
      } catch {
        // Continue polling
      }
      if (count >= 40) {
        // Timeout after 120s
        clearInterval(pollRef.current!);
        pollRef.current = null;
        setPollingId(null);
        setFetching(false);
        setError('抓取超时，请稍后刷新新闻列表查看');
      }
    }, 3000);
  };

  const handleFetch = async () => {
    if (!url.trim()) {
      setError('请输入文章 URL');
      return;
    }
    setFetching(true);
    setError(null);
    setSuccess(null);
    setResult(null);
    setPollingId(null);
    setPollCount(0);
    try {
      const res = await api.adminFetchUrl({
        url: url.trim(),
        title: title.trim(),
        source_name: sourceName.trim() || '手动抓取',
        category: category || '军事',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'processing') {
          setSuccess(`文章已创建，正在后台抓取全文并 AI 翻译... (${Math.ceil(pollCount * 3)}秒)`);
          // Use a small timeout to let the state update before polling
          setTimeout(() => startPolling(data.id), 100);
        } else {
          setResult(data);
          setSuccess('文章已抓取并入库');
          setFetching(false);
        }
      } else {
        const body = await res.json().catch(() => null);
        setError(body?.detail || '抓取失败，请确认 URL 可访问');
        setFetching(false);
      }
    } catch {
      setError('网络错误');
      setFetching(false);
    }
  };

  // Update polling progress message
  useEffect(() => {
    if (pollingId && fetching) {
      setSuccess(`文章正在后台抓取中，预计 60-120 秒... (已等待 ${pollCount * 3}秒)`);
    }
  }, [pollCount, pollingId, fetching]);

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-[var(--color-text)] tracking-tight">抓取文章</h2>
        <p className="font-mono text-[11px] tracking-[0.2em] text-[var(--color-text-muted)] mt-1 uppercase">FETCH ARTICLE BY URL</p>
      </div>

      {error && (
        <div className="border border-[var(--color-danger)]/30 px-4 py-3 mb-6 text-[var(--color-danger)] text-[13px] font-mono">{error}</div>
      )}
      {success && (
        <div className={`border px-4 py-3 mb-6 text-[13px] font-mono ${result ? 'border-green-500/30 text-green-400' : 'border-[var(--color-accent)]/30 text-[var(--color-accent)]'}`}>{success}</div>
      )}

      <div className="glass-card p-6 mb-6">
        <h3 className="text-[15px] font-semibold text-[var(--color-text)] mb-4">文章 URL</h3>
        <div className="flex gap-3 mb-4">
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            className="flex-1 px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] text-[13px] font-mono focus:outline-none focus:border-[var(--color-accent)]"
            placeholder="https://breakingdefense.com/2026/05/..."
            onKeyDown={e => e.key === 'Enter' && handleFetch()}
            disabled={fetching}
          />
          <button
            onClick={handleFetch}
            disabled={fetching}
            className="px-5 py-2 text-[12px] font-mono tracking-wider cursor-pointer bg-white text-black border border-white transition-opacity hover:opacity-85 disabled:opacity-50 flex items-center gap-2"
          >
            {fetching ? (
              <><Loader2 size={14} className="animate-spin" /> 抓取中...</>
            ) : (
              <><Search size={14} /> 抓取</>
            )}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-mono text-[var(--color-text-muted)] mb-1.5">标题（可选）</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-1.5 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] text-[12px] font-mono focus:outline-none focus:border-[var(--color-accent)]"
              placeholder="AI 自动生成"
              disabled={fetching}
            />
          </div>
          <div>
            <label className="block text-[11px] font-mono text-[var(--color-text-muted)] mb-1.5">来源名称</label>
            <input
              value={sourceName}
              onChange={e => setSourceName(e.target.value)}
              className="w-full px-3 py-1.5 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] text-[12px] font-mono focus:outline-none focus:border-[var(--color-accent)]"
              disabled={fetching}
            />
          </div>
          <div>
            <label className="block text-[11px] font-mono text-[var(--color-text-muted)] mb-1.5">分类</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-1.5 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] text-[12px] font-mono focus:outline-none focus:border-[var(--color-accent)]"
              disabled={fetching}
            >
              <option value="军事">军事</option>
              <option value="新闻">新闻</option>
              <option value="论文">论文</option>
              <option value="工具">工具</option>
              <option value="其他">其他</option>
            </select>
          </div>
        </div>
      </div>

      {result && (
        <div className="glass-card p-6">
          <h3 className="text-[15px] font-semibold text-[var(--color-text)] mb-4">抓取结果</h3>
          <div className="space-y-3 text-[13px] font-mono">
            <div>
              <span className="text-[var(--color-text-muted)]">ID：</span>
              <span className="text-[var(--color-text)]">{result.id}</span>
            </div>
            <div>
              <span className="text-[var(--color-text-muted)]">标题：</span>
              <span className="text-[var(--color-text)]">{result.title}</span>
            </div>
            <div>
              <span className="text-[var(--color-text-muted)]">来源：</span>
              <span className="text-[var(--color-text)]">{result.source_name}</span>
            </div>
            <div>
              <span className="text-[var(--color-text-muted)]">摘要：</span>
              <span className="text-[var(--color-text)]">{result.summary}</span>
            </div>
            {result.source_url && (
              <div>
                <span className="text-[var(--color-text-muted)]">原文：</span>
                <a
                  href={result.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-accent)] hover:underline"
                >
                  {result.source_url}
                </a>
              </div>
            )}
            <div className="pt-2">
              <Link
                to={`/news`}
                className="text-[12px] text-[var(--color-accent)] hover:underline"
              >
                前往 AI 资讯查看 →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
