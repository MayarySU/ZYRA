
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

// Diccionario de traducciones para la página de configuración
const translations = {
  es: {
    title: "Configuración del Sistema",
    subtitle: "Personaliza tu experiencia de usuario en ZYRA Command.",
    appearance: "Apariencia",
    language: "Idioma",
    accessibility: "Accesibilidad",
    vizTitle: "Visualización",
    vizDesc: "Controla el aspecto visual y el tema de colores.",
    darkMode: "Modo Oscuro",
    darkModeDesc: "Alternar entre tema claro y oscuro.",
    colorScheme: "Esquema de Colores",
    colors: {
      zyra: "Zyra (Violeta)",
      emerald: "Esmeralda",
      cobalt: "Cobalto",
      amber: "Ámbar"
    },
    locTitle: "Localización",
    locDesc: "Selecciona tu idioma de preferencia para la interfaz.",
    sysLang: "Idioma del Sistema",
    langOptions: {
      es: "Español Latino",
      en: "English (US)",
      zh: "中文 (Chino Simplificado)"
    },
    langNote: "Al cambiar el idioma, las etiquetas y mensajes se traducirán automáticamente.",
    accTitle: "Adaptabilidad",
    accDesc: "Ajusta el tamaño de los elementos para una mejor lectura.",
    fontSize: "Tamaño de Fuente Base",
    preview: "Vista previa del texto:",
    previewTxt: "Este es un ejemplo de cómo se verá el texto en el panel operativo de ZYRA.",
    btnCancel: "Cancelar",
    btnSave: "Guardar Configuración",
    toastTitle: "Configuración guardada",
    toastDesc: "Tus preferencias se han aplicado correctamente.",
    saving: "Guardando..."
  },
  en: {
    title: "System Settings",
    subtitle: "Customize your user experience in ZYRA Command.",
    appearance: "Appearance",
    language: "Language",
    accessibility: "Accessibility",
    vizTitle: "Visualization",
    vizDesc: "Control the visual aspect and color theme.",
    darkMode: "Dark Mode",
    darkModeDesc: "Toggle between light and dark theme.",
    colorScheme: "Color Scheme",
    colors: {
      zyra: "Zyra (Violet)",
      emerald: "Emerald",
      cobalt: "Cobalt",
      amber: "Amber"
    },
    locTitle: "Localization",
    locDesc: "Select your preferred language for the interface.",
    sysLang: "System Language",
    langOptions: {
      es: "Latin Spanish",
      en: "English (US)",
      zh: "Chinese (Simplified)"
    },
    langNote: "Changing the language will automatically translate labels and messages.",
    accTitle: "Adaptability",
    accDesc: "Adjust the size of elements for better reading.",
    fontSize: "Base Font Size",
    preview: "Text preview:",
    previewTxt: "This is an example of how text will look in the ZYRA operations panel.",
    btnCancel: "Cancel",
    btnSave: "Save Settings",
    toastTitle: "Settings saved",
    toastDesc: "Your preferences have been successfully applied.",
    saving: "Saving..."
  },
  zh: {
    title: "系统设置",
    subtitle: "在 ZYRA Command 中自定义您的用户体验。",
    appearance: "外观",
    language: "语言",
    accessibility: "无障碍",
    vizTitle: "可视化",
    vizDesc: "控制视觉外观和颜色主题。",
    darkMode: "深色模式",
    darkModeDesc: "在浅色和深色主题之间切换。",
    colorScheme: "配色方案",
    colors: {
      zyra: "Zyra (紫色)",
      emerald: "祖母绿",
      cobalt: "钴蓝色",
      amber: "琥珀色"
    },
    locTitle: "本地化",
    locDesc: "为界面选择您首选的语言。",
    sysLang: "系统语言",
    langOptions: {
      es: "拉丁西班牙语",
      en: "英语 (美国)",
      zh: "中文 (简体)"
    },
    langNote: "更改语言将自动翻译标签和消息。",
    accTitle: "适应性",
    accDesc: "调整元素的大小以获得更好的阅读效果。",
    fontSize: "基础字体大小",
    preview: "文本预览：",
    previewTxt: "这是 ZYRA 操作面板中文字显示效果的示例。",
    btnCancel: "取消",
    btnSave: "保存设置",
    toastTitle: "设置已保存",
    toastDesc: "您的偏好已成功应用。",
    saving: "保存中..."
  }
};

