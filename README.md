# Code2Uml

[code2uml.vercel.app](https://code2uml.vercel.app/) is a browser-based playground that converts source files into Mermaid class diagrams and renders them as SVG.

## Features

- Drag & drop uploader for files plus an inline editor to paste or prototype code.
- Language selector (currently C#) that enforces per-language extensions.
- Manual “Generate UML” button so you can curate a batch of files/snippets before rendering.
- Dual-preview surface: SVG diagram and the corresponding Mermaid source with copy/export actions.

## How to use

1. Open [code2uml.vercel.app](https://code2uml.vercel.app/).
2. Pick the programming language (C# is available today).
3. Either:
   - Drop one or more `.cs` files into the upload area, **or**
   - Switch to the “Inline editor” tab, paste/write code, and click “Add snippet as file”.
4. Review the file queue; remove or rename anything you don’t need.
5. Click **Generate UML** to parse the current queue.
6. Use the **Preview** tab to inspect the SVG (and download it), or switch to **Mermaid** to copy the generated DSL.
