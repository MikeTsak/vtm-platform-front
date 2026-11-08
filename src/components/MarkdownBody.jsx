import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import DOMPurify from 'dompurify';
import { ALL_CREST_NAMES, clanKeyFor, crestifyHtml } from './ReactionGlyph';
import { symlogo as localSymlogo } from '../data/clans';
import sanitizeHtml from '../utils/sanitizeHtml';

/**
 * Pre-processes text for ReactMarkdown:
 * - Normalizes newlines.
 * - Cleans basic wrapping divs / br tags from rich-text pastes so they flow naturally in markdown.
 * - Preserves single linebreaks within paragraphs via two trailing spaces.
 * - Swaps :Clan_Name: tokens for markdown image links.
 */
function prepareMarkdown(rawText, whiteCrest) {
  if (!rawText) return '';
  let str = String(rawText).replace(/\r\n/g, '\n');

  // Convert standard inline HTML formatting to markdown
  str = str.replace(/<(b|strong)>(.*?)<\/\1>/gis, '**$2**');
  str = str.replace(/<(i|em)>(.*?)<\/\1>/gis, '*$2*');

  // Strip or flatten outer div/p wrappers from contentEditable inputs without destroying layout
  str = str.replace(/<div><br\s*\/?><\/div>/gi, '\n\n');
  str = str.replace(/<\/div>\s*<div>/gi, '\n\n');
  str = str.replace(/<\/?(div|p|span)>/gi, '\n');
  str = str.replace(/<br\s*\/?>/gi, '\n');
  str = str.replace(/&nbsp;/gi, ' ');

  // Convert :Clan_Name: tokens to markdown images
  str = str.replace(/:([A-Za-z0-9_]+):/g, (match, token) => {
    const clan = clanKeyFor(token);
    if (!clan) return match;
    const url = localSymlogo(clan);
    return `![clan-crest:${clan}](${url})`;
  });

  // Preserve linebreaks in markdown paragraphs (turn single \n into two trailing spaces + \n)
  str = str.replace(/\n(?!\n)/g, '  \n');

  return str.trim();
}

/**
 * Detects legacy rich HTML structures (e.g. pasted Discord message scrollers, styled tables)
 * that should be rendered directly with DOMPurify rather than parsed as markdown.
 */
function isComplexHtml(text) {
  if (!text) return false;
  return /<(table|thead|tbody|iframe|figure|details|summary|ol[^>]*class|ul[^>]*class|div[^>]*class|span[^>]*style|s\b|strike\b|del\b|u\b)/i.test(text);
}

export default function MarkdownBody({
  content = '',
  className = '',
  style = {},
  whiteCrest = true,
}) {
  const isComplex = useMemo(() => isComplexHtml(content), [content]);

  const prepared = useMemo(
    () => (!isComplex ? prepareMarkdown(content, whiteCrest) : ''),
    [content, isComplex, whiteCrest]
  );

  if (!content) return null;

  if (isComplex) {
    const cleanHtml = crestifyHtml(sanitizeHtml(content), { white: whiteCrest });
    return (
      <div
        className={className}
        style={style}
        dangerouslySetInnerHTML={{ __html: cleanHtml }}
      />
    );
  }

  return (
    <div className={className} style={style}>
      <ReactMarkdown
        components={{
          img: ({ src, alt }) => {
            if (alt && alt.startsWith('clan-crest:')) {
              const clan = alt.replace('clan-crest:', '');
              return (
                <img
                  src={src}
                  alt={clan}
                  title={clan}
                  className="inline-block align-text-bottom"
                  style={{
                    width: '1.25em',
                    height: '1.25em',
                    verticalAlign: 'text-bottom',
                    display: 'inline-block',
                    filter: whiteCrest ? 'brightness(0) invert(1)' : 'brightness(0)',
                    margin: '0 2px',
                  }}
                />
              );
            }
            return (
              <img
                src={src}
                alt={alt || 'Image'}
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  borderRadius: '4px',
                  margin: '0.5rem 0',
                }}
              />
            );
          },
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              style={{
                color: whiteCrest ? '#93c5fd' : '#1d4ed8',
                textDecoration: 'underline',
                wordBreak: 'break-all',
              }}
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote
              style={{
                borderLeft: whiteCrest ? '3px solid var(--primary, #ca8a04)' : '3px solid #ca8a04',
                paddingLeft: '0.85rem',
                margin: '0.75rem 0',
                fontStyle: 'italic',
                opacity: 0.9,
              }}
            >
              {children}
            </blockquote>
          ),
          ul: ({ children }) => (
            <ul
              style={{
                listStyleType: 'disc',
                margin: '0.5rem 0 0.75rem 1.4rem',
                paddingLeft: '0.25rem',
              }}
            >
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol
              style={{
                listStyleType: 'decimal',
                margin: '0.5rem 0 0.75rem 1.4rem',
                paddingLeft: '0.25rem',
              }}
            >
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li
              style={{
                marginBottom: '0.35rem',
                lineHeight: '1.5',
              }}
            >
              {children}
            </li>
          ),
          p: ({ children }) => (
            <p
              style={{
                marginBottom: '0.85rem',
                lineHeight: '1.6',
              }}
            >
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong
              style={{
                fontWeight: 700,
                color: whiteCrest ? '#ffffff' : '#1c1917',
              }}
            >
              {children}
            </strong>
          ),
          em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
          code: ({ children }) => (
            <code
              style={{
                background: whiteCrest ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                padding: '0.15rem 0.35rem',
                borderRadius: '3px',
                fontSize: '0.9em',
                fontFamily: 'monospace',
              }}
            >
              {children}
            </code>
          ),
          h1: ({ children }) => (
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '1rem 0 0.5rem' }}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.85rem 0 0.4rem' }}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0.75rem 0 0.35rem' }}>
              {children}
            </h3>
          ),
        }}
      >
        {prepared}
      </ReactMarkdown>
    </div>
  );
}

