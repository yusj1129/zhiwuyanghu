import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatVarietyFamilyField, type VarietyTaxonomyEntry, type VarietyTaxonomyHit } from '@/lib/varietyTaxonomy';
import { db } from '@/lib/supabase';

export type VarietySpeciesFamilyFieldsProps = {
  species: string;
  family: string;
  onSpeciesChange: (species: string) => void;
  onFamilyChange: (family: string) => void;
  speciesId: string;
  speciesName: string;
  familyId: string;
  familyName: string;
  /** 弹窗从关闭到打开时置为 true，用于重置手改科属状态 */
  dialogOpen: boolean;
  gridClassName?: string;
};

export function VarietySpeciesFamilyFields({
  species,
  family,
  onSpeciesChange,
  onFamilyChange,
  speciesId,
  speciesName,
  familyId,
  familyName,
  dialogOpen,
  gridClassName = 'grid grid-cols-2 gap-3',
}: VarietySpeciesFamilyFieldsProps) {
  const [debouncedSpecies, setDebouncedSpecies] = useState(species);
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSpecies(species), 320);
    return () => window.clearTimeout(t);
  }, [species]);

  const [ranked, setRanked] = useState<VarietyTaxonomyHit[]>([]);
  useEffect(() => {
    const q = debouncedSpecies.trim();
    let cancelled = false;
    if (!q) {
      setRanked([]);
      return;
    }
    void (async () => {
      const hits = await db.searchPlantVarieties(q, 10);
      if (!cancelled) setRanked(hits);
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedSpecies]);

  const familyTouchedRef = useRef(false);
  const lastAutoFamilyRef = useRef('');

  useEffect(() => {
    if (!dialogOpen) return;
    familyTouchedRef.current = false;
    lastAutoFamilyRef.current = '';
  }, [dialogOpen]);

  useEffect(() => {
    const q = debouncedSpecies.trim();
    if (!q) return;

    const exactHits = ranked.filter((h) => h.score === 100);
    if (exactHits.length !== 1) return;
    if (familyTouchedRef.current) return;

    const formatted = formatVarietyFamilyField(exactHits[0].entry);
    const fam = family.trim();
    if (!fam || fam === lastAutoFamilyRef.current) {
      lastAutoFamilyRef.current = formatted;
      if (fam !== formatted) {
        onFamilyChange(formatted);
      }
    }
  }, [debouncedSpecies, ranked, family, onFamilyChange]);

  const applyEntry = (entry: VarietyTaxonomyEntry) => {
    familyTouchedRef.current = false;
    const f = formatVarietyFamilyField(entry);
    lastAutoFamilyRef.current = f;
    onFamilyChange(f);
  };

  const showChips = debouncedSpecies.trim().length > 0 && ranked.length > 0;

  return (
    <div className="space-y-2">
      <div className={gridClassName}>
        <div className="space-y-2">
          <Label htmlFor={speciesId} className="text-foreground font-medium">
            品种 *
          </Label>
          <Input
            id={speciesId}
            name={speciesName}
            placeholder="如：龟背竹"
            value={species}
            onChange={(e) => onSpeciesChange(e.target.value)}
            className="rounded-xl h-12 border-border focus:border-[#4CAF50] transition-all"
            required
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={familyId} className="text-foreground font-medium">
            科属
          </Label>
          <Input
            id={familyId}
            name={familyName}
            placeholder="由品种库自动带出，可手改"
            value={family}
            onChange={(e) => {
              familyTouchedRef.current = true;
              onFamilyChange(e.target.value);
            }}
            className="rounded-xl h-12 border-border focus:border-[#4CAF50] transition-all"
            autoComplete="off"
          />
        </div>
      </div>
      {showChips && (
        <div className="space-y-1.5 pt-0.5">
          <p className="text-[11px] text-muted-foreground leading-snug">
            品种名检索 Supabase 品种库，点击填入科属；完全匹配时自动填入（Mock 或未部署 RPC 时用本地兜底）。
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ranked.map((hit) => {
              const e = hit.entry;
              const label = `${e.names[0]} · ${formatVarietyFamilyField(e)}`;
              const k = `${e.family}|${e.genus}|${e.names[0]}`;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => applyEntry(e)}
                  className="max-w-full text-left text-[11px] leading-tight px-2.5 py-1.5 rounded-xl bg-muted/80 text-foreground border border-border hover:bg-[#E8F5E9] hover:border-[#4CAF50]/40 active:scale-[0.98] transition-colors"
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
