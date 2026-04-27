"use client";

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import Image from 'next/image';
import type { HTMLAttributes } from 'react';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="markdown-content text-sky-900 text-lg font-semibold leading-loose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // Style images with next/image for optimization
          img: ({ src, alt }) => {
            if (!src || typeof src !== 'string') return null;
            
            return (
              <span className="block my-6">
                <Image
                  src={src}
                  alt={alt || 'Note image'}
                  width={800}
                  height={600}
                  className="max-w-full h-auto rounded-2xl shadow-lg mx-auto"
                  style={{ width: '100%', height: 'auto' }}
                />
                {alt && (
                  <span className="block text-center text-sm text-sky-600 mt-2 italic">
                    {alt}
                  </span>
                )}
              </span>
            );
          },
          // Style paragraphs
          p: ({ ...props }) => (
            <p {...props} className="mb-4" />
          ),
          // Style headings
          h1: ({ ...props }) => (
            <h1 {...props} className="text-3xl font-extrabold mb-4 mt-6 text-sky-900" />
          ),
          h2: ({ ...props }) => (
            <h2 {...props} className="text-2xl font-bold mb-3 mt-5 text-sky-900" />
          ),
          h3: ({ ...props }) => (
            <h3 {...props} className="text-xl font-bold mb-2 mt-4 text-sky-900" />
          ),
          // Style lists
          ul: ({ ...props }) => (
            <ul {...props} className="list-disc list-inside mb-4 space-y-2" />
          ),
          ol: ({ ...props }) => (
            <ol {...props} className="list-decimal list-inside mb-4 space-y-2" />
          ),
          // Style links
          a: ({ ...props }) => (
            <a {...props} className="text-sky-600 hover:text-sky-800 underline font-bold" target="_blank" rel="noopener noreferrer" />
          ),
          // Style code blocks
          code: ({ inline, ...props }: { inline?: boolean } & HTMLAttributes<HTMLElement>) => (
            inline ? (
              <code {...props} className="bg-sky-100 px-2 py-1 rounded text-sky-800 font-mono text-base" />
            ) : (
              <code {...props} className="block bg-sky-100 p-4 rounded-xl my-4 overflow-x-auto font-mono text-base" />
            )
          ),
          // Style blockquotes
          blockquote: ({ ...props }) => (
            <blockquote {...props} className="border-l-4 border-sky-500 pl-4 py-2 my-4 italic bg-sky-50 rounded-r-lg" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
