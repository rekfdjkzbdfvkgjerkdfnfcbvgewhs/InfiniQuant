import { jStat } from 'jstat';
import * as ss from 'simple-statistics';

// 1.1 Baseline Anomaly Detection: The Z-Score Framework
export class WelfordStats {
  n: number = 0;
  mean: number = 0;
  M2: number = 0;

  update(x: number) {
    this.n += 1;
    const delta = x - this.mean;
    this.mean += delta / this.n;
    this.M2 += delta * (x - this.mean);
  }

  get variance() {
    return this.n > 1 ? this.M2 / (this.n - 1) : 0;
  }

  get std() {
    return Math.sqrt(this.variance);
  }

  zScore(x: number) {
    return this.std > 0 ? (x - this.mean) / this.std : 0;
  }
}

// 1.2 Cluster Significance Test — Fisher's Combined Probability
export function fishersCombinedP(pValues: number[]): number {
  if (pValues.length === 0) return 1;
  if (pValues.length === 1) return pValues[0];
  
  const clipped = pValues.map(p => Math.max(1e-10, Math.min(1.0, p)));
  const chi2Stat = -2 * clipped.reduce((sum, p) => sum + Math.log(p), 0);
  const df = 2 * pValues.length;
  
  return 1 - jStat.chisquare.cdf(chi2Stat, df);
}

export function insiderClusterScore(trades: { z_score: number }[]) {
  const pVals = trades.map(t => 1 - jStat.normal.cdf(t.z_score, 0, 1));
  const combinedP = fishersCombinedP(pVals);
  return {
    n_insiders: trades.length,
    combined_p: combinedP,
    log10_p: Math.log10(combinedP),
    is_significant: combinedP < 0.01
  };
}

// 1.3 Composite Insider Score
export function compositeInsiderScore(
  category: 'Promoter' | 'Director' | 'Officer' | 'Employee',
  valueCr: number,
  stakeDeltaPct: number,
  marketCapCr: number,
  numInsiders: number
) {
  const w1 = 0.35, w2 = 0.30, w3 = 0.20, w4 = 0.15;
  
  let f1 = 0.25;
  if (category === 'Promoter') f1 = 1.0;
  else if (category === 'Director') f1 = 0.70;
  else if (category === 'Officer') f1 = 0.45;

  const f2 = Math.min(Math.log(1 + valueCr) / Math.log(1 + 50), 1.0);
  const f3 = Math.min(stakeDeltaPct / 5.0, 1.0);
  const f4 = Math.min(1000 / marketCapCr, 1.0);

  const s = w1 * f1 + w2 * f2 + w3 * f3 + w4 * f4;
  return Math.min(s + 0.10 * (numInsiders - 1), 1.0);
}

// 2.1 Binomial Win-Rate Estimation with Exact Clopper-Pearson CI
export function clopperPearsonCi(k: number, n: number, alpha: number = 0.05) {
  if (n === 0) return [0.0, 1.0];
  const lo = k > 0 ? jStat.beta.inv(alpha / 2, k, n - k + 1) : 0.0;
  const hi = k < n ? jStat.beta.inv(1 - alpha / 2, k + 1, n - k) : 1.0;
  return [lo, hi];
}

export function patternStats(outcomes: boolean[]) {
  const n = outcomes.length;
  const k = outcomes.filter(Boolean).length;
  const p = n > 0 ? k / n : 0;
  const [lo, hi] = clopperPearsonCi(k, n);
  return { n, k, win_rate: p, ci_95_lower: lo, ci_95_upper: hi, ci_width: hi - lo };
}

// 2.2 One-Sample Proportion Z-Test
export function proportionZTest(k: number, n: number, p0: number = 0.50) {
  if (n === 0) return 1.0;
  const p = k / n;
  const z = (p - p0) / Math.sqrt((p0 * (1 - p0)) / n);
  return 1 - jStat.normal.cdf(z, 0, 1);
}

