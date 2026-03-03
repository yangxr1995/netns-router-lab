import { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import type { NodeType } from '@/types';

interface NetworkGraphProps {
  onNodeSelect: (node: cytoscape.NodeSingular | null) => void;
  cyRef: React.MutableRefObject<cytoscape.Core | null>;
  gridAlign: boolean;
}

const nodeColors: Record<NodeType, string> = {
  router: '#f85149',
  switch: '#58a6ff',
  pc: '#3fb950'
};

const nodeShapes: Record<NodeType, cytoscape.Css.NodeShape> = {
  router: 'round-rectangle',
  switch: 'round-rectangle',
  pc: 'ellipse'
};

export default function NetworkGraph({
  onNodeSelect,
  cyRef,
  gridAlign
}: NetworkGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sourceNodeRef = useRef<cytoscape.NodeSingular | null>(null);
  const ctrlPressedRef = useRef(false);

  // Initialize Cytoscape
  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': 13,
            'font-weight': 500,
            'color': '#f0f6fc',
            'text-outline-color': '#0d1117',
            'text-outline-width': 2,
            'width': 100,
            'height': 50,
            'border-width': 2,
            'border-color': '#30363d',
            'transition-property': 'background-color, border-color, border-width, width, height'
          }
        },

        {
          selector: 'node[type="router"]',
          style: {
            'background-color': nodeColors.router,
            'shape': nodeShapes.router
          }
        },
        {
          selector: 'node[type="switch"]',
          style: {
            'background-color': nodeColors.switch,
            'shape': nodeShapes.switch
          }
        },
        {
          selector: 'node[type="pc"]',
          style: {
            'background-color': nodeColors.pc,
            'shape': nodeShapes.pc
          }
        },
        {
          selector: ':selected',
          style: {
            'border-width': 4,
            'border-color': '#ffd700',
            'border-style': 'solid'
          }
        },
        {
          selector: '.connecting',
          style: {
            'border-width': 4,
            'border-color': '#f39c12',
            'border-style': 'dashed'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#666',
            'target-arrow-color': '#666',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 1.2
          }
        },
        {
          selector: ':selected.edge',
          style: {
            'line-color': '#ffd700',
            'target-arrow-color': '#ffd700',
            'width': 3
          }
        }
      ],
      layout: { name: 'grid' },
      minZoom: 0.3,
      maxZoom: 3,
      wheelSensitivity: 0.3,
      selectionType: 'single'
    });

    cyRef.current = cy;

    // Track Ctrl key state
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        ctrlPressedRef.current = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        ctrlPressedRef.current = false;
        // Cancel connection mode if Ctrl released
        if (sourceNodeRef.current) {
          sourceNodeRef.current.removeClass('connecting');
          sourceNodeRef.current = null;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // Event handlers
    cy.on('select', 'node', (evt) => {
      onNodeSelect(evt.target);
    });

    cy.on('unselect', 'node', () => {
      onNodeSelect(null);
    });

    // Node click handler for connection
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      
      // Only handle connection when Ctrl is pressed
      if (ctrlPressedRef.current) {
        if (!sourceNodeRef.current) {
          // First click - select source
          sourceNodeRef.current = node;
          node.addClass('connecting');
        } else if (sourceNodeRef.current.id() !== node.id()) {
          // Second click - connect to target
          const existingEdge = cy.edges().filter(edge => 
            edge.data('source') === sourceNodeRef.current!.id() && 
            edge.data('target') === node.id()
          );
          
          if (!existingEdge || existingEdge.length === 0) {
            cy.add({
              group: 'edges',
              data: {
                source: sourceNodeRef.current.id(),
                target: node.id()
              }
            });
          }
          
          // Reset connection state
          sourceNodeRef.current.removeClass('connecting');
          sourceNodeRef.current = null;
        }
      }
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        cy.elements().unselect();
        // Cancel connection if clicking on empty canvas
        if (sourceNodeRef.current) {
          sourceNodeRef.current.removeClass('connecting');
          sourceNodeRef.current = null;
        }
      }
    });

    cy.on('dragfree', 'node', (evt) => {
      if (gridAlign) {
        const node = evt.target;
        const pos = node.position();
        const gridSize = 20;
        node.position({
          x: Math.round(pos.x / gridSize) * gridSize,
          y: Math.round(pos.y / gridSize) * gridSize
        });
      }
    });


    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      cy.destroy();
    };
  }, [cyRef, gridAlign, onNodeSelect]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full grid-background"
      style={{ minHeight: 0 }}
    />
  );
}
