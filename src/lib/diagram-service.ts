import type { DiagramResult, SourceFile } from "./uml-types";
import { createMermaidFromSources as generateCsharp } from "./csharp-parser";
import { createMermaidFromJavaSources as generateJava } from "./java-parser";
import { createMermaidFromPythonSources as generatePython } from "./python-parser";

export type SupportedLanguage = "csharp" | "java" | "python";

export function generateDiagram(
  language: SupportedLanguage,
  files: SourceFile[]
): DiagramResult {
  switch (language) {
    case "python":
      return generatePython(files);
    case "java":
      return generateJava(files);
    case "csharp":
    default:
      return generateCsharp(files);
  }
}
