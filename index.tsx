import React from 'react';
import Head from 'next/head';
import Chat from '../components/Chat';

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>智能对话 - 智慧网络语料生态平台</title>
      </Head>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">智能对话</h1>
        <Chat />
      </main>
    </div>
  );
};

export default HomePage; 