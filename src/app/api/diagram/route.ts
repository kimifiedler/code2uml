import { NextResponse } from "next/server";

import { createMermaidFromSources, SourceFile } from "@/lib/csharp-parser";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    if (!payload || !Array.isArray(payload.files)) {
      return NextResponse.json(
        { error: "files payload missing" },
        { status: 400 }
      );
    }

    const files: SourceFile[] = payload.files
      .filter(
        (file: SourceFile) =>
          typeof file?.name === "string" && typeof file?.content === "string"
      )
      .map((file: SourceFile) => ({
        name: file.name.trim() || "Unbenannt.cs",
        content: file.content,
      }));

    const result = createMermaidFromSources(files);
    return NextResponse.json(result);
  } catch (error) {
    console.error("diagram generation failed", error);
    return NextResponse.json(
      { error: "diagram generation failed" },
      { status: 500 }
    );
  }
}
