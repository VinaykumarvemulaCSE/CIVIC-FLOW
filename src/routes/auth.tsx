import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Logo } from "@/components/civic/app-shell";
import { signIn } from "@/lib/civic/store";
import { findUser } from "@/lib/civic/users";
import { getRules } from "@/lib/civic/rules";
import { DEPARTMENTS, ZONES, type Department, type Role } from "@/lib/civic/types";
import { auth, googleProvider, firebaseReady } from "@/lib/civic/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile as updateFirebaseProfile
} from "firebase/auth";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    role: (search["role"] === "officer" || search["role"] === "admin"
      ? search["role"]
      : "citizen") as Role,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — CIVIC-FLOW" },
      {
        name: "description",
        content: "Citizen and officer sign in for the CIVIC-FLOW complaint triage workspace.",
      },
      { property: "og:title", content: "Sign in — CIVIC-FLOW" },
      {
        property: "og:description",
        content: "Enter the CIVIC-FLOW citizen or officer workspace.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { role } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [department, setDepartment] = useState<Department>("Roads");
  const [zone, setZone] = useState<string>(ZONES[0]);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() && mode === "signup") {
      toast.error("Enter your full name.");
      return;
    }
    if (!email.trim() || password.length < 6) {
      toast.error("Enter a valid email and a password of at least 6 characters.");
      return;
    }
    if (role === "admin" && accessCode.trim() !== getRules().adminAccessCode) {
      toast.error("That supervisor access code is not valid.");
      return;
    }
    
    // Strict admin credential enforcement
    if (role === "admin") {
      if (email.trim() !== "kumarvinay072007@gmail.com" || password !== "12345678") {
        toast.error("Invalid admin credentials.");
        return;
      }
    } else if (email.trim() === "kumarvinay072007@gmail.com") {
      toast.error("This email is reserved for the administrator.");
      return;
    }

    const existing = findUser(email.trim());
    if (existing?.status === "suspended") {
      toast.error("This account has been suspended by a supervisor.");
      return;
    }
    if (existing && existing.role !== role) {
      // If they are logging in as admin with the correct credentials, bypass the role mismatch lock
      if (role === "admin" && email.trim() === "kumarvinay072007@gmail.com") {
        // Allow it to proceed and overwrite their role
      } else {
        toast.error(`This email is registered as a ${existing.role}. Use the ${existing.role} tab.`);
        return;
      }
    }

    setLoading(true);
    try {
      if (auth) {
        if (mode === "signup") {
          const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
          await updateFirebaseProfile(userCredential.user, { displayName: name.trim() });
          toast.success("Account created successfully");
        } else {
          await signInWithEmailAndPassword(auth, email.trim(), password);
          toast.success(`Welcome back!`);
        }
      } else {
        toast.success(
          mode === "signup" ? "Account created (demo mode)" : "Welcome back! (demo mode)",
        );
      }
      
      // Update local store to maintain UI state
      signIn({
        role,
        name: mode === "signup" ? name.trim() : (existing?.name || name.trim()),
        email: email.trim(),
        ...(role === "officer" ? { employeeId, department, zone } : {}),
      });
      
      navigate({ to: role === "officer" ? "/officer" : role === "admin" ? "/admin" : "/citizen" });
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    if (role === "admin") {
      toast.error("Admins must sign in with email and password.");
      return;
    }

    if (!auth || !googleProvider) {
      toast.error("Google sign-in needs the Firebase keys configured.");
      return;
    }

    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      if (user.email === "kumarvinay072007@gmail.com") {
        toast.error("This email is reserved for the administrator.");
        return;
      }
      
      const existing = findUser(user.email || "");
      if (existing?.status === "suspended") {
        toast.error("This account has been suspended by a supervisor.");
        return;
      }
      if (existing && existing.role !== role) {
        toast.error(`This email is registered as a ${existing.role}. Use the ${existing.role} tab.`);
        return;
      }

      toast.success(`Welcome back, ${user.displayName?.split(" ")[0] || "User"}`);
      
      signIn({
        role,
        name: user.displayName || "User",
        email: user.email || "",
        ...(role === "officer" ? { employeeId, department, zone } : {}),
      });
      
      navigate({ to: role === "officer" ? "/officer" : "/citizen" });
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-ink p-10 text-ink-foreground lg:flex">
        <Logo tone="dark" />
        <div>
          <h2 className="font-display text-4xl font-bold uppercase leading-tight">
            One pipeline from
            <br />
            citizen photo to crew.
          </h2>
          <p className="mt-4 max-w-md text-ink-foreground/70">
            Severity scoring, department routing, duplicate clustering and priority ranking run
            automatically on every submission.
          </p>
        </div>
        <p className="text-xs text-ink-foreground/40">
          Sign in below to continue to your workspace.
        </p>
      </div>

      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="mt-6 flex gap-1 rounded-md border bg-muted p-1">
            {(["citizen", "officer"] as Role[]).map((r) => (
              <Link
                key={r}
                to="/auth"
                search={{ role: r }}
                className={`flex-1 rounded-sm px-3 py-2 text-center text-sm font-semibold capitalize transition-colors ${
                  role === r ? "bg-card shadow-sm" : "text-muted-foreground"
                }`}
              >
                {r}
              </Link>
            ))}
          </div>

          <Card className="mt-4">
            <CardContent className="p-6">
              <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")}>
                <TabsList className="w-full">
                  <TabsTrigger value="signin" className="flex-1">
                    Sign in
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="flex-1">
                    Sign up
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <form onSubmit={submit} className="mt-5 space-y-4">
                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">{role === "officer" ? "Official email" : "Email"}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>

                {role === "admin" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="code">Supervisor access code</Label>
                    <Input
                      id="code"
                      type="password"
                      placeholder="Provided by the city IT team"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Demo code: <span className="font-mono">civic-admin</span>
                    </p>
                  </div>
                )}

                {role === "officer" && mode === "signup" && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="emp">Employee ID</Label>
                      <Input
                        id="emp"
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Department</Label>
                      <Select
                        value={department}
                        onValueChange={(v) => setDepartment(v as Department)}
                        disabled={loading}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DEPARTMENTS.map((d) => (
                            <SelectItem key={d} value={d}>
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Assigned zone</Label>
                      <Select value={zone} onValueChange={setZone} disabled={loading}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ZONES.map((z) => (
                            <SelectItem key={z} value={z}>
                              {z}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? "Please wait..." : mode === "signup" ? `Create account as ${role}` : `Continue as ${role}`}
                </Button>
                
                {role !== "admin" && firebaseReady && (
                  <div className="mt-4 space-y-4">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">
                          Or continue with
                        </span>
                      </div>
                    </div>
                    
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full" 
                      size="lg" 
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                    >
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                        <path d="M1 1h22v22H1z" fill="none" />
                      </svg>
                      Google
                    </Button>
                  </div>
                )}
              </form>

              <div className="mt-6 rounded-md bg-muted/50 p-4 text-sm text-muted-foreground border">
                <p className="font-semibold mb-2 text-foreground">Demo Credentials:</p>
                {role === "citizen" && (
                  <ul className="space-y-1 list-disc pl-4 text-xs">
                    <li><strong>Email:</strong> meera@example.com</li>
                    <li><strong>Password:</strong> demo1234</li>
                  </ul>
                )}
                {role === "officer" && (
                  <ul className="space-y-1 list-disc pl-4 text-xs">
                    <li><strong>Email:</strong> a.khan@city.gov</li>
                    <li><strong>Password:</strong> demo1234</li>
                    <li><strong>Emp ID:</strong> EMP-2291</li>
                  </ul>
                )}
                {role === "admin" && (
                  <ul className="space-y-1 list-disc pl-4 text-xs">
                    <li><strong>Email:</strong> kumarvinay072007@gmail.com</li>
                    <li><strong>Password:</strong> 12345678</li>
                    <li><strong>Access Code:</strong> civic-admin</li>
                  </ul>
                )}
              </div>

              <p className="mt-4 text-center text-xs text-muted-foreground">
                {role === "admin" ? (
                  <Link to="/auth" search={{ role: "citizen" }} className="underline">
                    Back to citizen login
                  </Link>
                ) : (
                  <Link to="/auth" search={{ role: "admin" }} className="underline">
                    Supervisor / admin access
                  </Link>
                )}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

