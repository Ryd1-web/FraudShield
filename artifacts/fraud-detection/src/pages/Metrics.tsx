import { useGetModelMetrics, useGetRocCurve, useGetTransactionVolume } from "@workspace/api-client-react";
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend, ScatterChart, Scatter
} from "recharts";

function MetricGauge({ label, value, max = 1, format = "pct", description, color = "blue" }: {
  label: string; value: number; max?: number; format?: "pct" | "int" | "dec"; description: string; color?: string;
}) {
  const pct = (value / max) * 100;
  const display = format === "pct" ? `${(value * 100).toFixed(1)}%`
    : format === "int" ? String(value)
    : value.toFixed(3);

  const colorMap: Record<string, string> = {
    blue: "text-blue-600", green: "text-emerald-600", amber: "text-amber-600",
    red: "text-red-600", purple: "text-purple-600", indigo: "text-indigo-600",
  };
  const bgMap: Record<string, string> = {
    blue: "bg-blue-500", green: "bg-emerald-500", amber: "bg-amber-500",
    red: "bg-red-500", purple: "bg-purple-500", indigo: "bg-indigo-500",
  };

  return (
    <div className="bg-card border border-card-border rounded-lg p-5 space-y-3">
      <div className="flex justify-between items-start">
        <p className="text-sm font-semibold text-muted-foreground">{label}</p>
        <span className={`text-2xl font-black ${colorMap[color]}`}>{display}</span>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${bgMap[color]}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function ConfusionMatrix({ tp, tn, fp, fn }: { tp: number; tn: number; fp: number; fn: number }) {
  const total = tp + tn + fp + fn;
  const cells = [
    { label: "True Positive", value: tp, sub: "Correctly flagged fraud", color: "bg-emerald-100 border-emerald-300 text-emerald-800" },
    { label: "False Positive", value: fp, sub: "Clean tx flagged (false alarm)", color: "bg-amber-100 border-amber-300 text-amber-800" },
    { label: "False Negative", value: fn, sub: "Fraud missed (most critical)", color: "bg-red-100 border-red-300 text-red-800" },
    { label: "True Negative", value: tn, sub: "Correctly cleared clean tx", color: "bg-blue-100 border-blue-300 text-blue-800" },
  ];

  return (
    <div className="bg-card border border-card-border rounded-lg p-6">
      <h2 className="font-semibold mb-1">Confusion Matrix</h2>
      <p className="text-sm text-muted-foreground mb-4">Classification results across {total} evaluated transactions</p>
      <div className="grid grid-cols-2 gap-3">
        {cells.map(c => (
          <div key={c.label} className={`border rounded-lg p-4 ${c.color}`}>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{c.label}</p>
            <p className="text-3xl font-black mt-1">{c.value}</p>
            <p className="text-xs mt-1 opacity-70">{c.sub}</p>
            {total > 0 && <p className="text-xs mt-1 opacity-60">{((c.value / total) * 100).toFixed(1)}% of dataset</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

const CustomRocTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-card border border-card-border rounded-lg p-3 text-xs shadow-lg">
        <p className="font-semibold mb-1">Threshold: {d.threshold}</p>
        <p>TPR (Recall): <strong>{(d.tpr * 100).toFixed(1)}%</strong></p>
        <p>FPR: <strong>{(d.fpr * 100).toFixed(1)}%</strong></p>
      </div>
    );
  }
  return null;
};

export default function Metrics() {
  const { data: metrics, isLoading: metricsLoading } = useGetModelMetrics();
  const { data: rocData, isLoading: rocLoading } = useGetRocCurve();
  const { data: volumeData, isLoading: volumeLoading } = useGetTransactionVolume();

  const isLoading = metricsLoading || rocLoading;

  if (isLoading) {
    return (
      <div className="p-8 space-y-6 animate-pulse max-w-6xl mx-auto">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="grid grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <div key={i} className="h-28 bg-muted rounded" />)}</div>
        <div className="grid grid-cols-2 gap-6">{[...Array(2)].map((_, i) => <div key={i} className="h-72 bg-muted rounded" />)}</div>
      </div>
    );
  }

  const m = metrics!;
  const rocPoints = (rocData?.points ?? []).sort((a, b) => a.fpr - b.fpr);
  const diagLine = [{ fpr: 0, tpr: 0 }, { fpr: 1, tpr: 1 }];

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Evaluation Metrics</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Model performance evaluation across precision, recall, F1-score, and ROC-AUC — the standard research benchmarks for imbalanced fraud detection
        </p>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MetricGauge label="Precision" value={m.precision} description="Of all flagged transactions, what fraction were actually fraudulent?" color="blue" />
        <MetricGauge label="Recall (Sensitivity)" value={m.recall} description="Of all actual frauds, what fraction did the model catch?" color="green" />
        <MetricGauge label="F1-Score" value={m.f1Score} description="Harmonic mean of precision and recall — key metric for imbalanced datasets" color="purple" />
        <MetricGauge label="Accuracy" value={m.accuracy} description="Overall percentage of correct predictions across all classes" color="indigo" />
        <MetricGauge label="Specificity" value={m.specificity} description="True Negative Rate — ability to correctly identify legitimate transactions" color="amber" />
        <MetricGauge label="AUC-ROC" value={m.auc} description="Area Under ROC Curve — discriminative ability of the classifier (1.0 = perfect)" color="blue" />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-card-border rounded-lg p-5">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Error Rates</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-sm">False Positive Rate</span>
              <span className="text-sm font-semibold text-amber-600">{(m.falsePositiveRate * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-sm">False Negative Rate</span>
              <span className="text-sm font-semibold text-red-600">{(m.falseNegativeRate * 100).toFixed(1)}%</span>
            </div>
            <div className="pt-1 text-xs text-muted-foreground">
              Note: In fraud detection, False Negatives (missed fraud) are typically more costly than False Positives (false alarms). The model is tuned to minimize FNR.
            </div>
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-lg p-5">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Research Benchmark Comparison</h3>
          <div className="space-y-2 text-sm">
            {[
              { metric: "F1-Score", ours: m.f1Score, baseline: 0.78, label: "vs. Random Forest baseline" },
              { metric: "AUC-ROC", ours: m.auc, baseline: 0.85, label: "vs. Logistic Regression alone" },
              { metric: "Precision", ours: m.precision, baseline: 0.74, label: "vs. Rule-based only" },
            ].map(row => (
              <div key={row.metric} className="py-1.5 border-b border-border/40">
                <div className="flex justify-between">
                  <span className="font-medium">{row.metric}</span>
                  <div className="flex gap-4 text-right">
                    <span className="text-blue-600 font-semibold">{(row.ours * 100).toFixed(1)}%</span>
                    <span className="text-muted-foreground">{(row.baseline * 100).toFixed(1)}%</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{row.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ROC Curve */}
      <div className="bg-card border border-card-border rounded-lg p-6">
        <div className="flex items-baseline gap-3 mb-1">
          <h2 className="font-semibold">ROC Curve</h2>
          <span className="text-sm text-muted-foreground">AUC = <span className="font-bold text-blue-600">{rocData?.auc?.toFixed(3) ?? "—"}</span></span>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Receiver Operating Characteristic curve — True Positive Rate vs. False Positive Rate across all decision thresholds.
          The diagonal represents a random classifier. The larger the area under the curve, the better the model discriminates between legitimate and fraudulent transactions.
        </p>
        {rocLoading ? (
          <div className="h-64 bg-muted animate-pulse rounded" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart margin={{ top: 5, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="fpr"
                type="number"
                domain={[0, 1]}
                tickCount={6}
                tick={{ fontSize: 11 }}
                label={{ value: "False Positive Rate (1 - Specificity)", position: "insideBottom", offset: -10, fontSize: 12 }}
              />
              <YAxis
                type="number"
                domain={[0, 1]}
                tickCount={6}
                tick={{ fontSize: 11 }}
                label={{ value: "True Positive Rate (Recall)", angle: -90, position: "insideLeft", offset: 10, fontSize: 12 }}
              />
              <Tooltip content={<CustomRocTooltip />} />
              {/* Random classifier diagonal */}
              <Line
                data={diagLine}
                dataKey="tpr"
                stroke="#94a3b8"
                strokeDasharray="5 5"
                strokeWidth={1.5}
                dot={false}
                name="Random Classifier"
              />
              {/* Actual ROC */}
              <Line
                data={rocPoints}
                dataKey="tpr"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={false}
                name={`Hybrid Model (AUC=${rocData?.auc?.toFixed(3)})`}
              />
              <Legend verticalAlign="top" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Transaction Volume Chart */}
      {!volumeLoading && (volumeData?.data ?? []).length > 0 && (
        <div className="bg-card border border-card-border rounded-lg p-6">
          <h2 className="font-semibold mb-1">Transaction Volume Over Time</h2>
          <p className="text-sm text-muted-foreground mb-4">Breakdown by fraud label across time periods</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={volumeData!.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="clean" name="Clean" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
              <Area type="monotone" dataKey="suspicious" name="Suspicious" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
              <Area type="monotone" dataKey="fraudulent" name="Fraudulent" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Confusion Matrix */}
      <ConfusionMatrix tp={m.truePositives} tn={m.trueNegatives} fp={m.falsePositives} fn={m.falseNegatives} />
    </div>
  );
}
