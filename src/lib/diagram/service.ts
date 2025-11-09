import type { DiagramResult, SourceFile } from "../shared/uml-types";
import { createMermaidFromSources as generateCsharp } from "../parsers/csharp";
import { createMermaidFromJavaSources as generateJava } from "../parsers/java";
import { createMermaidFromPythonSources as generatePython } from "../parsers/python";

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
