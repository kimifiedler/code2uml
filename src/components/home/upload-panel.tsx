import type {
  ChangeEvent,
  DragEvent,
  RefObject,
} from "react";
import { FileCode2, Trash2, Upload } from "lucide-react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { LanguageOption } from "@/constants/languages";
import { formatBytes } from "@/utils/client";
import { UploadedFile } from "@/utils/uploads";

type UploadPanelProps = {
  files: UploadedFile[];
  selectedLanguage: LanguageOption;
  inputMode: "upload" | "inline";
  isDragging: boolean;
  fileInputRef: RefObject<HTMLInputElement>;
  snippetName: string;
  snippetContent: string;
  snippetPlaceholder: string;
  canSaveSnippet: boolean;
  canGenerate: boolean;
  onInputModeChange: (mode: "upload" | "inline") => void;
  onDragStateChange: (state: boolean) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSnippetNameChange: (value: string) => void;
  onSnippetContentChange: (value: string) => void;
  onAddSnippet: () => void;
  onClearFiles: () => void;
  onRemoveFile: (name: string) => void;
  onGenerate: () => void;
};

export function UploadPanel({
  files,
  selectedLanguage,
  inputMode,
  isDragging,
  fileInputRef,
  snippetName,
  snippetContent,
  snippetPlaceholder,
  canSaveSnippet,
  canGenerate,
  onInputModeChange,
  onDragStateChange,
  onDrop,
  onFileChange,
  onSnippetNameChange,
  onSnippetContentChange,
  onAddSnippet,
  onClearFiles,
  onRemoveFile,
  onGenerate,
}: UploadPanelProps) {
  return (
    <Card className="border-white/10 bg-black/60 backdrop-blur">
      <CardHeader className="py-4">
        <CardTitle>Upload files</CardTitle>
        <CardDescription>
          Add {selectedLanguage.label} files or use the inline editor below.
          Everything runs entirely in your browser.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs
          value={inputMode}
          onValueChange={(value) => onInputModeChange(value as "upload" | "inline")}
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
                onDragStateChange(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                onDragStateChange(false);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                onDragStateChange(false);
                onDrop(event);
              }}
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
                <p className="text-sm font-medium text-white">Inline editor</p>
                <p className="text-xs text-zinc-400">
                  Paste or write {selectedLanguage.label} code and add it as a
                  virtual file.
                </p>
              </div>
              <Input
                value={snippetName}
                onChange={(event) => onSnippetNameChange(event.target.value)}
                placeholder={`Snippet${selectedLanguage.extensions[0]}`}
                className="bg-black/40 text-sm text-white placeholder:text-zinc-500"
                spellCheck={false}
              />
              <Textarea
                value={snippetContent}
                onChange={(event) => onSnippetContentChange(event.target.value)}
                placeholder={snippetPlaceholder}
                rows={8}
                className="resize-none bg-black/40 text-sm text-white placeholder:text-zinc-500"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10"
                onClick={onAddSnippet}
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
            onClick={onClearFiles}
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
                    onClick={() => onRemoveFile(file.name)}
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
            onClick={onGenerate}
            disabled={!canGenerate}
          >
            Generate UML
          </Button>
          <p className="text-xs text-zinc-500">
            Generates from {files.length} file{files.length === 1 ? "" : "s"} currently in the
            queue.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
