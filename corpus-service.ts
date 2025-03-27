// 语料类型定义
export interface Corpus {
  id?: string;
  type: 'log' | 'fault' | 'kpi' | 'inspection' | 'manual';
  content: string;
  source: string;
  metadata: {
    deviceId?: string;
    timestamp: Date;
    location?: {
      latitude?: number;
      longitude?: number;
      address?: string;
    };
    tags: string[];
    [key: string]: any;
  };
  processed?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// 故障案例类型
export interface FaultCase {
  id?: string;
  title: string;
  type: string;          // 故障类型
  description: string;   // 故障描述
  symptoms: string[];    // 故障现象
  solution: string;      // 解决方案
  severity: number;      // 严重程度 (1-5)
  deviceIds: string[];   // 相关设备ID
  logIds: string[];      // 相关日志ID
  status: 'open' | 'closed' | 'in_progress';
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
}

// 设备信息类型
export interface Device {
  id: string;
  name: string;
  type: string;
  vendor: string;       // 设备厂商
  model: string;        // 设备型号
  protocol: string;     // 协议类型
  location: {
    latitude?: number;
    longitude?: number;
    address: string;
  };
  status: 'online' | 'offline' | 'maintenance' | 'warning' | 'error';
  lastUpdated: Date;
}

export class CorpusService {
  private corpus: Corpus[] = [];
  private faultCases: FaultCase[] = [];
  private devices: Device[] = [];

  // 添加语料
  async addCorpus(corpus: Corpus): Promise<Corpus> {
    // 设置创建时间
    corpus.createdAt = new Date();
    corpus.updatedAt = new Date();
    corpus.id = Date.now().toString();
    
    this.corpus.push(corpus);
    return corpus;
  }

  // 批量添加语料
  async bulkAddCorpus(corpusItems: Corpus[]): Promise<Corpus[]> {
    const timestamp = new Date();
    const addedItems = corpusItems.map(item => {
      const newItem = {
        ...item,
        createdAt: timestamp,
        updatedAt: timestamp,
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9)
      };
      this.corpus.push(newItem);
      return newItem;
    });
    
    return addedItems;
  }

  // 获取语料列表
  async getCorpusList(type?: string, limit: number = 20, offset: number = 0): Promise<Corpus[]> {
    let result = this.corpus;
    
    if (type) {
      result = result.filter(item => item.type === type);
    }
    
    return result.slice(offset, offset + limit);
  }

  // 添加故障案例
  async addFaultCase(faultCase: FaultCase): Promise<FaultCase> {
    faultCase.createdAt = new Date();
    faultCase.updatedAt = new Date();
    faultCase.id = Date.now().toString();
    
    this.faultCases.push(faultCase);
    return faultCase;
  }

  // 获取故障案例列表
  async getFaultCases(status?: string, limit: number = 20, offset: number = 0): Promise<FaultCase[]> {
    let result = this.faultCases;
    
    if (status) {
      result = result.filter(item => item.status === status);
    }
    
    return result.slice(offset, offset + limit);
  }

  // 获取故障案例详情
  async getFaultCaseById(id: string): Promise<FaultCase | null> {
    const faultCase = this.faultCases.find(item => item.id === id);
    return faultCase || null;
  }

  // 添加设备
  async addDevice(device: Device): Promise<Device> {
    this.devices.push(device);
    return device;
  }

  // 获取设备列表
  async getDevices(type?: string, status?: string, limit: number = 20, offset: number = 0): Promise<Device[]> {
    let result = this.devices;
    
    if (type) {
      result = result.filter(item => item.type === type);
    }
    
    if (status) {
      result = result.filter(item => item.status === status);
    }
    
    return result.slice(offset, offset + limit);
  }

  // 日志模板处理
  async processLogTemplate(log: string, vendor?: string): Promise<any> {
    // 这里是日志模板处理的逻辑
    // 实际项目中可能需要更复杂的处理
    const templates = {
      'huawei': [
        { pattern: /ALARM:(\w+):(.+)/, template: 'ALARM:{code}:{message}' },
        { pattern: /(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) (\w+) (.+)/, template: '{timestamp} {level} {message}' }
      ],
      'zte': [
        { pattern: /Warning: (.+) - (\w+)/, template: 'Warning: {message} - {code}' },
        { pattern: /Error (\d+): (.+)/, template: 'Error {code}: {message}' }
      ]
    };
    
    // 如果没有指定厂商，尝试自动检测
    if (!vendor) {
      if (log.includes('ALARM')) {
        vendor = 'huawei';
      } else if (log.includes('Warning') || log.includes('Error')) {
        vendor = 'zte';
      } else {
        vendor = 'unknown';
      }
    }
    
    // 应用模板
    const vendorTemplates = templates[vendor as keyof typeof templates] || [];
    for (const { pattern, template } of vendorTemplates) {
      const match = log.match(pattern);
      if (match) {
        // 提取参数
        const params: Record<string, string> = {};
        if (vendor === 'huawei') {
          if (match[1]) params['code'] = match[1];
          if (match[2]) params['message'] = match[2];
          if (match[0]) params['timestamp'] = match[0];
          if (match[1]) params['level'] = match[1];
        } else if (vendor === 'zte') {
          if (match[1]) params['message'] = match[1];
          if (match[2]) params['code'] = match[2];
          if (match[1]) params['code'] = match[1];
          if (match[2]) params['message'] = match[2];
        }
        
        return {
          vendor,
          template,
          params,
          original: log
        };
      }
    }
    
    // 没有匹配的模板
    return {
      vendor,
      template: null,
      params: {},
      original: log
    };
  }
} 