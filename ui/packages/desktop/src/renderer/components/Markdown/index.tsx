/**
 * @license
 * Copyright 2025 ZOYA (zoya.local)
 * SPDX-License-Identifier: Apache-2.0
 */

import ReactMarkdown from 'react-markdown';

import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

// Import KaTeX CSS to make it available in the document
import 'katex/dist/katex.min.css';

import { openExternalUrl } from '@/renderer/utils/platform';
import classNames from 'classnames';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { LinkPreview } from '@renderer/components/links/LinkPreview';
import { addLinkToHistory } from '@renderer/components/links/LinkHistory';
import { useTranslation } from 'react-i18next';
import { convertLatexDelimiters } from '@renderer/utils/chat/latexDelimiters';
import LocalImageView from '@renderer/components/media/LocalImageView';
import CodeBlock from './CodeBlock';
import ShadowView from './ShadowView';

const REMARK_PLUGINS = [remarkGfm, remarkMath, remarkBreaks];

const isLocalFilePath = (src: string): boolean => {
  if (src.startsWith('http://') || src.startsWith('https://')) return false;
  if (src.startsWith('data:')) return false;
  return true;
};

type MarkdownViewProps = {
  children: string;
  hiddenCodeCopyButton?: boolean;
  codeStyle?: React.CSSProperties;
  className?: string;
  onRef?: (el?: HTMLDivElement | null) => void;
  /** Enable raw HTML rendering in markdown content. Use with caution — only for trusted sources. */
  allowHtml?: boolean;
};

const MarkdownView: React.FC<MarkdownViewProps> = React.memo(
  ({ hiddenCodeCopyButton, codeStyle, className, onRef, allowHtml, children: childrenProp }) => {
    const { t } = useTranslation();

    const normalizedChildren = useMemo(() => {
      if (typeof childrenProp === 'string') {
        let text = childrenProp.replace(/file:\/\//g, '');
        text = convertLatexDelimiters(text);
        return text;
      }
      return childrenProp;
    }, [childrenProp]);

    const [hoveredLink, setHoveredLink] = useState<string | null>(null);
    const [hoverPos, setHoverPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const linkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleLinkClick = useCallback(
      (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const href = (e.currentTarget as HTMLAnchorElement).href;
        if (!href) return;
        addLinkToHistory(href, (e.currentTarget as HTMLAnchorElement).textContent || href);
        openExternalUrl(href).catch((error: unknown) => {
          console.error(t('messages.openLinkFailed'), error);
        });
      },
      [t]
    );

    const handleLinkMouseEnter = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      if (linkTimerRef.current) clearTimeout(linkTimerRef.current);
      const rect = (e.currentTarget as HTMLAnchorElement).getBoundingClientRect();
      setHoverPos({ x: rect.left, y: rect.bottom + 4 });
      linkTimerRef.current = setTimeout(() => setHoveredLink(href), 300);
    }, []);

    const handleLinkMouseLeave = useCallback(() => {
      if (linkTimerRef.current) clearTimeout(linkTimerRef.current);
      linkTimerRef.current = setTimeout(() => setHoveredLink(null), 500);
    }, []);

    // Memoize components so React preserves component identity across re-renders.
    // Without this, every streaming update creates new function references → React
    // unmounts/remounts all custom components → hooks & DOM state are lost.
    const components = useMemo(
      () => ({
        span: ({ node: _node, className: cn, children: ch, ...rest }: Record<string, unknown>) => (
          <span {...(rest as React.HTMLAttributes<HTMLSpanElement>)} className={cn as string}>
            {ch as React.ReactNode}
          </span>
        ),
        code: (props: Record<string, unknown>) => (
          <CodeBlock
            {...(props as Parameters<typeof CodeBlock>[0])}
            codeStyle={codeStyle}
            hiddenCodeCopyButton={hiddenCodeCopyButton}
          />
        ),
        a: ({ node: _node, ...rest }: Record<string, unknown>) => {
          const href = (rest as React.AnchorHTMLAttributes<HTMLAnchorElement>).href || '';
          return (
            <a
              {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
              target='_blank'
              rel='noreferrer'
              onClick={handleLinkClick}
              onMouseEnter={(e) => handleLinkMouseEnter(e, href)}
              onMouseLeave={handleLinkMouseLeave}
              style={{ position: 'relative', display: 'inline' }}
            />
          );
        },
        table: ({ node: _node, ...rest }: Record<string, unknown>) => (
          <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
            <table
              {...(rest as React.TableHTMLAttributes<HTMLTableElement>)}
              style={{
                ...(rest as { style?: React.CSSProperties }).style,
                borderCollapse: 'collapse',
                border: '1px solid var(--bg-3)',
                minWidth: '100%',
              }}
            />
          </div>
        ),
        td: ({ node: _node, ...rest }: Record<string, unknown>) => (
          <td
            {...(rest as React.TdHTMLAttributes<HTMLTableCellElement>)}
            style={{
              ...(rest as { style?: React.CSSProperties }).style,
              padding: '8px',
              border: '1px solid var(--bg-3)',
              minWidth: '120px',
            }}
          />
        ),
        img: ({ node: _node, ...rest }: Record<string, unknown>) => {
          const imgProps = rest as React.ImgHTMLAttributes<HTMLImageElement>;
          if (isLocalFilePath(imgProps.src || '')) {
            const src = decodeURIComponent(imgProps.src || '');
            return <LocalImageView src={src} alt={imgProps.alt || ''} className={imgProps.className} />;
          }
          return <img {...imgProps} />;
        },
      }),
      [codeStyle, hiddenCodeCopyButton, handleLinkClick, handleLinkMouseEnter, handleLinkMouseLeave]
    );

    const rehypePlugins = useMemo(() => (allowHtml ? [rehypeRaw, rehypeKatex] : [rehypeKatex]), [allowHtml]);

    return (
      <div className={classNames('relative w-full', className)}>
        <ShadowView>
          <div ref={onRef} className='markdown-shadow-body'>
            <ReactMarkdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={rehypePlugins} components={components}>
              {normalizedChildren}
            </ReactMarkdown>
          </div>
        </ShadowView>
        {hoveredLink && (
          <div
            style={{
              position: 'fixed',
              left: hoverPos.x,
              top: hoverPos.y,
              zIndex: 9999,
              maxWidth: 360,
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              borderRadius: 8,
              overflow: 'hidden',
            }}
            onMouseEnter={() => { if (linkTimerRef.current) clearTimeout(linkTimerRef.current); }}
            onMouseLeave={handleLinkMouseLeave}
          >
            <LinkPreview url={hoveredLink} onClose={() => setHoveredLink(null)} />
          </div>
        )}
      </div>
    );
  }
);

MarkdownView.displayName = 'MarkdownView';

export default MarkdownView;