export default function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Estados locales con persistencia inicial de localStorage si existe
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState("es");
  const [fontSize, setFontSize] = useState([14]);
  const [themeColor, setThemeColor] = useState("zyra");

  // Cargar configuración guardada al montar
  useEffect(() => {
    const saved = localStorage.getItem('zyra-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.darkMode !== undefined) setDarkMode(parsed.darkMode);
        if (parsed.language) setLanguage(parsed.language);
        if (parsed.fontSize) setFontSize(parsed.fontSize);
        if (parsed.themeColor) setThemeColor(parsed.themeColor);
      } catch (e) {
        console.error("Error loading settings", e);
      }
    }
  }, []);

  // Efecto para aplicar modo oscuro/claro
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Efecto para aplicar esquema de colores
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeColor);
  }, [themeColor]);

  // Efecto para aplicar tamaño de fuente
  useEffect(() => {
    document.documentElement.style.setProperty('--base-font-size', `${fontSize[0]}px`);
  }, [fontSize]);

  const t = translations[language as keyof typeof translations] || translations.es;

  const handleSaveSettings = () => {
    setLoading(true);
    localStorage.setItem('zyra-settings', JSON.stringify({
      darkMode,
      language,
      fontSize,
      themeColor
    }));
    
    setTimeout(() => {
      setLoading(false);
      toast({
        title: t.toastTitle,
        description: t.toastDesc,
      });
    }, 800);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 font-body">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Settings className="h-8 w-8 text-accent" /> {t.title}
          </h2>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>

        <Tabs defaultValue="appearance" className="w-full">
          <TabsList className="bg-white/5 border-white/10 p-1 mb-6">
            <TabsTrigger value="appearance" className="data-[state=active]:bg-accent data-[state=active]:text-white gap-2 text-xs">
              <Palette className="h-4 w-4" /> {t.appearance}
            </TabsTrigger>
            <TabsTrigger value="language" className="data-[state=active]:bg-accent data-[state=active]:text-white gap-2 text-xs">
              <Globe className="h-4 w-4" /> {t.language}
            </TabsTrigger>
            <TabsTrigger value="accessibility" className="data-[state=active]:bg-accent data-[state=active]:text-white gap-2 text-xs">
              <Type className="h-4 w-4" /> {t.accessibility}
            </TabsTrigger>
          </TabsList>

          {/* APARIENCIA */}
          <TabsContent value="appearance">
            <Card className="bg-card border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Palette className="h-5 w-5 text-accent" /> {t.vizTitle}
                </CardTitle>
                <CardDescription>{t.vizDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/2 border border-white/5">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold text-white">{t.darkMode}</Label>
                    <p className="text-xs text-muted-foreground">{t.darkModeDesc}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {darkMode ? <Moon className="h-4 w-4 text-accent" /> : <Sun className="h-4 w-4 text-yellow-500" />}
                    <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-xs uppercase font-bold text-muted-foreground tracking-widest">{t.colorScheme}</Label>
                  <RadioGroup 
                    value={themeColor} 
                    onValueChange={setThemeColor}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4"
                  >
                    {[
                      { id: "zyra", label: t.colors.zyra, color: "bg-[#8A2BE2]" },
                      { id: "emerald", label: t.colors.emerald, color: "bg-emerald-500" },
                      { id: "cobalt", label: t.colors.cobalt, color: "bg-blue-600" },
                      { id: "amber", label: t.colors.amber, color: "bg-amber-500" },
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

          {/* IDIOMA */}
          <TabsContent value="language">
            <Card className="bg-card border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Languages className="h-5 w-5 text-accent" /> {t.locTitle}
                </CardTitle>
                <CardDescription>{t.locDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-muted-foreground tracking-widest">{t.sysLang}</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="bg-white/5 border-white/10 h-12">
                      <SelectValue placeholder="Seleccionar idioma" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-white/10 text-white">
                      <SelectItem value="es">{t.langOptions.es}</SelectItem>
                      <SelectItem value="en">{t.langOptions.en}</SelectItem>
                      <SelectItem value="zh">{t.langOptions.zh}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-4 rounded-xl bg-accent/5 border border-accent/10">
                  <p className="text-xs text-muted-foreground flex gap-2">
                    <Globe className="h-4 w-4 shrink-0 text-accent" />
                    {t.langNote}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ACCESIBILIDAD */}
          <TabsContent value="accessibility">
            <Card className="bg-card border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Type className="h-5 w-5 text-accent" /> {t.accTitle}
                </CardTitle>
                <CardDescription>{t.accDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs uppercase font-bold text-muted-foreground tracking-widest">{t.fontSize}</Label>
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
                  <div className="flex justify-between text-[10px] text-muted-foreground font-bold">
                    <span>A</span>
                    <span>A+</span>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-white/2 border border-white/5">
                  <p className="text-muted-foreground mb-4 text-xs italic">{t.preview}</p>
                  <p style={{ fontSize: `${fontSize[0]}px` }} className="text-white leading-relaxed">
                    {t.previewTxt}
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
            {t.btnCancel}
          </Button>
          <Button 
            className="bg-accent hover:bg-accent/90 text-white font-bold px-8 gap-2 h-12"
            onClick={handleSaveSettings}
            disabled={loading}
          >
            {loading ? <span className="animate-spin mr-2">/</span> : <Save className="h-4 w-4" />}
            {loading ? t.saving : t.btnSave}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
