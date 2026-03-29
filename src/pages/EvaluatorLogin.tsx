import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loginAnonymously } from "@/lib/firebase";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function EvaluatorLogin() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      await loginAnonymously();
      navigate("/dashboard");
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') {
        setError("Anonymous auth is not enabled in Firebase. Please enable it in the Firebase Console under Authentication > Sign-in method.");
      } else {
        setError(err.message || "Failed to login");
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-2xl">Evaluator Access</CardTitle>
          <CardDescription>Direct entry for evaluation purposes. No credentials required.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <div className="text-red-500 text-sm mb-4 text-left p-3 bg-red-50 rounded-md">{error}</div>}
          <Button onClick={handleLogin} disabled={loading} size="lg" className="w-full">
            {loading ? "Entering..." : "Enter Dashboard"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
