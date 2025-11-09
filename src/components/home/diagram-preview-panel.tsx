import { Copy, Download, Loader2 } from "lucide-react";

import { MermaidRenderer } from "@/components/mermaid-renderer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DiagramResult } from "@/types/uml";

type DiagramPreviewPanelProps = {
  diagram: DiagramResult | null;
  svgMarkup: string;
  error: string | null;
  isParsing: boolean;
  onDownloadSvg: () => void;
  onCopyMermaid: () => void;
  onRendered: (markup: string) => void;
};

export function DiagramPreviewPanel({
  diagram,
  svgMarkup,
  error,
  isParsing,
  onDownloadSvg,
  onCopyMermaid,
  onRendered,
}: DiagramPreviewPanelProps) {
  const stats = getStats(diagram);

  return (
    <Card className="border-white/10 bg-black/70 backdrop-blur">
      <CardHeader className="flex flex-col gap-2 py-4">
        <CardTitle>Diagram preview</CardTitle>
        <CardDescription>
          Toggle between the rendered SVG and the generated Mermaid definition.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            className="bg-white/10 text-white hover:bg-white/20"
            onClick={onDownloadSvg}
            disabled={!svgMarkup}
          >
            <Download className="mr-2 h-4 w-4" />
            Save as SVG
          </Button>
          <Separator orientation="vertical" className="h-8 bg-white/20" />
          <Button
            variant="ghost"
            className="text-zinc-300 hover:text-white"
            onClick={onCopyMermaid}
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
                <MermaidRenderer chart={diagram?.mermaid ?? ""} onRendered={onRendered} />
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
  );
}

function getStats(diagram: DiagramResult | null) {
  if (!diagram) {
    return [];
  }
  const classes = diagram.entities.filter((entity) => entity.kind === "class").length;
  const interfaces = diagram.entities.filter((entity) => entity.kind === "interface").length;
  const records = diagram.entities.filter((entity) => entity.kind === "record").length;
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
}
