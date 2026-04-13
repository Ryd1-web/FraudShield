import { useState, useEffect } from "react";
import { useGetConfig, useUpdateConfig, useGetModelMetrics } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetConfigQueryKey, getGetModelMetricsQueryKey } from "@workspace/api-client-react";
import { Settings, Save, RefreshCw } from "lucide-react";

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
      <span className="text-sm font-medium">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted-foreground/30"}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-1"}`} />
      </button>
    </div>
  );
}

function SliderField({ label, value, min, max, step, onChange, description, format = "dec" }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; description: string; format?: "pct" | "dec";
}) {
  const display = format === "pct" ? `${Math.round(value * 100)}%` : value.toFixed(2);
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <label className="text-sm font-medium">{label}</label>
        <span className="text-sm font-bold text-primary">{display}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export default function Admin() {
  const queryClient = useQueryClient();
  const { data: configData, isLoading } = useGetConfig();
  const { data: metrics } = useGetModelMetrics();
  const updateMutation = useUpdateConfig();

  const [config, setConfig] = useState<any>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (configData && !config) {
      setConfig(configData);
    }
  }, [configData]);

  const handleSave = () => {
    updateMutation.mutate(config, {
      onSuccess: () => {
        setSaved(true);
        queryClient.invalidateQueries({ queryKey: getGetConfigQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetModelMetricsQueryKey() });
        setTimeout(() => setSaved(false), 2000);
      },
    });
  };

  const handleReset = () => {
    setConfig(configData);
  };

  if (isLoading || !config) {
    return (
      <div className="p-8 animate-pulse space-y-4 max-w-5xl mx-auto">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="grid grid-cols-2 gap-6">{[...Array(4)].map((_, i) => <div key={i} className="h-64 bg-muted rounded" />)}</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Research Panel</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure detection models, risk thresholds, and feature flags for research experiments</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Save className="h-4 w-4" />
            {saved ? "Saved!" : updateMutation.isPending ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Models */}
        <div className="bg-card border border-card-border rounded-lg p-6 space-y-1">
          <h2 className="font-semibold mb-1">Active Detection Models</h2>
          <p className="text-sm text-muted-foreground mb-4">Enable or disable components of the hybrid fraud detection ensemble</p>
          <Toggle
            label="Rule-Based Detection"
            checked={config.activeModels.ruleBased}
            onChange={v => setConfig((c: any) => ({ ...c, activeModels: { ...c.activeModels, ruleBased: v } }))}
          />
          <Toggle
            label="Anomaly Detection (Isolation Forest)"
            checked={config.activeModels.anomalyDetection}
            onChange={v => setConfig((c: any) => ({ ...c, activeModels: { ...c.activeModels, anomalyDetection: v } }))}
          />
          <Toggle
            label="Logistic Regression (Supervised)"
            checked={config.activeModels.logisticRegression}
            onChange={v => setConfig((c: any) => ({ ...c, activeModels: { ...c.activeModels, logisticRegression: v } }))}
          />

          <div className="mt-5 bg-muted/30 rounded-lg p-4 text-sm space-y-1.5">
            <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Model Architecture Note</p>
            <p className="text-xs text-muted-foreground">
              The ensemble combines outputs using configurable weights below. At minimum one model must remain active.
              In a production deployment, the supervised model would be periodically retrained on verified fraud labels.
            </p>
          </div>
        </div>

        {/* Risk Thresholds */}
        <div className="bg-card border border-card-border rounded-lg p-6 space-y-5">
          <h2 className="font-semibold mb-1">Risk Score Thresholds</h2>
          <p className="text-sm text-muted-foreground mb-2">Adjust classification boundaries for the 0–100 risk score</p>

          <SliderField
            label="Suspicious Threshold"
            value={config.thresholds.suspicious}
            min={10} max={60} step={5}
            onChange={v => setConfig((c: any) => ({ ...c, thresholds: { ...c.thresholds, suspicious: v } }))}
            description={`Score ≥ ${config.thresholds.suspicious} → flagged as Suspicious`}
            format="dec"
          />
          <SliderField
            label="Fraudulent Threshold"
            value={config.thresholds.fraudulent}
            min={50} max={90} step={5}
            onChange={v => setConfig((c: any) => ({ ...c, thresholds: { ...c.thresholds, fraudulent: v } }))}
            description={`Score ≥ ${config.thresholds.fraudulent} → classified as Fraudulent`}
            format="dec"
          />
          <SliderField
            label="Block Threshold"
            value={config.thresholds.block}
            min={70} max={98} step={1}
            onChange={v => setConfig((c: any) => ({ ...c, thresholds: { ...c.thresholds, block: v } }))}
            description={`Score ≥ ${config.thresholds.block} → transaction blocked`}
            format="dec"
          />

          {/* Threshold visualization */}
          <div className="relative h-6 bg-muted rounded-full overflow-hidden mt-2">
            <div className="absolute inset-0 flex">
              <div className="bg-emerald-200" style={{ width: `${config.thresholds.suspicious}%` }} />
              <div className="bg-amber-200" style={{ width: `${config.thresholds.fraudulent - config.thresholds.suspicious}%` }} />
              <div className="bg-red-200" style={{ width: `${config.thresholds.block - config.thresholds.fraudulent}%` }} />
              <div className="bg-red-500 flex-1" />
            </div>
            <div className="absolute inset-0 flex items-center justify-around text-xs font-medium text-foreground/70 px-2">
              <span>Clean</span><span>Suspicious</span><span>Fraud</span><span>Block</span>
            </div>
          </div>
        </div>

        {/* Ensemble Weights */}
        <div className="bg-card border border-card-border rounded-lg p-6 space-y-4">
          <h2 className="font-semibold">Ensemble Model Weights</h2>
          <p className="text-sm text-muted-foreground mb-2">Adjust the contribution of each model to the final risk score. Weights are normalized automatically.</p>

          <SliderField
            label="Rule-Based Weight"
            value={config.weights.ruleBased}
            min={0} max={1} step={0.05}
            onChange={v => setConfig((c: any) => ({ ...c, weights: { ...c.weights, ruleBased: v } }))}
            description="Contribution of deterministic rule engine to composite score"
            format="pct"
          />
          <SliderField
            label="Anomaly Detection Weight"
            value={config.weights.anomalyDetection}
            min={0} max={1} step={0.05}
            onChange={v => setConfig((c: any) => ({ ...c, weights: { ...c.weights, anomalyDetection: v } }))}
            description="Contribution of isolation forest-based anomaly scorer"
            format="pct"
          />
          <SliderField
            label="Logistic Regression Weight"
            value={config.weights.logisticRegression}
            min={0} max={1} step={0.05}
            onChange={v => setConfig((c: any) => ({ ...c, weights: { ...c.weights, logisticRegression: v } }))}
            description="Contribution of supervised classification model"
            format="pct"
          />
        </div>

        {/* Feature Flags */}
        <div className="bg-card border border-card-border rounded-lg p-6">
          <h2 className="font-semibold mb-1">Feature Flags</h2>
          <p className="text-sm text-muted-foreground mb-4">Toggle individual features for ablation study experiments</p>

          <Toggle
            label="Transaction Velocity Check"
            checked={config.featureFlags.velocityCheck}
            onChange={v => setConfig((c: any) => ({ ...c, featureFlags: { ...c.featureFlags, velocityCheck: v } }))}
          />
          <Toggle
            label="Geolocation Deviation"
            checked={config.featureFlags.geolocationCheck}
            onChange={v => setConfig((c: any) => ({ ...c, featureFlags: { ...c.featureFlags, geolocationCheck: v } }))}
          />
          <Toggle
            label="Device Fingerprint"
            checked={config.featureFlags.deviceFingerprint}
            onChange={v => setConfig((c: any) => ({ ...c, featureFlags: { ...c.featureFlags, deviceFingerprint: v } }))}
          />
          <Toggle
            label="Account Age Check"
            checked={config.featureFlags.accountAgeCheck}
            onChange={v => setConfig((c: any) => ({ ...c, featureFlags: { ...c.featureFlags, accountAgeCheck: v } }))}
          />
          <Toggle
            label="Amount Anomaly Detection"
            checked={config.featureFlags.amountAnomaly}
            onChange={v => setConfig((c: any) => ({ ...c, featureFlags: { ...c.featureFlags, amountAnomaly: v } }))}
          />
          <Toggle
            label="Time Pattern Analysis"
            checked={config.featureFlags.timePattern}
            onChange={v => setConfig((c: any) => ({ ...c, featureFlags: { ...c.featureFlags, timePattern: v } }))}
          />

          {/* Current metrics summary */}
          {metrics && (
            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                { label: "F1-Score", value: `${(metrics.f1Score * 100).toFixed(1)}%` },
                { label: "AUC-ROC", value: `${(metrics.auc * 100).toFixed(1)}%` },
                { label: "Recall", value: `${(metrics.recall * 100).toFixed(1)}%` },
              ].map(m => (
                <div key={m.label} className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className="font-bold text-primary mt-0.5">{m.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
