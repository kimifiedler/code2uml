import type { DiagramResult, SourceFile } from "./uml-types";
import { createMermaidFromSources as generateCsharp } from "./csharp-parser";
import { createMermaidFromJavaSources as generateJava } from "./java-parser";

export type SupportedLanguage = "csharp" | "java";

export function generateDiagram(
  language: SupportedLanguage,
  files: SourceFile[]
): DiagramResult {
  switch (language) {
    case "java":
      return generateJava(files);
    case "csharp":
    default:
      return generateCsharp(files);
  }
}
