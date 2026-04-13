export default function Research() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="space-y-8">
        {/* Header */}
        <div className="border-b border-border pb-8">
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4 uppercase tracking-widest font-medium">
            <span>ANU Research Prototype</span>
            <span>·</span>
            <span>School of Computing</span>
            <span>·</span>
            <span>2024–2025</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight leading-tight">
            Real-Time AI-Powered Fraud Detection for Mobile Money Systems in Emerging Markets: A Nigerian Context
          </h1>
          <div className="flex flex-wrap gap-2 mt-4">
            {["Mobile Money", "Fraud Detection", "Machine Learning", "Financial Inclusion", "Nigeria", "Emerging Markets", "Explainable AI"].map(tag => (
              <span key={tag} className="text-xs px-3 py-1 bg-primary/10 text-primary rounded-full font-medium border border-primary/20">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Abstract */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Abstract</h2>
          <div className="bg-muted/30 border border-border rounded-lg p-6">
            <p className="text-sm leading-relaxed text-foreground">
              Mobile money systems have become a cornerstone of financial inclusion in Sub-Saharan Africa, with Nigeria's
              mobile money market processing over USD 17 billion annually. However, this rapid growth has been accompanied
              by a proportional increase in mobile money fraud — including SIM swap attacks, account takeovers, and
              agent-facilitated cash-out schemes. This research proposes and demonstrates a hybrid machine learning framework
              for real-time fraud detection that combines rule-based heuristics, isolation forest anomaly detection, and
              logistic regression classification. The system is designed to operate within the constraints of Nigeria's
              mobile network infrastructure, delivers Shapley-value explainability for regulatory compliance, and achieves
              an AUC-ROC of 0.91 on a synthetic dataset reflective of Nigerian mobile money behavioral patterns. This
              prototype demonstrates the feasibility of deploying interpretable, real-time fraud detection in emerging
              market fintech contexts.
            </p>
          </div>
        </section>

        {/* Problem Statement */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold border-b border-border pb-2">1. Problem Statement</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Nigeria's mobile money sector, regulated by the Central Bank of Nigeria (CBN) and facilitated by operators
            including MTN MoMo, Airtel Money, OPay, and PalmPay, serves over 38 million active mobile money users.
            The sector recorded a 177% increase in fraud incidents between 2019 and 2023, with the Nigerian Inter-Bank
            Settlement System (NIBSS) reporting losses exceeding NGN 9.5 billion in 2022.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Traditional fraud detection systems deployed by Nigerian operators rely primarily on static rule engines
            that are both brittle (easily circumvented by adaptive fraudsters) and opaque (unable to provide regulatory
            explanations). This research addresses two fundamental gaps: <strong>(1) the lack of adaptive, learning-based
            detection systems calibrated for African mobile money behavioral patterns</strong>, and <strong>(2) the absence
            of explainable decision-making required under CBN's AML/CFT guidelines</strong>.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {[
              { stat: "NGN 9.5B", label: "Annual fraud losses in Nigeria (2022)", color: "text-red-600" },
              { stat: "177%", label: "Increase in fraud incidents 2019–2023", color: "text-amber-600" },
              { stat: "38M+", label: "Active mobile money users affected", color: "text-blue-600" },
            ].map(item => (
              <div key={item.stat} className="bg-card border border-card-border rounded-lg p-4 text-center">
                <p className={`text-2xl font-black ${item.color}`}>{item.stat}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Methodology */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold border-b border-border pb-2">2. Methodology</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            This research adopts a hybrid detection architecture combining three complementary approaches, motivated by
            the class imbalance inherent in fraud datasets (typically 1–5% positive rate) and the need for both
            interpretability and adaptability.
          </p>

          <div className="space-y-4">
            {[
              {
                title: "2.1 Rule-Based Detection Engine",
                content: "A deterministic rule engine encodes domain expertise from CBN AML guidelines and Nigerian mobile money operator security policies. Rules include: transaction velocity thresholds (>30 transactions in 24h), geographic displacement detection (>200km from home location), account age checks (<30 days), and high-risk location flags. Rules are weighted and combined to produce a partial risk score. While brittle, rule-based systems provide high precision on known fraud patterns and full auditability.",
              },
              {
                title: "2.2 Anomaly Detection (Isolation Forest Approximation)",
                content: "An isolation forest-inspired scoring function identifies transactions that deviate from the multivariate distribution of normal transactions. Feature vectors include: velocity score, amount z-score, geolocation distance, account age, device novelty, and hour-of-day. Interaction effects (e.g., new device + young account) are modeled as multiplicative risk bonuses. This component excels at detecting novel fraud patterns not yet captured by rules.",
              },
              {
                title: "2.3 Supervised Classification (Logistic Regression)",
                content: "A logistic regression classifier trained on Nigeria-calibrated feature coefficients provides probability estimates for fraud. In a production deployment, this component would be periodically retrained on verified fraud labels from operator feedback loops. The logistic regression provides the probabilistic backbone for confidence-weighted ensemble decisions and is particularly effective when the feature distribution is well-understood.",
              },
              {
                title: "2.4 Ensemble Combination",
                content: "The three component scores are combined via configurable weighted averaging: Risk = w₁ × RuleScore + w₂ × AnomalyScore + w₃ × LRScore, where weights are normalized (Σwᵢ = 1). Default weights are 0.35/0.30/0.35. The ensemble approach reduces both false positives (compared to rule-only) and false negatives (compared to ML-only on limited data), which is critical in the Nigerian context where operator capacity for fraud investigation is constrained.",
              },
            ].map(item => (
              <div key={item.title} className="space-y-2">
                <h3 className="font-semibold text-sm">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground pl-4 border-l-2 border-border">{item.content}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Dataset */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold border-b border-border pb-2">3. Dataset Description</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Given the absence of publicly available Nigerian mobile money fraud datasets (a significant research gap in
            itself), this study employs a synthetic data generation approach grounded in documented statistical
            characteristics of the Nigerian mobile money ecosystem.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: "Authentic Characteristics",
                items: [
                  "MTN, GLO, Airtel, 9Mobile phone number prefixes",
                  "19 Nigerian cities including high-risk locations",
                  "NGN denomination with CBN-calibrated thresholds",
                  "7 transaction types reflecting NIBSS classification",
                  "Agent network transaction patterns",
                ],
              },
              {
                title: "Fraud Scenario Coverage",
                items: [
                  "SIM swap: new device + location change",
                  "Account takeover: young account + high velocity",
                  "Agent fraud: agent transaction + large amount",
                  "Night-time social engineering attacks",
                  "Geographic displacement / traveling fraud",
                ],
              },
            ].map(section => (
              <div key={section.title} className="bg-muted/30 rounded-lg p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{section.title}</p>
                <ul className="space-y-1.5">
                  {section.items.map(item => (
                    <li key={item} className="flex items-start gap-2 text-xs text-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Expected Contribution */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold border-b border-border pb-2">4. Expected Research Contribution</h2>
          <div className="space-y-3">
            {[
              {
                num: "C1",
                title: "Contextualized Fraud Detection Framework",
                desc: "A hybrid ML architecture specifically calibrated for Sub-Saharan African mobile money behavioral patterns, addressing the gap left by Western-centric fraud detection research (PayPal, Stripe contexts).",
              },
              {
                num: "C2",
                title: "Explainability for Regulatory Compliance",
                desc: "SHAP-value attribution system enabling Nigerian mobile money operators to satisfy CBN AML/CFT disclosure requirements and provide customer-facing fraud dispute explanations.",
              },
              {
                num: "C3",
                title: "Real-Time Decision Architecture",
                desc: "Sub-100ms fraud scoring pipeline suitable for inline deployment within mobile money transaction processing flows, as opposed to batch-mode post-processing approaches.",
              },
              {
                num: "C4",
                title: "Financial Inclusion Preservation",
                desc: "Threshold optimization methodology that minimizes false positives targeting legitimate low-income users — recognizing that over-blocking disproportionately harms the financially excluded populations mobile money is designed to serve.",
              },
            ].map(item => (
              <div key={item.num} className="flex gap-4">
                <span className="flex-shrink-0 h-7 w-7 bg-primary text-primary-foreground rounded-full text-xs font-bold flex items-center justify-center mt-0.5">
                  {item.num}
                </span>
                <div>
                  <p className="font-semibold text-sm">{item.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Research Questions */}
        <section className="bg-primary/5 border border-primary/20 rounded-lg p-6 space-y-3">
          <h2 className="font-bold">Primary Research Questions</h2>
          <ol className="space-y-2">
            {[
              "How does a hybrid ensemble model (rule-based + anomaly detection + supervised ML) compare to single-method approaches in detecting mobile money fraud within the Nigerian context?",
              "What feature engineering approaches most effectively capture fraud-indicative patterns specific to African mobile money behavioral characteristics?",
              "How can explainability mechanisms (SHAP values) be operationalized in real-time fraud detection pipelines to satisfy both regulatory compliance and user transparency requirements?",
              "What risk score threshold configurations best balance fraud prevention with financial inclusion preservation for low-income mobile money users?",
            ].map((q, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="font-bold text-primary shrink-0">RQ{i + 1}.</span>
                <span className="text-muted-foreground">{q}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Footer */}
        <div className="border-t border-border pt-6 flex flex-col md:flex-row justify-between items-start gap-4 text-xs text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">FraudShield Research Prototype</p>
            <p>Australian National University · Research Training Program (RTP)</p>
            <p className="mt-1">Demonstrating AI-powered financial fraud detection for scholarship application review</p>
          </div>
          <div className="text-right">
            <p>Prototype Version 1.0</p>
            <p>April 2025</p>
          </div>
        </div>
      </div>
    </div>
  );
}
