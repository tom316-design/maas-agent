import React, { useEffect, useRef, useState } from 'react';
import G6, { Graph as G6Graph, IEvent, GraphOptions } from '@antv/g6';

interface KnowledgeNode {
  id: string;
  label: string;
  type: string;
}

interface KnowledgeEdge {
  id: string;
  source: string;
  target: string;
  label: string;
}

interface KnowledgeGraphProps {
  data: {
    nodes: KnowledgeNode[];
    edges: KnowledgeEdge[];
  };
  onNodeClick?: (node: KnowledgeNode) => void;
  onEdgeClick?: (edge: KnowledgeEdge) => void;
}

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  data,
  onNodeClick,
  onEdgeClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<G6Graph | null>(null);
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);

  useEffect(() => {
    if (!containerRef.current) return;

    // 更新容器尺寸
    const updateSize = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.offsetWidth);
        setHeight(containerRef.current.offsetHeight);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    // 定义节点和边的样式
    G6.register('node', 'knowledge-node', {
      draw(cfg: any, group: any) {
        const { label, type } = cfg;
        
        // 创建节点主体
        const keyShape = group.addShape('circle', {
          attrs: {
            x: 0,
            y: 0,
            r: 20,
            fill: getNodeColor(type),
            stroke: '#666',
            lineWidth: 1,
            cursor: 'pointer',
          },
          name: 'node-keyShape',
        });

        // 添加文本标签
        group.addShape('text', {
          attrs: {
            text: label,
            x: 0,
            y: 30,
            textAlign: 'center',
            textBaseline: 'middle',
            fill: '#666',
            fontSize: 12,
          },
          name: 'node-label',
        });

        return keyShape;
      },
    } as any);

    // 初始化图谱
    graphRef.current = new G6.Graph({
      container: containerRef.current,
      width,
      height,
      modes: {
        default: ['drag-canvas', 'zoom-canvas', 'drag-node'],
      },
      defaultNode: {
        type: 'knowledge-node',
        size: 40,
        labelCfg: {
          position: 'bottom',
          offset: 10,
        },
      },
      defaultEdge: {
        style: {
          stroke: '#aaa',
          lineWidth: 1,
          endArrow: true,
        },
        labelCfg: {
          autoRotate: true,
          style: {
            fill: '#666',
            fontSize: 12,
          },
        },
      },
      layout: {
        type: 'force',
        preventOverlap: true,
        linkDistance: 100,
        nodeStrength: -30,
        edgeStrength: 0.1,
      },
    } as G6.GraphOptions);

    // 事件处理
    graphRef.current.on('node:click', (evt: IEvent) => {
      const node = (evt as any).item;
      if (node) {
        onNodeClick?.(node.getModel() as KnowledgeNode);
      }
    });

    graphRef.current.on('edge:click', (evt: IEvent) => {
      const edge = (evt as any).item;
      if (edge) {
        onEdgeClick?.(edge.getModel() as KnowledgeEdge);
      }
    });

    return () => {
      window.removeEventListener('resize', updateSize);
      graphRef.current?.destroy();
    };
  }, []);

  // 更新数据
  useEffect(() => {
    if (graphRef.current) {
      (graphRef.current as any).changeData({
        nodes: data.nodes.map(node => ({
          id: node.id,
          label: node.label,
          type: node.type,
        })),
        edges: data.edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.label,
        })),
      });
      graphRef.current.render();
    }
  }, [data]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full min-h-[600px] border border-gray-200 rounded-lg"
    />
  );
};

// 根据节点类型返回不同的颜色
function getNodeColor(type: string): string {
  const colorMap: { [key: string]: string } = {
    device: '#91d5ff',
    fault: '#ffa39e',
    solution: '#b7eb8f',
    expert: '#adc6ff',
    default: '#d3adf7',
  };
  return colorMap[type] || colorMap.default;
}

export default KnowledgeGraph; 