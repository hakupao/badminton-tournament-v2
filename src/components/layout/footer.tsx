import { Globe, Github, Mail } from "lucide-react";
import { ShuttlecockIcon } from "@/components/brand/shuttlecock-icon";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-100 bg-white/60 backdrop-blur-sm">
      <div className="container mx-auto max-w-7xl px-4 py-5 md:py-6">
        <div className="flex items-start justify-between text-xs text-gray-400 max-w-none sm:max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto sm:mx-auto md:mx-auto lg:mx-auto">
          {/* Left: brand */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <ShuttlecockIcon className="w-3.5 h-3.5 text-gray-300" />
              <span className="font-medium text-gray-500">ShuttleArena</span>
            </div>
            <span className="text-gray-300 pl-5">by Bojiang</span>
          </div>

          {/* Right: tagline + links */}
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-gray-400">为热爱羽毛球的朋友们而做</span>
            <div className="flex items-center gap-3">
              <a
                href="https://bojiang.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-green-600 transition-colors"
                aria-label="个人主页"
              >
                <Globe className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://github.com/hakupao/badminton-tournament-v2"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-gray-700 transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-3.5 h-3.5" />
              </a>
              <a
                href="mailto:cnhakupao@yahoo.co.jp"
                className="text-gray-300 hover:text-blue-500 transition-colors"
                aria-label="发送邮件"
              >
                <Mail className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
