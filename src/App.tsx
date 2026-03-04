import React, { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import { Copy, Users, Play, Eye, RotateCcw, Sparkles, Heart } from 'lucide-react';

// --- Types ---
interface Player {
  id: string;
  name: string;
  avatar: string;
  vote: string | number | null;
}

interface Session {
  players: Record<string, Player>;
  revealed: boolean;
  adminId: string;
}

// --- Constants ---
const FIBONACCI = ['0', '1/2', '1', '2', '3', '5', '8', '13', '21', '?', '☕'];

const PONIES = [
  { name: 'Twilight Sparkle', color: '#D19FE4', img: '/avatars/twilight.jpg' },
  { name: 'Pinkie Pie', color: '#FFB6C1', img: '/avatars/pinkie.jpg' },
  { name: 'Rainbow Dash', color: '#87CEEB', img: '/avatars/rainbow.jpg' },
  { name: 'Rarity', color: '#F0F8FF', img: '/avatars/rarity.jpg' },
  { name: 'Applejack', color: '#FFD700', img: '/avatars/applejack.jpg' },
  { name: 'Fluttershy', color: '#FFFACD', img: '/avatars/fluttershy.jpg' },
];

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [name, setName] = useState('');
  const [selectedPony, setSelectedPony] = useState(PONIES[0]);
  const [isJoined, setIsJoined] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Initialize socket
  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('session-update', (updatedSession: Session) => {
      setSession(updatedSession);
    });

    // Check URL for session ID
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('session');
    if (id) {
      setSessionId(id);
    }

    return () => {
      newSocket.close();
    };
  }, []);

  const createSession = async () => {
    try {
      const res = await fetch('/api/create-session');
      const data = await res.json();
      const newUrl = `${window.location.origin}${window.location.pathname}?session=${data.sessionId}`;
      window.history.pushState({}, '', newUrl);
      setSessionId(data.sessionId);
    } catch (err) {
      console.error('Failed to create session', err);
    }
  };

  const joinSession = () => {
    if (socket && sessionId && name) {
      socket.emit('join-session', {
        sessionId,
        name,
        avatar: selectedPony.img,
      });
      setIsJoined(true);
    }
  };

  const submitVote = (vote: string | number) => {
    if (socket && sessionId && !session?.revealed) {
      socket.emit('submit-vote', { sessionId, vote });
    }
  };

  const revealVotes = () => {
    if (socket && sessionId) {
      socket.emit('reveal-votes', { sessionId });
    }
  };

  const resetRound = () => {
    if (socket && sessionId) {
      socket.emit('reset-round', { sessionId });
    }
  };

  const copyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const calculateAverage = () => {
    if (!session) return 0;
    const votes = (Object.values(session.players) as Player[])
      .map(p => {
        const v = p.vote;
        if (v === null || v === undefined || v === '?' || v === '☕') return null;
        if (v === '1/2') return 0.5;
        const num = Number(v);
        return isNaN(num) ? null : num;
      })
      .filter((v): v is number => v !== null);
    
    if (votes.length === 0) return 0;
    const sum = votes.reduce((a, b) => a + b, 0);
    return (sum / votes.length).toFixed(1);
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-pink-50">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-pink-300 max-w-md w-full text-center"
        >
          <div className="flex justify-center mb-6">
            <Sparkles className="text-pink-500 w-12 h-12 animate-pulse" />
          </div>
          <h1 className="text-4xl font-bold text-pink-600 mb-4 font-pony">Pony Poker</h1>
          <p className="text-purple-700 mb-8">Magical Storypointing for Friendship and Agile!</p>
          <button
            onClick={createSession}
            className="w-full py-4 bg-pink-500 hover:bg-pink-600 text-white rounded-2xl font-bold text-xl shadow-lg transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
          >
            <Play fill="currentColor" /> Create New Session
          </button>
        </motion.div>
      </div>
    );
  }

  if (!isJoined) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-purple-50">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-purple-300 max-w-md w-full"
        >
          <h2 className="text-2xl font-bold text-purple-600 mb-6 text-center font-pony leading-tight">
            Join the Herd for Magical Storypointing for Friendship and Agile!
          </h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-2">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name..."
                className="w-full p-4 border-2 border-purple-100 rounded-xl focus:border-purple-400 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-700 mb-2">Choose your Pony</label>
              <div className="grid grid-cols-3 gap-3">
                {PONIES.map((pony) => (
                  <button
                    key={pony.name}
                    onClick={() => setSelectedPony(pony)}
                    className={`p-2 rounded-xl border-2 transition-all ${
                      selectedPony.name === pony.name 
                        ? 'border-purple-500 bg-purple-50 scale-105' 
                        : 'border-transparent hover:bg-gray-50'
                    }`}
                  >
                    <img 
                      src={pony.img} 
                      alt={pony.name} 
                      className="w-full h-auto rounded-lg mb-1" 
                      referrerPolicy="no-referrer" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${pony.name}&backgroundColor=ffd700`;
                      }}
                    />
                    <span className="text-[10px] font-bold text-purple-800 block truncate">{pony.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={joinSession}
              disabled={!name}
              className="w-full py-4 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white rounded-2xl font-bold text-xl shadow-lg transition-all transform hover:scale-105 active:scale-95"
            >
              Join Session
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const players = session ? (Object.values(session.players) as Player[]) : [];
  const isAdmin = socket && session && session.adminId === socket.id;

  return (
    <div className="min-h-screen bg-pink-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="p-4 flex items-center justify-between bg-white shadow-sm border-b border-pink-100">
        <div className="flex items-center gap-2">
          <Heart className="text-pink-500 fill-pink-500" />
          <h1 className="text-2xl font-bold text-pink-600 font-pony">Pony Poker</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={copyLink}
            className="flex items-center gap-2 px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-full text-sm font-bold transition-colors"
          >
            {copyFeedback ? 'Copied!' : <><Copy size={16} /> Copy Invite Link</>}
          </button>
          <div className="flex items-center gap-2 px-4 py-2 bg-pink-100 text-pink-700 rounded-full text-sm font-bold">
            <Users size={16} /> {players.length} Ponies
          </div>
        </div>
      </header>

      {/* Poker Table Area */}
      <main className="flex-1 relative flex items-center justify-center p-8">
        {/* The Table */}
        <div className="relative w-full max-w-4xl aspect-[2/1] bg-emerald-600 rounded-[200px] border-[12px] border-emerald-800 shadow-2xl flex items-center justify-center">
          <div className="absolute inset-4 border-4 border-emerald-700/50 rounded-[180px]" />
          
          {/* Table Center Content */}
          <div className="text-center z-10">
            <AnimatePresence mode="wait">
              {session?.revealed ? (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  className="bg-white/90 backdrop-blur p-6 rounded-3xl shadow-xl border-4 border-yellow-400"
                >
                  <h3 className="text-lg font-bold text-purple-800 mb-1">Average Score</h3>
                  <div className="text-6xl font-black text-pink-600 font-pony">{calculateAverage()}</div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-emerald-100 font-pony text-3xl opacity-50"
                >
                  Waiting for votes...
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Players around the table */}
          {players.map((player, index) => {
            const angle = (index / players.length) * 2 * Math.PI;
            const radiusX = 50; // percentage
            const radiusY = 50; // percentage
            
            // Player position (outside table)
            const px = 50 + radiusX * Math.cos(angle) * 1.15;
            const py = 50 + radiusY * Math.sin(angle) * 1.15;

            // Card position (on table surface)
            const cx = 50 + radiusX * Math.cos(angle) * 0.65;
            const cy = 50 + radiusY * Math.sin(angle) * 0.65;

            return (
              <React.Fragment key={player.id}>
                {/* Card on Table */}
                <div 
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20"
                  style={{ left: `${cx}%`, top: `${cy}%` }}
                >
                  <AnimatePresence mode="wait">
                    {player.vote !== null ? (
                      <motion.div
                        key={session?.revealed ? 'front' : 'back'}
                        initial={{ rotateY: 90, scale: 0.8 }}
                        animate={{ rotateY: 0, scale: 1 }}
                        className={`w-12 h-18 rounded-lg shadow-lg flex items-center justify-center text-xl font-bold border-2 ${
                          session?.revealed 
                            ? 'bg-white text-purple-600 border-purple-200' 
                            : 'card-back border-white/50'
                        }`}
                      >
                        {session?.revealed ? player.vote : ''}
                      </motion.div>
                    ) : (
                      <div className="w-12 h-18 rounded-lg border-2 border-dashed border-emerald-400/30" />
                    )}
                  </AnimatePresence>
                </div>

                {/* Player Avatar */}
                <div
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-30"
                  style={{ left: `${px}%`, top: `${py}%` }}
                >
                  <div className={`relative p-1 rounded-full border-4 ${player.id === socket?.id ? 'border-yellow-400' : 'border-white'} shadow-lg bg-white`}>
                    <img 
                      src={player.avatar} 
                      alt={player.name} 
                      className="w-12 h-12 rounded-full object-cover" 
                      referrerPolicy="no-referrer" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${player.name}&backgroundColor=d19fe4`;
                      }}
                    />
                    {player.vote !== null && !session?.revealed && (
                      <div className="absolute -top-2 -right-2 bg-green-500 text-white p-1 rounded-full shadow-sm">
                        <Sparkles size={12} />
                      </div>
                    )}
                  </div>
                  <span className="mt-2 px-3 py-1 bg-white/90 rounded-full text-xs font-bold text-purple-900 shadow-sm whitespace-nowrap">
                    {player.name} {player.id === socket?.id && '(You)'}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </main>

      {/* Controls Footer */}
      <footer className="p-6 bg-white border-t border-pink-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-6">
          {/* Fibonacci Buttons */}
          <div className="flex-1 flex flex-wrap justify-center gap-3">
            {FIBONACCI.map((val) => (
              <button
                key={val}
                disabled={session?.revealed}
                onClick={() => submitVote(val)}
                className={`w-14 h-20 rounded-xl font-bold text-xl shadow-md transition-all transform hover:-translate-y-1 active:scale-95 border-2 ${
                  session?.players[socket?.id || '']?.vote === val
                    ? 'bg-pink-500 text-white border-pink-600 scale-110'
                    : 'bg-white text-purple-600 border-purple-100 hover:border-pink-300'
                } disabled:opacity-50 disabled:hover:translate-y-0`}
              >
                {val}
              </button>
            ))}
          </div>

          {/* Admin Actions */}
          {isAdmin && (
            <div className="flex gap-3">
              {!session?.revealed ? (
                <button
                  onClick={revealVotes}
                  className="px-8 py-4 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 rounded-2xl font-bold text-lg shadow-lg flex items-center gap-2 transition-all transform hover:scale-105"
                >
                  <Eye size={20} /> Reveal Cards
                </button>
              ) : (
                <button
                  onClick={resetRound}
                  className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-lg shadow-lg flex items-center gap-2 transition-all transform hover:scale-105"
                >
                  <RotateCcw size={20} /> Next Round
                </button>
              )}
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
