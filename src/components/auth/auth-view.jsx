import { useState } from 'react';
import { AuthService } from '../../services/auth-service';
import { Mail, Lock, User, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import './auth.css';

export default function Auth() {
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [error, setError] = useState(null);

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                if (!username.trim()) throw new Error('Username is required');

                const result = await AuthService.signUp(email, password, username);
                if (!result.success) throw new Error(result.error);
                alert('Check your email for the confirmation link!');
            } else {
                const result = await AuthService.signIn(email, password);
                if (!result.success) throw new Error(result.error);
            }
        } catch (err) {
            setError(err.description || err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="logo-icon">
                        <Sparkles size={32} color="#8b5cf6" />
                    </div>
                    <h1>{isSignUp ? 'Create an Account' : 'Welcome Back'}</h1>
                    <p>{isSignUp ? 'Join the community and start matching' : 'Sign in to access your dashboard'}</p>
                </div>

                {error && <div className="error-message">{error}</div>}

                <form className="auth-form" onSubmit={handleAuth}>
                    {isSignUp && (
                        <div className="form-group slide-in">
                            <label htmlFor="username">Username</label>
                            <div className="input-wrapper">
                                <User size={18} />
                                <input
                                    id="username"
                                    type="text"
                                    placeholder="Enter your username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required={isSignUp}
                                />
                            </div>
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <div className="input-wrapper">
                            <Mail size={18} />
                            <input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <div className="input-wrapper">
                            <Lock size={18} />
                            <input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button className="auth-button" type="submit" disabled={loading}>
                        {loading ? (
                            <Loader2 className="spinner" size={20} />
                        ) : (
                            <>
                                {isSignUp ? 'Sign Up' : 'Sign In'}
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>
                        {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                        <button
                            className="auth-toggle"
                            onClick={() => {
                                setIsSignUp(!isSignUp);
                                setEmail('');
                                setPassword('');
                                setUsername('');
                                setError(null);
                            }}
                        >
                            {isSignUp ? 'Sign In' : 'Sign Up'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
