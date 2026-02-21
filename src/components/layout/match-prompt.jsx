import React, { useEffect, useState } from 'react';
import { MatchService } from '../../services/match-service';
import { Heart, X } from 'lucide-react';

export const MatchPrompt = () => {
    const [match, setMatch] = useState(null);

    useEffect(() => {
        const subscription = MatchService.subscribeToMatches((newMatch) => {
            setMatch(newMatch);
            // Auto-hide after 5 seconds
            setTimeout(() => setMatch(null), 5000);
        });

        return () => {
            if (subscription) subscription.unsubscribe();
        };
    }, []);

    if (!match) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-gradient-to-br from-blue-900 to-purple-900 p-8 rounded-3xl border-2 border-blue-400 shadow-[0_0_50px_rgba(59,130,246,0.5)] text-center max-w-sm w-full transform animate-in zoom-in duration-500">
                <div className="relative inline-block mb-6">
                    <Heart size={80} className="text-red-500 fill-current animate-pulse" />
                    <div className="absolute top-0 right-0 bg-white text-blue-900 rounded-full h-8 w-8 flex items-center justify-center font-bold">!</div>
                </div>

                <h2 className="text-4xl font-black text-white mb-2 italic tracking-tighter">¡ES UN MATCH!</h2>
                <p className="text-blue-100 mb-8">Has conectado con una nueva sala. ¿Quieres entrar ahora?</p>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full bg-white text-blue-900 font-bold py-4 rounded-xl hover:bg-blue-50 transition shadow-lg"
                    >
                        IR A LA SALA
                    </button>
                    <button
                        onClick={() => setMatch(null)}
                        className="w-full text-blue-300 hover:text-white font-medium py-2 transition"
                    >
                        Seguir buscando
                    </button>
                </div>
            </div>
        </div>
    );
};
