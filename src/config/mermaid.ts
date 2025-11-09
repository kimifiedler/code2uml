import type mermaid from "mermaid";

type MermaidConfig = Parameters<typeof mermaid.initialize>[0];

const BASE_THEME_PROPS = {
  startOnLoad: false,
  securityLevel: "loose",
  deterministicIds: true,
} as const;

export const DARK_MERMAID_CONFIG: MermaidConfig = {
  ...BASE_THEME_PROPS,
  theme: "dark",
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

export const LIGHT_MERMAID_CONFIG: MermaidConfig = {
  ...BASE_THEME_PROPS,
  theme: "base",
  themeVariables: {
    primaryColor: "#ffffff",
    primaryTextColor: "#111111",
    primaryBorderColor: "#d4d4d8",
    lineColor: "#18181b",
    fontSize: "14px",
    fontFamily: "var(--font-geist-sans, 'Geist Sans', 'Inter', sans-serif)",
    edgeLabelBackground: "#f4f4f5",
    background: "#ffffff",
  },
};
