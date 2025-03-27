'use client';

import { useState } from 'react';

const API_CONFIG = {
  APP_URL: 'https://183.235.108.52:38559/api/proxy/api/v1',
  APP_ID: 'cv34rqpu4vo0g2jv698g',
  KEY: 'cv3a3k1u4vo0g2jv6p1g'
};

export default function Home() {
  const [messages, setMessages] = useState<Array<{type: 'user' | 'agent', content: string}>>([]);
  const [input, setInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // 添加用户消息
    setMessages(prev => [...prev, { type: 'user', content: input }]);
    
    try {
      const response = await fetch(`${API_CONFIG.APP_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-ID': API_CONFIG.APP_ID,
          'X-App-Key': API_CONFIG.KEY,
        },
        body: JSON.stringify({
          message: input
        }),
      });

      const data = await response.json();
      setMessages(prev => [...prev, { type: 'agent', content: data.response }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { type: 'agent', content: '抱歉，发生了错误，请稍后重试。' }]);
    }

    setInput('');
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 bg-gray-100">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">MAAS 操作日志告警专家</h1>
        
        <div className="h-[500px] overflow-y-auto mb-4 p-4 border rounded">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`mb-4 ${
                message.type === 'user' ? 'text-right' : 'text-left'
              }`}
            >
              <div
                className={`inline-block p-3 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 p-2 border rounded"
            placeholder="请输入您的问题..."
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            发送
          </button>
        </form>
      </div>
    </main>
  );
}
