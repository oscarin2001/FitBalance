"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { usePasswordGate } from "@/components/usePasswordGate";

type MealTipo = string; // permitir variantes como Snack_manana / Snack_tarde

export default function ProfileMealsPage() {
  const [hours, setHours] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<boolean>(false);
  const { ensureConfirmed, dialog: pwdDialog } = usePasswordGate();
  const [enabledMeals, setEnabledMeals] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Cargar horarios actuales
        const res = await fetch("/api/account/meal-plan/schedule", { cache: "no-store" });
        if (res.ok) {
          const j = await res.json();
          if (j?.schedule && typeof j.schedule === "object") setHours(j.schedule);
        }
        // Cargar preferencias para saber qué comidas están activadas
        const prof = await fetch("/api/account/profile", { cache: "no-store" });
        if (prof.ok) {
          const pj = await prof.json().catch(() => ({}));
          let prefs = pj?.user?.preferencias_alimentos ?? null;
          if (prefs && typeof prefs === 'string') { try { prefs = JSON.parse(prefs); } catch { prefs = null; } }
          const enabled = prefs && typeof prefs === 'object' ? (prefs.enabledMeals || null) : null;
          setEnabledMeals(enabled);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  async function save(tipo: MealTipo, hora: string) {
    try {
      const res = await fetch("/api/account/meal-plan/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, hora }),
      });
      if (!res.ok) throw new Error();
    } catch {
      throw new Error("save_failed");
    }
  }

  // Lista dinámica de tipos, según enabledMeals y schedule
  const ORDER_DYNAMIC: MealTipo[] = useMemo(() => {
    const base: MealTipo[] = ["Desayuno", "Almuerzo", "Cena"];
    const keys = new Set<string>(Object.keys(hours || {}));
    const bothSnacksEnabled = !!(enabledMeals?.["snack_mañana"] || enabledMeals?.snack_manana) && !!enabledMeals?.snack_tarde;
    const hasVariants = keys.has('Snack_manana') || keys.has('Snack_mañana') || keys.has('Snack_tarde');
    if (bothSnacksEnabled || hasVariants) {
      base.push('Snack_manana', 'Snack_tarde');
    } else {
      base.push('Snack');
    }
    // Añadir cualquier clave extra no contemplada, pero omitir Snack si hay variantes
    for (const k of keys) {
      if ((bothSnacksEnabled || hasVariants) && k === 'Snack') continue;
      if (!base.includes(k)) base.push(k);
    }
    // Ordenar por hora ascendente cuando exista (HH:MM); faltantes al final
    const toMin = (v?: string) => (v && /^\d{2}:\d{2}$/.test(v)) ? (parseInt(v.slice(0,2))*60 + parseInt(v.slice(3,5))) : Number.POSITIVE_INFINITY;
    return [...base].sort((a,b) => toMin(hours[a]) - toMin(hours[b]));
  }, [hours, enabledMeals]);

  async function saveAll() {
    setSaving(true);
    try {
      for (const tipo of ORDER_DYNAMIC) {
        const hora = hours[tipo];
        if (hora && /^\d{2}:\d{2}$/.test(hora)) {
          await save(tipo, hora);
        }
      }
      toast.success("Horarios guardados");
    } catch {
      toast.error("No se pudieron guardar los horarios");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Plan de comidas</h1>
        <p className="text-sm text-muted-foreground">Definido automáticamente por la IA • Configura tus horarios</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Horarios diarios</CardTitle>
          <CardDescription>Ajusta el horario de cada comida según tu rutina.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-5 text-sm">
            <p className="text-muted-foreground">
              Tu planificación diaria de comidas es generada por nuestro modelo de IA. Puedes ajustar aquí los <strong>horarios</strong> a tu preferencia; estos permanecerán fijos hasta que los cambies.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ORDER_DYNAMIC.map((tipo) => (
                <div key={tipo} className="space-y-1">
                  <Label htmlFor={`h-${tipo}`}>
                    {tipo === 'Snack_manana' || tipo === 'Snack_mañana' ? 'Snack mañana' : (tipo === 'Snack_tarde' ? 'Snack tarde' : tipo)}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id={`h-${tipo}`}
                      type="time"
                      value={hours[tipo] || ""}
                      onChange={(e) => setHours((prev) => ({ ...prev, [tipo]: e.target.value }))}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={loading || !/^\d{2}:\d{2}$/.test((hours[tipo] || ""))}
                      onClick={() => ensureConfirmed(async () => {
                        try {
                          await save(tipo, hours[tipo]!);
                          toast.success(`${tipo}: guardado`);
                        } catch {
                          toast.error(`${tipo}: error al guardar`);
                        }
                      })}
                    >
                      Guardar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button onClick={() => ensureConfirmed(saveAll)} disabled={saving || loading}>{saving ? "Guardando…" : "Guardar todos"}</Button>
              <span className="text-xs text-muted-foreground">Puedes ver el plan en <Link href="/dashboard/plan" className="underline">Plan</Link> o registrar comidas en el <Link href="/dashboard" className="underline">Dashboard</Link>.</span>
            </div>
          </div>
          <Toaster richColors />
          {pwdDialog}
        </CardContent>
      </Card>
    </div>
  );
}
