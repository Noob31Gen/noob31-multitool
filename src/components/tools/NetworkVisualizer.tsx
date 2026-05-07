import React, { useState, useRef } from 'react';
import type { Device, Link } from '@/lib/networkSimulator';
import { DeviceType } from '@/lib/networkSimulator';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Play, RotateCcw, Trash2, Link as LinkIcon, 
  MousePointer2, Send, Download, Upload, Monitor, 
  Layers, Network, Globe, Grid3X3, Zap, Shield, HardDrive
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { animate } from 'animejs';

// Impure logic moved outside to satisfy strict purity linters
let idCounter = 0;
const nextId = (prefix: string) => {
  idCounter += 1;
  return `${prefix}-${idCounter}-${Math.random().toString(36).slice(2, 7)}`;
};

const getRandomCoords = (snapToGrid: boolean, gridSize: number) => {
  let x = 100 + Math.random() * 400;
  let y = 100 + Math.random() * 300;
  if (snapToGrid) {
    x = Math.round(x / gridSize) * gridSize;
    y = Math.round(y / gridSize) * gridSize;
  }
  return { x, y };
};

const getRandomMac = () => Math.random().toString(16).slice(2, 14).toUpperCase();

export const NetworkVisualizer: React.FC = () => {
  const [nodes, setNodes] = useState<Device[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedLink, setSelectedLink] = useState<string | null>(null);
  const [mode, setMode] = useState<'select' | 'link'>('select');
  const [snapToGrid, setSnapToGrid] = useState(true);
  
  // Dragging state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Linking state
  const [linkStartNodeId, setLinkStartNodeId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  const svgRef = useRef<SVGSVGElement>(null);
  const packetLayerRef = useRef<SVGGElement>(null);

  const GRID_SIZE = 40;

  const getMouseCoords = (e: React.MouseEvent | MouseEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const CTM = svgRef.current.getScreenCTM();
    if (!CTM) return { x: 0, y: 0 };
    return {
      x: (e.clientX - CTM.e) / CTM.a,
      y: (e.clientY - CTM.f) / CTM.d
    };
  };

  const findPath = (startId: string, endId: string): string[] | null => {
    const queue: [string, string[]][] = [[startId, [startId]]];
    const visited = new Set([startId]);

    while (queue.length > 0) {
      const [currentId, path] = queue.shift()!;
      if (currentId === endId) return path;

      const neighbors = links
        .filter(l => l.fromDeviceId === currentId || l.toDeviceId === currentId)
        .map(l => l.fromDeviceId === currentId ? l.toDeviceId : l.fromDeviceId);

      for (const neighborId of neighbors) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push([neighborId, [...path, neighborId]]);
        }
      }
    }
    return null;
  };

  const [logs, setLogs] = useState<{ id: string, msg: string, time: string, type: 'info' | 'success' | 'error' }[]>([]);

  const logEvent = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    const newLog = {
      id: nextId('log'),
      msg,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50));
  };

  const animatePacket = (path: string[], color: string = '#fbbf24', callback?: () => void) => {
    if (path.length < 2 || !packetLayerRef.current) {
      callback?.();
      return;
    }

    const fromNode = nodes.find(n => n.id === path[0]);
    const toNode = nodes.find(n => n.id === path[1]);
    if (!fromNode || !toNode) return;

    logEvent(`Packet forwarding: ${fromNode.name} -> ${toNode.name}`, 'info');

    // Create packet element
    const packetCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    packetCircle.setAttribute("r", "5");
    packetCircle.setAttribute("fill", color);
    packetCircle.setAttribute("filter", "drop-shadow(0 0 3px rgba(0,0,0,0.3))");
    packetLayerRef.current.appendChild(packetCircle);

    // Pulse animation on the sending node
    animate(`[data-node-id="${fromNode.id}"] circle`, {
      scale: [1, 1.2, 1],
      duration: 300,
      easing: 'easeInOutQuad'
    });

    animate(packetCircle, {
      cx: [fromNode.x, toNode.x],
      cy: [fromNode.y, toNode.y],
      duration: 600,
      easing: 'linear',
      onComplete: () => {
        packetCircle.remove();
        // Continue to next hop
        animatePacket(path.slice(1), color, callback);
      }
    });
  };

  const [pingTargetId, setPingTargetId] = useState<string>('');
  const [pingCount, setPingCount] = useState<number>(1);

  const handlePing = (sourceId: string, targetIdOverride?: string) => {
    const sourceNode = nodes.find(n => n.id === sourceId);
    const destId = targetIdOverride || pingTargetId || nodes.filter(n => n.id !== sourceId && n.type === DeviceType.PC)[0]?.id;
    
    if (!destId) {
      logEvent(`Ping failed: No destination selected`, 'error');
      return;
    }
    const destNode = nodes.find(n => n.id === destId);

    logEvent(`Initiating ${pingCount} Ping(s): ${sourceNode?.name} -> ${destNode?.name}`, 'info');

    const path = findPath(sourceId, destId);
    if (!path) {
      logEvent(`Unreachable: No path between ${sourceNode?.name} and ${destNode?.name}`, 'error');
      animate(`[data-node-id="${sourceId}"] circle`, {
        stroke: ['#ef4444', '#cbd5e1'],
        duration: 1000
      });
      return;
    }

    // Loop for multiple pings
    for (let i = 0; i < pingCount; i++) {
      setTimeout(() => {
        animatePacket(path, '#fbbf24', () => {
          logEvent(`Ping success (${i + 1}/${pingCount}): Response received at ${sourceNode?.name}`, 'success');
          setTimeout(() => {
            animatePacket([...path].reverse(), '#34d399');
          }, 400);
        });
      }, i * 1500); // Stagger pings by 1.5s
    }
  };

  const addNode = (type: DeviceType) => {
    const { x, y } = getRandomCoords(snapToGrid, GRID_SIZE);

    const newNode: Device = {
      id: nextId('node'),
      name: `${type}-${nodes.length + 1}`,
      type,
      x,
      y,
      interfaces: [
        { id: 'eth0', mac: getRandomMac(), isConnected: false }
      ],
      arpCache: {}
    };
    setNodes([...nodes, newNode]);
    logEvent(`Added ${type}: ${newNode.name}`, 'info');
  };

  const startDrag = (e: React.MouseEvent, nodeId: string) => {
    if (mode !== 'select') return;
    e.stopPropagation();
    const coords = getMouseCoords(e);
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setDraggingNodeId(nodeId);
      setDragOffset({ x: coords.x - node.x, y: coords.y - node.y });
      setSelectedNode(nodeId);
      setSelectedLink(null);
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const coords = getMouseCoords(e);
    setMousePos(coords);

    if (draggingNodeId) {
      let x = coords.x - dragOffset.x;
      let y = coords.y - dragOffset.y;

      if (snapToGrid) {
        x = Math.round(x / GRID_SIZE) * GRID_SIZE;
        y = Math.round(y / GRID_SIZE) * GRID_SIZE;
      }

      setNodes(nodes.map(n => 
        n.id === draggingNodeId ? { ...n, x, y } : n
      ));
    }
  };

  const onMouseUp = () => {
    setDraggingNodeId(null);
  };

  const handleNodeClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (mode === 'link') {
      if (!linkStartNodeId) {
        setLinkStartNodeId(nodeId);
      } else if (linkStartNodeId !== nodeId) {
        // Check if link already exists
        const exists = links.some(l => 
          (l.fromDeviceId === linkStartNodeId && l.toDeviceId === nodeId) ||
          (l.fromDeviceId === nodeId && l.toDeviceId === linkStartNodeId)
        );
        
        if (!exists) {
          const newLink: Link = {
            id: nextId('link'),
            fromDeviceId: linkStartNodeId,
            fromInterfaceId: 'eth0',
            toDeviceId: nodeId,
            toInterfaceId: 'eth0',
            bandwidth: 1000,
            latency: 1,
            status: 'up'
          };
          setLinks([...links, newLink]);
        }
        setLinkStartNodeId(null);
      }
    } else {
      setSelectedNode(nodeId);
      setSelectedLink(null);
    }
  };

  const deleteElement = () => {
    if (selectedNode) {
      setNodes(nodes.filter(n => n.id !== selectedNode));
      setLinks(links.filter(l => l.fromDeviceId !== selectedNode && l.toDeviceId !== selectedNode));
      setSelectedNode(null);
    } else if (selectedLink) {
      setLinks(links.filter(l => l.id !== selectedLink));
      setSelectedLink(null);
    }
  };

  const exportDesign = () => {
    const data = JSON.stringify({ nodes, links }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `network-design-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importDesign = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const { nodes: importedNodes, links: importedLinks } = JSON.parse(event.target?.result as string);
        setNodes(importedNodes);
        setLinks(importedLinks);
        setSelectedNode(null);
        setSelectedLink(null);
      } catch (err) {
        console.error("Failed to import design", err);
      }
    };
    reader.readAsText(file);
  };

  const clearCanvas = () => {
    setNodes([]);
    setLinks([]);
    setSelectedNode(null);
    setSelectedLink(null);
    setLinkStartNodeId(null);
  };

  return (
    <div className="flex flex-col h-full space-y-4 p-4">
      <div className="flex items-center justify-between bg-card p-2 rounded-lg border shadow-sm">
        <div className="flex space-x-2 items-center border-r pr-4 mr-2">
          <Button 
            variant={mode === 'select' ? 'default' : 'ghost'} 
            size="icon" 
            onClick={() => { setMode('select'); setLinkStartNodeId(null); }}
            title="Select & Move"
          >
            <MousePointer2 className="w-4 h-4" />
          </Button>
          <Button 
            variant={mode === 'link' ? 'default' : 'ghost'} 
            size="icon" 
            onClick={() => setMode('link')}
            title="Connect Devices"
          >
            <LinkIcon className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex space-x-2 border-r pr-4 mr-2">
          <Button variant="outline" size="sm" onClick={() => addNode(DeviceType.PC)} title="Add PC">
            <Monitor className="w-3 h-3 mr-1" /> PC
          </Button>
          <Button variant="outline" size="sm" onClick={() => addNode(DeviceType.SERVER)} title="Add Server">
            <HardDrive className="w-3 h-3 mr-1" /> Server
          </Button>
          <Button variant="outline" size="sm" onClick={() => addNode(DeviceType.SWITCH)} title="Add Switch">
            <Layers className="w-3 h-3 mr-1" /> Switch
          </Button>
          <Button variant="outline" size="sm" onClick={() => addNode(DeviceType.ROUTER)} title="Add Router">
            <Network className="w-3 h-3 mr-1" /> Router
          </Button>
          <Button variant="outline" size="sm" onClick={() => addNode(DeviceType.FIREWALL)} title="Add Firewall">
            <Shield className="w-3 h-3 mr-1 text-red-500" /> Firewall
          </Button>
        </div>
        
        <div className="flex space-x-1 items-center border-r pr-4 mr-2">
          <Button 
            variant={snapToGrid ? 'default' : 'ghost'} 
            size="icon" 
            className="h-8 w-8"
            onClick={() => setSnapToGrid(!snapToGrid)}
            title="Snap to Grid"
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={exportDesign} title="Export Design (JSON)">
            <Download className="w-4 h-4" />
          </Button>
          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={importDesign}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              title="Import Design (JSON)"
            />
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Upload className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex space-x-2 ml-auto">
          <Button 
            variant="default" 
            size="sm" 
            className="bg-green-600 hover:bg-green-700"
            onClick={() => {
              // Trigger a broadcast from all PCs
              nodes.filter(n => n.type === DeviceType.PC).forEach(pc => handlePing(pc.id));
            }}
          >
            <Play className="w-4 h-4 mr-2" /> Broadcast Test
          </Button>
          <Button variant="ghost" size="sm" onClick={clearCanvas}>
            <RotateCcw className="w-4 h-4 mr-2" /> Reset
          </Button>
        </div>
      </div>

      <div className="flex-1 relative border rounded-xl bg-slate-50 dark:bg-slate-900/50 overflow-hidden shadow-inner">
        <svg 
          ref={svgRef}
          className={cn(
            "w-full h-full transition-colors",
            mode === 'link' ? "cursor-crosshair bg-blue-50/30 dark:bg-blue-900/10" : "cursor-default"
          )}
          viewBox="0 0 1000 800"
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onClick={() => { setSelectedNode(null); setSelectedLink(null); setLinkStartNodeId(null); }}
        >
          {/* Grid Background */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-slate-200 dark:text-slate-800" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Active Linking Line */}
          {mode === 'link' && linkStartNodeId && (
            <line
              x1={nodes.find(n => n.id === linkStartNodeId)?.x}
              y1={nodes.find(n => n.id === linkStartNodeId)?.y}
              x2={mousePos.x}
              y2={mousePos.y}
              stroke="#3b82f6"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          )}

          {/* Links */}
          {links.map(link => {
            const from = nodes.find(n => n.id === link.fromDeviceId);
            const to = nodes.find(n => n.id === link.toDeviceId);
            if (!from || !to) return null;
            
            return (
              <g key={link.id} onClick={(e) => { e.stopPropagation(); setSelectedLink(link.id); setSelectedNode(null); }}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={selectedLink === link.id ? '#3b82f6' : '#cbd5e1'}
                  strokeWidth={selectedLink === link.id ? '4' : '2'}
                  className="transition-all hover:stroke-blue-400 cursor-pointer"
                />
              </g>
            );
          })}

          {/* Packet Layer */}
          <g ref={packetLayerRef} />

          {/* Nodes */}
          {nodes.map(node => (
            <g 
              key={node.id} 
              data-node-id={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              onMouseDown={(e) => startDrag(e, node.id)}
              onClick={(e) => handleNodeClick(e, node.id)}
              className="group"
            >
              <circle 
                r="28" 
                fill="white" 
                stroke={selectedNode === node.id || linkStartNodeId === node.id ? '#3b82f6' : '#cbd5e1'} 
                strokeWidth={selectedNode === node.id || linkStartNodeId === node.id ? '3' : '2'} 
                className="dark:fill-slate-800 transition-all group-hover:stroke-blue-400 shadow-xl"
              />
              <text 
                y="45" 
                textAnchor="middle" 
                className="text-[10px] font-bold fill-slate-700 dark:fill-slate-300 select-none uppercase tracking-tighter"
              >
                {node.name}
              </text>
              <foreignObject x="-12" y="-12" width="24" height="24" className="pointer-events-none overflow-visible">
                <div className="flex items-center justify-center w-full h-full text-slate-600 dark:text-slate-300">
                  {node.type === DeviceType.PC ? <Monitor size={20} /> : 
                   node.type === DeviceType.SWITCH ? <Layers size={20} /> : 
                   node.type === DeviceType.ROUTER ? <Network size={20} /> : 
                   node.type === DeviceType.SERVER ? <HardDrive size={20} /> :
                   node.type === DeviceType.FIREWALL ? <Shield size={20} className="text-red-500" /> :
                   <Globe size={20} />}
                </div>
              </foreignObject>
            </g>
          ))}
        </svg>
        
        {/* Help Text */}
        <div className="absolute bottom-4 left-4 text-[10px] text-muted-foreground bg-white/50 dark:bg-black/20 p-2 rounded backdrop-blur-sm pointer-events-none">
          {mode === 'select' ? "DRAG TO MOVE • CLICK TO SELECT" : "CLICK TWO DEVICES TO CONNECT • ESC TO CANCEL"}
        </div>

        {/* Network Log Terminal */}
        <div className="absolute bottom-4 right-4 w-72 max-h-48 flex flex-col-reverse overflow-y-auto bg-black/80 text-[10px] font-mono text-green-400 p-2 rounded-lg border border-slate-700 shadow-2xl backdrop-blur-sm">
          {logs.length === 0 ? (
            <div className="text-slate-500 italic">Waiting for network events...</div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="mb-1 leading-tight border-b border-white/5 pb-1 last:border-0">
                <span className="text-slate-500">[{log.time}]</span>{" "}
                <span className={cn(
                  log.type === 'success' ? 'text-green-400' : 
                  log.type === 'error' ? 'text-red-400' : 
                  'text-blue-300'
                )}>{log.msg}</span>
              </div>
            ))
          )}
          <div className="text-slate-400 font-bold mb-2 flex justify-between items-center border-b border-slate-700 pb-1">
            <span>NETWORK LOG</span>
            <span className="w-1.5 h-3 bg-green-500 animate-pulse" />
          </div>
        </div>

        {/* Info Overlay */}
        {(selectedNode || selectedLink) && (
          <Card className="absolute top-4 right-4 w-64 p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-right-4 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm uppercase tracking-widest text-blue-500">
                {selectedNode ? 'Device Settings' : 'Link Settings'}
              </h3>
              <div className="flex space-x-1">
                {selectedNode && nodes.find(n => n.id === selectedNode)?.type === DeviceType.PC && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 hover:bg-blue-100 dark:hover:bg-blue-900/30 group" 
                    onClick={(e) => { e.stopPropagation(); handlePing(selectedNode); }}
                    title="Send Ping"
                  >
                    <Send className="w-4 h-4 text-blue-500" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-100 dark:hover:bg-red-900/30 group" onClick={deleteElement}>
                  <Trash2 className="w-4 h-4 text-slate-400 group-hover:text-red-500 transition-colors" />
                </Button>
              </div>
            </div>
            
            {selectedNode && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Identifier</p>
                  <p className="text-sm font-mono">{nodes.find(n => n.id === selectedNode)?.name}</p>
                </div>
                
                {/* Ping Lab Section */}
                {nodes.find(n => n.id === selectedNode)?.type === DeviceType.PC && (
                  <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30 space-y-3">
                    <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                      <Zap className="w-3 h-3" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Ping Lab</span>
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label className="text-[9px] uppercase text-muted-foreground">Target Device</Label>
                      <Select value={pingTargetId} onValueChange={setPingTargetId}>
                        <SelectTrigger className="h-7 text-xs bg-white dark:bg-slate-900">
                          <SelectValue placeholder="Select Target..." />
                        </SelectTrigger>
                        <SelectContent>
                          {nodes
                            .filter(n => n.id !== selectedNode && n.type === DeviceType.PC)
                            .map(pc => (
                              <SelectItem key={pc.id} value={pc.id} className="text-xs">
                                {pc.name} ({pc.interfaces[0].mac.slice(-4)})
                              </SelectItem>
                            ))
                          }
                          {nodes.filter(n => n.id !== selectedNode && n.type === DeviceType.PC).length === 0 && (
                            <div className="p-2 text-[10px] text-muted-foreground italic">No other PCs found</div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[9px] uppercase text-muted-foreground">Ping Count (1-10)</Label>
                      <Input 
                        type="number" 
                        min={1} 
                        max={10} 
                        value={pingCount}
                        onChange={(e) => setPingCount(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="h-7 text-xs bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">MAC Address</p>
                  <p className="text-sm font-mono text-blue-600 dark:text-blue-400">{nodes.find(n => n.id === selectedNode)?.interfaces[0].mac}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Interfaces</p>
                  <div className="flex items-center space-x-2 py-1 px-2 bg-slate-100 dark:bg-slate-800 rounded">
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
                    <span className="text-xs font-mono">eth0 (UP)</span>
                  </div>
                </div>
              </div>
            )}

            {selectedLink && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Bandwidth</p>
                  <p className="text-sm font-mono">1000 Mbps</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Status</p>
                  <div className="flex items-center space-x-2 py-1 px-2 bg-slate-100 dark:bg-slate-800 rounded">
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
                    <span className="text-xs font-mono">CONNECTED</span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};
