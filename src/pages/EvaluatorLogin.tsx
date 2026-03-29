import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function EvaluatorLogin() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = () => {
    setLoading(true);
    // Completely bypass Firebase Auth
    localStorage.setItem("evaluatorMode", "true");
    setTimeout(() => {
      navigate("/dashboard");
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-2xl">Evaluator Access</CardTitle>
          <CardDescription>Direct entry for evaluation purposes. No credentials required.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleLogin} disabled={loading} size="lg" className="w-full">
            {loading ? "Entering..." : "Enter Dashboard"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
