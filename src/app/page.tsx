"use client";

import type { ChangeEvent, DragEvent } from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import mermaid from "mermaid";

import { DiagramPreviewPanel } from "@/components/home/diagram-preview-panel";
import { HeroSection } from "@/components/home/hero-section";
import { UploadPanel } from "@/components/home/upload-panel";
import { generateDiagram, SupportedLanguage } from "@/services/diagram";
import { createId } from "@/utils/client";
import { LANGUAGES, SNIPPET_PLACEHOLDERS } from "@/constants/languages";
import { DARK_MERMAID_CONFIG, LIGHT_MERMAID_CONFIG } from "@/config/mermaid";
import type { DiagramResult } from "@/types/uml";
import type { UploadedFile } from "@/utils/uploads";

export default function Home() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [diagram, setDiagram] = useState<DiagramResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [svgMarkup, setSvgMarkup] = useState("");
  const [language, setLanguage] = useState<SupportedLanguage>("csharp");
  const [snippetName, setSnippetName] = useState(
    `Snippet${LANGUAGES[0].extensions[0]}`
  );
  const [snippetContent, setSnippetContent] = useState("");
  const [inputMode, setInputMode] = useState<"upload" | "inline">("upload");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedLanguage = useMemo(
    () => LANGUAGES.find((option) => option.id === language) ?? LANGUAGES[0],
    [language]
  );

  const matchesLanguage = useCallback(
    (fileName: string) => {
      const lowerName = fileName.toLowerCase();
      return selectedLanguage.extensions.some((extension) =>
        lowerName.endsWith(extension)
      );
    },
    [selectedLanguage]
  );

  const readFile = useCallback(
    (file: File) =>
      new Promise<UploadedFile>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () =>
          resolve({
            id: createId(),
            name: file.name,
            size: file.size,
            content: String(reader.result ?? ""),
          });
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
      }),
    []
  );

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      if (!fileList || !fileList.length) {
        return;
      }
      setIsParsing(true);
      setError(null);
      try {
        const incoming = Array.from(fileList);
        const targets = incoming.filter((file) => matchesLanguage(file.name));
        if (!targets.length) {
          setError(
            `Unsupported file type. ${
              selectedLanguage.label
            } accepts ${selectedLanguage.extensions.join(", ")}.`
          );
          return;
        }
        if (targets.length !== incoming.length) {
          setError(
            `Some files were ignored. ${
              selectedLanguage.label
            } accepts ${selectedLanguage.extensions.join(", ")}.`
          );
        } else {
          setError(null);
        }
        const loaded = await Promise.all(targets.map((file) => readFile(file)));
        setFiles((current) => {
          const merged = new Map(current.map((file) => [file.name, file]));
          loaded.forEach((file) => merged.set(file.name, file));
          return Array.from(merged.values());
        });
      } catch {
        setError("Unable to read the provided files.");
      } finally {
        setIsParsing(false);
      }
    },
    [matchesLanguage, readFile, selectedLanguage]
  );

  const buildDiagram = useCallback(
    (payload: UploadedFile[]) => {
      if (!payload.length) {
        setDiagram(null);
        setSvgMarkup("");
        return;
      }
      try {
        const result = generateDiagram(language, payload);
        setDiagram(result);
        setError(null);
      } catch {
        setDiagram(null);
        setError("Generating the diagram failed. Please review your files.");
      }
    },
    [language]
  );

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      void handleFiles(event.dataTransfer.files);
    },
    [handleFiles]
  );

  const onFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (!event.target.files) {
        return;
      }
      void handleFiles(event.target.files);
      event.target.value = "";
    },
    [handleFiles]
  );

  const removeFile = useCallback((name: string) => {
    setFiles((current) => current.filter((file) => file.name !== name));
  }, []);

  const addSnippet = useCallback(() => {
    const trimmedContent = snippetContent.trim();
    const baseName = snippetName.trim() || "Snippet";
    if (!trimmedContent) {
      setError("Please add some code before saving the snippet.");
      return;
    }
    const requiredExtension = selectedLanguage.extensions[0];
    const normalizedName = baseName.toLowerCase().endsWith(requiredExtension)
      ? baseName
      : `${baseName}${requiredExtension}`;
    const newFile: UploadedFile = {
      id: createId(),
      name: normalizedName,
      size: new Blob([trimmedContent]).size,
      content: trimmedContent,
    };
    setFiles((current) => {
      const others = current.filter((file) => file.name !== newFile.name);
      return [...others, newFile];
    });
    setSnippetContent("");
    setError(null);
  }, [selectedLanguage, snippetContent, snippetName]);

  const clearFiles = useCallback(() => {
    setFiles([]);
    setDiagram(null);
    setSvgMarkup("");
    setError(null);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!diagram?.mermaid) {
      return;
    }
    await navigator.clipboard.writeText(diagram.mermaid);
  }, [diagram?.mermaid]);

  const downloadSvg = useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }

    let exportMarkup = svgMarkup;

    if (diagram?.mermaid?.trim()) {
      try {
        const id = `download-${Date.now()}`;
        mermaid.initialize(LIGHT_MERMAID_CONFIG);
        const { svg } = await mermaid.render(id, diagram.mermaid);
        exportMarkup = svg;
      } catch (error) {
        console.error("Unable to render light SVG for download", error);
      } finally {
        mermaid.initialize(DARK_MERMAID_CONFIG);
      }
    }

    if (!exportMarkup) {
      return;
    }

    const blob = new Blob([exportMarkup], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "uml-diagram.svg";
    link.click();
    URL.revokeObjectURL(url);
  }, [diagram?.mermaid, svgMarkup]);

  const canSaveSnippet = snippetContent.trim().length > 0;
  const canGenerate = files.length > 0 && !isParsing;
  const snippetPlaceholder = SNIPPET_PLACEHOLDERS[language];

  const handleGenerate = useCallback(() => {
    if (!files.length) {
      setError("Add at least one file or snippet before generating.");
      return;
    }
    buildDiagram(files);
  }, [buildDiagram, files]);

  const handleLanguageChange = useCallback(
    (lang: SupportedLanguage) => {
      const option =
        LANGUAGES.find((entry) => entry.id === lang) ?? LANGUAGES[0];
      setLanguage(lang);
      setSnippetName(`Snippet${option.extensions[0]}`);
      setFiles((current) =>
        current.filter((file) =>
          option.extensions.some((extension) =>
            file.name.toLowerCase().endsWith(extension)
          )
        )
      );
    },
    []
  );

  return (
    <div className="min-h-screen bg-[#050505] pb-16 text-zinc-100">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-neutral-900/60 via-black to-black" />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 lg:px-8">
        <HeroSection
          language={language}
          languages={LANGUAGES}
          onLanguageChange={handleLanguageChange}
        />

        <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
          <UploadPanel
            files={files}
            selectedLanguage={selectedLanguage}
            inputMode={inputMode}
            isDragging={isDragging}
            fileInputRef={fileInputRef}
            snippetName={snippetName}
            snippetContent={snippetContent}
            snippetPlaceholder={snippetPlaceholder}
            canSaveSnippet={canSaveSnippet}
            canGenerate={canGenerate}
            onInputModeChange={setInputMode}
            onDragStateChange={setIsDragging}
            onDrop={onDrop}
            onFileChange={onFileChange}
            onSnippetNameChange={setSnippetName}
            onSnippetContentChange={setSnippetContent}
            onAddSnippet={addSnippet}
            onClearFiles={clearFiles}
            onRemoveFile={removeFile}
            onGenerate={handleGenerate}
          />

          <DiagramPreviewPanel
            diagram={diagram}
            svgMarkup={svgMarkup}
            error={error}
            isParsing={isParsing}
            onDownloadSvg={downloadSvg}
            onCopyMermaid={handleCopy}
            onRendered={setSvgMarkup}
          />
        </div>
      </main>
    </div>
  );
}
