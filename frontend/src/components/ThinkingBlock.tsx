import React, { useState } from "react";
import { Brain, ChevronDown, ChevronRight } from "lucide-react";

interface Props {
  content: string;
  defaultOpen?: boolean;
}

export const ThinkingBlock: React.FC<Props> = ({ content, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  if (!content) return null;
  return (
    <div className="thought-block animate-fade-in">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 w-full text-left font-medium"
        style={{ background: "transparent", border: "none", padding: 0, color: "inherit" }}
      >
        <Brain size={14} />
        <span>Thought</span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && (
        <div className="mt-1.5 whitespace-pre-wrap" style={{ fontStyle: "normal" }}>
          {content}
        </div>
      )}
    </div>
  );
};