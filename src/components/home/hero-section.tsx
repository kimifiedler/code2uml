import { SupportedLanguage } from "@/services/diagram";
import { LanguageOption } from "@/constants/languages";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type HeroSectionProps = {
  language: SupportedLanguage;
  languages: LanguageOption[];
  onLanguageChange: (language: SupportedLanguage) => void;
};

export function HeroSection({
  language,
  languages,
  onLanguageChange,
}: HeroSectionProps) {
  return (
    <section className="flex flex-col gap-5 text-center lg:text-left">
      <div className="text-3xl font-semibold tracking-tight text-white lg:self-start">
        Code2UML
      </div>
      <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
        Turn source files into clean UML diagrams
      </h1>
      <p className="text-base text-zinc-300 sm:text-lg">
        Drop your files, generate Mermaid instantly, and preview the SVG without
        leaving the browser.
      </p>
      <div className="flex flex-col gap-2 text-left sm:flex-row sm:items-center sm:gap-4">
        <span className="text-sm uppercase tracking-wide text-zinc-400">
          Language
        </span>
        <Select
          value={language}
          onValueChange={(value) => onLanguageChange(value as SupportedLanguage)}
        >
          <SelectTrigger className="w-full max-w-xs bg-black/40 text-left text-sm text-white">
            <SelectValue placeholder="Choose language" />
          </SelectTrigger>
          <SelectContent className="bg-neutral-900 text-white">
            {languages.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </section>
  );
}
