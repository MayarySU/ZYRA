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

export default function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Estados locales para simular la configuración
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState("es");
  const [fontSize, setFontSize] = useState([14]);
  const [themeColor, setThemeColor] = useState("zyra");

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

  const handleSaveSettings = () => {
    setLoading(true);
    // Persistimos en localStorage para esta demo
    localStorage.setItem('zyra-settings', JSON.stringify({
      darkMode,
      language,
      fontSize,
      themeColor
    }));
    
    setTimeout(() => {
      setLoading(false);
      toast({
        title: "Configuración guardada",
        description: "Tus preferencias se han aplicado en todo el sistema.",
      });
    }, 800);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 font-body">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Settings className="h-8 w-8 text-accent" /> Configuración del Sistema
          </h2>
          <p className="text-muted-foreground">Personaliza tu experiencia de usuario en ZYRA Command.</p>
        </div>

        <Tabs defaultValue="appearance" className="w-full">
          <TabsList className="bg-white/5 border-white/10 p-1 mb-6">
            <TabsTrigger value="appearance" className="data-[state=active]:bg-accent data-[state=active]:text-white gap-2">
              <Palette className="h-4 w-4" /> Apariencia
            </TabsTrigger>
            <TabsTrigger value="language" className="data-[state=active]:bg-accent data-[state=active]:text-white gap-2">
              <Globe className="h-4 w-4" /> Idioma
            </TabsTrigger>
            <TabsTrigger value="accessibility" className="data-[state=active]:bg-accent data-[state=active]:text-white gap-2">
              <Type className="h-4 w-4" /> Accesibilidad
            </TabsTrigger>
          </TabsList>

          {/* APARIENCIA */}
          <TabsContent value="appearance">
            <Card className="bg-card border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Palette className="h-5 w-5 text-accent" /> Visualización
                </CardTitle>
                <CardDescription>Controla el aspecto visual y el tema de colores.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/2 border border-white/5">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold text-white">Modo Oscuro</Label>
                    <p className="text-xs text-muted-foreground">Alternar entre tema claro y oscuro.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {darkMode ? <Moon className="h-4 w-4 text-accent" /> : <Sun className="h-4 w-4 text-yellow-500" />}
                    <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Esquema de Colores</Label>
                  <RadioGroup 
                    value={themeColor} 
                    onValueChange={setThemeColor}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4"
                  >
                    {[
                      { id: "zyra", label: "Zyra (Violeta)", color: "bg-[#8A2BE2]" },
                      { id: "emerald", label: "Esmeralda", color: "bg-emerald-500" },
                      { id: "cobalt", label: "Cobalto", color: "bg-blue-600" },
                      { id: "amber", label: "Ámbar", color: "bg-amber-500" },
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
                  <Languages className="h-5 w-5 text-accent" /> Localización
                </CardTitle>
                <CardDescription>Selecciona tu idioma de preferencia para la interfaz.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Idioma del Sistema</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="bg-white/5 border-white/10 h-12">
                      <SelectValue placeholder="Seleccionar idioma" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-white/10 text-white">
                      <SelectItem value="es">Español (Chile/Latam)</SelectItem>
                      <SelectItem value="en">English (US)</SelectItem>
                      <SelectItem value="zh">中文 (Chino Simplificado)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-4 rounded-xl bg-accent/5 border border-accent/10">
                  <p className="text-xs text-muted-foreground flex gap-2">
                    <Globe className="h-4 w-4 shrink-0 text-accent" />
                    Al cambiar el idioma, todas las etiquetas y mensajes del sistema se traducirán automáticamente. Algunos reportes históricos mantendrán su idioma original.
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
                  <Type className="h-5 w-5 text-accent" /> Adaptabilidad
                </CardTitle>
                <CardDescription>Ajusta el tamaño de los elementos para una mejor lectura.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Tamaño de Fuente Base</Label>
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
                  <p className="text-muted-foreground mb-4 text-xs italic">Vista previa del texto:</p>
                  <p style={{ fontSize: `${fontSize[0]}px` }} className="text-white leading-relaxed">
                    Este es un ejemplo de cómo se verá el texto en el panel operativo y los reportes de obra de ZYRA.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-4">
          <Button 
            variant="outline" 
            className="border-white/10 text-white hover:bg-white/5 px-8"
            onClick={() => window.history.back()}
          >
            Cancelar
          </Button>
          <Button 
            className="bg-accent hover:bg-accent/90 text-white font-bold px-8 gap-2 h-12"
            onClick={handleSaveSettings}
            disabled={loading}
          >
            {loading ? <span className="animate-spin mr-2">/</span> : <Save className="h-4 w-4" />}
            {loading ? "Guardando..." : "Guardar Configuración"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
