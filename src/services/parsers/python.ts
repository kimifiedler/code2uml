import type {
  DiagramResult,
  ParsedEntity,
  SourceFile,
  UmlMember,
} from "@/types/uml";
import { finalizeDiagram } from "../diagram/builder";

export function createMermaidFromPythonSources(
  files: SourceFile[]
): DiagramResult {
  const parsed = files.flatMap((file) =>
    parsePythonEntities(file.content, file.name)
  );
  return finalizeDiagram(parsed);
}

function parsePythonEntities(content: string, sourceName?: string): ParsedEntity[] {
  const normalized = preprocessPythonSource(content);
  const lines = normalized.split(/\r?\n/);
  const entities: ParsedEntity[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match =
      line.match(/^(\s*)class\s+([A-Za-z_][\w]*)\s*(\(([^)]*)\))?\s*:/);
    if (!match) {
      continue;
    }

    const indent = indentLength(match[1]);
    const rawName = match[2];
    const bases = match[4] ?? "";

    const bodyLines: string[] = [];
    let pointer = i + 1;
    while (pointer < lines.length) {
      const currentLine = lines[pointer];
      if (!currentLine.trim()) {
        bodyLines.push(currentLine);
        pointer++;
        continue;
      }
      const currentIndent = indentLength(
        currentLine.match(/^(\s*)/)?.[1] ?? ""
      );
      if (currentIndent <= indent) {
        break;
      }
      bodyLines.push(currentLine);
      pointer++;
    }
    i = pointer - 1;

    const entity: ParsedEntity = {
      name: rawName,
      kind: "class",
      members: parsePythonMembers(bodyLines.join("\n")),
      inherits: splitBases(bases),
      implements: [],
      sourceName,
    };

    entities.push(entity);
  }

  return entities;
}

function parsePythonMembers(body: string): UmlMember[] {
  const members: UmlMember[] = [];

  const methodPattern =
    /^\s*def\s+([A-Za-z_][\w]*)\s*\(([^)]*)\)\s*(?:->\s*([\w\[\],\.]+))?\s*:/gm;
  let methodMatch: RegExpExecArray | null;
  while ((methodMatch = methodPattern.exec(body))) {
    const [, name, params, returnType] = methodMatch;
    if (!name) {
      continue;
    }
    members.push({
      kind: "method",
      name,
      returnType: returnType ?? "",
      parameters: normalizePythonParams(params),
      access: pythonAccess(name),
    });
  }

  const fieldPattern =
    /self\.([A-Za-z_][\w]*)\s*(?::\s*([\w\[\],\.]+))?\s*=/g;
  let fieldMatch: RegExpExecArray | null;
  const seenFields = new Set<string>();
  while ((fieldMatch = fieldPattern.exec(body))) {
    const [, name, type] = fieldMatch;
    if (!name || seenFields.has(name)) {
      continue;
    }
    seenFields.add(name);
    members.push({
      kind: "field",
      name,
      type,
      access: pythonAccess(name),
    });
  }

  return members;
}

function splitBases(value: string): string[] {
  return value
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token && token !== "object");
}

function normalizePythonParams(params: string): string {
  if (!params.trim()) {
    return "";
  }
  return params
    .split(",")
    .map((param) => param.trim())
    .filter(
      (param) => param && !/^self\b/.test(param) && !/^cls\b/.test(param)
    )
    .map((param) => {
      const namePart = param.replace(/=.*$/, "").trim();
      const annotationSplit = namePart.split(":").map((part) => part.trim());
      const rawName = annotationSplit[0]?.replace(/^\*+/, "") ?? param;
      const type = annotationSplit[1];
      return type ? `${rawName}: ${type}` : rawName;
    })
    .join(", ");
}

function pythonAccess(name: string): string {
  if (name.startsWith("__") && name.endsWith("__")) {
    return "+";
  }
  if (name.startsWith("_")) {
    return "-";
  }
  return "+";
}

function preprocessPythonSource(content: string): string {
  return content
    .replace(/'''[\s\S]*?'''/g, "")
    .replace(/"""[\s\S]*?"""/g, "")
    .replace(/#.*$/gm, "");
}

function indentLength(value: string): number {
  return value.replace(/\t/g, "    ").length;
}
