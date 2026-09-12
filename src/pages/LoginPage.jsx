import { useState } from "react";
import { Lock, ArrowRight, Eye, EyeOff, User } from "lucide-react";
import { Card } from "../components/ui/Card.jsx";
import { login } from "../lib/storage.js";

export function LoginPage({ onAuthSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(username, password);

      if (result.success) {
        onAuthSuccess(result.user);
      } else {
        setError(result.error);
      }
    } catch (_err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg)]">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
            Welcome Back!
          </h1>
          <p className="text-[var(--text-faint)] text-sm">
            Login to continue your preparation
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-[var(--danger-bg)] border border-[var(--danger-border)] rounded-lg text-[var(--danger-text)] text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[var(--text-secondary)] text-sm mb-2">Username</label>
            <div className="relative">
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                minLength={3}
                className="w-full pl-10 pr-4 py-3 bg-[var(--elevated-bg)] border border-[var(--border-strong)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>
          <div>
            <label className="block text-[var(--text-secondary)] text-sm mb-2">Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                minLength={4}
                className="w-full pl-10 pr-12 py-3 bg-[var(--elevated-bg)] border border-[var(--border-strong)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)] hover:text-[var(--text-secondary)]"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-pop touch-target w-full flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-lg py-3 transition-colors"
          >
            {loading ? 'Processing...' : 'Login'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>
      </Card>
    </div>
  );
}
