import { NextResponse } from "next/server";

import { generateDiagram, SupportedLanguage } from "@/services/diagram";
import type { SourceFile } from "@/types/uml";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    if (!payload || !Array.isArray(payload.files)) {
      return NextResponse.json(
        { error: "files payload missing" },
        { status: 400 }
      );
    }

    const language: SupportedLanguage =
      payload.language === "java" ? "java" : "csharp";

    const fallbackName = language === "java" ? "Snippet.java" : "Snippet.cs";

    const files: SourceFile[] = payload.files
      .filter(
        (file: SourceFile) =>
          typeof file?.name === "string" && typeof file?.content === "string"
      )
      .map((file: SourceFile) => ({
        name: file.name.trim() || fallbackName,
        content: file.content,
      }));

    const result = generateDiagram(language, files);
    return NextResponse.json(result);
  } catch (error) {
    console.error("diagram generation failed", error);
    return NextResponse.json(
      { error: "diagram generation failed" },
      { status: 500 }
    );
  }
}
