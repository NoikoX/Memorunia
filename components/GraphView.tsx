import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Note, Cluster } from '../types';

interface GraphViewProps {
  notes: Note[];
  clusters: Cluster[];
  onNodeClick: (noteId: string) => void;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  group: string;
  type: 'note' | 'cluster';
  label: string;
  x?: number;
  y?: number;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  type: 'cluster' | 'semantic';
  value: number;
}

// Pure math helper for similarity
const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

export const GraphView: React.FC<GraphViewProps> = ({ notes, clusters, onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, undefined> | null>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || notes.length === 0) return;

    const container = containerRef.current;
    
    const initGraph = () => {
      // 1. Measure Dimensions
      const width = container.clientWidth;
      const height = container.clientHeight;

      if (width === 0 || height === 0) return;

      // 2. Cleanup Previous
      if (simulationRef.current) simulationRef.current.stop();
      d3.select(svgRef.current).selectAll("*").remove();

      // 3. Prepare Data
      const graphNodes: GraphNode[] = [];
      const graphLinks: GraphLink[] = [];

      // A. Add Cluster Nodes
      clusters.forEach(c => {
        graphNodes.push({ 
          id: c.id, 
          group: c.id, 
          type: 'cluster', 
          label: c.name,
          x: width / 2 + (Math.random() - 0.5) * 50,
          y: height / 2 + (Math.random() - 0.5) * 50
        });
      });

      // B. Add Note Nodes
      notes.forEach(n => {
        const cluster = clusters.find(c => c.noteIds.includes(n.id));
        const group = cluster ? cluster.id : 'unclustered';
        
        graphNodes.push({ 
          id: n.id, 
          group: group, 
          type: 'note', 
          label: n.title,
          x: width / 2 + (Math.random() - 0.5) * 100,
          y: height / 2 + (Math.random() - 0.5) * 100
        });

        // Link to Cluster Center
        if (cluster) {
          graphLinks.push({ 
            source: n.id, 
            target: cluster.id, 
            type: 'cluster',
            value: 1 
          });
        }
      });

      // C. Add Semantic Links (Auto-connect similar notes)
      // This creates the "web" effect even without clusters
      for (let i = 0; i < notes.length; i++) {
        for (let j = i + 1; j < notes.length; j++) {
          const n1 = notes[i];
          const n2 = notes[j];
          if (n1.embedding && n2.embedding) {
            const sim = cosineSimilarity(n1.embedding, n2.embedding);
            // Threshold for connection (0.65 is usually good for related concepts)
            if (sim > 0.65) {
              graphLinks.push({
                source: n1.id,
                target: n2.id,
                type: 'semantic',
                value: sim
              });
            }
          }
        }
      }

      // 4. Setup SVG & Zoom Group
      const svg = d3.select(svgRef.current)
        .attr("viewBox", [0, 0, width, height]);
      
      const g = svg.append("g");

      const zoom = d3.zoom<SVGSVGElement, unknown>()
          .scaleExtent([0.1, 4])
          .on("zoom", (event) => {
            g.attr("transform", event.transform);
          });

      svg.call(zoom);

      // 5. Setup Simulation
      const simulation = d3.forceSimulation<GraphNode>(graphNodes)
        .force("link", d3.forceLink<GraphNode, GraphLink>(graphLinks)
            .id(d => d.id)
            .distance(d => d.type === 'cluster' ? 80 : 120) // Semantic links are longer/looser
        )
        .force("charge", d3.forceManyBody<GraphNode>().strength((d) => d.type === 'cluster' ? -300 : -100))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collide", d3.forceCollide().radius(30).iterations(2));
      
      simulationRef.current = simulation;

      // 6. Draw Elements
      const link = g.append("g")
        .selectAll("line")
        .data(graphLinks)
        .join("line")
        .attr("stroke", d => d.type === 'cluster' ? "#cbd5e1" : "#e2e8f0") // Darker for cluster, lighter for semantic
        .attr("stroke-width", d => d.type === 'cluster' ? 2 : 1.5)
        .attr("stroke-dasharray", d => d.type === 'semantic' ? "4,4" : "none") // Dashed for semantic
        .attr("opacity", d => d.type === 'cluster' ? 0.8 : 0.6);

      const nodeGroup = g.append("g")
        .selectAll("g")
        .data(graphNodes)
        .join("g")
        .call(drag(simulation) as any);

      // Node Circles
      const circles = nodeGroup.append("circle")
        .attr("r", (d) => d.type === 'cluster' ? 20 : 8)
        .attr("fill", (d) => {
          if (d.type === 'cluster') return '#6366f1'; 
          if (d.group === 'unclustered') return '#94a3b8';
          const hash = d.group.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          return d3.interpolateRainbow((hash % 100) / 100);
        })
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .style("cursor", "pointer")
        .on("click", (event, d) => {
          if (d.type === 'note') {
            event.stopPropagation();
            onNodeClick(d.id);
          }
        });

      // Labels for Clusters
      nodeGroup.filter(d => d.type === 'cluster')
        .append("text")
        .text(d => d.label)
        .attr("font-size", 12)
        .attr("fill", "#475569")
        .attr("font-weight", "bold")
        .attr("text-anchor", "middle")
        .attr("dy", -28)
        .style("pointer-events", "none")
        .style("text-shadow", "0 1px 2px rgba(255,255,255,0.8)");

      // Tooltips for Notes
      circles.append("title").text(d => d.label);

      // 7. Tick Function
      simulation.on("tick", () => {
        link
          .attr("x1", (d: any) => d.source.x)
          .attr("y1", (d: any) => d.source.y)
          .attr("x2", (d: any) => d.target.x)
          .attr("y2", (d: any) => d.target.y);

        nodeGroup.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
      });
    };

    // Initial Draw
    initGraph();

    // Resize Observer
    const resizeObserver = new ResizeObserver(() => {
        if (!simulationRef.current || !container) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        simulationRef.current.force("center", d3.forceCenter(w / 2, h / 2));
        simulationRef.current.alpha(0.3).restart();
    });
    
    resizeObserver.observe(container);

    return () => {
      if (simulationRef.current) simulationRef.current.stop();
      resizeObserver.disconnect();
    };
  }, [notes, clusters, onNodeClick]);

  // Drag Helper
  const drag = (simulation: d3.Simulation<GraphNode, undefined>) => {
    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  };

  return (
    <div ref={containerRef} className="w-full h-full bg-slate-50 relative overflow-hidden select-none">
       {notes.length === 0 && (
         <div className="absolute inset-0 flex items-center justify-center text-slate-400">
           No notes to visualize. Add some notes!
         </div>
       )}
       {notes.length > 0 && clusters.length === 0 && (
          <div className="absolute top-4 left-4 right-4 z-10 flex justify-center pointer-events-none">
             <div className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full text-xs font-medium border border-indigo-100 shadow-sm">
                Showing semantic connections. Click "Organize My Notes" to group them!
             </div>
          </div>
       )}
       <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur p-2 rounded-lg text-xs text-slate-500 pointer-events-none border border-slate-200 shadow-sm">
         Scroll to Zoom • Drag to Pan
       </div>
      <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing"></svg>
    </div>
  );
};