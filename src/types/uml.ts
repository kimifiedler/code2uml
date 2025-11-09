export type UmlEntityKind = "class" | "interface" | "record" | "struct";

export type UmlMemberKind = "property" | "field" | "method";

export interface UmlMember {
  kind: UmlMemberKind;
  name: string;
  type?: string;
  returnType?: string;
  parameters?: string;
  access: string;
}

export interface ParsedEntity {
  name: string;
  kind: UmlEntityKind;
  members: UmlMember[];
  inherits: string[];
  implements: string[];
  sourceName?: string;
}

export interface SourceFile {
  name: string;
  content: string;
}

export interface DiagramResult {
  mermaid: string;
  entities: ParsedEntity[];
}
