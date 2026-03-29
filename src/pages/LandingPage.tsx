import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loginWithGoogle } from "@/lib/firebase";
import { useNavigate, Link } from "react-router-dom";
import { Activity, BarChart3, ShieldCheck } from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      navigate("/dashboard");
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="px-6 py-4 border-b bg-white flex justify-between items-center">
        <div className="flex items-center gap-2 text-primary font-bold text-xl">
          <Activity className="h-6 w-6" />
          <span>InfiniQuant</span>
        </div>
        <div className="flex gap-4">
          <Link to="/evaluator-login">
            <Button variant="outline">Evaluator Login</Button>
          </Link>
          <Button onClick={handleGoogleLogin}>Sign In with Google</Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 mb-6 max-w-3xl">
          Quantitative Foundations for Journalist's Alpha Copilot
        </h1>
        <p className="text-xl text-slate-600 mb-10 max-w-2xl">
          Empowering small financial journalism teams with rigorous statistical analysis. 
          Turn raw insider trades and market data into compelling, mathematically sound stories.
        </p>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl w-full mb-12">
          <Card>
            <CardHeader>
              <BarChart3 className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Rigorous Signal Detection</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Z-Score anomaly detection, Fisher's combined probability, and Bayesian Beta-Binomial updating to separate signal from noise.
              </CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <ShieldCheck className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Statistical Integrity</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Walk-forward validation, multiple testing correction (BH FDR), and Monte Carlo permutation tests to prevent false discoveries.
              </CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Activity className="h-10 w-10 text-primary mb-2" />
              <CardTitle>LLM Orchestration</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Powered by Gemini 3.1 Pro to synthesize complex mathematical outputs into clear, journalistic narratives.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <Button size="lg" className="text-lg px-8" onClick={handleGoogleLogin}>
          Get Started Now
        </Button>
      </main>
    </div>
  );
}
