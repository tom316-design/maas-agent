import { useState, useRef } from 'react';
import axios from 'axios';
import mammoth from 'mammoth';

interface CheckItem {
  id: number;
  name: string;
  status: 'pass' | 'fail' | 'warning';
  description: string;
  suggestion?: string;
}

interface AnalysisResult {
  completeness: {
    items: CheckItem[];
    score: number;
  };
  accuracy: {
    items: CheckItem[];
    score: number;
  };
  structure: {
    title: string;
    sections: {
      title: string;
      subsections: string[];
    }[];
  };
}

interface AnalysisHistory {
  filename: string;
  timestamp: number;
  result: AnalysisResult;
}

interface SortConfig {
  key: keyof CheckItem;
  direction: 'asc' | 'desc';
}

const DocAnalysis = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [history, setHistory] = useState<AnalysisHistory[]>([]);
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'analysis' | 'history'>('analysis');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const calculateScore = (items: CheckItem[]): number => {
    if (items.length === 0) return 0;
    const passedItems = items.filter(item => item.status === 'pass').length;
    const warningItems = items.filter(item => item.status === 'warning').length;
    return Math.round((passedItems + warningItems * 0.5) / items.length * 100);
  };

  const formatCheckResults = (items: CheckItem[]): string => {
    return items.map(item => `
### ${item.name}
- 状态：${item.status === 'pass' ? '通过' : item.status === 'fail' ? '不通过' : '警告'}
- 问题描述：${item.description}
${item.suggestion ? `- 改进建议：${item.suggestion}` : ''}`).join('\n');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setUploadProgress(0);
    setResult(null);
    setCurrentFileName(file.name);

    try {
      console.log('开始处理文件:', file.name);
      
      // 检查文件大小
      if (file.size > 10 * 1024 * 1024) { // 10MB
        throw new Error('文件大小不能超过10MB');
      }

      const content = await readFileContent(file);
      if (!content || content.length === 0) {
        throw new Error('文件内容为空');
      }
      console.log('文件内容读取完成，长度:', content.length);

      setUploadProgress(30);

      // 发送到API进行分析
      console.log('开始发送到API进行分析');
      const response = await axios.post('/api/parse-doc', { 
        content,
        filename: file.name
      });
      
      if (!response.data || !response.data.completeness || !response.data.accuracy) {
        throw new Error('文档分析结果格式不正确');
      }

      console.log('API分析完成');
      const analysisResult = response.data;
      
      // 计算完整性和准确性得分
      analysisResult.completeness.score = calculateScore(analysisResult.completeness.items);
      analysisResult.accuracy.score = calculateScore(analysisResult.accuracy.items);
      
      setResult(analysisResult);
      setUploadProgress(100);

      // 添加到历史记录
      setHistory(prev => [
        {
          filename: file.name,
          timestamp: Date.now(),
          result: analysisResult
        },
        ...prev.slice(0, 9)
      ]);

    } catch (err: any) {
      console.error('文档分析错误:', err);
      let errorMessage = '文档分析失败';
      
      if (err.message) {
        if (err.message.includes('文件大小')) {
          errorMessage = err.message;
        } else if (err.message.includes('文件内容为空')) {
          errorMessage = '文件内容为空，请检查文件是否正确';
        } else if (err.message.includes('格式不正确')) {
          errorMessage = '文档格式不正确，请使用正确的文档模板';
        } else if (err.response?.data?.error) {
          errorMessage = err.response.data.error;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      // 清除文件输入，允许重新选择相同文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const readFileContent = async (file: File): Promise<string> => {
    if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
      // 处理 Word 文档
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } else if (file.name.endsWith('.txt')) {
      // 处理文本文件
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = (e) => reject(new Error('文件读取失败'));
        reader.readAsText(file);
      });
    } else {
      throw new Error('不支持的文件格式，请上传 .doc、.docx 或 .txt 文件');
    }
  };

  // 将 Markdown 格式的文本转换为 HTML
  const renderMarkdown = (text: string) => {
    const sections = text.split(/(?=###)/);
    return sections.map((section, index) => {
      if (!section.trim()) return null;

      const lines = section.split('\n');
      const title = lines[0].replace(/^###\s*/, '');
      const content = lines.slice(1).join('\n');

      return (
        <div key={index} className="mb-8">
          <h3 className="text-xl font-bold mb-4 text-blue-700">{title}</h3>
          <div className="prose max-w-none">
            {content.split(/(?=\*\*[^*]+\*\*)/).map((part, i) => {
              if (part.startsWith('**')) {
                const [bold, ...rest] = part.split('**');
                return (
                  <div key={i} className="mb-4">
                    <div className="font-bold text-gray-800">{bold}</div>
                    <div className="pl-4 text-gray-600">{rest.join('**')}</div>
                  </div>
                );
              }
              return <p key={i} className="mb-4 text-gray-600">{part}</p>;
            })}
          </div>
        </div>
      );
    });
  };

  const exportToMarkdown = () => {
    if (!result) return;

    const formatStats = (items: CheckItem[]) => {
      const stats = {
        pass: items.filter(item => item.status === 'pass').length,
        fail: items.filter(item => item.status === 'fail').length,
        warning: items.filter(item => item.status === 'warning').length
      };
      const total = items.length;
      return `- 总检查项：${total}
- 通过：${stats.pass} (${Math.round((stats.pass / total) * 100)}%)
- 不通过：${stats.fail} (${Math.round((stats.fail / total) * 100)}%)
- 警告：${stats.warning} (${Math.round((stats.warning / total) * 100)}%)`;
    };

    const content = `# UPF割接方案分析报告

## 文件信息
- 文件名称：${currentFileName}
- 分析时间：${new Date().toLocaleString()}

## 分析得分
- 完整性得分：${result.completeness.score}%
- 准确性得分：${result.accuracy.score}%

## 完整性检查统计
${formatStats(result.completeness.items)}

### 完整性检查详细结果
${formatCheckResults(result.completeness.items)}

## 准确性检查统计
${formatStats(result.accuracy.items)}

### 准确性检查详细结果
${formatCheckResults(result.accuracy.items)}

## 文档结构
${result.structure.sections.map(section => `
### ${section.title}
${section.subsections.map(sub => `- ${sub}`).join('\n')}`).join('\n')}

## 总结建议
1. 完整性问题：${result.completeness.items.filter(item => item.status === 'fail').length} 个不通过项
${result.completeness.items
  .filter(item => item.status === 'fail')
  .map(item => `   - ${item.name}：${item.description}`)
  .join('\n')}

2. 准确性问题：${result.accuracy.items.filter(item => item.status === 'fail').length} 个不通过项
${result.accuracy.items
  .filter(item => item.status === 'fail')
  .map(item => `   - ${item.name}：${item.description}`)
  .join('\n')}

3. 需要注意的警告：
${[...result.completeness.items, ...result.accuracy.items]
  .filter(item => item.status === 'warning')
  .map(item => `   - ${item.name}：${item.description}`)
  .join('\n')}

## 改进建议
${[...result.completeness.items, ...result.accuracy.items]
  .filter(item => item.suggestion)
  .map(item => `- ${item.name}：${item.suggestion}`)
  .join('\n')}
`;

    const element = document.createElement('a');
    const file = new Blob([content], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = `割接方案分析结果_${currentFileName}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const exportToPDF = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">割接方案分析</h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            disabled={isLoading}
          >
            {isLoading ? '分析中...' : '上传文档'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".doc,.docx,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
          {isLoading && (
            <div className="flex items-center">
              <div className="w-40 h-2 bg-gray-200 rounded-full mr-2">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <span className="text-sm text-gray-600">{uploadProgress}%</span>
            </div>
          )}
        </div>
      </div>

      {/* 标签页切换 */}
      <div className="mb-6 border-b">
        <div className="flex space-x-4">
          <button
            className={`py-2 px-4 ${
              activeTab === 'analysis'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500'
            }`}
            onClick={() => setActiveTab('analysis')}
          >
            当前分析
          </button>
          <button
            className={`py-2 px-4 ${
              activeTab === 'history'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500'
            }`}
            onClick={() => setActiveTab('history')}
          >
            历史记录
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded">
          <div className="font-bold">错误提示：</div>
          <div>{error}</div>
        </div>
      )}

      {activeTab === 'analysis' && result && (
        <div className="space-y-6">
          {/* 文件信息 */}
          <div className="bg-blue-50 rounded p-4">
            <div className="text-sm text-gray-600">
              <div><span className="font-medium">文件名称：</span>{currentFileName}</div>
              <div><span className="font-medium">分析时间：</span>{new Date().toLocaleString()}</div>
            </div>
          </div>

          {/* 分析总览 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded p-4 bg-white">
              <h4 className="text-lg font-semibold mb-2">完整性得分</h4>
              <div className="text-3xl font-bold text-blue-600">{result.completeness.score}%</div>
            </div>
            <div className="border rounded p-4 bg-white">
              <h4 className="text-lg font-semibold mb-2">准确性得分</h4>
              <div className="text-3xl font-bold text-green-600">{result.accuracy.score}%</div>
            </div>
          </div>

          {/* 完整性检查结果 */}
          <div className="border rounded p-6 bg-white">
            <CheckResultTable 
              title="完整性检查结果" 
              items={result.completeness.items} 
            />
          </div>

          {/* 准确性检查结果 */}
          <div className="border rounded p-6 bg-white">
            <CheckResultTable 
              title="准确性检查结果" 
              items={result.accuracy.items} 
            />
          </div>

          {/* 文档结构 */}
          <div className="border rounded p-4 bg-gray-50">
            <h3 className="text-lg font-semibold mb-4">文档结构</h3>
            <div className="space-y-2">
              {result.structure.sections.map((section, index) => (
                <div key={index} className="ml-4">
                  <div className="font-medium text-blue-600">{section.title}</div>
                  <div className="ml-4 text-gray-600">
                    {section.subsections.map((sub, subIndex) => (
                      <div key={subIndex} className="flex items-center space-x-2">
                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                        <div>{sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 导出按钮组 */}
          <div className="flex justify-end space-x-4 mt-4">
            <button
              onClick={exportToMarkdown}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              导出 Markdown
            </button>
            <button
              onClick={exportToPDF}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              导出 PDF
            </button>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          {history.map((item, index) => (
            <div
              key={index}
              className="border rounded p-4 hover:bg-gray-50 cursor-pointer"
              onClick={() => {
                setResult(item.result);
                setCurrentFileName(item.filename);
                setActiveTab('analysis');
              }}
            >
              <div className="font-medium">{item.filename}</div>
              <div className="text-sm text-gray-500">
                分析时间：{new Date(item.timestamp).toLocaleString()}
              </div>
            </div>
          ))}
          {history.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              暂无分析历史记录
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const StatisticsChart = ({ items }: { items: CheckItem[] }) => {
  const stats = {
    pass: items.filter(item => item.status === 'pass').length,
    fail: items.filter(item => item.status === 'fail').length,
    warning: items.filter(item => item.status === 'warning').length
  };

  const total = items.length;
  const getPercentage = (count: number) => Math.round((count / total) * 100);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.pass}</div>
          <div className="text-sm text-gray-500">通过 ({getPercentage(stats.pass)}%)</div>
        </div>
        <div className="flex-1 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.fail}</div>
          <div className="text-sm text-gray-500">不通过 ({getPercentage(stats.fail)}%)</div>
        </div>
        <div className="flex-1 text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.warning}</div>
          <div className="text-sm text-gray-500">警告 ({getPercentage(stats.warning)}%)</div>
        </div>
      </div>
      
      <div className="h-4 flex rounded-full overflow-hidden">
        <div 
          className="bg-green-500 transition-all duration-500"
          style={{ width: `${getPercentage(stats.pass)}%` }}
        />
        <div 
          className="bg-red-500 transition-all duration-500"
          style={{ width: `${getPercentage(stats.fail)}%` }}
        />
        <div 
          className="bg-yellow-500 transition-all duration-500"
          style={{ width: `${getPercentage(stats.warning)}%` }}
        />
      </div>
    </div>
  );
};

const CheckResultTable = ({ items, title }: { items: CheckItem[], title: string }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pass' | 'fail' | 'warning'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const sortedAndFilteredItems = [...items]
    .filter(item => {
      if (statusFilter === 'all') return true;
      return item.status === statusFilter;
    })
    .filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (!sortConfig) return 0;
      
      const { key, direction } = sortConfig;
      const aValue = a[key];
      const bValue = b[key];
      
      if (!aValue || !bValue) return 0;
      return (aValue < bValue ? -1 : 1) * (direction === 'asc' ? 1 : -1);
    });

  const handleSort = (key: keyof CheckItem) => {
    setSortConfig(current => ({
      key,
      direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (key: keyof CheckItem) => {
    if (sortConfig?.key !== key) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const getStatusCount = (status: 'pass' | 'fail' | 'warning') => {
    return items.filter(item => item.status === status).length;
  };

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-blue-700">{title}</h3>
        <div className="flex items-center space-x-4">
          {/* 搜索框 */}
          <div className="relative">
            <input
              type="text"
              placeholder="搜索检查项..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* 状态筛选 */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg text-sm ${
                statusFilter === 'all' ? 'bg-gray-200' : 'hover:bg-gray-100'
              }`}
            >
              全部 ({items.length})
            </button>
            <button
              onClick={() => setStatusFilter('pass')}
              className={`px-3 py-1 rounded-lg text-sm ${
                statusFilter === 'pass' ? 'bg-green-100 text-green-800' : 'hover:bg-gray-100'
              }`}
            >
              通过 ({getStatusCount('pass')})
            </button>
            <button
              onClick={() => setStatusFilter('fail')}
              className={`px-3 py-1 rounded-lg text-sm ${
                statusFilter === 'fail' ? 'bg-red-100 text-red-800' : 'hover:bg-gray-100'
              }`}
            >
              不通过 ({getStatusCount('fail')})
            </button>
            <button
              onClick={() => setStatusFilter('warning')}
              className={`px-3 py-1 rounded-lg text-sm ${
                statusFilter === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'hover:bg-gray-100'
              }`}
            >
              警告 ({getStatusCount('warning')})
            </button>
          </div>
        </div>
      </div>

      {/* 添加统计图表 */}
      <div className="mb-6 border rounded-lg bg-white">
        <StatisticsChart items={items} />
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                检查项 {getSortIcon('name')}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('status')}
              >
                状态 {getSortIcon('status')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                问题描述
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                改进建议
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedAndFilteredItems.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {item.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${item.status === 'pass' ? 'bg-green-100 text-green-800' : 
                      item.status === 'fail' ? 'bg-red-100 text-red-800' : 
                      'bg-yellow-100 text-yellow-800'}`}>
                    {item.status === 'pass' ? '通过' : 
                     item.status === 'fail' ? '不通过' : '警告'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {item.description}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {item.suggestion || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {sortedAndFilteredItems.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          没有找到匹配的检查项
        </div>
      )}
    </div>
  );
};

export default DocAnalysis; 