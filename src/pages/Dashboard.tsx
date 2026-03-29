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

export default function Dashboard({ user }: { user: any }) {
  const [ticker, setTicker] = useState("TITAN");
  const [insiderData, setInsiderData] = useState(
    JSON.stringify([
      { category: "Promoter", valueCr: 14.2, stakeDeltaPct: 0.5, marketCapCr: 150000, z_score: 3.4 }
    ], null, 2)
  );
  const [priceHistory, setPriceHistory] = useState(
    JSON.stringify([
      100, 102, 101, 105, 104, 108, 110, 109, 112, 115
    ], null, 2)
  );
  
  const [loading, setLoading] = useState(false);
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

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker,
          insiderTrades: JSON.parse(insiderData),
          priceHistory: JSON.parse(priceHistory)
        })
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Analysis failed", error);
      alert("Analysis failed. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    try {
      await addDoc(collection(db, "articles"), {
        ...result,
        ticker,
        authorId: user.uid,
        authorEmail: user.email || "anonymous@evaluator",
        createdAt: new Date().toISOString()
      });
      alert("Article saved successfully!");
      fetchSavedArticles();
    } catch (error) {
      console.error("Failed to save article", error);
      alert("Failed to save article.");
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
          <Button variant="ghost" size="icon" onClick={logout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 p-6 grid lg:grid-cols-12 gap-6 max-w-7xl mx-auto w-full">
        <div className="lg:col-span-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Input</CardTitle>
              <CardDescription>Enter the raw financial data for analysis.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Stock Ticker</Label>
                <Input value={ticker} onChange={(e) => setTicker(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Insider Trades (JSON Array)</Label>
                <Textarea 
                  className="font-mono text-xs h-32" 
                  value={insiderData} 
                  onChange={(e) => setInsiderData(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label>Price History (JSON Array of Prices)</Label>
                <Textarea 
                  className="font-mono text-xs h-32" 
                  value={priceHistory} 
                  onChange={(e) => setPriceHistory(e.target.value)} 
                />
              </div>
              <Button className="w-full" onClick={handleAnalyze} disabled={loading}>
                {loading ? "Running Statistical Pipeline..." : "Generate Rigorous Analysis"}
              </Button>
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
