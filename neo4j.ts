
import neo4j, { Driver } from 'neo4j-driver';

// 创建 Neo4j 驱动实例
export const neo4jDriver: Driver = neo4j.driver(
  process.env.NEO4J_URI || 'neo4j://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'asdfasdf'
  ),
  {
    maxConnectionPoolSize: 50,
    connectionTimeout: 30000
  }
);

// 数据库连接健康检查
export async function verifyConnectivity() {
  try {
    await neo4jDriver.verifyConnectivity();
    console.log('Neo4j 连接成功');
    return true;
  } catch (error) {
    console.error('Neo4j 连接失败:', error);
    return false;
  }
}
 
// 关闭连接
export async function closeDriver() {
  await neo4jDriver.close();
} 