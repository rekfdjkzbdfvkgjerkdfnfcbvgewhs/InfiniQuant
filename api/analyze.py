import sys
import json
import math
import random
from urllib import request, parse
import os
from http.server import BaseHTTPRequestHandler

def welford_update(n, mean, M2, x):
    n += 1
    delta = x - mean
    mean += delta / n
    M2 += delta * (x - mean)
    return n, mean, M2

def z_score(x, n, mean, M2):
    if n < 2: return 0.0
    variance = M2 / (n - 1)
    std = math.sqrt(variance)
    return (x - mean) / std if std > 0 else 0.0

def normal_cdf(x):
    return (1.0 + math.erf(x / math.sqrt(2.0))) / 2.0

def chi2_cdf(x, df):
    if df == 2:
        return 1.0 - math.exp(-x / 2.0)
    sum_term = 0
    for i in range(df // 2):
        sum_term += (x / 2.0)**i / math.factorial(i)
    return 1.0 - math.exp(-x / 2.0) * sum_term

def fishers_combined_p(p_values):
    if not p_values: return 1.0
    if len(p_values) == 1: return p_values[0]
    clipped = [max(1e-10, min(1.0, p)) for p in p_values]
    chi2_stat = -2.0 * sum(math.log(p) for p in clipped)
    df = 2 * len(p_values)
    return 1.0 - chi2_cdf(chi2_stat, df)

def composite_insider_score(category, value_cr, stake_delta_pct, market_cap_cr, num_insiders):
    w1, w2, w3, w4 = 0.35, 0.30, 0.20, 0.15
    f1 = {'Promoter': 1.0, 'Director': 0.70, 'Officer': 0.45}.get(category, 0.25)
    f2 = min(math.log(1 + max(value_cr, 0)) / math.log(1 + 50), 1.0)
    f3 = min(max(stake_delta_pct, 0) / 5.0, 1.0)
    f4 = min(1000.0 / max(market_cap_cr, 1.0), 1.0)
    s = w1 * f1 + w2 * f2 + w3 * f3 + w4 * f4
    return min(s + 0.10 * (num_insiders - 1), 1.0)

def sanitize_float(val, default=0.0):
    try:
        if val is None: return default
        return float(val)
    except (ValueError, TypeError):
        return default

def process_analysis(data):
    ticker = data.get("ticker") or "UNKNOWN"
    insider_trades = data.get("insiderTrades") or []
    price_history = data.get("priceHistory") or []
    
    p_values = []
    for trade in insider_trades:
        if not isinstance(trade, dict): continue
        z = sanitize_float(trade.get("z_score"), 0.0)
        p_val = 1.0 - normal_cdf(z)
        p_values.append(p_val)
        
    combined_p = fishers_combined_p(p_values)
    
    scores = []
    for trade in insider_trades:
        if not isinstance(trade, dict): continue
        score = composite_insider_score(
            trade.get("category", "Employee"),
            sanitize_float(trade.get("valueCr"), 0.0),
            sanitize_float(trade.get("stakeDeltaPct"), 0.0),
            sanitize_float(trade.get("marketCapCr"), 1000.0),
            len(insider_trades)
        )
        scores.append(score)
        
    avg_score = sum(scores) / len(scores) if scores else 0.0
    
    return {
        "ticker": ticker,
        "combined_p": combined_p,
        "avg_score": avg_score,
        "insider_trades": insider_trades,
        "price_history": price_history
    }

# Vercel Serverless Function Handler
class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)
        
        result = process_analysis(data)
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(result).encode('utf-8'))

# CLI execution for AI Studio Node.js child_process
if __name__ == "__main__":
    try:
        input_data = sys.stdin.read()
        data = json.loads(input_data)
        result = process_analysis(data)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

