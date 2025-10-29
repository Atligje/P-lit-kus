



import React, { useState, useEffect, useRef } from 'react';
import type { Chat } from '@google/genai';
import { createChat } from '../services/geminiService';
import type { ChatMessage } from '../types';
import { SendIcon } from './Icons';
import LoadingSpinner from './LoadingSpinner';

const Chatbot: React.FC = () => {
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const exampleQuestions = [
      "Hvað er stjórnarsáttmáli?",
      "Hver er munurinn á frumvarpi og þingsályktunartillögu?",
      "Hvert er hlutverk forseta Alþingis?",
      "Hvað gerir Umboðsmaður Alþingis?"
  ];

  useEffect(() => {
    setChat(createChat());
    setMessages([
        { role: 'model', parts: [{ text: "Halló! Ég heiti Pólitíkus. Hvernig get ég aðstoðað þig í dag?" }] }
    ]);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !chat || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', parts: [{ text: input }] };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const stream = await chat.sendMessageStream({ message: input });
      
      let modelResponse = '';
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: "" }] }]);

      for await (const chunk of stream) {
        modelResponse += chunk.text;
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].parts[0].text = modelResponse;
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = { role: 'model', parts: [{ text: 'Því miður, eitthvað fór úrskeiðis. Vinsamlegast reyndu aftur.' }] };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 rounded-lg">
       <div className="p-4 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold text-white mb-3">Dæmi um spurningar</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {exampleQuestions.map((q, i) => (
                  <button 
                    key={i} 
                    onClick={() => setInput(q)} 
                    className="p-3 bg-gray-800 rounded-lg text-left hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                      <p className="text-gray-300">{q}</p>
                  </button>
              ))}
          </div>
      </div>
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-lg p-3 rounded-xl ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
              <p className="text-sm whitespace-pre-wrap">{msg.parts[0].text}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="max-w-lg p-3 rounded-xl bg-gray-700 text-gray-200">
                <LoadingSpinner />
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-2 sm:p-4 border-t border-gray-700 flex-shrink-0">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Sláðu inn skilaboðin þín..."
            className="w-full bg-gray-800 border border-gray-600 rounded-full py-3 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={isLoading}
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 text-white rounded-full p-2 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;