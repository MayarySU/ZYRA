"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "../dashboard/layout";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription,
  CardFooter 
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Moon, Sun, Languages, Type, Palette, Save, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/providers/i18n-provider";
import { Language } from "@/app/lib/i18n";

export default function SettingsPage() {
  const { toast } = useToast();
  const { language, setLanguage, t } = useI18n();
  const [loading, setLoading] = useState(false);

  // Appearance states
  const [darkMode, setDarkMode] = useState(true);
  const [fontSize, setFontSize] = useState([14]);
  const [themeColor, setThemeColor] = useState("zyra");

  // Load existing settings on mount (except language which is managed by I18nProvider)
  useEffect(() => {
    const saved = localStorage.getItem('zyra-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.darkMode !== undefined) setDarkMode(parsed.darkMode);
        if (parsed.fontSize) setFontSize(parsed.fontSize);
        if (parsed.themeColor) setThemeColor(parsed.themeColor);
      } catch (e) {
        console.error("Error loading settings", e);
      }
    }
  }, []);

  // Theme effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Color scheme effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeColor);
  }, [themeColor]);

  // Font size effect
  useEffect(() => {
    document.documentElement.style.setProperty('--base-font-size', `${fontSize[0]}px`);
  }, [fontSize]);

  const handleSaveSettings = () => {
    setLoading(true);
    localStorage.setItem('zyra-settings', JSON.stringify({
      darkMode,
      fontSize,
      themeColor
    }));
    
    setTimeout(() => {
      setLoading(false);
      toast({
        title: t.common.success,
        description: t.settings.acc_title + " " + t.common.success,
      });
    }, 800);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 font-body">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Settings className="h-8 w-8 text-accent" /> {t.settings.title}
          </h2>
          <p className="text-muted-foreground">{t.settings.subtitle}</p>
        </div>

        <Tabs defaultValue="appearance" className="w-full">
          <TabsList className="bg-white/5 border-white/10 p-1 mb-6">
            <TabsTrigger value="appearance" className="data-[state=active]:bg-accent data-[state=active]:text-white gap-2 text-xs">
              <Palette className="h-4 w-4" /> {t.settings.appearance}
            </TabsTrigger>
            <TabsTrigger value="language" className="data-[state=active]:bg-accent data-[state=active]:text-white gap-2 text-xs">
              <Globe className="h-4 w-4" /> {t.settings.language}
            </TabsTrigger>
            <TabsTrigger value="accessibility" className="data-[state=active]:bg-accent data-[state=active]:text-white gap-2 text-xs">
              <Type className="h-4 w-4" /> {t.settings.accessibility}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appearance">
            <Card className="bg-card border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Palette className="h-5 w-5 text-accent" /> {t.settings.viz_title}
                </CardTitle>
                <CardDescription>{t.settings.viz_desc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/2 border border-white/5">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold text-white">{t.settings.dark_mode}</Label>
                    <p className="text-xs text-muted-foreground">{t.settings.dark_mode_desc}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {darkMode ? <Moon className="h-4 w-4 text-accent" /> : <Sun className="h-4 w-4 text-yellow-500" />}
                    <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-xs uppercase font-bold text-muted-foreground tracking-widest">{t.settings.color_scheme}</Label>
                  <RadioGroup 
                    value={themeColor} 
                    onValueChange={setThemeColor}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4"
                  >
                    {[
                      { id: "zyra", label: t.settings.colors.zyra, color: "bg-[#8A2BE2]" },
                      { id: "emerald", label: t.settings.colors.emerald, color: "bg-emerald-500" },
                      { id: "cobalt", label: t.settings.colors.cobalt, color: "bg-blue-600" },
                      { id: "amber", label: t.settings.colors.amber, color: "bg-amber-500" },
                    ].map((theme) => (
                      <div key={theme.id} className="relative">
                        <RadioGroupItem
                          value={theme.id}
                          id={theme.id}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={theme.id}
                          className={cn(
                            "flex flex-col items-center justify-between rounded-xl border-2 border-white/5 bg-white/2 p-4 hover:bg-white/5 peer-data-[state=checked]:border-accent cursor-pointer transition-all",
                            themeColor === theme.id && "border-accent bg-accent/5"
                          )}
                        >
                          <div className={cn("h-6 w-6 rounded-full mb-2", theme.color)} />
                          <span className="text-[10px] font-bold text-center">{theme.label}</span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="language">
            <Card className="bg-card border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Languages className="h-5 w-5 text-accent" /> {t.settings.loc_title}
                </CardTitle>
                <CardDescription>{t.settings.loc_desc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-muted-foreground tracking-widest">{t.settings.sys_lang}</Label>
                  <Select value={language} onValueChange={(val) => setLanguage(val as Language)}>
                    <SelectTrigger className="bg-white/5 border-white/10 h-12">
                      <SelectValue placeholder={t.settings.sys_lang} />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-white/10 text-white">
                      <SelectItem value="es">{t.settings.lang_options.es}</SelectItem>
                      <SelectItem value="en">{t.settings.lang_options.en}</SelectItem>
                      <SelectItem value="zh">{t.settings.lang_options.zh}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="accessibility">
            <Card className="bg-card border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Type className="h-5 w-5 text-accent" /> {t.settings.acc_title}
                </CardTitle>
                <CardDescription>{t.settings.acc_desc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs uppercase font-bold text-muted-foreground tracking-widest">{t.settings.font_size}</Label>
                    <span className="text-sm font-bold text-accent">{fontSize[0]}px</span>
                  </div>
                  <div className="px-2">
                    <Slider
                      value={fontSize}
                      onValueChange={setFontSize}
                      max={20}
                      min={12}
                      step={1}
                      className="py-4"
                    />
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-white/2 border border-white/5">
                  <p className="text-muted-foreground mb-4 text-xs italic">{t.settings.preview}</p>
                  <p style={{ fontSize: `${fontSize[0]}px` }} className="text-white leading-relaxed">
                    {t.settings.preview_txt}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-4 pb-20 md:pb-0">
          <Button 
            variant="outline" 
            className="border-white/10 text-white hover:bg-white/5 px-8"
            onClick={() => window.history.back()}
          >
            {t.common.cancel}
          </Button>
          <Button 
            className="bg-accent hover:bg-accent/90 text-white font-bold px-8 gap-2 h-12"
            onClick={handleSaveSettings}
            disabled={loading}
          >
            {loading ? <span className="animate-spin mr-2">/</span> : <Save className="h-4 w-4" />}
            {loading ? t.common.loading : t.common.save}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
