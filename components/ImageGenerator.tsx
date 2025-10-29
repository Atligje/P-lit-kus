


import React, { useState } from 'react';
import { generateImage } from '../services/geminiService';
import { ImageIcon } from './Icons';
import LoadingSpinner from './LoadingSpinner';

const ImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const examplePrompt = 'Vindmyllur í íslensku landslagi undir norðurljósum';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setError('Vinsamlegast sláðu inn lýsingu á myndinni.');
      return;
    }
    setIsLoading(true);
    setImageUrl(null);
    setError(null);
    try {
      const url = await generateImage(prompt);
      setImageUrl(url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-start p-4">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Myndasmiður með gervigreind</h1>
        <p className="text-gray-400 mb-6 max-w-xl mx-auto">
          Þetta tól gerir þér kleift að búa til myndefni sem tengist þeim málum sem þú ert að greina. Notaðu það til að útbúa myndir fyrir kynningar, samfélagsmiðla, eða skýrslur til að gera efnið þitt áhrifameira.
        </p>

        <div className="mb-6 p-4 bg-gray-800/50 rounded-lg text-left">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Dæmi um notkun tengt málaleit:</h3>
            <p className="text-gray-300 mb-2 text-sm">Eftir að hafa greint mál um orkustefnu gætirðu búið til mynd fyrir kynningu:</p>
            <button 
                onClick={() => setPrompt(examplePrompt)}
                className="w-full p-3 bg-gray-800 rounded-lg text-left hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
                <p className="text-indigo-400 font-mono text-sm">{`"${examplePrompt}"`}</p>
            </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 mb-6">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Lýstu myndinni sem þú vilt búa til..."
            className="flex-grow bg-gray-800 border border-gray-700 rounded-md py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-md flex items-center justify-center gap-2 transition-colors disabled:bg-indigo-800 disabled:cursor-not-allowed w-full sm:w-auto"
          >
            {isLoading ? <LoadingSpinner /> : <ImageIcon />}
            <span>Búa til</span>
          </button>
        </form>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <div className="w-full aspect-square bg-gray-900 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-700">
          {isLoading ? (
            <div className="text-center">
                <LoadingSpinner />
                <p className="mt-2 text-gray-400">Bý til myndina þína...</p>
            </div>
          ) : imageUrl ? (
            <img src={imageUrl} alt={prompt} className="object-contain w-full h-full rounded-lg" />
          ) : (
            <div className="text-gray-500">
                <ImageIcon className="mx-auto h-12 w-12" />
                <p>Myndin sem þú býrð til birtist hér</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageGenerator;