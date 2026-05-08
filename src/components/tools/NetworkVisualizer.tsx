import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { Device, Link } from '@/lib/networkSimulator';
import { DeviceType, SimulationEngine } from '@/lib/networkSimulator';
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
import { SEO } from "@/components/shared/SEO";
import {
  Play, RotateCcw, Trash2, Link as LinkIcon,
  MousePointer2, Send, Download, Upload, Monitor,
  Layers, Network, Globe, Grid3X3, Zap, Shield, HardDrive,
  Activity, Info, X, ChevronUp, ChevronDown, Cloud
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from '@/components/ui/switch';
import { animate } from 'animejs';

// Impure logic moved outside to satisfy strict purity linters
let idCounter = 0;
const nextId = (prefix: string) => {
  idCounter += 1;
  return `${prefix}-${idCounter}-${Math.random().toString(36).slice(2, 7)}`;
};

const getRandomCoords = (nodes: Device[]) => {
  // Try to find a free spot
  for (let row = 1; row < 10; row++) {
    for (let col = 1; col < 8; col++) {
      const tx = col * 120;
      const ty = row * 100;
      const isOccupied = nodes.some(n => Math.abs(n.x - tx) < 50 && Math.abs(n.y - ty) < 50);
      if (!isOccupied) {
        return { x: tx, y: ty };
      }
    }
  }

  // Fallback
  return { x: 100 + Math.random() * 400, y: 100 + Math.random() * 300 };
};

const getRandomMac = () => Math.random().toString(16).slice(2, 14).toUpperCase();

const NetworkVisualizerContent: React.FC = () => {
  const [nodes, setNodes] = useState<Device[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedLink, setSelectedLink] = useState<string | null>(null);
  const [mode, setMode] = useState<'select' | 'link' | 'delete'>('select');
  const [snapToGrid, setSnapToGrid] = useState(true);

  // Dragging state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Linking state
  const [linkStartNodeId, setLinkStartNodeId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const [selectedNetworkId, setSelectedNetworkId] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [isNetworksCollapsed, setIsNetworksCollapsed] = useState(false);
  const [isLogsCollapsed, setIsLogsCollapsed] = useState(false);
  const [dhcpStatus, setDhcpStatus] = useState<Record<string, 'none' | 'discovering' | 'bound'>>({});
  const [cloudText, setCloudText] = useState<{ x: number, y: number } | null>(null);
  const [ispText, setIspText] = useState<{ x: number, y: number } | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const discoveredTriangles = useRef<Set<string>>(new Set());



  const stpData = useMemo(() => {
    const baseEngine = new SimulationEngine(nodes, links);
    return baseEngine.runSTP();
  }, [nodes, links]);

  const engine = useMemo(() => new SimulationEngine(stpData.nodes, stpData.links), [stpData]);

  // Dynamic Network Detection logic
  const detectedNetworks = useMemo(() => {
    return engine.detectNetworks();
  }, [engine]);

  // Repair/Sync interfaces effect: Ensures interface array and connectivity status are always accurate
  useEffect(() => {
    const needsRepair = nodes.some(node =>
      node.interfaces.length < node.portLimit ||
      node.interfaces.some(iface => {
        const isLinked = links.some(l =>
          (l.fromDeviceId === node.id && l.fromInterfaceId === iface.id) ||
          (l.toDeviceId === node.id && l.toInterfaceId === iface.id)
        );
        return iface.isConnected !== isLinked;
      })
    );

    if (needsRepair) {
      setTimeout(() => {
        setNodes(prevNodes => prevNodes.map(node => {
          let nodeChanged = false;
          let updatedInterfaces = [...node.interfaces];

          // 1. Ensure interfaces array length matches portLimit
          if (updatedInterfaces.length < node.portLimit) {
            for (let i = updatedInterfaces.length; i < node.portLimit; i++) {
              updatedInterfaces.push({
                id: `eth${i}`,
                mac: getRandomMac(),
                isConnected: false
              });
            }
            nodeChanged = true;
          }

          // 2. Ensure isConnected accurately reflects current links
          updatedInterfaces = updatedInterfaces.map(iface => {
            const isLinked = links.some(l =>
              (l.fromDeviceId === node.id && l.fromInterfaceId === iface.id) ||
              (l.toDeviceId === node.id && l.toInterfaceId === iface.id)
            );
            if (iface.isConnected !== isLinked) {
              nodeChanged = true;
              return { ...iface, isConnected: isLinked };
            }
            return iface;
          });

          return nodeChanged ? { ...node, interfaces: updatedInterfaces } : node;
        }));
      }, 0);
    }
  }, [links, nodes]); // Check whenever links change or nodes change

  const [logs, setLogs] = useState<{ id: string, msg: string, time: string, type: 'info' | 'success' | 'error' }[]>([]);

  const logEvent = useCallback((msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    const newLog = {
      id: nextId('log'),
      msg,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50));
  }, [setLogs]);

  const showDropAnimation = useCallback((nodeId: string, type: 'firewall' | 'routing' | 'silent' = 'firewall') => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !overNodeLayerRef.current) return;

    const isSilent = type === 'silent';
    const isIds = node.type === DeviceType.IPS_IDS && node.ipsMode === 'IDS';
    const isRouting = type === 'routing';
    
    // Silent drops use a neutral grey
    const color = isSilent ? "#94a3b8" : (isIds ? "#f59e0b" : (isRouting ? "#a855f7" : "#ef4444"));

    // Create a group for the drop effect
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("style", "pointer-events: none;");
    
    // Create a ripple ring
    const ripple = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    ripple.setAttribute("cx", node.x.toString());
    ripple.setAttribute("cy", node.y.toString());
    ripple.setAttribute("r", "10");
    ripple.setAttribute("fill", "none");
    ripple.setAttribute("stroke", color);
    ripple.setAttribute("stroke-width", isSilent ? "1" : "2");
    g.appendChild(ripple);

    if (!isSilent) {
      // Create the icon/mark (Only for non-silent drops)
      const mark = document.createElementNS("http://www.w3.org/2000/svg", "g");
      mark.setAttribute("transform", `translate(${node.x}, ${node.y})`);
      
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("r", "15");
      circle.setAttribute("fill", color);
      circle.setAttribute("opacity", "0.9");
      mark.appendChild(circle);

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.textContent = isIds ? "!" : (isRouting ? "?" : "×");
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dy", ".35em");
      text.setAttribute("font-size", "20");
      text.setAttribute("fill", "white");
      text.setAttribute("font-weight", "bold");
      mark.appendChild(text);
      
      g.appendChild(mark);

      // Animate the mark
      animate(mark, {
        translateY: [0, -30],
        opacity: [0, 1, 1, 0],
        scale: [0.5, 1.2, 1],
        duration: 1200,
        easing: 'easeOutElastic(1, .8)',
        onComplete: () => g.remove()
      });
    } else {
      // Silent drop cleanup
      setTimeout(() => g.remove(), 1000);
    }
    
    overNodeLayerRef.current.appendChild(g);

    // Animate the ripple
    animate(ripple, {
      r: [10, isSilent ? 30 : 40],
      opacity: [1, 0],
      duration: isSilent ? 600 : 800,
      easing: 'easeOutExpo'
    });

    if (!isSilent) {
      if (isRouting) {
        logEvent(`Routing Error at ${node.name}: Destination Network Unknown`, 'error');
      } else if (isIds) {
        logEvent(`IDS Alert at ${node.name}: Malicious traffic detected`, 'info');
      } else {
        logEvent(`Packet blocked at ${node.name}`, 'error');
      }
    }
  }, [nodes, logEvent]);

  // Easter Egg: Cloud Computing
  useEffect(() => {
    const servers = nodes.filter(n => n.type === DeviceType.SERVER && !n.isCloud);
    if (servers.length < 3) return;

    // Find connected components of servers
    const visited = new Set<string>();
    for (const server of servers) {
      if (visited.has(server.id)) continue;
      
      const component: Device[] = [];
      const queue = [server.id];
      visited.add(server.id);
      
      while (queue.length > 0) {
        const currId = queue.shift()!;
        const currNode = nodes.find(n => n.id === currId)!;
        component.push(currNode);
        
        links.filter(l => l.fromDeviceId === currId || l.toDeviceId === currId).forEach(l => {
          const neighborId = l.fromDeviceId === currId ? l.toDeviceId : l.fromDeviceId;
          const neighbor = nodes.find(n => n.id === neighborId);
          if (neighbor?.type === DeviceType.SERVER && !visited.has(neighborId)) {
            visited.add(neighborId);
            queue.push(neighborId);
          }
        });
      }
      
      if (component.length >= 3) {
        // TRIGGER EASTER EGG
        const ids = component.map(n => n.id);
        const avgX = component.reduce((acc, n) => acc + n.x, 0) / component.length;
        const avgY = component.reduce((acc, n) => acc + n.y, 0) / component.length - 60;
        
        // 1. Create Cloud Node
        const cloudNode: Device = {
          id: `cloud-${Date.now()}`,
          name: "The Cloud",
          type: DeviceType.ROUTER,
          x: avgX,
          y: avgY + 60, // Place actual node at original center, text is at y-60
          interfaces: [
            { id: `eth0`, mac: "00:0C:10:0D:5E:01", isConnected: true }
          ],
          arpCache: {},
          portLimit: 10,
          isCloud: true,
          routingEnabled: true,
          blockedNetworks: [],
          disabledRoutes: [],
          enabledRoutes: []
        };
        
        // 2. Update Links
        const newLinks = links
          .filter(l => !(ids.includes(l.fromDeviceId) && ids.includes(l.toDeviceId))) // Remove links between the servers
          .map(l => {
            if (ids.includes(l.fromDeviceId)) return { ...l, fromDeviceId: cloudNode.id };
            if (ids.includes(l.toDeviceId)) return { ...l, toDeviceId: cloudNode.id };
            return l;
          });
          
        // 3. Update Nodes
        const newNodes = nodes.filter(n => !ids.includes(n.id));
        newNodes.push(cloudNode);
        
        // 4. Celebration Animation
        setTimeout(() => logEvent("CLOUD COMPUTING DISCOVERED!", "success"), 0);
        setTimeout(() => setCloudText({ x: avgX, y: avgY }), 0);
        setTimeout(() => {
          animate('#cloud-discovery-text', {
            opacity: [0, 1, 1, 0],
            duration: 3000,
            easing: 'easeInOutQuad'
          });
        }, 100);
        setTimeout(() => setCloudText(null), 3000);
        
        // Animate the merge
        ids.forEach(id => {
          animate(`[data-node-id="${id}"] circle, [data-node-id="${id}"] foreignObject, [data-node-id="${id}"] text`, {
            scale: [1, 0],
            opacity: [1, 0],
            duration: 500,
            easing: 'easeInBack'
          });
        });

        setTimeout(() => {
          setNodes(newNodes);
          setLinks(newLinks);
          setSelectedNode(cloudNode.id);
          
          // Flash the new cloud node
          setTimeout(() => {
            // Animate the contents to avoid overriding the group's translate transform
            animate(`[data-node-id="${cloudNode.id}"] circle`, {
              scale: [0.1, 1.2, 1],
              duration: 1500,
              easing: 'easeOutElastic(1, .8)'
            });
            animate(`[data-node-id="${cloudNode.id}"] foreignObject`, {
              scale: [0.1, 1.2, 1],
              rotate: '1turn',
              duration: 1500,
              easing: 'easeOutElastic(1, .8)'
            });
          }, 100);
        }, 600);

        break;
      }
    }
  }, [nodes, links, cloudText, logEvent, setNodes, setLinks]);

  // Easter Egg: ISP Discovery (Router Triangle)
  useEffect(() => {
    const routers = nodes.filter(n => n.type === DeviceType.ROUTER);
    if (routers.length >= 3 && !ispText) {
      for (let i = 0; i < routers.length; i++) {
        for (let j = i + 1; j < routers.length; j++) {
          for (let k = j + 1; k < routers.length; k++) {
            const r1 = routers[i];
            const r2 = routers[j];
            const r3 = routers[k];
            
            const l12 = links.find(l => (l.fromDeviceId === r1.id && l.toDeviceId === r2.id) || (l.fromDeviceId === r2.id && l.toDeviceId === r1.id));
            const l23 = links.find(l => (l.fromDeviceId === r2.id && l.toDeviceId === r3.id) || (l.fromDeviceId === r3.id && l.toDeviceId === r2.id));
            const l31 = links.find(l => (l.fromDeviceId === r3.id && l.toDeviceId === r1.id) || (l.fromDeviceId === r1.id && l.toDeviceId === r3.id));
            
            if (l12 && l23 && l31) {
              const triId = [r1.id, r2.id, r3.id].sort().join('-');
              if (discoveredTriangles.current.has(triId)) continue;
              
              discoveredTriangles.current.add(triId);
              const avgX = (r1.x + r2.x + r3.x) / 3;
              const avgY = (r1.y + r2.y + r3.y) / 3 - 60;
              
              setTimeout(() => setIspText({ x: avgX, y: avgY }), 0);
              setTimeout(() => logEvent("ISP DISCOVERED!", "success"), 0);
              setTimeout(() => {
                animate('#isp-discovery-text', {
                  opacity: [0, 1, 1, 0],
                  duration: 3000,
                  easing: 'easeInOutQuad'
                });
                
                // Pulse effect on the routers
                [r1, r2, r3].forEach(r => {
                  animate(`[data-node-id="${r.id}"] circle`, {
                    scale: [1, 1.5, 1],
                    stroke: ['#cbd5e1', '#3b82f6', '#cbd5e1'],
                    duration: 1000,
                    easing: 'easeOutExpo'
                  });
                });
              }, 100);
              setTimeout(() => setIspText(null), 3000);
              return;
            }
          }
        }
      }
    }
  }, [nodes, links, ispText, logEvent]);

  const svgRef = useRef<SVGSVGElement>(null);
  const underNodeLayerRef = useRef<SVGGElement>(null);
  const overNodeLayerRef = useRef<SVGGElement>(null);

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

  const findPath = useCallback((startId: string, endId: string, destIp?: string): { path: string[], failureId?: string, failureType?: 'firewall' | 'routing' | 'silent' } | null => {
    return engine.findPath(startId, endId, {
      foundNetworks: detectedNetworks.foundNetworks,
      destIp,
      onDropAnimation: (nodeId, type) => showDropAnimation(nodeId, type)
    });
  }, [engine, detectedNetworks, showDropAnimation]);
  const animatePacket = useCallback((path: string[], color: string = '#3b82f6', callback?: () => void, failureId?: string, failureType?: 'firewall' | 'routing' | 'silent') => {
    const startAnimation = (p: string[], c: string, cb?: () => void, fId?: string, fType?: 'firewall' | 'routing' | 'silent') => {
      if (p.length < 2 || !underNodeLayerRef.current) return;

      const createPacket = (packetColor: string) => {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        
        // Trail effect (The path left behind)
        const trail = document.createElementNS("http://www.w3.org/2000/svg", "path");
        trail.setAttribute("fill", "none");
        trail.setAttribute("stroke", packetColor);
        trail.setAttribute("stroke-width", "3");
        trail.setAttribute("stroke-linecap", "round");
        trail.setAttribute("opacity", "0.3");
        trail.setAttribute("filter", `blur(1px)`);
        g.appendChild(trail);

        // Core Pulse (The moving data)
        // We use a group for the core to allow rotation and glow
        const core = document.createElementNS("http://www.w3.org/2000/svg", "g");
        
        // Glow effect
        const glow = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        glow.setAttribute("width", "20");
        glow.setAttribute("height", "4");
        glow.setAttribute("rx", "2");
        glow.setAttribute("x", "-16");
        glow.setAttribute("y", "-2");
        glow.setAttribute("fill", packetColor);
        glow.setAttribute("filter", `blur(3px)`);
        glow.setAttribute("opacity", "0.6");
        core.appendChild(glow);

        // Solid core
        const bolt = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        bolt.setAttribute("width", "16");
        bolt.setAttribute("height", "2");
        bolt.setAttribute("rx", "1");
        bolt.setAttribute("x", "-14");
        bolt.setAttribute("y", "-1");
        bolt.setAttribute("fill", "white");
        core.appendChild(bolt);

        // Head (Leading edge)
        const head = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        head.setAttribute("r", "3.5");
        head.setAttribute("cx", "2");
        head.setAttribute("fill", "white");
        head.setAttribute("filter", `drop-shadow(0 0 4px ${packetColor})`);
        core.appendChild(head);

        g.appendChild(core);
        return { g, trail, core };
      };

      let step = 0;
      const playNextStep = () => {
        if (step >= p.length - 1) {
          if (cb) cb();
          return;
        }

        const fromNode = nodes.find(n => n.id === p[step]);
        const toNode = nodes.find(n => n.id === p[step + 1]);

        if (!fromNode || !toNode) return;

        const isLastStepAndFailed = fId === toNode.id;
        const { g: packetGroup, trail, core } = createPacket(c);
        underNodeLayerRef.current!.appendChild(packetGroup);

        const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x) * 180 / Math.PI;
        
        // Trail setup
        trail.setAttribute("d", `M ${fromNode.x} ${fromNode.y} L ${toNode.x} ${toNode.y}`);
        const pathLength = trail.getTotalLength();
        trail.setAttribute("stroke-dasharray", `${pathLength}`);
        trail.setAttribute("stroke-dashoffset", `${pathLength}`);

        // Animate Trail
        animate(trail, {
          strokeDashoffset: [pathLength, 0, -pathLength],
          duration: 800,
          easing: 'easeInOutCubic'
        });

        // Animate Core Position & Rotation
        animate(core, {
          translateX: [fromNode.x, toNode.x],
          translateY: [fromNode.y, toNode.y],
          rotate: [angle, angle],
          opacity: [0, 1, 1, 0],
          scale: [0.8, 1, 1, 0.8],
          duration: 800,
          easing: 'easeInOutCubic',
          onComplete: () => {
            packetGroup.remove();
            
            // Impact Ripple
            const ripple = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            ripple.setAttribute("cx", toNode.x.toString());
            ripple.setAttribute("cy", toNode.y.toString());
            ripple.setAttribute("r", "4");
            ripple.setAttribute("fill", "none");
            ripple.setAttribute("stroke", c);
            ripple.setAttribute("stroke-width", "2");
            underNodeLayerRef.current!.appendChild(ripple);
            
            animate(ripple, {
              r: [4, 30],
              opacity: [0.8, 0],
              duration: 500,
              easing: 'easeOutQuart',
              onComplete: () => ripple.remove()
            });

            if (isLastStepAndFailed) {
              showDropAnimation(toNode.id, fType);
              return;
            }
            step++;
            playNextStep();
          }
        });
      };

      playNextStep();
    };

    startAnimation(path, color, callback, failureId, failureType);
  }, [nodes, showDropAnimation]);


  const animateBroadcastTree = useCallback((paths: string[][], color: string = '#22d3ee', options?: { onNodeArrival?: (nodeId: string) => void, onComplete?: () => void }) => {
    if (paths.length === 0 || !underNodeLayerRef.current) {
      if (options?.onComplete) options.onComplete();
      return;
    }

    const tree: Record<string, Set<string>> = {};
    paths.forEach(path => {
      for (let i = 0; i < path.length - 1; i++) {
        const from = path[i];
        const to = path[i + 1];
        if (!tree[from]) tree[from] = new Set();
        tree[from].add(to);
      }
    });

    const animateNode = (nodeId: string, onDone?: () => void) => {
      const neighbors = tree[nodeId];
      
      // Notify arrival at this node
      if (options?.onNodeArrival) options.onNodeArrival(nodeId);

      if (!neighbors || neighbors.size === 0) {
        if (onDone) onDone();
        return;
      }

      let completedCount = 0;
      const totalNeighbors = neighbors.size;

      neighbors.forEach(neighborId => {
        animatePacket([nodeId, neighborId], color, () => {
          animateNode(neighborId, () => {
            completedCount++;
            if (completedCount === totalNeighbors && onDone) {
              onDone();
            }
          });
        });
      });
    };

    animateNode(paths[0][0], options?.onComplete);
  }, [animatePacket]);

  const [pingTargetId, setPingTargetId] = useState<string>('');
  const [pingCount, setPingCount] = useState<number>(1);

  const handleBroadcast = (sourceId: string) => {
    // Find the network segment this device belongs to
    const segment = detectedNetworks.foundNetworks.find(net => net.devices.includes(sourceId));
    if (!segment) {
      logEvent("No network detected for broadcast", "error");
      return;
    }

    const targets = segment.devices.filter(id => {
      const node = nodes.find(n => n.id === id);
      return id !== sourceId && (
        node?.type === DeviceType.PC ||
        node?.type === DeviceType.SERVER ||
        node?.type === DeviceType.ROUTER ||
        node?.type === DeviceType.FIREWALL
      );
    });

    if (targets.length === 0) {
      logEvent(`No other reachable devices in ${segment.name}`, "info");
      return;
    }

    // Get all paths for the broadcast
    const broadcastPaths = targets.map(targetId => {
      const result = findPath(sourceId, targetId);
      return result ? result.path : null;
    }).filter((p): p is string[] => p !== null);

    if (broadcastPaths.length > 0) {
      animateBroadcastTree(broadcastPaths, '#3b82f6', {
        onComplete: () => {
          logEvent(`Broadcast complete: ${nodes.find(n => n.id === sourceId)?.name} -> ${segment.name}`, 'success');
        }
      });
    }
  };

  const handleArpDiscovery = useCallback((sourceId: string, targetId?: string, callback?: () => void) => {
    const sourceNode = nodes.find(n => n.id === sourceId);
    if (!sourceNode) {
      if (callback) callback();
      return;
    }

    const results = engine.simulateArpDiscovery(sourceId, detectedNetworks.foundNetworks);
    if (results.length === 0) {
      if (callback) setTimeout(callback, 500);
      return;
    }

    const segment = detectedNetworks.foundNetworks.find(net => net.devices.includes(sourceId));
    logEvent(`[ARP] Request: ${sourceNode.name} broadcasting for ${targetId ? 'target' : 'all nodes'} in ${segment?.name || 'segment'}`, 'info');

    // Step 1: ARP Request (Tree-based Broadcast) - Cyan
    const requestPaths = results.map(r => r.path);
    const leafNodes = new Set(requestPaths.map(p => p[p.length - 1]));

    animateBroadcastTree(requestPaths, '#22d3ee', {
      onNodeArrival: (nodeId) => {
        // If it's a leaf node but NOT the targetId (and we have a targetId), show drop
        if (targetId && leafNodes.has(nodeId) && nodeId !== targetId && nodeId !== sourceId) {
          showDropAnimation(nodeId, 'silent');
        }
      },
      onComplete: () => {
        // Step 2: ARP Replies (Unicast back to source) - Teal
        const targetsToRespond = targetId 
          ? results.filter(r => r.targetId === targetId)
          : results;

        if (targetsToRespond.length === 0) {
          if (callback) callback();
          return;
        }

        let repliesDone = 0;
        targetsToRespond.forEach(result => {
          const tId = result.targetId;
          const targetNode = nodes.find(n => n.id === tId);
          if (targetNode) {
            animatePacket([...result.path].reverse(), '#2dd4bf', () => {
              const targetIp = Object.entries(detectedNetworks.interfaceIps)
                .find(([key]) => key.startsWith(`${tId}-`))?.[1] || '?.?.?.?';

              setNodes(prev => prev.map(n => {
                if (n.id === sourceId) {
                  return { ...n, arpCache: { ...n.arpCache, [targetIp]: targetNode.interfaces[0].mac } };
                }
                return n;
              }));
              logEvent(`[ARP] Reply from ${targetNode.name}: I am at ${targetIp}`, 'success');
              
              repliesDone++;
              if (repliesDone === targetsToRespond.length && callback) {
                callback();
              }
            });
          } else {
            repliesDone++;
            if (repliesDone === targetsToRespond.length && callback) {
              callback();
            }
          }
        });
      }
    });
  }, [nodes, engine, detectedNetworks, logEvent, animatePacket, animateBroadcastTree, showDropAnimation]);

  const handleDhcpDiscovery = useCallback((deviceId: string) => {
    const node = nodes.find(n => n.id === deviceId);
    if (!node) return;

    const result = engine.simulateDhcpDiscovery(deviceId, detectedNetworks.foundNetworks);
    if (!result) {
      // APIPA Fallback
      setDhcpStatus(prev => ({ ...prev, [deviceId]: 'discovering' }));
      logEvent(`[DHCP] Discover: ${node.name} broadcasting for a server...`, 'info');
      setTimeout(() => {
        setDhcpStatus(prev => ({ ...prev, [deviceId]: 'bound' }));
        logEvent(`[DHCP] No server found. ${node.name} using APIPA (169.254.x.x)`, 'info');
      }, 1500);
      return;
    }

    setDhcpStatus(prev => ({ ...prev, [deviceId]: 'discovering' }));
    logEvent(`[DHCP] Discover: ${node.name} broadcasting for a server...`, 'info');

    // Step 1: Discover (Broadcast-ish) - Orange
    animatePacket(result.path, '#f97316', () => {
      const serverNode = nodes.find(n => n.id === result.serverId);
      if (serverNode) {
        // Step 2: Offer/Ack - Green
        animatePacket([...result.path].reverse(), '#34d399', () => {
          setDhcpStatus(prev => ({ ...prev, [deviceId]: 'bound' }));
          logEvent(`[DHCP] Bound: ${node.name} received IP from ${serverNode.name}`, 'success');
        });
      }
    });
  }, [nodes, engine, detectedNetworks, logEvent, animatePacket]);

  // Auto-DHCP trigger
  useEffect(() => {
    nodes.forEach(node => {
      if (node.type === DeviceType.PC || node.type === DeviceType.SERVER) {
        const isConnected = links.some(l => l.fromDeviceId === node.id || l.toDeviceId === node.id);
        if (isConnected && !dhcpStatus[node.id]) {
          handleDhcpDiscovery(node.id);
        } else if (!isConnected && dhcpStatus[node.id]) {
          // Reset DHCP if disconnected
          setDhcpStatus(prev => {
            const next = { ...prev };
            delete next[node.id];
            return next;
          });
        }
      }
    });
  }, [links, nodes, dhcpStatus, handleDhcpDiscovery]);



  const handlePing = (sourceId: string, targetIdOverride?: string) => {
    const sourceNode = nodes.find(n => n.id === sourceId);
    const destId = targetIdOverride || pingTargetId;

    if (destId === 'broadcast') {
      handleBroadcast(sourceId);
      return;
    }

    if (!destId) {
      logEvent(`Ping failed: No destination selected`, 'error');
      return;
    }
    const destNode = nodes.find(n => n.id === destId);

    // ARP Discovery Phase First
    handleArpDiscovery(sourceId, destId, () => {
      logEvent(`Initiating ${pingCount} Ping(s): ${sourceNode?.name} -> ${destNode?.name}`, 'info');

      // Resolve destination IP for routing decisions
      const destIp = Object.entries(detectedNetworks.interfaceIps)
        .find(([key]) => key.startsWith(`${destId}-`))?.[1];
      const result = findPath(sourceId, destId, destIp);
      if (!result) {
        logEvent(`Unreachable: No path between ${sourceNode?.name} and ${destNode?.name}`, 'error');
        animate(`[data-node-id="${sourceId}"] circle`, {
          scale: [1, 1.5, 1],
          duration: 300,
          easing: 'easeInOutQuad'
        });
        return;
      }

      const { path, failureId, failureType } = result;

      // Loop for multiple pings
      for (let i = 0; i < pingCount; i++) {
        setTimeout(() => {
          animatePacket(path, '#fbbf24', () => {
            if (!failureId) {
              // Wait briefly then send the response back
              setTimeout(() => {
                animatePacket([...path].reverse(), '#34d399', () => {
                  logEvent(`Ping success (${i + 1}/${pingCount}): Response received at ${sourceNode?.name} from ${destNode?.name}`, 'success');
                });
              }, 400);
            }
          }, failureId, failureType);
        }, i * 1500); // Stagger pings by 1.5s
      }
    });
  };


  const addNode = (type: DeviceType) => {
    const { x, y } = getRandomCoords(nodes);

    // Set port limits based on type
    let portLimit = 2;
    if (type === DeviceType.SWITCH) portLimit = 6;
    if (type === DeviceType.ROUTER || type === DeviceType.FIREWALL) portLimit = 4;
    if (type === DeviceType.IPS_IDS) portLimit = 2;

    const interfaces = Array.from({ length: portLimit }, (_, i) => ({
      id: `eth${i}`,
      mac: getRandomMac(),
      isConnected: false
    }));

    const newNode: Device = {
      id: nextId('node'),
      name: `${type}-${nodes.length + 1}`,
      type,
      x,
      y,
      interfaces,
      arpCache: {},
      portLimit,
      vlans: type === DeviceType.SWITCH ? ['VLAN 1'] : undefined,
      vlanMap: type === DeviceType.SWITCH ? {} : undefined,
      blockedNetworks: (type === DeviceType.ROUTER || type === DeviceType.FIREWALL) ? [] : undefined,
      routingEnabled: type === DeviceType.FIREWALL ? true : (type === DeviceType.ROUTER ? true : undefined),
      ipsMode: type === DeviceType.IPS_IDS ? 'IDS' : undefined,
      disabledRoutes: (type === DeviceType.ROUTER || type === DeviceType.FIREWALL) ? [] : undefined,
      enabledRoutes: (type === DeviceType.ROUTER || type === DeviceType.FIREWALL) ? [] : undefined
    };
    setNodes([...nodes, newNode]);
    logEvent(`Added ${type}: ${newNode.name} (Max Ports: ${portLimit})`, 'info');
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
      setPingTargetId('broadcast');
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
    if (mode === 'delete') {
      const node = nodes.find(n => n.id === nodeId);
      // Remove node and its links
      setNodes(nodes.filter(n => n.id !== nodeId));
      setLinks(links.filter(l => l.fromDeviceId !== nodeId && l.toDeviceId !== nodeId));
      
      if (selectedNode === nodeId) setSelectedNode(null);
      logEvent(`Deleted ${node?.name}`, 'info');
      return;
    }

    if (mode === 'link') {
      if (!linkStartNodeId) {
        // Check if start node has free ports
        const startNode = nodes.find(n => n.id === nodeId);
        const startLinkCount = links.filter(l => l.fromDeviceId === nodeId || l.toDeviceId === nodeId).length;
        if (startNode && startLinkCount >= startNode.portLimit) {
          logEvent(`Error: ${startNode.name} has reached its port limit (${startNode.portLimit})`, 'error');
          return;
        }
        setLinkStartNodeId(nodeId);
      } else if (linkStartNodeId !== nodeId) {
        // Check if target node has free ports
        const targetNode = nodes.find(n => n.id === nodeId);
        const targetLinkCount = links.filter(l => l.fromDeviceId === nodeId || l.toDeviceId === nodeId).length;
        if (targetNode && targetLinkCount >= targetNode.portLimit) {
          logEvent(`Error: ${targetNode.name} has reached its port limit (${targetNode.portLimit})`, 'error');
          setLinkStartNodeId(null);
          return;
        }

        // Check if link already exists
        const exists = links.some(l =>
          (l.fromDeviceId === linkStartNodeId && l.toDeviceId === nodeId) ||
          (l.fromDeviceId === nodeId && l.toDeviceId === linkStartNodeId)
        );

        if (!exists) {
          const startNode = nodes.find(n => n.id === linkStartNodeId);
          const targetNode = nodes.find(n => n.id === nodeId);

          if (startNode && targetNode) {
            const startIface = startNode.interfaces.find(i => !i.isConnected);
            const targetIface = targetNode.interfaces.find(i => !i.isConnected);

            if (!startIface || !targetIface) {
              logEvent("Error: No available interfaces", "error");
              setLinkStartNodeId(null);
              return;
            }

            const startIfaceId = startIface.id;
            const targetIfaceId = targetIface.id;

            // Update nodes with connected interfaces
            setNodes(nodes.map(n => {
              if (n.id === linkStartNodeId) {
                return { ...n, interfaces: n.interfaces.map(i => i.id === startIfaceId ? { ...i, isConnected: true } : i) };
              }
              if (n.id === nodeId) {
                return { ...n, interfaces: n.interfaces.map(i => i.id === targetIfaceId ? { ...i, isConnected: true } : i) };
              }
              return n;
            }));

            const newLink: Link = {
              id: nextId('link'),
              fromDeviceId: linkStartNodeId,
              fromInterfaceId: startIfaceId,
              toDeviceId: nodeId,
              toInterfaceId: targetIfaceId,
              bandwidth: 1000,
              latency: 1,
              status: 'up'
            };
            setLinks([...links, newLink]);
            logEvent(`Linked ${startNode.name}:${startIfaceId} to ${targetNode.name}:${targetIfaceId}`, 'success');
          }
        }
        setLinkStartNodeId(null);
      }
    } else {
      setSelectedNode(nodeId);
      setSelectedLink(null);
      setPingTargetId('broadcast');
    }
  };


  const exportDesign = () => {
    const data = JSON.stringify({ nodes, links }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tools-noob31-com-network-design-${Date.now()}.json`;
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
    <div className="space-y-6">
      <SEO
        title="Network Visualiser"
        description="Design, simulate, and analyze complex network topologies with real-time packet tracking and security device modeling."
        url="https://tools.noob31.com/network/visualiser"
      />

      <div>
        <h1 className="font-brand text-2xl sm:text-3xl font-bold tracking-tight">Network Visualiser [BETA]</h1>
        <p className="text-muted-foreground mt-2">Design and observe simple network topologies. Click on (i) for info.</p>
      </div>

      {/* Mobile Disclaimer */}
      <div className="lg:hidden p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
          <Monitor className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="font-bold text-slate-900 dark:text-slate-100">Desktop Only.</h2>
          <p className="text-sm text-slate-500 max-w-[280px] mx-auto leading-relaxed">
            This feature is currently disabled for mobile users due to screen constraints and complexity.
          </p>
        </div>
      </div>

      <div className="hidden lg:flex flex-col h-[800px] gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 rounded-lg border shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-md">
              <Button
                variant={mode === 'select' ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => { setMode('select'); setLinkStartNodeId(null); }}
                title="Select & Move"
              >
                <MousePointer2 className="w-4 h-4" />
              </Button>
              <Button
                variant={mode === 'link' ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => { setMode('link'); setLinkStartNodeId(null); }}
                title="Connect Devices"
              >
                <LinkIcon className="w-4 h-4" />
              </Button>
              <Button
                variant={mode === 'delete' ? 'default' : 'ghost'}
                size="icon"
                className={cn("h-8 w-8 rounded-md", mode === 'delete' ? "bg-red-500 hover:bg-red-600 text-white" : "text-red-400 hover:bg-red-50")}
                onClick={() => { setMode(mode === 'delete' ? 'select' : 'delete'); setLinkStartNodeId(null); }}
                title="Delete Mode (Click to remove)"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <Button variant="outline" size="sm" className="h-8 text-[10px] uppercase font-bold transition-premium hover:scale-105 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => addNode(DeviceType.PC)} title="Add PC">
                <Monitor className="w-3 h-3 mr-1" /> PC
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-[10px] uppercase font-bold transition-premium hover:scale-105 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => addNode(DeviceType.SERVER)} title="Add Server">
                <HardDrive className="w-3 h-3 mr-1" /> Server
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-[10px] uppercase font-bold transition-premium hover:scale-105 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => addNode(DeviceType.SWITCH)} title="Add Switch">
                <Layers className="w-3 h-3 mr-1" /> Switch
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-[10px] uppercase font-bold transition-premium hover:scale-105 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => addNode(DeviceType.ROUTER)} title="Add Router">
                <Network className="w-3 h-3 mr-1" /> Router
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-[10px] uppercase font-bold transition-premium hover:scale-105 hover:bg-red-50 dark:hover:bg-red-900/10" onClick={() => addNode(DeviceType.FIREWALL)} title="Add Firewall">
                <Shield className="w-3 h-3 mr-1 text-red-500" /> Firewall
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-[10px] uppercase font-bold transition-premium hover:scale-105 hover:bg-orange-50 dark:hover:bg-orange-900/10" onClick={() => addNode(DeviceType.IPS_IDS)} title="Add IPS/IDS">
                <Activity className="w-3 h-3 mr-1 text-orange-500" /> IPS/IDS
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <Button
                variant={snapToGrid ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8 transition-premium hover:scale-110"
                onClick={() => setSnapToGrid(!snapToGrid)}
                title="Snap to Grid"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 transition-premium hover:scale-110" onClick={exportDesign} title="Export Design (JSON)">
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
                <Button variant="ghost" size="icon" className="h-8 w-8 transition-premium hover:scale-110">
                  <Upload className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                className="h-8 text-[10px] font-bold uppercase bg-green-600 hover:bg-green-700 transition-premium hover:scale-105 active:scale-95 shadow-lg shadow-green-500/20"
                onClick={() => {
                  // Trigger a segment-aware broadcast from all endpoints (PCs/Servers)
                  nodes.filter(n => n.type === DeviceType.PC || n.type === DeviceType.SERVER).forEach(dev => handleBroadcast(dev.id));
                }}
              >
                <Play className="w-4 h-4 mr-1" /> Broadcast
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs font-bold uppercase transition-premium hover:bg-slate-100 dark:hover:bg-slate-800" onClick={clearCanvas}>
                <RotateCcw className="w-4 h-4 mr-1" /> Reset
              </Button>
              <Button
                variant="outline"
                size="icon"
                className={cn("h-8 w-8 ml-2 transition-premium hover:scale-110", showLegend ? "bg-blue-500 text-white" : "")}
                onClick={() => setShowLegend(!showLegend)}
                title="Tool Legend & Guide"
              >
                <Info className="w-4 h-4" />
              </Button>
            </div>
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
            onClick={() => { setSelectedNode(null); setSelectedLink(null); setLinkStartNodeId(null); setSelectedNetworkId(null); }}
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

            {/* Under-Node Layer (Packets) */}
            <g ref={underNodeLayerRef} />

            {/* Links */}
            {/* Links */}
            {stpData.links.map(link => {
              const fromNode = stpData.nodes.find(n => n.id === link.fromDeviceId);
              const toNode = stpData.nodes.find(n => n.id === link.toDeviceId);
              if (!fromNode || !toNode) return null;

              const isBlocked = link.stpState === 'blocking';

              return (
                <g key={link.id} className="group">
                  {/* Transparent Hit Target (Wider for easier clicking) */}
                  <line
                    x1={fromNode.x}
                    y1={fromNode.y}
                    x2={toNode.x}
                    y2={toNode.y}
                    stroke="transparent"
                    strokeWidth={12}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedLink(link.id);
                      setSelectedNode(null);
                      if (mode === 'delete') {
                        // Update connected status of interfaces
                        setNodes(nodes.map(n => {
                          if (n.id === link.fromDeviceId || n.id === link.toDeviceId) {
                            const ifaceId = n.id === link.fromDeviceId ? link.fromInterfaceId : link.toInterfaceId;
                            return {
                              ...n,
                              interfaces: n.interfaces.map(i => i.id === ifaceId ? { ...i, isConnected: false } : i)
                            };
                          }
                          return n;
                        }));
                        setLinks(links.filter(l => l.id !== link.id));
                        if (selectedLink === link.id) setSelectedLink(null);
                        logEvent(`Deleted Link`, 'info');
                      }
                    }}
                  />
                  {/* Visible Link Line */}
                  <line
                    x1={fromNode.x}
                    y1={fromNode.y}
                    x2={toNode.x}
                    y2={toNode.y}
                    stroke={selectedLink === link.id ? '#3b82f6' : (isBlocked ? '#94a3b8' : '#cbd5e1')}
                    strokeWidth={selectedLink === link.id ? 4 : 2}
                    strokeDasharray={isBlocked ? "4 4" : "0"}
                    className={cn(
                      "transition-premium pointer-events-none",
                      !isBlocked && "group-hover:stroke-blue-400 group-hover:stroke-[3px]",
                      selectedLink === link.id && "glow-blue"
                    )}
                  />
                  {isBlocked && (
                    <circle
                      cx={(fromNode.x + toNode.x) / 2}
                      cy={(fromNode.y + toNode.y) / 2}
                      r={6}
                      fill="#ef4444"
                      className="pointer-events-none"
                    />
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {stpData.nodes.map(node => (
              <g
                key={node.id}
                data-node-id={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseDown={(e) => startDrag(e, node.id)}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                onClick={(e) => handleNodeClick(e, node.id)}
                className="group cursor-pointer"
              >
                {/* Selected Node Halo - Lightweight static design */}
                {selectedNode === node.id && (
                  <g className="pointer-events-none">
                    <circle
                      r="35"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                      className="animate-[spin_10s_linear_infinite] opacity-60"
                    />
                    <circle
                      r="32"
                      fill="#3b82f6"
                      className="opacity-10"
                    />
                  </g>
                )}

                {/* Root Bridge Indicator */}
                {/* STP Root Bridge - Energy Field Effect */}
                {node.isRootBridge && (
                  <g className="pointer-events-none">
                    <circle
                      r="40"
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="1.5"
                      strokeDasharray="15 5"
                      className="animate-[spin_20s_linear_infinite] opacity-40"
                    />
                    <circle
                      r="35"
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="1"
                      strokeDasharray="4 8"
                      className="animate-spin-reverse opacity-60"
                      style={{ animationDuration: '10s' }}
                    />
                    <circle
                      r="30"
                      fill="url(#rootBridgeGradient)"
                      className="animate-pulse-soft opacity-30"
                    />
                    <defs>
                      <radialGradient id="rootBridgeGradient">
                        <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                      </radialGradient>
                    </defs>
                  </g>
                )}

                {/* Network Selection - Visible Highlight */}
                {selectedNetworkId && detectedNetworks.foundNetworks.find(net => net.id === selectedNetworkId)?.devices.includes(node.id) && (
                  <g className="pointer-events-none">
                    <circle
                      r="40"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                      className="animate-[spin_12s_linear_infinite] opacity-60"
                    />
                    <circle
                      r="35"
                      fill="#3b82f6"
                      className="opacity-20 animate-pulse"
                      style={{ animationDuration: '2s' }}
                    />
                  </g>
                )}
                <circle
                  r="28"
                  fill="white"
                  stroke={selectedNode === node.id || linkStartNodeId === node.id ? '#3b82f6' : '#cbd5e1'}
                  strokeWidth={selectedNode === node.id || linkStartNodeId === node.id ? '3' : '2'}
                  className="dark:fill-slate-800 transition-premium group-hover:stroke-blue-400 group-hover:scale-110 shadow-lg"
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
                    {node.isCloud ? <Cloud size={20} className="text-sky-400" /> :
                      node.type === DeviceType.PC ? <Monitor size={20} /> :
                        node.type === DeviceType.SWITCH ? <Layers size={20} /> :
                          node.type === DeviceType.ROUTER ? <Network size={20} /> :
                            node.type === DeviceType.SERVER ? <HardDrive size={20} /> :
                              node.type === DeviceType.FIREWALL ? <Shield size={20} className="text-red-500" /> :
                                node.type === DeviceType.IPS_IDS ? <Activity size={20} className="text-orange-500" /> :
                                  <Globe size={20} />}
                  </div>
                </foreignObject>
              </g>
            ))}
            
            {cloudText && (
              <text
                id="cloud-discovery-text"
                x={cloudText.x}
                y={cloudText.y}
                textAnchor="middle"
                className="text-2xl font-black fill-blue-500 dark:fill-blue-400 uppercase tracking-tighter pointer-events-none"
                style={{ 
                  opacity: 0,
                  filter: 'drop-shadow(0 0 12px rgba(59, 130, 246, 0.8))'
                }}
              >
                Cloud Computing Discovered!
              </text>
            )}
            
            {ispText && (
              <text
                id="isp-discovery-text"
                x={ispText.x}
                y={ispText.y}
                textAnchor="middle"
                className="text-2xl font-black fill-purple-500 dark:fill-purple-400 uppercase tracking-tighter pointer-events-none"
                style={{ 
                  opacity: 0,
                  filter: 'drop-shadow(0 0 12px rgba(168, 85, 247, 0.8))'
                }}
              >
                ISP Infrastructure Detected
              </text>
            )}

            {/* Over-Node Layer (Drop marks/Alerts) */}
            <g ref={overNodeLayerRef} />
          </svg>

          {/* Device Hover Tooltip */}
          {(() => {
            const hoveredNode = nodes.find(n => n.id === hoveredNodeId);
            if (!hoveredNodeId || !hoveredNode) return null;
            
            return (
              <div 
                className="fixed pointer-events-none z-[100] animate-in fade-in zoom-in-95 duration-200"
              style={{ 
                left: mousePos.x * (svgRef.current?.getScreenCTM()?.a || 1) + (svgRef.current?.getScreenCTM()?.e || 0) + 15,
                top: mousePos.y * (svgRef.current?.getScreenCTM()?.d || 1) + (svgRef.current?.getScreenCTM()?.f || 0) + 15
              }}
            >
              <div className="bg-slate-900/90 text-white p-2 rounded-lg shadow-xl backdrop-blur-md border border-slate-700/50 flex flex-col gap-1 min-w-[120px]">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
                    {nodes.find(n => n.id === hoveredNodeId)?.type}
                  </span>
                  <span className="text-[9px] font-mono opacity-50">
                    {nodes.find(n => n.id === hoveredNodeId)?.interfaces[0].mac.slice(-4)}
                  </span>
                </div>
                <span className="text-xs font-bold truncate">
                  {nodes.find(n => n.id === hoveredNodeId)?.name}
                </span>
                <div className="pt-1 border-t border-white/10 flex flex-col gap-0.5">
                  {(() => {
                    const nodeNets = detectedNetworks.foundNetworks.filter(net => net.devices.includes(hoveredNodeId));
                    if (nodeNets.length === 0) return (
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                        <span className="text-[9px] uppercase font-bold opacity-70">Isolated Node</span>
                      </div>
                    );
                    
                    const primaryNet = nodeNets[0];
                    return (
                      <>
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                          <span className="text-[9px] uppercase font-bold text-blue-400">
                            {nodeNets.length > 1 ? `Multi-Segment (${nodeNets.length})` : primaryNet.name}
                          </span>
                        </div>
                        <span className="text-[8px] font-mono opacity-50 ml-3 truncate">
                          {nodeNets.length > 1 ? "Layer 3 Gateway" : primaryNet.subnet}
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          ); })()}

          {/* Bottom Left UI Stack */}
          <div className="absolute bottom-4 left-4 flex flex-col gap-2 pointer-events-none">
            {/* Help Text */}
            <div className="self-start text-xs text-muted-foreground bg-white/50 dark:bg-black/20 p-2 rounded backdrop-blur-sm">
              {mode === 'select' ? "DRAG TO MOVE • CLICK TO SELECT" : "CLICK TWO DEVICES TO CONNECT • ESC TO CANCEL"}
            </div>

            {/* Dynamic Network Browser */}
            <div className="flex items-end gap-3 pointer-events-auto">
              {/* Networks Box */}
              <div className="w-64 max-h-56 flex flex-col bg-white/95 dark:bg-slate-900/95 text-xs text-slate-600 dark:text-slate-300 rounded-xl border border-slate-200/50 dark:border-slate-800/50 shadow-2xl backdrop-blur-md overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                    <span className="font-bold uppercase tracking-widest text-[10px] text-blue-500">Network Segments</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-5 w-5 text-slate-400 hover:text-blue-500 transition-premium"
                    onClick={() => setIsNetworksCollapsed(!isNetworksCollapsed)}
                  >
                    {isNetworksCollapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </Button>
                </div>
                
                {!isNetworksCollapsed && (
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 space-y-1">
                    {detectedNetworks.foundNetworks.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 italic text-[10px]">
                        No active segments detected.<br/>Connect devices to start.
                      </div>
                    ) : (
                      detectedNetworks.foundNetworks.map(net => (
                        <div
                          key={net.id}
                          className={cn(
                            "group relative p-2 rounded-lg border border-transparent transition-premium cursor-pointer",
                            selectedNetworkId === net.id 
                              ? "bg-blue-500/10 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                              : "hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700"
                          )}
                          onClick={() => {
                            setSelectedNetworkId(selectedNetworkId === net.id ? null : net.id);
                          }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={cn(
                              "font-bold text-xs transition-colors",
                              selectedNetworkId === net.id ? "text-blue-600 dark:text-blue-400" : "text-slate-700 dark:text-slate-200 group-hover:text-blue-500"
                            )}>{net.name}</span>
                            <span className="text-[10px] font-mono text-blue-500/60">{net.subnet}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex -space-x-1.5">
                              {net.devices.slice(0, 4).map(devId => (
                                <div key={devId} className="w-5 h-5 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-900 flex items-center justify-center shadow-sm">
                                  <Monitor className="w-2.5 h-2.5 text-slate-400" />
                                </div>
                              ))}
                              {net.devices.length > 4 && (
                                <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-900 flex items-center justify-center text-[8px] font-bold text-slate-500">
                                  +{net.devices.length - 4}
                                </div>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 italic">{net.devices.length} devices</span>
                          </div>
                          {selectedNetworkId === net.id && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1 h-4 bg-blue-500 rounded-full animate-pulse" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {selectedNetworkId && (
                <div className={cn(
                  "w-64 flex flex-col bg-white/95 dark:bg-slate-900/95 text-xs text-slate-600 dark:text-slate-300 rounded-xl border border-slate-200/50 dark:border-slate-800/50 shadow-2xl backdrop-blur-md animate-in slide-in-from-left-4 duration-300 overflow-hidden",
                  isNetworksCollapsed ? "h-fit" : "max-h-56"
                )}>
                  <div className="flex items-center justify-between p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-[10px] uppercase tracking-widest text-blue-500 truncate">Member Devices</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-red-50 dark:hover:bg-red-900/20 group transition-premium" onClick={() => setSelectedNetworkId(null)}>
                      <X size={12} className="text-slate-400 group-hover:text-red-500" />
                    </Button>
                  </div>
                  {!isNetworksCollapsed && (
                    <div className="flex-1 overflow-y-auto space-y-1 p-1.5 pr-1.5 custom-scrollbar">
                      {detectedNetworks.foundNetworks.find(n => n.id === selectedNetworkId)?.devices.map(devId => {
                        const node = nodes.find(n => n.id === devId);
                        if (!node) return null;

                        const ifaceIps = Object.entries(detectedNetworks.interfaceIps)
                          .filter(([key]) => key.startsWith(`${devId}-`))
                          .map(([, ip]) => ip);

                        return (
                          <button
                            key={devId}
                            className="w-full p-2 rounded-lg bg-slate-50/50 dark:bg-white/5 flex items-center justify-between group hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800 border border-transparent transition-premium text-left"
                            onClick={() => {
                              setSelectedNode(devId);
                              setMode('select');
                            }}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={cn(
                                "shrink-0 p-1 rounded-md bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 group-hover:scale-110 transition-premium",
                                node.type === DeviceType.FIREWALL ? "text-red-500" : (node.type === DeviceType.IPS_IDS ? "text-orange-500" : "text-blue-500")
                              )}>
                                {node.type === DeviceType.PC ? <Monitor size={12} /> :
                                  node.type === DeviceType.SWITCH ? <Layers size={12} /> :
                                    node.type === DeviceType.ROUTER ? <Network size={12} /> :
                                      node.type === DeviceType.SERVER ? <HardDrive size={12} /> :
                                        <Shield size={12} />}
                              </span>
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-slate-700 dark:text-slate-200 truncate">{node.name}</span>
                                {ifaceIps.length > 0 && (
                                  <span className="text-[10px] font-mono text-blue-500 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                    {ifaceIps.join(', ')}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-[9px] font-mono text-slate-400 ml-1 shrink-0 bg-slate-100 dark:bg-slate-800 px-1 rounded uppercase">{node.interfaces[0].mac.slice(-4)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Network Log Terminal */}
          <div className="absolute bottom-4 right-4 w-80 max-h-48 flex flex-col bg-black/80 text-xs font-mono text-green-400 rounded-lg border border-slate-700 shadow-2xl backdrop-blur-sm overflow-hidden">
            <div className="flex items-center justify-between p-2 border-b border-slate-700 bg-slate-800/50">
              <div className="flex items-center gap-2">
                <Activity className="w-3 h-3 text-green-400 animate-pulse" />
                <span className="font-bold uppercase tracking-wider text-[10px] text-green-400">Network Log</span>
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-4 w-4 text-slate-500 hover:text-red-400"
                  onClick={() => setLogs([])}
                  title="Clear Logs"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-4 w-4 text-slate-400 hover:text-white"
                  onClick={() => setIsLogsCollapsed(!isLogsCollapsed)}
                >
                  {isLogsCollapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </Button>
              </div>
            </div>
            
            {!isLogsCollapsed && (
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 font-mono space-y-1.5 scroll-smooth">
                {logs.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-600 italic text-[10px]">
                    Waiting for events...
                  </div>
                ) : (
                  logs.map(log => (
                    <div key={log.id} className="flex gap-2 animate-in slide-in-from-bottom-1 duration-200">
                      <span className="text-slate-600 shrink-0 select-none">[{log.time}]</span>
                      <span className={cn(
                        "break-words",
                        log.type === 'success' ? 'text-green-400' : 
                        log.type === 'error' ? 'text-red-400' : 'text-slate-300'
                      )}>
                        {log.msg}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Info Overlay */}
          {(selectedNode || selectedLink) && (
            <Card className="absolute top-4 right-4 w-72 max-h-[calc(100%-2rem)] flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl border-slate-200/50 dark:border-slate-800/50 rounded-xl animate-in fade-in slide-in-from-right-4 duration-300 overflow-hidden z-40">
              <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex-shrink-0">
                <h3 className="font-bold text-[10px] uppercase tracking-widest text-blue-500">
                  {selectedNode ? 'Device Intelligence' : 'Link Configuration'}
                </h3>
                <div className="flex items-center gap-1">
                  {selectedNode && (nodes.find(n => n.id === selectedNode)?.type === DeviceType.PC || nodes.find(n => n.id === selectedNode)?.type === DeviceType.SERVER || nodes.find(n => n.id === selectedNode)?.type === DeviceType.ROUTER || nodes.find(n => n.id === selectedNode)?.type === DeviceType.FIREWALL) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-blue-50 dark:hover:bg-blue-900/20 group transition-premium"
                      onClick={(e) => { e.stopPropagation(); handlePing(selectedNode); }}
                      title="Initiate Ping Test"
                    >
                      <Send className="w-3.5 h-3.5 text-blue-500 group-hover:scale-110 transition-premium" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-red-50 dark:hover:bg-red-900/20 group transition-premium" onClick={() => { setSelectedNode(null); setSelectedLink(null); }}>
                    <X className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-500 transition-premium" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">

                {selectedNode && (
                  <div className="space-y-4">
                    {/* Device Role Description */}
                    <div className="p-2 bg-slate-100/50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                      <p className="text-xs text-muted-foreground uppercase font-bold mb-1 opacity-70">Device Role</p>
                      <p className="text-xs leading-tight italic text-slate-600 dark:text-slate-400">
                        {(() => {
                          const node = nodes.find(n => n.id === selectedNode);
                          switch (node?.type) {
                            case DeviceType.PC: return "Standard network host for end-user applications and initiating/receiving traffic.";
                            case DeviceType.SERVER: return "High-capacity network host optimized for data storage and processing service requests.";
                            case DeviceType.SWITCH: return "Layer 2 networking device that connects multiple hosts within a local network segment via MAC address learning.";
                            case DeviceType.ROUTER: return "Layer 3 networking device that routes traffic between different network segments and manages logical boundaries.";
                            case DeviceType.FIREWALL: return "Security appliance that filters traffic based on source/destination rules and manages network isolation.";
                            case DeviceType.IPS_IDS: return "Security device that monitors (IDS) or prevents (IPS) malicious traffic. Operates as a transparent Layer 2 bridge.";
                            default: return "Network device with specific connectivity and security rules.";
                          }
                        })()}
                      </p>
                    </div>

                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase font-bold">Identifier</p>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-sm font-mono truncate max-w-[150px] cursor-help">{nodes.find(n => n.id === selectedNode)?.name}</p>
                          </TooltipTrigger>
                          <TooltipContent className="bg-slate-900/95 text-white border-slate-700/50 backdrop-blur-md shadow-2xl p-2 min-w-[120px]">
                            {nodes.find(n => n.id === selectedNode)?.name}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-xs text-muted-foreground uppercase font-bold">Ports</p>
                        <p className="text-xs font-mono">
                          {links.filter(l => l.fromDeviceId === selectedNode || l.toDeviceId === selectedNode).length} / {nodes.find(n => n.id === selectedNode)?.portLimit}
                        </p>
                      </div>
                    </div>

                    {/* Network Context */}
                    <div className="p-3 bg-blue-50/30 dark:bg-blue-900/10 rounded-lg border border-blue-100/50 dark:border-blue-900/30 space-y-2">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold opacity-70">Active Connectivity</p>
                      <div className="space-y-1.5">
                        {(() => {
                          const activeSegments = detectedNetworks.foundNetworks.filter(net => net.devices.includes(selectedNode!));
                          if (activeSegments.length === 0) return (
                            <div className="flex items-center justify-between p-1.5 rounded bg-white/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                              <span className="text-xs font-bold text-slate-400">Isolated Node</span>
                              <span className="text-[9px] font-mono text-slate-400">Air-Gapped</span>
                            </div>
                          );
                          return activeSegments.map(net => (
                            <div key={net.id} className="flex items-center justify-between p-1.5 rounded bg-white/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 group/net transition-premium">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 truncate cursor-help">
                                      {net.name}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-slate-900/95 text-white border-slate-700/50 backdrop-blur-md shadow-2xl p-2 min-w-[120px]" side="left">{net.name}</TooltipContent>
                                </Tooltip>
                              </div>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-[10px] font-mono text-slate-500 cursor-help">
                                    {net.subnet}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="bg-slate-900/95 text-white border-slate-700/50 backdrop-blur-md shadow-2xl p-2 min-w-[120px]" side="bottom">Subnet Signature: {net.sig}</TooltipContent>
                              </Tooltip>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    {/* Routing Section (Conditional for Firewall) */}
                    {(() => {
                      const node = nodes.find(n => n.id === selectedNode);
                      if (!node) return null;
                      const isFirewall = node.type === DeviceType.FIREWALL;
                      const isRouter = node.type === DeviceType.ROUTER;
                      
                      if (!isFirewall && !isRouter) return null;

                      return (
                        <div className="space-y-4">
                          {/* Firewall Routing Toggle */}
                          {isFirewall && (
                            <div className="p-3 bg-red-50/50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                  <Network className="w-3 h-3" />
                                  <span className="text-[10px] font-bold uppercase tracking-wider">L3 Routing Capability</span>
                                </div>
                                <Button
                                  variant={node.routingEnabled ? "default" : "outline"}
                                  size="sm"
                                  className={cn("h-5 text-[10px] px-1.5 transition-premium", node.routingEnabled ? "bg-red-600 hover:bg-red-700" : "")}
                                  onClick={() => {
                                    setNodes(nodes.map(n => n.id === selectedNode ? { ...n, routingEnabled: !n.routingEnabled } : n));
                                    logEvent(`Firewall routing ${!node.routingEnabled ? 'ENABLED' : 'DISABLED'}`, 'info');
                                  }}
                                >
                                  {node.routingEnabled ? 'ENABLED' : 'DISABLED'}
                                </Button>
                              </div>
                              <p className="text-[9px] text-muted-foreground italic leading-tight">
                                {node.routingEnabled 
                                  ? "Operating in Layer 3 mode. Can route between segments and apply ACLs." 
                                  : "Operating in Layer 2 Transparent Bridge mode. Routing and Knowledge disabled."}
                              </p>
                            </div>
                          )}

                        </div>
                      );
                    })()}

                    {/* Router/Firewall Section */}
                    {(nodes.find(n => n.id === selectedNode)?.type === DeviceType.ROUTER || nodes.find(n => n.id === selectedNode)?.type === DeviceType.FIREWALL) && (
                      <div className="p-3 bg-red-50/50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30 space-y-3">
                        <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                          <Shield className="w-3 h-3" />
                          <span className="text-xs font-bold uppercase tracking-wider">
                            Security ACLs
                          </span>
                        </div>


                        <div className="space-y-1.5 border-t pt-2">
                          <Label className="text-xs uppercase text-muted-foreground flex justify-between items-center">
                            ACL: Block Network Segment
                            <Shield size={12} className="text-red-500" />
                          </Label>
                          <div className="max-h-32 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                            {detectedNetworks.foundNetworks.map(net => {
                              const node = nodes.find(n => n.id === selectedNode);
                              const isBlocked = node?.blockedNetworks?.includes(net.sig);
                              const isDirectlyConnected = net.devices.includes(selectedNode!);

                              return (
                                <div key={net.id} className={cn(
                                  "flex items-center justify-between p-1 rounded",
                                  isDirectlyConnected ? "bg-blue-100/30 dark:bg-blue-900/10" : "hover:bg-white dark:hover:bg-slate-900"
                                )}>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-bold truncate">{net.name}</span>
                                    <span className="text-[10px] font-mono opacity-60 truncate">{net.subnet}</span>
                                  </div>
                                  <Button
                                    variant={isBlocked ? "destructive" : "outline"}
                                    size="sm"
                                    className={cn("h-5 text-[10px] px-1.5 transition-premium", isBlocked ? "bg-red-600 hover:bg-red-700" : "")}
                                    onClick={() => {
                                      if (node) {
                                        const newBlocked = isBlocked
                                          ? (node.blockedNetworks || []).filter(sig => sig !== net.sig)
                                          : [...(node.blockedNetworks || []), net.sig];
                                        setNodes(nodes.map(n => n.id === selectedNode ? { ...n, blockedNetworks: newBlocked } : n));
                                        logEvent(`${node.name}: ${isBlocked ? 'Unblocked' : 'Blocked'} ${net.name}`, isBlocked ? 'info' : 'error');
                                      }
                                    }}
                                  >
                                    {isBlocked ? 'BLOCKED' : 'ALLOW'}
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-[10px] text-muted-foreground italic leading-tight pt-1">
                            Firewalls block entire network segments at Layer 3. Traffic from these sources will be dropped.
                          </p>
                        </div>

                        <div className="space-y-1.5 border-t pt-2">
                          <Label className="text-xs uppercase text-muted-foreground flex justify-between items-center">
                            ACL: Block Individual Device
                            <Monitor size={12} className="text-slate-400" />
                          </Label>
                          <div className="max-h-32 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                            {nodes
                              .filter(n => n.id !== selectedNode && (n.type === DeviceType.PC || n.type === DeviceType.SERVER))
                              .map(target => {
                                const isBlocked = nodes.find(n => n.id === selectedNode)?.blockedNetworks?.includes(target.id);
                                return (
                                  <div key={target.id} className="flex items-center justify-between p-1.5 rounded bg-slate-50/50 dark:bg-white/5 border border-transparent hover:bg-white dark:hover:bg-slate-900 transition-premium">
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-[10px] font-bold truncate">{target.name}</span>
                                      <span className="text-[9px] font-mono opacity-60">ID: {target.id.slice(0, 8)}</span>
                                    </div>
                                    <Button
                                      variant={isBlocked ? "destructive" : "outline"}
                                      size="sm"
                                      className={cn("h-5 text-[10px] px-1.5 transition-premium", isBlocked ? "bg-red-600 hover:bg-red-700" : "")}
                                      onClick={() => {
                                        const node = nodes.find(n => n.id === selectedNode);
                                        if (node) {
                                          const newBlocked = isBlocked
                                            ? (node.blockedNetworks || []).filter(id => id !== target.id)
                                            : [...(node.blockedNetworks || []), target.id];
                                          setNodes(nodes.map(n => n.id === selectedNode ? { ...n, blockedNetworks: newBlocked } : n));
                                          logEvent(`${node.name}: ${isBlocked ? 'Unblocked' : 'Blocked'} ${target.name}`, isBlocked ? 'info' : 'error');
                                        }
                                      }}
                                    >
                                      {isBlocked ? 'BLOCKED' : 'ALLOW'}
                                    </Button>
                                  </div>
                                );
                              })
                            }
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Server DHCP Configuration */}
                    {nodes.find(n => n.id === selectedNode)?.type === DeviceType.SERVER && (
                      <div className="p-3 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-lg border border-indigo-100 dark:border-indigo-900/30 space-y-3">
                        <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
                          <div className="flex items-center space-x-2">
                            <Zap className="w-3 h-3" />
                            <span className="text-xs font-bold uppercase tracking-wider">Service: DHCP Server</span>
                          </div>
                          <Switch 
                            checked={nodes.find(n => n.id === selectedNode)?.dhcpEnabled || false}
                            onCheckedChange={(checked) => {
                              setNodes(nodes.map(n => n.id === selectedNode ? { ...n, dhcpEnabled: checked } : n));
                              logEvent(`${nodes.find(n => n.id === selectedNode)?.name} DHCP Service: ${checked ? 'Online' : 'Offline'}`, checked ? 'success' : 'info');
                            }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground italic leading-tight">
                          When enabled, this server will provide IP addresses to the local network segment.
                        </p>
                      </div>
                    )}

                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">MAC Address</p>
                      <p className="text-sm font-mono text-blue-600 dark:text-blue-400">{nodes.find(n => n.id === selectedNode)?.interfaces[0].mac}</p>
                    </div>

                    {/* IPS/IDS Mode Section */}
                    {nodes.find(n => n.id === selectedNode)?.type === DeviceType.IPS_IDS && (
                      <div className="p-3 bg-orange-50/50 dark:bg-orange-900/10 rounded-lg border border-orange-100 dark:border-orange-900/30 space-y-3">
                        <div className="flex items-center space-x-2 text-orange-600 dark:text-orange-400">
                          <Activity className="w-3 h-3" />
                          <span className="text-xs font-bold uppercase tracking-wider">Device Mode</span>
                        </div>

                        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-md">
                          <Button
                            variant={nodes.find(n => n.id === selectedNode)?.ipsMode === 'IDS' ? 'default' : 'ghost'}
                            size="sm"
                            className="flex-1 h-7 text-xs uppercase font-bold"
                            onClick={() => {
                              setNodes(nodes.map(n => n.id === selectedNode ? { ...n, ipsMode: 'IDS' } : n));
                              logEvent(`${nodes.find(n => n.id === selectedNode)?.name} set to IDS mode (Detection Only)`, 'info');
                            }}
                          >
                            IDS
                          </Button>
                          <Button
                            variant={nodes.find(n => n.id === selectedNode)?.ipsMode === 'IPS' ? 'default' : 'ghost'}
                            size="sm"
                            className="flex-1 h-7 text-xs uppercase font-bold"
                            onClick={() => {
                              setNodes(nodes.map(n => n.id === selectedNode ? { ...n, ipsMode: 'IPS' } : n));
                              logEvent(`${nodes.find(n => n.id === selectedNode)?.name} set to IPS mode (Prevention Enabled)`, 'info');
                            }}
                          >
                            IPS
                          </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground italic leading-tight">
                          {nodes.find(n => n.id === selectedNode)?.ipsMode === 'IDS'
                            ? 'IDS Mode: Sniffs traffic but does not block. Transparent Layer 2 bridge.'
                            : 'IPS Mode: Inspects and blocks malicious traffic. Transparent Layer 2 bridge.'}
                        </p>

                        {nodes.find(n => n.id === selectedNode)?.ipsMode === 'IPS' && (
                          <div className="space-y-4 pt-2 border-t border-orange-100 dark:border-orange-900/20">
                            {/* Segment ACL for IPS */}
                            <div className="space-y-1.5">
                              <Label className="text-xs uppercase text-muted-foreground flex justify-between items-center">
                                ACL: Block Network Segment
                                <Shield size={12} className="text-orange-500" />
                              </Label>
                              <div className="max-h-32 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                {detectedNetworks.foundNetworks.map(net => {
                                  const node = nodes.find(n => n.id === selectedNode);
                                  const isBlocked = node?.blockedNetworks?.includes(net.sig);
                                  const isDirectlyConnected = net.devices.includes(selectedNode!);

                                  return (
                                    <div key={net.id} className={cn(
                                      "flex items-center justify-between p-1.5 rounded",
                                      isDirectlyConnected ? "bg-blue-100/30 dark:bg-blue-900/10" : "hover:bg-white dark:hover:bg-slate-900"
                                    )}>
                                      <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-bold truncate">{net.name}</span>
                                        <span className="text-[10px] font-mono opacity-60 truncate">{net.subnet}</span>
                                      </div>
                                      <Button
                                        variant={isBlocked ? "destructive" : "outline"}
                                        size="sm"
                                        className={cn("h-5 text-[10px] px-1.5 transition-premium", isBlocked ? "bg-orange-600 hover:bg-orange-700" : "")}
                                        onClick={() => {
                                          if (node) {
                                            const newBlocked = isBlocked
                                              ? (node.blockedNetworks || []).filter(sig => sig !== net.sig)
                                              : [...(node.blockedNetworks || []), net.sig];
                                            setNodes(nodes.map(n => n.id === selectedNode ? { ...n, blockedNetworks: newBlocked } : n));
                                            logEvent(`${node.name}: ${isBlocked ? 'Unblocked' : 'Blocked'} ${net.name}`, isBlocked ? 'info' : 'error');
                                          }
                                        }}
                                      >
                                        {isBlocked ? 'BLOCKED' : 'ALLOW'}
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Device ACL for IPS */}
                            <div className="space-y-1.5 border-t border-orange-100 dark:border-orange-900/20 pt-2">
                              <Label className="text-xs uppercase text-muted-foreground flex justify-between items-center">
                                ACL: Block Individual Device
                                <Monitor size={12} className="text-slate-400" />
                              </Label>
                              <div className="max-h-32 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                {nodes
                                  .filter(n => n.id !== selectedNode && (n.type === DeviceType.PC || n.type === DeviceType.SERVER))
                                  .map(target => {
                                    const isBlocked = nodes.find(n => n.id === selectedNode)?.blockedNetworks?.includes(target.id);
                                    return (
                                      <div key={target.id} className="flex items-center justify-between p-1.5 rounded bg-white/50 dark:bg-slate-800/50 border border-transparent hover:bg-white dark:hover:bg-slate-900 transition-premium">
                                        <div className="flex flex-col min-w-0">
                                          <span className="text-[10px] font-bold truncate">{target.name}</span>
                                          <span className="text-[9px] font-mono opacity-60">ID: {target.id.slice(0, 8)}</span>
                                        </div>
                                        <Button
                                          variant={isBlocked ? "destructive" : "outline"}
                                          size="sm"
                                          className={cn("h-5 text-[10px] px-1.5 transition-premium", isBlocked ? "bg-orange-600 hover:bg-orange-700" : "")}
                                          onClick={() => {
                                            const node = nodes.find(n => n.id === selectedNode);
                                            if (node) {
                                              const newBlocked = isBlocked
                                                ? (node.blockedNetworks || []).filter(id => id !== target.id)
                                                : [...(node.blockedNetworks || []), target.id];
                                              setNodes(nodes.map(n => n.id === selectedNode ? { ...n, blockedNetworks: newBlocked } : n));
                                              logEvent(`${node.name}: ${isBlocked ? 'Unblocked' : 'Blocked'} ${target.name}`, isBlocked ? 'info' : 'error');
                                            }
                                          }}
                                        >
                                          {isBlocked ? 'BLOCKED' : 'ALLOW'}
                                        </Button>
                                      </div>
                                    );
                                  })
                                }
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {(nodes.find(n => n.id === selectedNode)?.type === DeviceType.PC || nodes.find(n => n.id === selectedNode)?.type === DeviceType.SERVER || nodes.find(n => n.id === selectedNode)?.type === DeviceType.ROUTER || nodes.find(n => n.id === selectedNode)?.type === DeviceType.FIREWALL) && (
                      <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                            <Zap className="w-3 h-3" />
                            <span className="text-xs font-bold uppercase tracking-wider">Ping Lab</span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-blue-500 hover:bg-blue-100"
                              onClick={() => handleBroadcast(selectedNode!)}
                              title="Broadcast to Segment"
                            >
                              <Globe className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-blue-500 hover:bg-blue-100"
                              onClick={() => {
                                if (pingTargetId) {
                                  handlePing(selectedNode!, pingTargetId);
                                } else {
                                  logEvent("Please select a target device first", "error");
                                }
                              }}
                              title="Send Direct Ping"
                            >
                              <Send className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <Label className="text-xs uppercase text-muted-foreground">Target Device</Label>
                            <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 px-1 rounded text-blue-600 font-bold">BROADCAST BY DEFAULT</span>
                          </div>
                          <Select value={pingTargetId} onValueChange={setPingTargetId}>
                            <SelectTrigger className="h-7 text-xs bg-white dark:bg-slate-900">
                              <SelectValue placeholder="Broadcast (Segment)..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="broadcast" className="text-xs font-bold text-blue-600">Broadcast to Segment</SelectItem>
                              {nodes
                                .filter(n => n.id !== selectedNode && (
                                  n.type === DeviceType.PC ||
                                  n.type === DeviceType.SERVER ||
                                  n.type === DeviceType.ROUTER ||
                                  n.type === DeviceType.FIREWALL
                                ))
                                .map(target => (
                                  <SelectItem key={target.id} value={target.id} className="text-xs">
                                    {target.name} ({target.interfaces[0].mac.slice(-4)})
                                  </SelectItem>
                                ))
                              }
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase text-muted-foreground">Ping Count (1-10)</Label>
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

                    {/* Switch VLAN Section */}
                    {nodes.find(n => n.id === selectedNode)?.type === DeviceType.SWITCH && (
                      <div className="p-3 bg-purple-50/50 dark:bg-purple-900/10 rounded-lg border border-purple-100 dark:border-purple-900/30 space-y-3">
                        <div className="flex items-center space-x-2 text-purple-600 dark:purple-400">
                          <Layers className="w-3 h-3" />
                          <span className="text-xs font-bold uppercase tracking-wider">VLAN Manager (Max 3)</span>
                        </div>

                        {/* STP Status */}
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 space-y-2">
                           <div className="flex justify-between items-center">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground">STP Status</span>
                              {stpData.nodes.find(n => n.id === selectedNode)?.isRootBridge ? (
                                <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-600 px-1 rounded font-bold">ROOT BRIDGE</span>
                              ) : (
                                <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-500 px-1 rounded">DESIGNATED</span>
                              )}
                           </div>
                           <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-1.5">
                             <Label className="text-[10px] uppercase text-muted-foreground">Force Root Bridge</Label>
                             <input 
                                type="checkbox"
                                checked={nodes.find(n => n.id === selectedNode)?.isManualRoot || false} 
                                onChange={(e) => {
                                  const isChecked = e.target.checked;
                                  setNodes(nodes.map(n => n.id === selectedNode ? { ...n, isManualRoot: isChecked } : n));
                                  if (isChecked) logEvent(`${nodes.find(n => n.id === selectedNode)?.name} forced as STP Root`, 'info');
                                }}
                                className="w-3 h-3 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                             />
                           </div>
                        </div>

                        <div className="space-y-2">
                          {nodes.find(n => n.id === selectedNode)?.vlans?.map((vlan, vIdx) => (
                            <div key={vIdx} className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded border border-purple-100 dark:border-purple-900/20">
                              <span className="text-xs font-mono">{vlan}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-red-400 hover:text-red-500"
                                onClick={() => {
                                  const node = nodes.find(n => n.id === selectedNode);
                                  if (node && node.vlans) {
                                    const newVlans = node.vlans.filter((_, i) => i !== vIdx);
                                    setNodes(nodes.map(n => n.id === selectedNode ? { ...n, vlans: newVlans } : n));
                                  }
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}

                          {(nodes.find(n => n.id === selectedNode)?.vlans?.length || 0) < 3 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-xs h-7 border-dashed border-purple-300"
                              onClick={() => {
                                const node = nodes.find(n => n.id === selectedNode);
                                if (node && node.vlans) {
                                  const newVlan = `VLAN ${node.vlans.length + 1}`;
                                  setNodes(nodes.map(n => n.id === selectedNode ? { ...n, vlans: [...node.vlans!, newVlan] } : n));
                                }
                              }}
                            >
                              + Add VLAN
                            </Button>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase text-muted-foreground">Assign Ports to VLAN</Label>
                          <div className="space-y-2">
                            {links
                              .filter(l => l.fromDeviceId === selectedNode || l.toDeviceId === selectedNode)
                              .map(link => {
                                const otherId = link.fromDeviceId === selectedNode ? link.toDeviceId : link.fromDeviceId;
                                const otherNode = nodes.find(n => n.id === otherId);
                                const currentVlan = nodes.find(n => n.id === selectedNode)?.vlanMap?.[otherId] || 'VLAN 1';

                                return (
                                  <div key={link.id} className="flex items-center space-x-2">
                                    <span className="text-xs font-mono flex-1 truncate">{otherNode?.name}</span>
                                    <Select
                                      value={currentVlan}
                                      onValueChange={(val) => {
                                        setNodes(nodes.map(n => {
                                          if (n.id === selectedNode) {
                                            return { ...n, vlanMap: { ...n.vlanMap, [otherId]: val } };
                                          }
                                          return n;
                                        }));
                                      }}
                                    >
                                      <SelectTrigger className="h-6 text-xs w-24">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {nodes.find(n => n.id === selectedNode)?.vlans?.map(v => (
                                          <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase font-bold">Interfaces</p>
                      <div className="space-y-2">
                        {nodes.find(n => n.id === selectedNode)?.interfaces.map(iface => {
                          const connectedLink = links.find(l =>
                            (l.fromDeviceId === selectedNode && l.fromInterfaceId === iface.id) ||
                            (l.toDeviceId === selectedNode && l.toInterfaceId === iface.id)
                          );

                          let peerInfo = null;
                          if (connectedLink) {
                            const peerId = connectedLink.fromDeviceId === selectedNode ? connectedLink.toDeviceId : connectedLink.fromDeviceId;
                            const peerIfaceId = connectedLink.fromDeviceId === selectedNode ? connectedLink.toInterfaceId : connectedLink.fromInterfaceId;
                            const peerNode = nodes.find(n => n.id === peerId);
                            peerInfo = { name: peerNode?.name, interface: peerIfaceId };
                          }

                          return (
                            <div key={iface.id} className="flex flex-col p-2 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center space-x-2">
                                  <div className={cn("w-2 h-2 rounded-full", iface.isConnected ? "bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" : "bg-slate-400")} />
                                  <span className="text-xs font-bold uppercase">{iface.id}</span>
                                </div>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-[10px] font-mono opacity-50 cursor-help">{iface.mac}</span>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-slate-900/95 text-white border-slate-700/50 backdrop-blur-md shadow-2xl p-2 min-w-[120px]" side="top">MAC: {iface.mac}</TooltipContent>
                                </Tooltip>
                              </div>
                              <div className="flex justify-between items-center">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-xs text-muted-foreground italic truncate mr-2 cursor-help max-w-[140px]">
                                      {peerInfo ? (
                                        <>Connected to <span className="text-blue-500 font-bold not-italic">{peerInfo.name}</span> <span className="opacity-70">({peerInfo.interface})</span></>
                                      ) : 'Disconnected'}
                                    </span>
                                  </TooltipTrigger>
                                  {peerInfo && (
                                    <TooltipContent className="bg-slate-900/95 text-white border-slate-700/50 backdrop-blur-md shadow-2xl p-2 min-w-[120px]" side="bottom">
                                      Connected to {peerInfo.name} on remote interface {peerInfo.interface}
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                                <div className="flex flex-col items-end shrink-0">
                                  <span className="text-xs font-mono text-blue-500 font-bold">
                                    {dhcpStatus[selectedNode!] === 'bound' ? (detectedNetworks.interfaceIps[`${selectedNode}-${iface.id}`] || 'no ip') : (dhcpStatus[selectedNode!] === 'discovering' ? 'DHCP...' : 'no ip')}
                                  </span>
                                  {(nodes.find(n => n.id === selectedNode)?.type === DeviceType.PC || nodes.find(n => n.id === selectedNode)?.type === DeviceType.SERVER) &&
                                    links.some(l => (l.fromDeviceId === selectedNode && l.fromInterfaceId === iface.id) || (l.toDeviceId === selectedNode && l.toInterfaceId === iface.id)) && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-3 text-[10px] px-1 text-blue-400 hover:text-blue-300 p-0"
                                        onClick={() => handleDhcpDiscovery(selectedNode!)}
                                      >
                                        Renew IP
                                      </Button>
                                    )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
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
              </div>
            </Card>
          )}

          {/* Tool Legend & Guide Modal */}
          {showLegend && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
              <Card className="w-full max-w-2xl max-h-[90%] overflow-hidden flex flex-col shadow-2xl border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95">
                <div className="p-4 border-b flex justify-between items-center bg-blue-600 text-white">
                  <div className="flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    <h2 className="font-bold uppercase tracking-widest text-sm">NetViz Legend & Usage Guide</h2>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/20 text-white" onClick={() => setShowLegend(false)}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                  {/* Basic Usage */}
                  <section className="space-y-3">
                    <h3 className="text-xs font-black uppercase text-blue-500 tracking-wider flex items-center gap-2">
                      <Zap size={14} /> Quick Start Guide
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      <div className="space-y-2">
                        <p><span className="font-bold text-slate-900 dark:text-slate-100">1. Build:</span> Drag devices from the toolbar onto the canvas. Use the <LinkIcon size={12} className="inline" /> Link tool to connect them.</p>
                        <p><span className="font-bold text-slate-900 dark:text-slate-100">2. Configure:</span> Select a device to view its MAC, change VLANs, or manage blocked sources.</p>
                      </div>
                      <div className="space-y-2">
                        <p><span className="font-bold text-slate-900 dark:text-slate-100">3. Simulate:</span> Select a PC/Server and use the "Ping Lab" to test connectivity through your topology.</p>
                        <p><span className="font-bold text-slate-900 dark:text-slate-100">4. Analyze:</span> Watch the packets travel and check the "Network Log" for real-time hop details.</p>
                      </div>
                    </div>
                  </section>

                  {/* Toolbar Icons */}
                  <section className="space-y-4">
                    <h3 className="text-xs font-black uppercase text-blue-500 tracking-wider flex items-center gap-2">
                      <Grid3X3 size={14} /> Toolbar Reference
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><MousePointer2 size={16} /></div>
                        <div>
                          <p className="font-bold text-xs uppercase">Select</p>
                          <p className="text-[10px] text-muted-foreground italic">Move & Edit devices</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600"><LinkIcon size={16} /></div>
                        <div>
                          <p className="font-bold text-xs uppercase">Link</p>
                          <p className="text-[10px] text-muted-foreground italic">Create connections</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-red-500">
                        <div className="w-8 h-8 rounded bg-red-100 dark:bg-red-900/30 flex items-center justify-center"><Trash2 size={16} /></div>
                        <div>
                          <p className="font-bold text-xs uppercase">Delete</p>
                          <p className="text-[10px] text-muted-foreground italic">Remove nodes/links</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><Grid3X3 size={16} /></div>
                        <div>
                          <p className="font-bold text-xs uppercase">Grid</p>
                          <p className="text-[10px] text-muted-foreground italic">Toggle 40px snapping</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-green-600">
                        <div className="w-8 h-8 rounded bg-green-100 dark:bg-green-900/30 flex items-center justify-center"><Play size={16} /></div>
                        <div>
                          <p className="font-bold text-xs uppercase">Broadcast</p>
                          <p className="text-[10px] text-muted-foreground italic">All PCs ping at once</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-slate-500">
                        <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><RotateCcw size={16} /></div>
                        <div>
                          <p className="font-bold text-xs uppercase">Reset</p>
                          <p className="text-[10px] text-muted-foreground italic">Clear entire canvas</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Device Legend */}
                  <section className="space-y-4">
                    <h3 className="text-xs font-black uppercase text-blue-500 tracking-wider flex items-center gap-2">
                      <Layers size={14} /> Network Nodes
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex gap-4 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg border">
                        <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border flex items-center justify-center shadow-sm flex-shrink-0">
                          <Monitor size={20} className="text-slate-600" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-bold text-xs uppercase">PC / Server</p>
                          <p className="text-[10px] text-muted-foreground leading-tight">Endpoints that generate and receive traffic. Used in the Ping Lab.</p>
                        </div>
                      </div>
                      <div className="flex gap-4 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg border">
                        <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border flex items-center justify-center shadow-sm flex-shrink-0">
                          <Layers size={20} className="text-slate-600" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-bold text-xs uppercase">Switch</p>
                          <p className="text-[10px] text-muted-foreground leading-tight">L2 bridge. Supports up to 3 VLANs for logical network isolation.</p>
                        </div>
                      </div>
                      <div className="flex gap-4 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg border">
                        <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border flex items-center justify-center shadow-sm flex-shrink-0">
                          <Network size={20} className="text-slate-600" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-bold text-xs uppercase">Router</p>
                          <p className="text-[10px] text-muted-foreground leading-tight">L3 gateway. Connects different segments and filters by source ID.</p>
                        </div>
                      </div>
                      <div className="flex gap-4 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-red-200/50">
                        <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-red-200 flex items-center justify-center shadow-sm flex-shrink-0">
                          <Shield size={20} className="text-red-500" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-bold text-xs uppercase">Firewall</p>
                          <p className="text-[10px] text-muted-foreground leading-tight">Security boundary. Toggles routing and blocks specific source devices.</p>
                        </div>
                      </div>
                      <div className="flex gap-4 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-orange-200/50">
                        <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-orange-200 flex items-center justify-center shadow-sm flex-shrink-0">
                          <Activity size={20} className="text-orange-500" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-bold text-xs uppercase">IPS / IDS</p>
                          <p className="text-[10px] text-muted-foreground leading-tight">Intrusion system. Transparent in IDS mode; Partitions network in IPS mode.</p>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t flex justify-center">
                  <Button variant="default" size="sm" className="font-bold uppercase text-xs px-8" onClick={() => setShowLegend(false)}>
                    Got it!
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const NetworkVisualizer: React.FC = () => {
  return (
    <TooltipProvider delayDuration={300}>
      <NetworkVisualizerContent />
    </TooltipProvider>
  );
};
