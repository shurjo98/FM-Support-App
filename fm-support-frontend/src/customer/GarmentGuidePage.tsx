import { useEffect, useState } from "react";
import { fetchGarmentRecommendations, searchPortal } from "../api";
import type { CustomerUser, GarmentRecommendation, GarmentType, Machine, NeedleProduct } from "../types";
import { useLang, type TranslationKey } from "./i18n";
import DetailModal from "./DetailModal";
import CallTechnicianButton from "./CallTechnicianButton";

const GARMENT_ICON: Record<GarmentType, string> = {
  SHIRTS: "👔",
  PANTS: "👖",
  JEANS: "🧵",
};

const GARMENT_LABEL_KEY: Record<GarmentType, TranslationKey> = {
  SHIRTS: "garment.SHIRTS",
  PANTS: "garment.PANTS",
  JEANS: "garment.JEANS",
};

function MachineChip({ machine, onClick }: { machine: Machine; onClick: () => void }) {
  return (
    <div className="cust-chip" onClick={onClick}>
      {machine.imageUrl && <img src={machine.imageUrl} alt={machine.name} />}
      <div>
        <div className="cust-chip-name">{machine.name}</div>
        <div className="cust-chip-sub">{machine.model}</div>
      </div>
    </div>
  );
}

function NeedleChip({ needle, onClick }: { needle: NeedleProduct; onClick: () => void }) {
  return (
    <div className="cust-chip" onClick={onClick}>
      <img src={needle.imageUrl} alt={needle.name} />
      <div>
        <div className="cust-chip-name">{needle.name}</div>
        <div className="cust-chip-sub">{needle.system}</div>
      </div>
    </div>
  );
}

export default function GarmentGuidePage({ user }: { user: CustomerUser }) {
  const { t, lang } = useLang();
  const [guide, setGuide] = useState<GarmentRecommendation[]>([]);
  const [selected, setSelected] = useState<GarmentType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailMachine, setDetailMachine] = useState<Machine | null>(null);
  const [detailNeedle, setDetailNeedle] = useState<NeedleProduct | null>(null);

  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    fetchGarmentRecommendations()
      .then(setGuide)
      .catch((err) => setError(err.message));
  }, []);

  const active = guide.find((g) => g.garment === selected) ?? null;
  const hasProcesses = Boolean(active?.processes?.length);

  async function askAi(garment: GarmentRecommendation) {
    setAiLoading(true);
    setAiAnswer(null);
    try {
      const result = await searchPortal(
        `What machine and needle should I use for sewing ${garment.name.toLowerCase()}?`,
        lang
      );
      setAiAnswer(result.message);
    } catch (err) {
      setAiAnswer(err instanceof Error ? err.message : "AI request failed");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div>
      <p className="cust-empty" style={{ marginBottom: 18 }}>
        {t("garments.intro")}
      </p>

      {error && <div className="cust-error">{error}</div>}

      <div className="cust-category-row">
        {guide.map((g) => (
          <div
            key={g.garment}
            className={`cust-card cust-card-clickable cust-category-card cust-garment-card ${
              selected === g.garment ? "selected" : ""
            }`}
            onClick={() => {
              setSelected(g.garment);
              setAiAnswer(null);
            }}
          >
            <div className="cust-garment-icon">{GARMENT_ICON[g.garment]}</div>
            <div className="cust-category-card-name">{t(GARMENT_LABEL_KEY[g.garment])}</div>
          </div>
        ))}
      </div>

      {active && (
        <div className="cust-card" style={{ marginTop: 8 }}>
          <p className="cust-empty" style={{ marginBottom: 18 }}>
            {active.description}
          </p>

          {hasProcesses ? (
            <>
              <h2 className="cust-section-title">{t("garments.productionProcess")}</h2>
              {active.processes!.map((proc) => (
                <div key={proc.name} className="cust-process-card">
                  <div className="cust-process-name">{proc.name}</div>
                  <div className="cust-process-description">{proc.description}</div>
                  <div className="cust-chip-row">
                    {proc.machines.map((m) => (
                      <MachineChip key={m.id} machine={m} onClick={() => setDetailMachine(m)} />
                    ))}
                    {proc.needles.map((n) => (
                      <NeedleChip key={n.id} needle={n} onClick={() => setDetailNeedle(n)} />
                    ))}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              <h2 className="cust-section-title">{t("garments.recommendedMachines")}</h2>
              <div className="cust-machine-grid" style={{ marginBottom: 24 }}>
                {active.machines.map((m) => (
                  <div
                    key={m.id}
                    className="cust-card cust-card-clickable cust-machine-option"
                    onClick={() => setDetailMachine(m)}
                  >
                    {m.imageUrl && <img src={m.imageUrl} alt={m.name} />}
                    <div className="cust-machine-option-name">{m.name}</div>
                    <div className="cust-machine-option-model">{m.model}</div>
                  </div>
                ))}
              </div>

              <h2 className="cust-section-title">{t("garments.recommendedNeedles")}</h2>
              <div className="cust-machine-grid" style={{ marginBottom: 24 }}>
                {active.needles.map((n) => (
                  <div
                    key={n.id}
                    className="cust-card cust-card-clickable cust-machine-option"
                    onClick={() => setDetailNeedle(n)}
                  >
                    <img src={n.imageUrl} alt={n.name} />
                    <div className="cust-machine-option-name">{n.name}</div>
                    <div className="cust-machine-option-model">{n.system}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          <button className="cust-button" onClick={() => askAi(active)} disabled={aiLoading}>
            {aiLoading ? t("garments.asking") : t("garments.askAi")}
          </button>

          {aiAnswer && (
            <div className="cust-search-result" style={{ marginTop: 14 }}>
              <div>{aiAnswer}</div>
              <CallTechnicianButton />
            </div>
          )}
        </div>
      )}

      {detailMachine && (
        <DetailModal
          title={detailMachine.name}
          subtitle={detailMachine.model}
          images={detailMachine.images?.length ? detailMachine.images : detailMachine.imageUrl ? [detailMachine.imageUrl] : []}
          description={detailMachine.description}
          onClose={() => setDetailMachine(null)}
        />
      )}

      {detailNeedle && (
        <DetailModal
          title={detailNeedle.name}
          subtitle={`${detailNeedle.brand} · ${detailNeedle.system}`}
          images={[detailNeedle.imageUrl]}
          description={detailNeedle.description}
          onClose={() => setDetailNeedle(null)}
        />
      )}
    </div>
  );
}
