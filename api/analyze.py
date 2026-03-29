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
    f2 = min(math.log(1 + value_cr) / math.log(1 + 50), 1.0)
    f3 = min(stake_delta_pct / 5.0, 1.0)
    f4 = min(1000.0 / market_cap_cr, 1.0)
    s = w1 * f1 + w2 * f2 + w3 * f3 + w4 * f4
    return min(s + 0.10 * (num_insiders - 1), 1.0)

def call_gemini(prompt):
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return {"error": "GEMINI_API_KEY not set"}
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key={api_key}"
    data = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json"}
    }).encode('utf-8')
    
    req = request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    try:
        with request.urlopen(req) as response:
            res_body = response.read()
            res_json = json.loads(res_body)
            text = res_json.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '{}')
            return json.loads(text)
    except Exception as e:
        return {"error": str(e)}

def process_analysis(data):
    ticker = data.get("ticker", "UNKNOWN")
    insider_trades = data.get("insiderTrades", [])
    price_history = data.get("priceHistory", [])
    
    p_values = []
    for trade in insider_trades:
        z = trade.get("z_score", 0.0)
        p_val = 1.0 - normal_cdf(z)
        p_values.append(p_val)
        
    combined_p = fishers_combined_p(p_values)
    
    scores = []
    for trade in insider_trades:
        score = composite_insider_score(
            trade.get("category", "Employee"),
            trade.get("valueCr", 0.0),
            trade.get("stakeDeltaPct", 0.0),
            trade.get("marketCapCr", 1000.0),
            len(insider_trades)
        )
        scores.append(score)
        
    avg_score = sum(scores) / len(scores) if scores else 0.0
    
    prompt = f"""
    You are a quantitative financial journalist. You have been provided with insider trades and price history for {ticker}.
    
    Insider Trades:
    {json.dumps(insider_trades, indent=2)}
    
    Price History (last 30 days):
    {json.dumps(price_history, indent=2)}
    
    Calculated Statistical Metrics:
    - Fisher's Combined P-Value for Insider Cluster: {combined_p:.4f}
    - Composite Insider Signal Score: {avg_score:.2f}/1.00
    
    Analyze the data and generate a rigorous financial article.
    The article should include:
    1. A compelling headline.
    2. A summary of the insider activity.
    3. Statistical context (Z-scores, win rates, etc. - use the calculated metrics).
    4. Market regime context (infer from price history).
    5. A conclusion on the signal strength.
    
    Format the output as a JSON object with the following structure:
    {{
      "headline": "...",
      "summary": "...",
      "articleBody": "...",
      "signalStrength": "Strong|Moderate|Weak",
      "keyMetrics": {{
        "zScore": 0.0,
        "combinedPValue": {combined_p:.4f},
        "compositeScore": {avg_score:.2f}
      }}
    }}
    """
    
    return call_gemini(prompt)

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

