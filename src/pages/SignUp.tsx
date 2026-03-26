import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, AlertCircle, Chrome } from 'lucide-react';
import { supabase, signInWithGoogle } from '../supabaseClient';
import { APP_CONFIG } from '../constants';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (data.user && data.session === null) {
      // This happens when email confirmation is enabled
      setSuccess(true);
      setLoading(false);
    } else {
      // Log sign-up activity
      await supabase.from('users_detail').insert([{
        feature_type: 'auth_log',
        message: `New user signed up: ${email}`,
        user_id: data.user?.id
      }]);
      navigate('/dashboard');
    }
  };

  const handleGoogleSignIn = async () => {
    const { error } = await signInWithGoogle();
    if (error) setError(error.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-white dark:bg-slate-950 transition-colors relative overflow-hidden">
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[500px] h-[500px] bg-red-500/5 dark:bg-red-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-[500px] h-[500px] bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-md w-full glass-card p-8 rounded-[40px] relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="text-primary w-8 h-8" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Create Account</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Join {APP_CONFIG.APP_NAME} for instant safety</p>
        </div>

        {success ? (
          <div className="text-center space-y-6">
            <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-3xl border border-green-100 dark:border-green-900/30">
              <AlertCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Check your email</h3>
              <p className="text-slate-600 dark:text-slate-400">
                We've sent a confirmation link to <span className="font-bold">{email}</span>. Please click it to activate your account.
              </p>
            </div>
            <button
              onClick={() => setSuccess(false)}
              className="text-primary font-bold hover:underline"
            >
              Back to Sign Up
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-8">
              <button
                onClick={handleGoogleSignIn}
                className="w-full py-4 px-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center gap-3 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                <Chrome className="w-5 h-5" />
                Continue with Google
              </button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-slate-900 px-4 text-slate-400 dark:text-slate-500 font-bold">Or continue with email</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSignUp} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:text-white"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm font-medium bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-900/30">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 rounded-2xl bg-primary text-white font-bold text-lg shadow-xl shadow-red-200 dark:shadow-none hover:bg-primary-dark transition-all disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : 'Sign Up'}
              </button>
            </form>
          </>
        )}

        <p className="text-center mt-8 text-slate-500 dark:text-slate-400 text-sm">
          Already have an account?{' '}
          <Link to="/signin" className="text-primary font-bold hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
