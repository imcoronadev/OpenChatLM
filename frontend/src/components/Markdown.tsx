import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./CodeBlock";

interface Props {
  content: string;
}

export const Markdown: React.FC<Props> = ({ content }) => {
  return (
    <div className="prose-chat">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props: any) {
            const { className, children, inline } = props;
            const match = /language-(\w+)/.exec(className || "");
            const text = String(children).replace(/\n$/, "");
            if (!inline && (match || text.includes("\n"))) {
              return <CodeBlock language={match?.[1]} code={text} />;
            }
            return (
              <code
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: "0.85em",
                  background: "rgb(var(--bg-soft))",
                  padding: "0.1em 0.3em",
                  borderRadius: "4px",
                }}
              >
                {children}
              </code>
            );
          },
          a({ children, href }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-hover underline">
                {children}
              </a>
            );
          },
          table({ children }) {
            return (
              <div style={{ overflowX: "auto" }}>
                <table className="border-collapse my-2" style={{ width: "100%" }}>
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th
                style={{
                  textAlign: "left",
                  padding: "0.4rem 0.6rem",
                  borderBottom: "1px solid rgb(var(--border))",
                  background: "rgb(var(--bg-soft))",
                }}
              >
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td style={{ padding: "0.4rem 0.6rem", borderBottom: "1px solid rgb(var(--border))" }}>{children}</td>
            );
          },
          ul({ children }) {
            return <ul className="list-disc pl-6 my-1.5 space-y-1">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal pl-6 my-1.5 space-y-1">{children}</ol>;
          },
          h1: ({ children }) => <h1 className="text-xl font-semibold mt-2 mb-1">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-semibold mt-2 mb-1">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-semibold mt-1.5 mb-1">{children}</h3>,
          blockquote: ({ children }) => (
            <blockquote
              style={{
                borderLeft: "3px solid rgb(var(--border))",
                paddingLeft: "0.75rem",
                color: "rgb(var(--fg-soft))",
                margin: "0.5rem 0",
              }}
            >
              {children}
            </blockquote>
          ),
          p: ({ children }) => <p className="my-1.5 leading-relaxed">{children}</p>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};