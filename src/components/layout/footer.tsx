import { ExternalLink } from "lucide-react";
import { ShuttlecockIcon } from "@/components/brand/shuttlecock-icon";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-100 bg-white/60 backdrop-blur-sm">
      <div className="container mx-auto max-w-7xl px-4 py-4">
        <div className="flex flex-col items-center gap-1.5 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <ShuttlecockIcon className="w-3.5 h-3.5 text-gray-300" />
            <span>ShuttleArena</span>
            <span className="text-gray-200">·</span>
            <span>为热爱羽毛球的朋友们而做</span>
          </div>
          <div className="flex items-center gap-1">
            <span>by </span>
            <a
              href="https://bojiang.org"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-gray-400 hover:text-green-600 transition-colors"
            >
              Bojiang
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
