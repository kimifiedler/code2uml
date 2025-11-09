"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  Copy,
  Download,
  FileCode2,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";

import { MermaidRenderer } from "@/components/mermaid-renderer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DiagramResult, SourceFile } from "@/lib/uml-types";
import { generateDiagram, SupportedLanguage } from "@/lib/diagram-service";

type UploadedFile = SourceFile & {
  id: string;
  size: number;
};

type LanguageOption = {
  id: SupportedLanguage;
  label: string;
  extensions: string[];
  accept: string;
};

const LANGUAGES: LanguageOption[] = [
  {
    id: "csharp",
    label: "C#",
    extensions: [".cs"],
    accept: ".cs",
  },
  {
    id: "java",
    label: "Java",
    extensions: [".java"],
    accept: ".java",
  },
];

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
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      void handleFiles(event.dataTransfer.files);
    },
    [handleFiles]
  );

  const onFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
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

  const downloadSvg = useCallback(() => {
    if (!svgMarkup) {
      return;
    }
    const blob = new Blob([svgMarkup], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "uml-diagram.svg";
    link.click();
    URL.revokeObjectURL(url);
  }, [svgMarkup]);

  const stats = useMemo(() => {
    if (!diagram) {
      return [];
    }
    const classes = diagram.entities.filter(
      (entity) => entity.kind === "class"
    ).length;
    const interfaces = diagram.entities.filter(
      (entity) => entity.kind === "interface"
    ).length;
    const records = diagram.entities.filter(
      (entity) => entity.kind === "record"
    ).length;
    const members = diagram.entities.reduce(
      (total, entity) => total + entity.members.length,
      0
    );
    return [
      { label: "Classes", value: classes },
      { label: "Interfaces", value: interfaces },
      { label: "Records", value: records },
      { label: "Members", value: members },
    ];
  }, [diagram]);

  const canSaveSnippet = snippetContent.trim().length > 0;
  const canGenerate = files.length > 0 && !isParsing;

  const handleGenerate = useCallback(() => {
    if (!files.length) {
      setError("Add at least one file or snippet before generating.");
      return;
    }
    buildDiagram(files);
  }, [buildDiagram, files]);

  return (
    <div className="min-h-screen bg-[#050505] pb-16 text-zinc-100">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-neutral-900/60 via-black to-black" />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 lg:px-8">
        <section className="flex flex-col gap-5 text-center lg:text-left">
          <div className="text-3xl font-semibold tracking-tight text-white lg:self-start">
            Code2UML
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Turn source files into clean UML diagrams
          </h1>
          <p className="text-base text-zinc-300 sm:text-lg">
            Drop your files, generate Mermaid instantly, and preview the SVG
            without leaving the browser.
          </p>
          <div className="flex flex-col gap-2 text-left sm:flex-row sm:items-center sm:gap-4">
            <span className="text-sm uppercase tracking-wide text-zinc-400">
              Language
            </span>
            <Select
              value={language}
              onValueChange={(value) => {
                const lang = value as SupportedLanguage;
                setLanguage(lang);
                setSnippetName(`Snippet${lang === "java" ? ".java" : ".cs"}`);
                setFiles((current) =>
                  current.filter((file) =>
                    lang === "java"
                      ? file.name.toLowerCase().endsWith(".java")
                      : file.name.toLowerCase().endsWith(".cs")
                  )
                );
              }}
            >
              <SelectTrigger className="w-full max-w-xs bg-black/40 text-left text-sm text-white">
                <SelectValue placeholder="Choose language" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 text-white">
                {LANGUAGES.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
          <Card className="border-white/10 bg-black/60 backdrop-blur">
            <CardHeader className="py-4">
              <CardTitle>Upload files</CardTitle>
              <CardDescription>
                Add {selectedLanguage.label} files or use the inline editor
                below. Everything runs entirely in your browser.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs
                value={inputMode}
                onValueChange={(value) =>
                  setInputMode(value as "upload" | "inline")
                }
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 bg-white/5">
                  <TabsTrigger value="upload">Upload files</TabsTrigger>
                  <TabsTrigger value="inline">Inline editor</TabsTrigger>
                </TabsList>
                <TabsContent value="upload" className="mt-4 space-y-4">
                  <div
                    className={`rounded-xl border border-dashed border-white/20 bg-neutral-950/70 px-6 py-10 transition ${
                      isDragging ? "border-white/60 bg-neutral-900/70" : ""
                    }`}
                    onDragEnter={(event) => {
                      event.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={(event) => {
                      event.preventDefault();
                      setIsDragging(false);
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={onDrop}
                  >
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className="rounded-full border border-white/10 bg-white/5 p-3">
                        <Upload className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-base font-medium text-white">
                          Drop files here
                        </p>
                        <p className="text-sm text-zinc-400">
                          or use the button to select them
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        className="bg-white text-black hover:bg-white/90"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Choose files
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={selectedLanguage.accept}
                        multiple
                        className="hidden"
                        onChange={onFileChange}
                      />
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="inline" className="mt-4 space-y-4">
                  <div className="space-y-3 rounded-xl border border-white/10 bg-black/50 p-4">
                    <div>
                      <p className="text-sm font-medium text-white">
                        Inline editor
                      </p>
                      <p className="text-xs text-zinc-400">
                        Paste or write {selectedLanguage.label} code and add it
                        as a virtual file.
                      </p>
                    </div>
                    <Input
                      value={snippetName}
                      onChange={(event) => setSnippetName(event.target.value)}
                      placeholder={`Snippet${selectedLanguage.extensions[0]}`}
                      className="bg-black/40 text-sm text-white placeholder:text-zinc-500"
                      spellCheck={false}
                    />
                    <Textarea
                      value={snippetContent}
                      onChange={(event) =>
                        setSnippetContent(event.target.value)
                      }
                      placeholder={`public class Demo {\n    // ${selectedLanguage.label} code ...\n}`}
                      rows={8}
                      className="resize-none bg-black/40 text-sm text-white placeholder:text-zinc-500"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-white/20 text-white hover:bg-white/10"
                      onClick={addSnippet}
                      disabled={!canSaveSnippet}
                    >
                      Add snippet as file
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex items-center justify-between text-sm text-zinc-400">
                <span>{files.length} file(s) ready</span>
                <button
                  className="text-white hover:text-zinc-300 disabled:pointer-events-none disabled:opacity-40"
                  onClick={clearFiles}
                  disabled={!files.length}
                >
                  Reset
                </button>
              </div>

              <ScrollArea className="h-64 rounded-lg border border-white/10 bg-black/40 p-3">
                {!files.length ? (
                  <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                    No files added yet.
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {files.map((file) => (
                      <li
                        key={file.id}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-black/70 px-3 py-2"
                      >
                        <div className="flex items-center gap-3">
                          <div className="rounded-md bg-white/5 p-2">
                            <FileCode2 className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">
                              {file.name}
                            </p>
                            <p className="text-xs text-zinc-400">
                              {formatBytes(file.size)}
                            </p>
                          </div>
                        </div>
                        <button
                          className="text-zinc-400 transition hover:text-red-400"
                          onClick={() => removeFile(file.name)}
                          aria-label={`Remove ${file.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </ScrollArea>
              <div className="space-y-2">
                <Button
                  variant="default"
                  className="w-full bg-white text-black hover:bg-white/90"
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                >
                  Generate UML
                </Button>
                <p className="text-xs text-zinc-500">
                  Generates from {files.length} file
                  {files.length === 1 ? "" : "s"} currently in the queue.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-black/70 backdrop-blur">
            <CardHeader className="flex flex-col gap-2 py-4">
              <CardTitle>Diagram preview</CardTitle>
              <CardDescription>
                Toggle between the rendered SVG and the generated Mermaid
                definition.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="secondary"
                  className="bg-white/10 text-white hover:bg-white/20"
                  onClick={downloadSvg}
                  disabled={!svgMarkup}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Save as SVG
                </Button>
                <Separator orientation="vertical" className="h-8 bg-white/20" />
                <Button
                  variant="ghost"
                  className="text-zinc-300 hover:text-white"
                  onClick={handleCopy}
                  disabled={!diagram?.mermaid}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Mermaid
                </Button>
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <Tabs defaultValue="preview" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-white/5">
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="code">Mermaid</TabsTrigger>
                </TabsList>
                <TabsContent value="preview" className="mt-4">
                  <div className="min-h-[420px] rounded-xl border border-white/10 bg-neutral-950/70 p-4">
                    {isParsing ? (
                      <div className="flex h-full items-center justify-center gap-2 text-sm text-zinc-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Parsing files…
                      </div>
                    ) : (
                      <MermaidRenderer
                        chart={diagram?.mermaid ?? ""}
                        onRendered={setSvgMarkup}
                      />
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="code" className="mt-4">
                  <div className="h-[420px] rounded-xl border border-white/10 bg-neutral-950/70 p-4">
                    <ScrollArea className="h-full">
                      <pre className="whitespace-pre-wrap text-sm text-zinc-100">
                        {diagram?.mermaid || "No Mermaid code available yet."}
                      </pre>
                    </ScrollArea>
                  </div>
                </TabsContent>
              </Tabs>

              {!!stats.length && (
                <div className="grid gap-4 rounded-xl border border-white/10 bg-white/5 p-4 sm:grid-cols-2">
                  {stats.map((stat) => (
                    <div key={stat.label}>
                      <p className="text-xs uppercase tracking-wide text-zinc-400">
                        {stat.label}
                      </p>
                      <p className="text-2xl font-semibold text-white">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(1)} ${units[exponent]}`;
}
