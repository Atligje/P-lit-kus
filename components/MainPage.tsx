


import React, { useState } from 'react';
import CaseLookup from './CaseLookup';
import ImageGenerator from './ImageGenerator';
import Chatbot from './Chatbot';
import { CaseIcon, ImageIcon, ChatIcon, LogoutIcon } from './Icons';

type Tab = 'case' | 'image' | 'chat';

interface MainPageProps {
  onLogout: () => void;
}

const MainPage: React.FC<MainPageProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<Tab>('case');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'case':
        return <CaseLookup />;
      case 'image':
        return <ImageGenerator />;
      case 'chat':
        return <Chatbot />;
      default:
        return null;
    }
  };

  const TabButton: React.FC<{ tabName: Tab; label: string; icon: React.ReactNode }> = ({ tabName, label, icon }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
        activeTab === tabName
          ? 'bg-indigo-600 text-white'
          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-800 text-gray-100">
      <nav className="w-full md:w-64 bg-gray-900 p-2 md:p-4 flex flex-row md:flex-col justify-between md:justify-start">
        <div>
          <h1 className="text-2xl font-bold text-white mb-6 hidden md:block">Stjórnborð</h1>
          <div className="flex flex-row md:flex-col space-x-2 md:space-x-0 md:space-y-2">
            <TabButton tabName="case" label="Málaleit" icon={<CaseIcon />} />
            <TabButton tabName="image" label="Myndasmiður" icon={<ImageIcon />} />
            <TabButton tabName="chat" label="Pólitíkus - Spjallmenni" icon={<ChatIcon />} />
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-red-600 hover:text-white transition-colors"
        >
          <LogoutIcon />
          <span className="hidden md:inline">Útskráning</span>
        </button>
      </nav>
      <main className="flex-1 p-2 sm:p-4 md:p-6 overflow-auto">
        {renderTabContent()}
      </main>
    </div>
  );
};

export default MainPage;