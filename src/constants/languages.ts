import type { SupportedLanguage } from "@/services/diagram";

export type LanguageOption = {
  id: SupportedLanguage;
  label: string;
  extensions: string[];
  accept: string;
};

export const LANGUAGES: LanguageOption[] = [
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
  {
    id: "python",
    label: "Python",
    extensions: [".py"],
    accept: ".py",
  },
];

export const SNIPPET_PLACEHOLDERS: Record<SupportedLanguage, string> = {
  csharp: `public class DemoService
{
    public string Greet(string name) => $"Hello {name}";
}`,
  java: `public class DemoService {
    private final String name;

    public DemoService(String name) {
        this.name = name;
    }
}`,
  python: `class DemoService:
    def __init__(self, name: str):
        self.name = name

    def greet(self):
        return f"Hello {self.name}"`,
};
