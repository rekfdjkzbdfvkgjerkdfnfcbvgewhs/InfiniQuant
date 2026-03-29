import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { logout, db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import { Activity, LogOut, FileText, BarChart, Save, History } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { GoogleGenAI } from "@google/genai";

export default function Dashboard({ user }: { user: any }) {
  const [queryText, setQueryText] = useState("Analyze NVDA. On Oct 12, Director Smith sold 15M worth of shares (0.5% stake delta) at a 3.4 z-score. Market cap is 3T. Recent prices: 130, 128, 125, 120, 115, 118, 125.");
  
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [result, setResult] = useState<any>(null);
  const [savedArticles, setSavedArticles] = useState<any[]>([]);

  useEffect(() => {
    fetchSavedArticles();
  }, []);

  const fetchSavedArticles = async () => {
    try {
      const q = query(collection(db, "articles"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const articles = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSavedArticles(articles);
    } catch (error) {
      console.error("Failed to fetch articles", error);
    }
  };

  const handleLogout = async () => {
    if (user.isAnonymous && user.uid === 'evaluator') {
      localStorage.removeItem('evaluatorMode');
      window.location.href = '/';
    } else {
      await logout();
    }
  };

  const handleAnalyze = async () => {
    if (!queryText.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Step 1: Extract Data
      setLoadingStep("Extracting quantitative data from natural language...");
      const extractionPrompt = `
      Extract financial data EXACTLY as provided in the following natural language query. 
      CRITICAL: DO NOT hallucinate, simulate, or fabricate any data. This tool is used by real media houses for rigorous financial journalism. If specific numbers, trades, or prices are missing from the text, return empty arrays or null. Only extract facts explicitly stated in the text.
      
      Query: "${queryText}"
      
      Format as JSON with: 
      - ticker (string, extract from text or "UNKNOWN")
      - insiderTrades (array of objects with: category ['Promoter', 'Director', 'Officer', 'Employee'], valueCr (number, in crores/millions), stakeDeltaPct (number), marketCapCr (number), z_score (number)). Only include trades explicitly mentioned.
      - priceHistory (array of numbers representing recent daily prices). Only include prices explicitly mentioned.
      `;

      const extractionResponse = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: extractionPrompt,
        config: { responseMimeType: "application/json" }
      });
      const extractedData = JSON.parse(extractionResponse.text || "{}");

      // Step 2: Python Backend Math
      setLoadingStep("Running statistical rigor models (Z-Scores, Fisher's Combined p)...");
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: extractedData.ticker || "UNKNOWN",
          insiderTrades: extractedData.insiderTrades || [],
          priceHistory: extractedData.priceHistory || []
        })
      });
      const metrics = await response.json();

      if (metrics.error) {
        throw new Error(metrics.error);
      }

      // Step 3: Orchestrate article generation
      setLoadingStep("Drafting journalistic narrative...");
      const prompt = `
      You are a quantitative financial journalist. You have been provided with insider trades and price history for ${metrics.ticker}.
      
      Insider Trades:
      ${JSON.stringify(metrics.insider_trades, null, 2)}
      
      Price History (last 30 days):
      ${JSON.stringify(metrics.price_history, null, 2)}
      
      Calculated Statistical Metrics:
      - Fisher's Combined P-Value for Insider Cluster: ${metrics.combined_p.toFixed(4)}
      - Composite Insider Signal Score: ${metrics.avg_score.toFixed(2)}/1.00
      
      Analyze the data and generate a rigorous financial article.
      The article should include:
      1. A compelling headline.
      2. A summary of the insider activity.
      3. Statistical context (Z-scores, win rates, etc. - use the calculated metrics).
      4. Market regime context (infer from price history).
      5. A conclusion on the signal strength.
      
      Format the output as a JSON object with the following structure:
      {
        "headline": "...",
        "summary": "...",
        "articleBody": "...",
        "signalStrength": "Strong|Moderate|Weak",
        "keyMetrics": {
          "zScore": 0.0,
          "combinedPValue": ${metrics.combined_p.toFixed(4)},
          "compositeScore": ${metrics.avg_score.toFixed(2)}
        }
      }
      `;

      const geminiResponse = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const resultData = JSON.parse(geminiResponse.text || "{}");
      setResult({ ...resultData, ticker: metrics.ticker });
    } catch (error) {
      console.error("Analysis failed", error);
      alert("Analysis failed. Check console for details.");
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const handleSave = async () => {
    if (!result) return;
    try {
      await addDoc(collection(db, "articles"), {
        ...result,
        authorId: user.uid,
        authorEmail: user.email || "anonymous@evaluator",
        createdAt: new Date().toISOString()
      });
      alert("Article saved successfully!");
      fetchSavedArticles();
    } catch (error) {
      console.error("Failed to save article", error);
      alert("Failed to save article. Note: Evaluator mode may not have database write permissions.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="px-6 py-4 border-b bg-white flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2 text-primary font-bold text-xl">
          <Activity className="h-6 w-6" />
          <span>InfiniQuant Dashboard</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">{user.isAnonymous ? "Evaluator (Anonymous)" : user.email}</span>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 p-6 grid lg:grid-cols-12 gap-6 max-w-7xl mx-auto w-full">
        <div className="lg:col-span-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Natural Language Query</CardTitle>
              <CardDescription>Describe the market scenario or insider activity you want to analyze.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Textarea 
                  className="h-40 resize-none" 
                  placeholder="e.g., Analyze NVDA. On Oct 12, Director Smith sold 15M worth of shares (0.5% stake delta) at a 3.4 z-score. Market cap is 3T. Recent prices: 130, 128, 125, 120, 115, 118, 125."
                  value={queryText} 
                  onChange={(e) => setQueryText(e.target.value)} 
                />
              </div>
              <Button className="w-full" onClick={handleAnalyze} disabled={loading}>
                {loading ? "Processing..." : "Generate Rigorous Analysis"}
              </Button>
              {loading && <p className="text-xs text-center text-slate-500 animate-pulse mt-2">{loadingStep}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><History className="w-4 h-4" /> Saved Articles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[300px] overflow-auto">
                {savedArticles.map((article, idx) => (
                  <div key={idx} className="p-3 border rounded-md bg-slate-50 text-sm cursor-pointer hover:bg-slate-100" onClick={() => setResult(article)}>
                    <div className="font-bold text-primary">{article.ticker}</div>
                    <div className="truncate text-slate-600">{article.headline}</div>
                    <div className="text-xs text-slate-400 mt-1">{new Date(article.createdAt).toLocaleDateString()}</div>
                  </div>
                ))}
                {savedArticles.length === 0 && <p className="text-sm text-slate-500">No saved articles yet.</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Journalist's Output</CardTitle>
                <CardDescription>Statistically validated narrative ready for publication.</CardDescription>
              </div>
              {result && !result.createdAt && (
                <Button variant="outline" size="sm" onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" /> Save to Firestore
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              {result ? (
                <Tabs defaultValue="article" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="article"><FileText className="w-4 h-4 mr-2" /> Article</TabsTrigger>
                    <TabsTrigger value="metrics"><BarChart className="w-4 h-4 mr-2" /> Metrics</TabsTrigger>
                  </TabsList>
                  <TabsContent value="article" className="space-y-4 mt-4">
                    <h2 className="text-2xl font-bold font-serif">{result.headline}</h2>
                    <div className="flex gap-2 mb-4">
                      <Badge variant={result.signalStrength === 'Strong' ? 'default' : 'secondary'}>
                        {result.signalStrength} Signal
                      </Badge>
                      <Badge variant="outline">Z-Score: {result.keyMetrics?.zScore}</Badge>
                      <Badge variant="outline">Combined p: {result.keyMetrics?.combinedPValue}</Badge>
                    </div>
                    <p className="text-lg font-medium text-slate-700 italic border-l-4 border-primary pl-4">
                      {result.summary}
                    </p>
                    <div className="prose prose-slate max-w-none mt-6 whitespace-pre-wrap font-serif">
                      {result.articleBody}
                    </div>
                  </TabsContent>
                  <TabsContent value="metrics" className="mt-4">
                    <div className="bg-slate-900 text-slate-50 p-4 rounded-md font-mono text-sm whitespace-pre-wrap">
                      {JSON.stringify(result.keyMetrics, null, 2)}
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 flex-col gap-4 py-20">
                  <Activity className="h-12 w-12 opacity-20" />
                  <p>Run analysis to see the generated article.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
