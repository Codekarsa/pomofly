'use client'
import React from 'react';
import { Github } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const Footer: React.FC = () => (
    <footer className="bg-background border-t py-2 text-sm text-muted-foreground mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-4">
            <span>© 2024 Pomofly</span>
            <Separator orientation="vertical" className="h-4" />
            <a href="/#" className="hover:underline">Privacy</a>
            <a href="/#" className="hover:underline">Terms</a>
          </div>
          <div className="flex items-center space-x-4">
            <span>Made with ❤️ by Codekarsa</span>
            <Button variant="ghost" size="icon">
              <Github className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );

  export default Footer;
