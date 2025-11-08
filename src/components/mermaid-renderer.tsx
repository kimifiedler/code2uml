"use client";

import { useEffect, useState } from "react";
import mermaid from "mermaid";

const MERMAID_CONFIG: mermaid.Config = {
  startOnLoad: false,
  securityLevel: "loose",
  theme: "dark",
  deterministicIds: true,
  themeVariables: {
    primaryColor: "#050505",
    primaryTextColor: "#f5f5f5",
    primaryBorderColor: "#1f1f1f",
    lineColor: "#f5f5f5",
    fontSize: "14px",
    fontFamily: "var(--font-geist-sans, 'Geist Sans', 'Inter', sans-serif)",
    edgeLabelBackground: "#0f0f0f",
    background: "#000000",
  },
};

let isConfigured = false;

function ensureMermaidConfigured() {
  if (isConfigured) {
    return;
  }
  if (typeof window !== "undefined") {
    mermaid.initialize(MERMAID_CONFIG);
    isConfigured = true;
  }
}

ensureMermaidConfigured();

interface MermaidRendererProps {
  chart: string;
  onRendered?: (svg: string) => void;
}

export function MermaidRenderer({ chart, onRendered }: MermaidRendererProps) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const diagramId = "uml-preview";

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      if (!chart.trim()) {
        setSvg("");
        setError(null);
        onRendered?.("");
        return;
      }

      try {
        const { svg: renderedSvg } = await mermaid.render(diagramId, chart);
        if (cancelled) {
          return;
        }
        setSvg(renderedSvg);
        setError(null);
        onRendered?.(renderedSvg);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setSvg("");
        setError("Unable to render the Mermaid diagram.");
        onRendered?.("");
        console.error(err);
      }
    }

    renderDiagram();
    return () => {
      cancelled = true;
    };
  }, [chart, diagramId, onRendered]);

  if (error) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-6 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="flex h-full items-center justify-center rounded-md border border-dashed border-border/40 bg-gradient-to-b from-neutral-900/30 to-neutral-900/10 px-4 py-10 text-sm text-muted-foreground">
        No diagram yet. Upload compatible files to get started.
      </div>
    );
  }

  return (
    <div
      className="mermaid-diagram [&_svg]:h-auto [&_svg]:w-full [&_svg]:max-w-none"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
