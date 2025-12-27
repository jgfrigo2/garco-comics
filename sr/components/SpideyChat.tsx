import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { askSpideyLibrarian, isGeminiConfigured } from '../services/geminiService.ts';
import { Volume, ChatMessage } from '../types.ts';

interface SpideyChatProps {
  library: Volume[];
}

const SpideyChat: React.FC<SpideyChatProps> = ({ library }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Hola! Sóc el teu amic i veí Spider-Man. Què vols llegir avui?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    if (!isGeminiConfigured()) {
        setTimeout(() => {
            setMessages(prev => [...prev, { role: 'model', text: "Sembla que falten les meves teranyines (API Key no trobada a l'entorn)." }]);
            setIsLoading(false);
        }, 500);
        return;
    }

    try {
      const responseText = await askSpideyLibrarian(userMsg.text, library);
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', text: "Ups, alguna cosa ha fallat amb els meus llançateranyines." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-spidey-red hover:bg-spidey-darkRed text-white p-4 rounded-full shadow-lg transition-transform hover:scale-110 flex items-center justify-center border-2 border-spidey-blue"
        >
          <MessageCircle size={28} />
        </button>
      )}

      {isOpen && (
        <div className="bg-white rounded-xl shadow-2xl w-80 sm:w-96 flex flex-col overflow-hidden border-4 border-spidey-red h-[500px]">
          {/* Header */}
          <div className="bg-spidey-red p-3 flex justify-between items-center text-white">
            <h3 className="font-comic text-xl tracking-wide">Spidey AI</h3>
            <button onClick={() => setIsOpen(false)} className="hover:text-spidey-black">
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-3">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[80%] p-3 rounded-lg text-sm shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-spidey-blue text-white rounded-br-none' 
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 p-3 rounded-lg rounded-bl-none text-gray-500 text-xs italic">
                  L'Spider-Man està pensant...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-200 bg-white flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Demana'm una recomanació..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-spidey-blue"
            />
            <button 
              onClick={handleSend}
              disabled={isLoading}
              className="bg-spidey-red text-white p-2 rounded-lg hover:bg-spidey-darkRed disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpideyChat;
