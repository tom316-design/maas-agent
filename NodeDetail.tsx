import React from 'react';

interface NodeDetailProps {
  node: {
    id: string;
    label: string;
    type: string;
    properties: {
      name: string;
      description?: string;
      createdAt?: Date;
      updatedAt?: Date;
      [key: string]: any;
    };
  } | null;
  onClose: () => void;
}

const NodeDetail: React.FC<NodeDetailProps> = ({ node, onClose }) => {
  if (!node) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center pb-3">
          <h3 className="text-lg font-medium text-gray-900">节点详情</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <span className="sr-only">关闭</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">名称</label>
            <p className="mt-1 text-sm text-gray-900">{node.properties.name}</p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">类型</label>
            <p className="mt-1 text-sm text-gray-900">{node.type}</p>
          </div>

          {node.properties.description && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">描述</label>
              <p className="mt-1 text-sm text-gray-900">{node.properties.description}</p>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">创建时间</label>
            <p className="mt-1 text-sm text-gray-900">
              {node.properties.createdAt
                ? new Date(node.properties.createdAt).toLocaleString()
                : '未知'}
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">更新时间</label>
            <p className="mt-1 text-sm text-gray-900">
              {node.properties.updatedAt
                ? new Date(node.properties.updatedAt).toLocaleString()
                : '未知'}
            </p>
          </div>

          {/* 其他属性 */}
          {Object.entries(node.properties).map(([key, value]) => {
            if (['name', 'description', 'createdAt', 'updatedAt'].includes(key)) {
              return null;
            }
            return (
              <div key={key} className="mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  {key}
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default NodeDetail; 