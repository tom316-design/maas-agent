import { neo4jDriver } from './neo4j';

// 网络实体类型
export interface NetworkEntity {
  id?: string;
  label: string;        // 实体标签（设备/告警/解决方案等）
  type: string;         // 实体类型
  properties: {         // 实体属性
    name: string;
    description?: string;
    createdAt?: Date;
    updatedAt?: Date;
    [key: string]: any;
  };
}

// 网络关系类型
export interface NetworkRelation {
  id?: string;
  type: string;         // 关系类型（导致/解决/包含等）
  startNode: string;    // 起始节点ID
  endNode: string;      // 终止节点ID
  properties: {         // 关系属性
    weight?: number;    // 关系权重
    timestamp?: Date;
    [key: string]: any;
  };
}

// 图谱数据类型
export interface GraphData {
  nodes: any[];
  edges: any[];
}

export class KnowledgeGraphService {
  // 创建实体
  async createEntity(entity: NetworkEntity): Promise<any> {
    const session = neo4jDriver.session();
    try {
      // 设置创建时间
      if (!entity.properties.createdAt) {
        entity.properties.createdAt = new Date();
      }
      entity.properties.updatedAt = new Date();

      const result = await session.writeTransaction(tx =>
        tx.run(
          `
          CREATE (n:${entity.label} $props)
          RETURN n
          `,
          { props: entity.properties }
        )
      );
      
      const createdNode = result.records[0].get('n');
      return {
        id: createdNode.identity.toString(),
        ...createdNode.properties,
        label: entity.label,
        type: entity.type
      };
    } finally {
      await session.close();
    }
  }

  // 创建关系
  async createRelation(relation: NetworkRelation): Promise<any> {
    const session = neo4jDriver.session();
    try {
      // 设置时间戳
      if (!relation.properties.timestamp) {
        relation.properties.timestamp = new Date();
      }

      const result = await session.writeTransaction(tx =>
        tx.run(
          `
          MATCH (start), (end)
          WHERE ID(start) = $startId AND ID(end) = $endId
          CREATE (start)-[r:${relation.type} $props]->(end)
          RETURN r, start, end
          `,
          {
            startId: relation.startNode,
            endId: relation.endNode,
            props: relation.properties
          }
        )
      );
      
      const record = result.records[0];
      const rel = record.get('r');
      const start = record.get('start');
      const end = record.get('end');
      
      return {
        id: rel.identity.toString(),
        type: relation.type,
        properties: rel.properties,
        source: start.identity.toString(),
        target: end.identity.toString()
      };
    } finally {
      await session.close();
    }
  }

  // 查询相关实体
  async queryRelatedEntities(entityId: string, depth: number = 2): Promise<GraphData> {
    const session = neo4jDriver.session();
    try {
      const result = await session.readTransaction(tx =>
        tx.run(
          `
          MATCH path = (n)-[*1..${depth}]-(related)
          WHERE ID(n) = $entityId
          RETURN path
          `,
          { entityId }
        )
      );
      
      return this.processPathResults(result.records);
    } finally {
      await session.close();
    }
  }

  // 故障路径分析
  async analyzeFaultPath(faultId: string): Promise<GraphData> {
    const session = neo4jDriver.session();
    try {
      const result = await session.readTransaction(tx =>
        tx.run(
          `
          MATCH path = (fault:Fault {id: $faultId})-[:CAUSED_BY*]->(root:RootCause)
          RETURN path
          `,
          { faultId }
        )
      );
      
      return this.processPathResults(result.records);
    } finally {
      await session.close();
    }
  }

  // 搜索实体
  async searchEntities(keyword: string): Promise<any[]> {
    const session = neo4jDriver.session();
    try {
      const result = await session.readTransaction(tx =>
        tx.run(
          `
          MATCH (n)
          WHERE n.name CONTAINS $keyword OR n.description CONTAINS $keyword
          RETURN n
          LIMIT 20
          `,
          { keyword }
        )
      );
      
      return result.records.map(record => {
        const node = record.get('n');
        return {
          id: node.identity.toString(),
          ...node.properties,
          labels: node.labels
        };
      });
    } finally {
      await session.close();
    }
  }

  // 处理路径结果
  private processPathResults(records: any[]): GraphData {
    const nodes = new Map();
    const edges = new Map();

    records.forEach(record => {
      const path = record.get('path');
      
      path.segments.forEach((segment: any) => {
        // 处理起始节点
        const startNode = segment.start;
        if (!nodes.has(startNode.identity.toString())) {
          nodes.set(startNode.identity.toString(), {
            id: startNode.identity.toString(),
            ...startNode.properties,
            label: startNode.labels[0]
          });
        }
        
        // 处理终止节点
        const endNode = segment.end;
        if (!nodes.has(endNode.identity.toString())) {
          nodes.set(endNode.identity.toString(), {
            id: endNode.identity.toString(),
            ...endNode.properties,
            label: endNode.labels[0]
          });
        }
        
        // 处理关系
        const relationship = segment.relationship;
        if (!edges.has(relationship.identity.toString())) {
          edges.set(relationship.identity.toString(), {
            id: relationship.identity.toString(),
            source: startNode.identity.toString(),
            target: endNode.identity.toString(),
            type: relationship.type,
            ...relationship.properties
          });
        }
      });
    });

    return {
      nodes: Array.from(nodes.values()),
      edges: Array.from(edges.values())
    };
  }
} 