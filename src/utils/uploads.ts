import type { SourceFile } from "@/types/uml";

export type UploadedFile = SourceFile & {
  id: string;
  size: number;
};
