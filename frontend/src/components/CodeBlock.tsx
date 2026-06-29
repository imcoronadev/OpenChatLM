import React, { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";

interface Props {
  language: string | undefined;
  code: string;
}

export const CodeBlock: React.FC<Props> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);
  const [html, setHtml] = useState<string>("");
  const lang = (language || "text").toLowerCase();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { codeToHtml, bundledLanguages } = await import("shiki");
        const safeLang = (bundledLanguages as string[]).includes(lang) ? lang : "text";
        const out = await codeToHtml(code, { lang: safeLang, theme: "github-dark" });
        if (!cancelled) setHtml(out);
      } catch {
        if (!cancelled) setHtml(`<pre><code>${escapeHtml(code)}</code></pre>`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, lang]);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="code-block">
      <div className="code-header">
        <span>{lang}</span>
        <button
          className="btn btn-ghost"
          style={{ padding: "0.15rem 0.4rem", fontSize: "0.72rem" }}
          onClick={copy}
          aria-label="Copy code"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre>
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
};

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}