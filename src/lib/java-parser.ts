import type {
  DiagramResult,
  ParsedEntity,
  SourceFile,
  UmlEntityKind,
  UmlMember,
} from "./uml-types";
import { finalizeDiagram } from "./diagram-builder";
import {
  findMatchingBrace,
  normalizeParams,
  stripGenerics,
  toAccess,
} from "./uml-utils";

export function createMermaidFromJavaSources(
  files: SourceFile[]
): DiagramResult {
  const parsed = files.flatMap((file) =>
    parseJavaEntities(file.content, file.name)
  );
  return finalizeDiagram(parsed);
}

function parseJavaEntities(content: string, sourceName?: string): ParsedEntity[] {
  const cleaned = preprocessJavaSource(content);
  const entities: ParsedEntity[] = [];
  const typePattern =
    /((?:public|protected|private)\s+)?(?:abstract\s+|static\s+|final\s+|sealed\s+)?(class|interface|record|enum)\s+([A-Za-z_][\w$<>]*)\s*(?:\(([^)]*)\))?\s*(?:extends\s+([A-Za-z0-9_<>\.\s,]+?))?(?:implements\s+([A-Za-z0-9_<>\.\s,]+?))?\s*\{/g;

  let match: RegExpExecArray | null;
  while ((match = typePattern.exec(cleaned))) {
    const kind = normalizeJavaKind(match[2]);
    const rawName = match[3].trim();
    const recordParams = match[4] ?? "";
    const extendsPart = match[5] ?? "";
    const implementsPart = match[6] ?? "";

    const openBraceIndex = cleaned.indexOf("{", typePattern.lastIndex - 1);
    if (openBraceIndex === -1) {
      continue;
    }
    const closeBraceIndex = findMatchingBrace(cleaned, openBraceIndex);
    if (closeBraceIndex === -1) {
      continue;
    }

    const body = cleaned.slice(openBraceIndex + 1, closeBraceIndex);
    const members = parseJavaMembers(body, rawName, recordParams);

    const entity: ParsedEntity = {
      name: rawName,
      kind,
      members,
      inherits: splitTargets(extendsPart),
      implements: splitTargets(implementsPart),
      sourceName,
    };

    entities.push(entity);
    typePattern.lastIndex = closeBraceIndex + 1;
  }

  return entities;
}

function parseJavaMembers(
  body: string,
  rawName: string,
  recordParams: string
): UmlMember[] {
  const members: UmlMember[] = [];
  const cleanBody = body.replace(/^\s*@[\w.]+.*$/gm, "");
  const className = stripGenerics(rawName);

  if (recordParams.trim()) {
    normalizeParams(recordParams)
      .split(",")
      .filter(Boolean)
      .forEach((param) => {
        const [name, type] = param.split(":").map((token) => token.trim());
        if (name) {
          members.push({
            kind: "property",
            name,
            type,
            access: "+",
          });
        }
      });
  }

  const methodPattern =
    /(?:(public|protected|private)\s+)?(?:static\s+|final\s+|abstract\s+|synchronized\s+|default\s+)?([\w<>\[\]\.?]+)\s+([A-Za-z_][\w]*)\s*\(([^)]*)\)\s*(?:\{|;)/g;
  const ctorPattern =
    /(?:(public|protected|private)\s+)?([A-Za-z_][\w]*)\s*\(([^)]*)\)\s*(?:\{|;)/g;
  const fieldPattern =
    /(?:(public|protected|private)\s+)?(?:static\s+|final\s+|volatile\s+|transient\s+)?([\w<>\[\]\.?]+)\s+([A-Za-z_][\w]*)\s*(?:=\s*[^;]+)?;/g;

  let methodMatch: RegExpExecArray | null;
  while ((methodMatch = methodPattern.exec(cleanBody))) {
    const [, access, returnType, name, params] = methodMatch;
    if (name === className) {
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

function splitTargets(value: string): string[] {
  return value
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
}

function preprocessJavaSource(content: string): string {
  return content
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

function normalizeJavaKind(kind: string): UmlEntityKind {
  switch (kind) {
    case "interface":
      return "interface";
    case "record":
      return "record";
    default:
      return "class";
  }
}
