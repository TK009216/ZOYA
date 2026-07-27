import React, { useMemo, useState } from 'react';
import type { MediaViewerProps } from './types';

const THEME: Record<string, string> = {
  '--code-bg': 'var(--bg-2, #1e1e2e)', '--code-text': 'var(--text-primary, #cdd6f4)',
  '--code-keyword': '#c678dd', '--code-string': '#98c379', '--code-number': '#d19a66',
  '--code-function': '#61afef', '--code-comment': '#5c6370', '--code-type': '#e5c07b',
  '--code-operator': '#abb2bf', '--code-builtin': '#56b6c2',
};

const LANG_ALIASES: Record<string, string> = {
  js: 'javascript', ts: 'typescript', jsx: 'javascript', tsx: 'typescript',
  py: 'python', rb: 'ruby', sh: 'bash', yml: 'yaml', md: 'markdown',
};

const CodeViewer: React.FC<MediaViewerProps> = ({ source }) => {
  const lang = LANG_ALIASES[source.language ?? ''] ?? source.language ?? '';
  const lines = useMemo(() => (source.content ?? '').split('\n'), [source.content]);
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return lines.map((l, i) => ({ line: i + 1, text: l, highlight: false }));
    return lines.map((l, i) => ({ line: i + 1, text: l, highlight: l.toLowerCase().includes(search.toLowerCase()) }));
  }, [lines, search]);

  const handleCopy = () => {
    navigator.clipboard.writeText(source.content ?? '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-base)', maxWidth: '90vw' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--bg-3)', fontSize: 12, color: 'var(--text-secondary)' }}>
        <span style={{ fontWeight: 600 }}>{lang || 'text'}</span>
        <span style={{ flex: 1 }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder='Search...'
          style={{ padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border-base)', background: 'var(--bg-1)', color: 'var(--text-primary)', fontSize: 12, width: 120 }}
        />
        <button onClick={handleCopy} style={copyBtn}>{copied ? '✅' : '📋'}</button>
      </div>
      <div style={{ overflow: 'auto', maxHeight: '60vh', display: 'flex' }}>
        <div style={{ padding: '8px 0', minWidth: 40, textAlign: 'right', color: 'var(--text-disabled)', fontSize: 12, lineHeight: 1.6, userSelect: 'none', borderRight: '1px solid var(--border-light)', marginRight: 8 }}>
          {filtered.map((l) => <div key={l.line} style={{ paddingRight: 8 }}>{l.line}</div>)}
        </div>
        <pre style={{ margin: 0, padding: '8px 0', fontSize: 13, lineHeight: 1.6, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", color: 'var(--code-text, var(--text-primary))', whiteSpace: 'pre', overflow: 'auto' }}>
          <code>{source.content}</code>
        </pre>
      </div>
    </div>
  );
};

const copyBtn: React.CSSProperties = {
  padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border-base)',
  background: 'var(--bg-2)', cursor: 'pointer', fontSize: 12, lineHeight: 1,
};

export default CodeViewer;
