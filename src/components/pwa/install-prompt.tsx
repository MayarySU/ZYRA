"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// Extend the window object to include the beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Update UI to notify the user they can add to home screen
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // If app is already installed
    window.addEventListener("appinstalled", () => {
      setDeferredPrompt(null);
      setIsVisible(false);
      console.log("PWA was installed");
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsVisible(false);
    }
    
    // Clear the deferredPrompt variable, it can only be used once.
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-background border border-border rounded-xl shadow-2xl p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Instalar ZYRA</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Instala la aplicación para una experiencia más rápida y pantalla completa.
              </p>
            </div>
          </div>
          <button 
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <Button 
          onClick={handleInstallClick} 
          className="w-full bg-accent hover:bg-accent/90 text-white shadow-lg shadow-accent/20"
        >
          Instalar Aplicación
        </Button>
      </div>
    </div>
  );
}
