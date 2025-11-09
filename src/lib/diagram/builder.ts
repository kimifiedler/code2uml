import type {
  DiagramResult,
  ParsedEntity,
  UmlMember,
} from "../shared/uml-types";
import { stripGenerics } from "../shared/uml-utils";

export function finalizeDiagram(entities: ParsedEntity[]): DiagramResult {
  if (!entities.length) {
    return { mermaid: "", entities: [] };
  }
  const merged = harmonizeEntities(mergeEntities(entities));
  const mermaid = buildMermaidDiagram(merged);
  return { mermaid, entities: merged };
}

function mergeEntities(entities: ParsedEntity[]): ParsedEntity[] {
  const map = new Map<string, ParsedEntity>();

  entities.forEach((entity) => {
    const key = entity.name;
    if (!map.has(key)) {
      map.set(key, {
        ...entity,
        members: [...entity.members],
        inherits: [...entity.inherits],
        implements: [...entity.implements],
      });
      return;
    }

    const existing = map.get(key)!;
    const mergedMembers = [...existing.members];
    entity.members.forEach((member) => {
      if (
        !mergedMembers.some(
          (current) =>
            current.kind === member.kind &&
            current.name === member.name &&
            current.parameters === member.parameters
        )
      ) {
        mergedMembers.push(member);
      }
    });

    existing.members = mergedMembers;
    existing.inherits = [...new Set([...existing.inherits, ...entity.inherits])];
    existing.implements = [
      ...new Set([...existing.implements, ...entity.implements]),
    ];
  });

  return Array.from(map.values());
}

function harmonizeEntities(entities: ParsedEntity[]): ParsedEntity[] {
  const kindMap = new Map<string, ParsedEntity["kind"]>();
  entities.forEach((entity) => {
    kindMap.set(stripGenerics(entity.name), entity.kind);
  });

  return entities.map((entity) => {
    const resolvedImplements: string[] = [];
    const resolvedInherits = [...entity.inherits];

    entity.implements.forEach((target) => {
      const kind = kindMap.get(stripGenerics(target));
      if (kind && kind !== "interface") {
        resolvedInherits.push(target);
        return;
      }
      resolvedImplements.push(target);
    });

    return {
      ...entity,
      inherits: Array.from(new Set(resolvedInherits)),
      implements: Array.from(new Set(resolvedImplements)),
    };
  });
}

function buildMermaidDiagram(entities: ParsedEntity[]): string {
  const lines: string[] = ["classDiagram"];
  const idMap = new Map<string, string>();
  const counts = new Map<string, number>();

  const getId = (name: string) => {
    const base = sanitizeForId(stripGenerics(name)) || "Type";
    const current = counts.get(base) ?? 0;
    counts.set(base, current + 1);
    const suffix = current > 0 ? `_${current + 1}` : "";
    const finalId = `${base}${suffix}`;
    idMap.set(name, finalId);
    return finalId;
  };

  const ensurePlaceholder = (name: string) => {
    const existing = idMap.get(name);
    if (existing) {
      return existing;
    }
    const placeholder = sanitizeForId(stripGenerics(name)) || "External";
    idMap.set(name, placeholder);
    lines.push(`    class ${placeholder}`);
    return placeholder;
  };

  entities.forEach((entity) => {
    const id = getId(entity.name);
    lines.push(`    class ${id} {`);
    if (entity.kind === "interface") {
      lines.push(`        <<interface>>`);
    } else if (entity.kind === "record") {
      lines.push(`        <<record>>`);
    } else if (entity.kind === "struct") {
      lines.push(`        <<struct>>`);
    }
    entity.members.forEach((member) => {
      const label = formatMember(member);
      if (label) {
        lines.push(`        ${label}`);
      }
    });
    lines.push("    }");
  });

  entities.forEach((entity) => {
    const from = idMap.get(entity.name);
    if (!from) {
      return;
    }

    entity.inherits.forEach((target) => {
      const to = ensurePlaceholder(target);
      lines.push(`    ${to} <|-- ${from}`);
    });

    entity.implements.forEach((target) => {
      const to = ensurePlaceholder(target);
      lines.push(`    ${to} <|.. ${from}`);
    });
  });

  return lines.join("\n");
}

function formatMember(member: UmlMember): string {
  const visibility = member.access || "~";
  if (member.kind === "method") {
    const params = member.parameters ?? "";
    const returnType = member.returnType ? ` : ${member.returnType}` : "";
    return `${visibility}${member.name}(${params})${returnType}`;
  }

  const typeLabel = member.type ? ` : ${member.type}` : "";
  return `${visibility}${member.name}${typeLabel}`;
}

function sanitizeForId(value: string): string {
  return value.replace(/[^\w]/g, "_");
}
