import type {
  DiagramResult,
  ParsedEntity,
  SourceFile,
  UmlEntityKind,
  UmlMember,
} from "@/types/uml";
import { finalizeDiagram } from "../diagram/builder";
import {
  findMatchingBrace,
  normalizeParams,
  stripGenerics,
  toAccess,
} from "@/utils/uml";

/**
 * Converts one or more C# source files into a Mermaid class diagram.
 */
export function createMermaidFromSources(files: SourceFile[]): DiagramResult {
  const parsed = files.flatMap((file) =>
    parseEntities(file.content, file.name)
  );
  return finalizeDiagram(parsed);
}

function parseEntities(content: string, sourceName?: string): ParsedEntity[] {
  const cleaned = preprocessSource(content);
  const entities: ParsedEntity[] = [];
  const typePattern =
    /((?:public|protected|internal|private)(?:\s+(?:protected|internal))?)?\s*(?:static\s+|sealed\s+|abstract\s+|partial\s+|readonly\s+|ref\s+|unsafe\s+|new\s+)*\b(class|interface|record|struct)\s+([A-Za-z_][\w<>\.]*)\s*(?:\:\s*([^{]+))?\s*\{/g;

  let match: RegExpExecArray | null;
  while ((match = typePattern.exec(cleaned))) {
    const kind = normalizeKind(match[2]);
    const rawName = match[3].trim();
    const inheritsTokens = (match[4] ?? "")
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean);

    const openBraceIndex = cleaned.indexOf("{", typePattern.lastIndex - 1);
    if (openBraceIndex === -1) {
      continue;
    }
    const closeBraceIndex = findMatchingBrace(cleaned, openBraceIndex);
    if (closeBraceIndex === -1) {
      continue;
    }

    const body = cleaned.slice(openBraceIndex + 1, closeBraceIndex);
    const members = parseMembers(body, rawName);

    const entity: ParsedEntity = {
      name: rawName,
      kind,
      members,
      inherits: [],
      implements: [],
      sourceName,
    };

    if (inheritsTokens.length) {
      // First non-interface token is treated as inheritance. Others are interfaces.
      inheritsTokens.forEach((token) => {
        if (token.toLowerCase().startsWith("i") || token.includes("<")) {
          entity.implements.push(token);
        } else if (entity.inherits.length === 0) {
          entity.inherits.push(token);
        } else {
          entity.implements.push(token);
        }
      });
    }

    entities.push(entity);
    typePattern.lastIndex = closeBraceIndex + 1;
  }

  return entities;
}

function parseMembers(body: string, rawName: string): UmlMember[] {
  const members: UmlMember[] = [];
  const cleanBody = body.replace(/^\s*\[[^\]]*\]\s*/gm, "");
  const className = stripGenerics(rawName);

  const propertyPattern =
    /(?:(public|protected|internal|private)(?:\s+(?:protected|internal))?\s+)?(?:static\s+|virtual\s+|override\s+|abstract\s+|sealed\s+|new\s+)?(?!(?:class|interface|record|struct)\b)([\w<>\[\]\.?]+)\s+([A-Za-z_][\w]*)\s*\{\s*[^{}]*?\s*\}/gm;
  const methodPattern =
    /(?:(public|protected|internal|private)(?:\s+(?:protected|internal))?\s+)?(?:static\s+|virtual\s+|override\s+|abstract\s+|sealed\s+|async\s+|partial\s+|new\s+)*([\w<>\[\]\.?]+)\s+([A-Za-z_][\w]*)\s*\(([^)]*)\)\s*(?:\{|=>|where|;)/g;
  const ctorPattern =
    /(?:(public|protected|internal|private)(?:\s+(?:protected|internal))?\s+)?([A-Za-z_][\w]*)\s*\(([^)]*)\)\s*(?:\{|:|=>|;)/g;
  const fieldPattern =
    /(?:(public|protected|internal|private)(?:\s+(?:protected|internal))?\s+)?(?:static\s+|readonly\s+|volatile\s+|new\s+)?(?!(?:class|interface|record|struct)\b)([\w<>\[\]\.?]+)\s+([A-Za-z_][\w]*)\s*(?:=\s*[^;]+)?;/g;

  let propertyMatch: RegExpExecArray | null;
  while ((propertyMatch = propertyPattern.exec(cleanBody))) {
    const [, access, type, name] = propertyMatch;
    members.push({
      kind: "property",
      name,
      type,
      access: toAccess(access),
    });
  }

  let methodMatch: RegExpExecArray | null;
  while ((methodMatch = methodPattern.exec(cleanBody))) {
    const [, access, returnType, name, params] = methodMatch;
    if (name === className) {
      // Skip constructors handled separately.
      continue;
    }
    members.push({
      kind: "method",
      name,
      returnType,
      parameters: normalizeParams(params),
      access: toAccess(access),
    });
  }

  let ctorMatch: RegExpExecArray | null;
  while ((ctorMatch = ctorPattern.exec(cleanBody))) {
    const [, access, name, params] = ctorMatch;
    if (name !== className) {
      continue;
    }
    members.push({
      kind: "method",
      name,
      returnType: "",
      parameters: normalizeParams(params),
      access: toAccess(access),
    });
  }

  let fieldMatch: RegExpExecArray | null;
  while ((fieldMatch = fieldPattern.exec(cleanBody))) {
    const [, access, type, name] = fieldMatch;
    if (members.some((member) => member.name === name)) {
      continue;
    }
    members.push({
      kind: "field",
      name,
      type,
      access: toAccess(access),
    });
  }

  return members;
}

function preprocessSource(content: string): string {
  return content
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/#region[\s\S]*?#endregion/g, "")
    .replace(/record\s+struct/g, "record")
    .replace(/record\s+class/g, "record");
}

function normalizeKind(kind: string): UmlEntityKind {
  switch (kind) {
    case "interface":
      return "interface";
    case "record":
      return "record";
    case "struct":
      return "struct";
    default:
      return "class";
  }
}