// 2.3.2 Benjamini-Hochberg FDR Control
export function benjaminiHochberg(pValues: number[], q: number = 0.10): boolean[] {
  const m = pValues.length;
  const indexedP = pValues.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
  
  let maxK = -1;
  for (let k = 0; k < m; k++) {
    const threshold = ((k + 1) / m) * q;
    if (indexedP[k].p <= threshold) {
      maxK = k;
    }
  }

  const reject = new Array(m).fill(false);
  for (let i = 0; i <= maxK; i++) {
    reject[indexedP[i].i] = true;
  }
  return reject;
}

// 3.1 Bayesian Beta-Binomial Model
export class BayesianPatternTracker {
  alpha: number;
  beta: number;

  constructor(alpha0: number = 5.0, beta0: number = 5.0) {
    this.alpha = alpha0;
    this.beta = beta0;
  }

  update(win: boolean) {
    if (win) this.alpha += 1;
    else this.beta += 1;
  }

  updateBatch(kWins: number, nTrials: number) {
    this.alpha += kWins;
    this.beta += (nTrials - kWins);
  }

  get posteriorMean() {
    return this.alpha / (this.alpha + this.beta);
  }

  get posteriorStd() {
    const a = this.alpha, b = this.beta;
    return Math.sqrt((a * b) / (Math.pow(a + b, 2) * (a + b + 1)));
  }

  credibleInterval(level: number = 0.95) {
    const q = (1 - level) / 2;
    return [
      jStat.beta.inv(q, this.alpha, this.beta),
      jStat.beta.inv(1 - q, this.alpha, this.beta)
    ];
  }
}

// 5.1 Kelly Criterion
export function kellyFraction(p: number, rWin: number, rLoss: number) {
  if (rWin <= 0 || rLoss >= 0) return 0;
  const q = 1 - p;
  const b = Math.abs(rWin / rLoss);
  const f = p - q / b;
  return Math.max(0, f);
}

// 5.2 Value at Risk and Conditional VaR
export function computeRiskMetrics(returns: number[], alpha: number = 0.95) {
  if (returns.length === 0) return null;
  const sorted = [...returns].sort((a, b) => a - b);
  const index = Math.max(0, Math.floor((1 - alpha) * sorted.length));
  const varH = -sorted[index];
  
  const tail = sorted.filter(r => r < -varH);
  const cvar = tail.length > 0 ? -ss.mean(tail) : varH;

  return {
    var_95: varH,
    cvar_95: cvar,
    max_loss: sorted[0],
    max_gain: sorted[sorted.length - 1]
  };
}

// 7.2 Hurst Exponent (Simplified R/S Analysis)
export function hurstExponent(ts: number[], minWindow: number = 10) {
  const n = ts.length;
  if (n < minWindow * 2) return 0.5;
  
  const ns = [];
  for (let w = minWindow; w <= Math.floor(n / 2); w += Math.max(1, Math.floor(n / 50))) {
    ns.push(w);
  }

  const rsVals = [];
  for (const size of ns) {
    const rsSub = [];
    for (let start = 0; start <= n - size; start += size) {
      const sub = ts.slice(start, start + size);
      const meanSub = ss.mean(sub);
      let dev = 0;
      let maxDev = -Infinity;
      let minDev = Infinity;
      for (const val of sub) {
        dev += (val - meanSub);
        if (dev > maxDev) maxDev = dev;
        if (dev < minDev) minDev = dev;
      }
      const R = maxDev - minDev;
      const S = ss.sampleStandardDeviation(sub);
      if (S > 0) rsSub.push(R / S);
    }
    if (rsSub.length > 0) {
      rsVals.push({ size, rs: ss.mean(rsSub) });
    }
  }

  if (rsVals.length < 2) return 0.5;
  
  const logN = rsVals.map(v => Math.log(v.size));
  const logRs = rsVals.map(v => Math.log(v.rs));
  
  const lr = ss.linearRegression(logN.map((x, i) => [x, logRs[i]]));
  return lr.m;
}

// 9.1 Verbal Confidence Mapping
export function assignQualityTier(ciLo: number, pFreq: number, mcPValue: number) {
  if (ciLo > 0.65) return 'Historically Reliable';
  if (ciLo > 0.55) return 'Strong Historical Edge';
  if (ciLo > 0.50) return 'Moderate Signal';
  if (ciLo <= 0.50) return 'Insufficient Evidence';
  return 'Statistically Inconclusive';
}
