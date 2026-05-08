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

export const NetworkVisualizer: React.FC = () => {
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
        logEvent("CLOUD COMPUTING DISCOVERED!", "success");
        setCloudText({ x: avgX, y: avgY });
        setTimeout(() => {
          animate('#cloud-discovery-text', {
            opacity: [0, 1, 0],
            duration: 2500,
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
  }, [nodes, links, cloudText]);

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
              
              setIspText({ x: avgX, y: avgY });
              logEvent("ISP DISCOVERED!", "success");
              setTimeout(() => {
                animate('#isp-discovery-text', {
                  opacity: [0, 1, 0],
                  duration: 2500,
                  easing: 'easeInOutQuad'
                });
              }, 100);
              setTimeout(() => setIspText(null), 3000);
              return;
            }
          }
        }
      }
    }
  }, [nodes, links, ispText]);

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

  const showDropAnimation = useCallback((nodeId: string, type: 'firewall' | 'routing' = 'firewall') => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !overNodeLayerRef.current) return;

    const isIds = node.type === DeviceType.IPS_IDS && node.ipsMode === 'IDS';
    const isRouting = type === 'routing';
    const symbol = isIds ? "!" : (isRouting ? "?" : "×");
    const color = isIds ? "#f59e0b" : (isRouting ? "#a855f7" : "#ef4444"); // Purple for routing

    const mark = document.createElementNS("http://www.w3.org/2000/svg", "text");
    mark.textContent = symbol;
    mark.setAttribute("x", node.x.toString());
    mark.setAttribute("y", node.y.toString());
    mark.setAttribute("text-anchor", "middle");
    mark.setAttribute("font-size", isIds ? "32" : "40");
    mark.setAttribute("fill", color);
    mark.setAttribute("font-weight", "bold");
    mark.setAttribute("filter", `drop-shadow(0 0 8px ${color})`);
    mark.setAttribute("style", "pointer-events: none;");
    overNodeLayerRef.current.appendChild(mark);

    animate(mark, {
      opacity: [0, 1, 1, 0],
      duration: 1000,
      easing: 'linear',
      onComplete: () => mark.remove()
    });

    if (isRouting) {
      logEvent(`ROUTING ERROR at ${node.name}: Dest Network Unknown`, 'error');
    } else {
      logEvent(`${isIds ? 'IDS ALERT' : 'Packet DROPPED'} at ${node.name}`, isIds ? 'info' : 'error');
    }
  }, [nodes, logEvent]);

  const findPath = useCallback((startId: string, endId: string, destIp?: string): { path: string[], failureId?: string, failureType?: 'firewall' | 'routing' } | null => {
    return engine.findPath(startId, endId, {
      foundNetworks: detectedNetworks.foundNetworks,
      destIp,
      onDropAnimation: (nodeId, type) => showDropAnimation(nodeId, type)
    });
  }, [engine, detectedNetworks, showDropAnimation]);

  const animatePacket = useCallback((path: string[], color: string = '#fbbf24', callback?: () => void, failureId?: string, failureType?: 'firewall' | 'routing') => {
    const startAnimation = (p: string[], c: string, cb?: () => void, fId?: string, fType?: 'firewall' | 'routing') => {
      if (p.length < 2 || !underNodeLayerRef.current) return;

      const createArrow = (arrowColor: string) => {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        const arrow = document.createElementNS("http://www.w3.org/2000/svg", "path");
        arrow.setAttribute("d", "M -6,-4 L 6,0 L -6,4 Z");
        arrow.setAttribute("fill", arrowColor);
        arrow.setAttribute("filter", `drop-shadow(0 0 3px ${arrowColor})`);
        g.appendChild(arrow);
        return g;
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
        const packet = createArrow(c);
        underNodeLayerRef.current!.appendChild(packet);

        const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x) * 180 / Math.PI;

        animate(packet, {
          translateX: [fromNode.x, toNode.x],
          translateY: [fromNode.y, toNode.y],
          rotate: [angle, angle],
          opacity: [0, 1, 1, 0],
          scale: [0.5, 1.2, 1.2, 0.5],
          duration: 600,
          easing: 'easeInOutQuad',
          onComplete: () => {
            packet.remove();
            if (isLastStepAndFailed) {
              showDropAnimation(toNode.id, fType);
              if (fType === 'routing') {
                setTimeout(() => {
                  startAnimation([...p].reverse(), '#a855f7', () => {
                    logEvent(`Routing Error message received at source`, 'error');
                  });
                }, 300);
              }
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
  }, [nodes, showDropAnimation, logEvent]);

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

    targets.forEach(targetId => handlePing(sourceId, targetId));
    logEvent(`Broadcast: ${nodes.find(n => n.id === sourceId)?.name} -> ${segment.name} (${targets.length} targets)`, 'success');
  };

  const handleArpDiscovery = useCallback((sourceId: string, callback: () => void) => {
    const sourceNode = nodes.find(n => n.id === sourceId);
    if (!sourceNode) {
      callback();
      return;
    }

    const results = engine.simulateArpDiscovery(sourceId, detectedNetworks.foundNetworks);
    if (results.length === 0) {
      setTimeout(callback, 500);
      return;
    }

    const segment = detectedNetworks.foundNetworks.find(net => net.devices.includes(sourceId));
    logEvent(`[ARP] Discovery: ${sourceNode.name} broadcasting to ${segment?.name || 'segment'}`, 'info');

    results.forEach((result, idx) => {
      const targetId = result.path[result.path.length - 1];
      // Step 1: ARP Request (Broadcast) - Cyan
      setTimeout(() => {
        animatePacket(result.path, '#22d3ee', () => {
          const targetNode = nodes.find(n => n.id === targetId);
          if (targetNode) {
            // Step 2: ARP Reply (Unicast) - Teal
            animatePacket([...result.path].reverse(), '#2dd4bf', () => {
              const targetIp = Object.entries(detectedNetworks.interfaceIps)
                .find(([key]) => key.startsWith(`${targetId}-`))?.[1] || '?.?.?.?';

              setNodes(prev => prev.map(n => {
                if (n.id === sourceId) {
                  return { ...n, arpCache: { ...n.arpCache, [targetIp]: targetNode.interfaces[0].mac } };
                }
                return n;
              }));
              logEvent(`[ARP] Reply from ${targetNode.name}: I am at ${targetIp}`, 'success');
            });
          }
        });
      }, idx * 100);
    });

    // Proceed to ping after discovery phase
    setTimeout(callback, 2000 + (results.length * 50));
  }, [nodes, engine, detectedNetworks, logEvent, animatePacket]);

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
    handleArpDiscovery(sourceId, () => {
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

  const highlightDevices = (deviceIds: string[]) => {
    // Legacy highlight removed in favor of Sonar Pulse SVG effect
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
              <Button variant="outline" size="sm" className="h-8 text-[10px] uppercase font-bold" onClick={() => addNode(DeviceType.PC)} title="Add PC">
                <Monitor className="w-3 h-3 mr-1" /> PC
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-[10px] uppercase font-bold" onClick={() => addNode(DeviceType.SERVER)} title="Add Server">
                <HardDrive className="w-3 h-3 mr-1" /> Server
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-[10px] uppercase font-bold" onClick={() => addNode(DeviceType.SWITCH)} title="Add Switch">
                <Layers className="w-3 h-3 mr-1" /> Switch
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-[10px] uppercase font-bold" onClick={() => addNode(DeviceType.ROUTER)} title="Add Router">
                <Network className="w-3 h-3 mr-1" /> Router
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-[10px] uppercase font-bold" onClick={() => addNode(DeviceType.FIREWALL)} title="Add Firewall">
                <Shield className="w-3 h-3 mr-1 text-red-500" /> Firewall
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-[10px] uppercase font-bold" onClick={() => addNode(DeviceType.IPS_IDS)} title="Add IPS/IDS">
                <Activity className="w-3 h-3 mr-1 text-orange-500" /> IPS/IDS
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
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

            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                className="h-8 text-[10px] font-bold uppercase bg-green-600 hover:bg-green-700"
                onClick={() => {
                  // Trigger a segment-aware broadcast from all endpoints (PCs/Servers)
                  nodes.filter(n => n.type === DeviceType.PC || n.type === DeviceType.SERVER).forEach(dev => handleBroadcast(dev.id));
                }}
              >
                <Play className="w-4 h-4 mr-1" /> Broadcast
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs font-bold uppercase" onClick={clearCanvas}>
                <RotateCcw className="w-4 h-4 mr-1" /> Reset
              </Button>
              <Button
                variant="outline"
                size="icon"
                className={cn("h-8 w-8 ml-2", showLegend ? "bg-blue-500 text-white" : "")}
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
                      "transition-all duration-300 pointer-events-none",
                      !isBlocked && "group-hover:stroke-blue-400"
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
                onClick={(e) => handleNodeClick(e, node.id)}
                className="group"
              >
                {/* Root Bridge Indicator */}
                {/* STP Root Bridge - Energy Field Effect */}
                {node.isRootBridge && (
                  <g className="pointer-events-none">
                    <circle
                      r="36"
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="1.5"
                      strokeDasharray="10 5"
                      className="animate-[spin_15s_linear_infinite] opacity-80"
                    />
                    <circle
                      r="32"
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="1"
                      strokeDasharray="4 2"
                      className="animate-spin-reverse opacity-60"
                      style={{ animationDuration: '8s' }}
                    />
                    <circle
                      r="30"
                      fill="#fbbf24"
                      className="opacity-20 blur-md animate-pulse"
                    />
                  </g>
                )}

                {/* Network Selection - Sonar Pulse Effect */}
                {selectedNetworkId && detectedNetworks.foundNetworks.find(net => net.id === selectedNetworkId)?.devices.includes(node.id) && (
                  <g className="pointer-events-none">
                    <circle
                      r="42"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      className="animate-ping opacity-20"
                      style={{ animationDuration: '2s' }}
                    />
                    <circle
                      r="38"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      strokeDasharray="20 40"
                      className="animate-[spin_3s_linear_infinite] opacity-60"
                    />
                    <circle
                      r="35"
                      fill="#3b82f6"
                      className="opacity-15 animate-pulse blur-sm"
                    />
                  </g>
                )}
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
                className="text-xl font-black fill-white uppercase tracking-tighter pointer-events-none"
                style={{ 
                  opacity: 0,
                  filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.8))'
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
                className="text-xl font-black fill-white uppercase tracking-tighter pointer-events-none"
                style={{ 
                  opacity: 0,
                  filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.8))'
                }}
              >
                ISP Discovered
              </text>
            )}

            {/* Over-Node Layer (Drop marks/Alerts) */}
            <g ref={overNodeLayerRef} />
          </svg>

          {/* Bottom Left UI Stack */}
          <div className="absolute bottom-4 left-4 flex flex-col gap-2 pointer-events-none">
            {/* Help Text */}
            <div className="self-start text-xs text-muted-foreground bg-white/50 dark:bg-black/20 p-2 rounded backdrop-blur-sm">
              {mode === 'select' ? "DRAG TO MOVE • CLICK TO SELECT" : "CLICK TWO DEVICES TO CONNECT • ESC TO CANCEL"}
            </div>

            {/* Dynamic Network Browser */}
            <div className="flex items-end gap-3 pointer-events-auto">
              {/* Networks Box */}
              <div className="w-56 max-h-48 flex flex-col bg-slate-900/90 text-xs text-slate-300 rounded-lg border border-slate-700 shadow-2xl backdrop-blur-md overflow-hidden">
                <div className="flex items-center justify-between p-2 border-b border-slate-700 bg-slate-800/50">
                  <div className="flex items-center gap-2">
                    <Zap className="w-3 h-3 text-blue-400" />
                    <span className="font-bold uppercase tracking-wider text-[10px] text-blue-400">Network Segments</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-4 w-4 text-slate-400 hover:text-white"
                    onClick={() => setIsNetworksCollapsed(!isNetworksCollapsed)}
                  >
                    {isNetworksCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                  </Button>
                </div>
                
                {!isNetworksCollapsed && (
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-1 space-y-1">
                    {detectedNetworks.foundNetworks.length === 0 ? (
                      <div className="p-4 text-center text-slate-500 italic py-8">
                        No active segments detected. Connect devices to start.
                      </div>
                    ) : (
                      detectedNetworks.foundNetworks.map(net => (
                        <div
                          key={net.id}
                          className={cn(
                            "group relative p-2 rounded border border-transparent transition-all cursor-pointer",
                            selectedNetworkId === net.id 
                              ? "bg-blue-600/20 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.1)]" 
                              : "hover:bg-slate-800/50 hover:border-slate-700"
                          )}
                          onClick={() => {
                            setSelectedNetworkId(selectedNetworkId === net.id ? null : net.id);
                            highlightDevices(net.devices);
                          }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs text-slate-200 group-hover:text-blue-400 transition-colors">{net.name}</span>
                            <span className="text-[10px] font-mono text-blue-400/70">{net.subnet}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex -space-x-1">
                              {net.devices.slice(0, 4).map(devId => (
                                <div key={devId} className="w-4 h-4 rounded-full bg-slate-700 border border-slate-900 flex items-center justify-center">
                                  <Monitor className="w-2 h-2 text-slate-400" />
                                </div>
                              ))}
                              {net.devices.length > 4 && (
                                <div className="w-4 h-4 rounded-full bg-slate-800 border border-slate-900 flex items-center justify-center text-[8px] text-slate-500">
                                  +{net.devices.length - 4}
                                </div>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 italic">{net.devices.length} devices</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {selectedNetworkId && (
                <div className={cn(
                  "w-56 flex flex-col bg-slate-900/90 text-xs text-slate-300 p-2 rounded-lg border border-slate-700 shadow-2xl backdrop-blur-md animate-in slide-in-from-left-2 duration-200",
                  isNetworksCollapsed ? "h-fit" : "max-h-48"
                )}>
                  <div className="flex items-center justify-between border-b border-slate-700 pb-1 text-blue-400 font-bold uppercase tracking-wider mb-1">
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">Devices in {detectedNetworks.foundNetworks.find(n => n.id === selectedNetworkId)?.name}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-4 w-4 hover:bg-white/10" onClick={() => setSelectedNetworkId(null)}>
                      <Trash2 size={12} className="text-slate-500" />
                    </Button>
                  </div>
                  {!isNetworksCollapsed && (
                    <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar mt-1">
                      {detectedNetworks.foundNetworks.find(n => n.id === selectedNetworkId)?.devices.map(devId => {
                        const node = nodes.find(n => n.id === devId);
                        if (!node) return null;

                        const ifaceIps = Object.entries(detectedNetworks.interfaceIps)
                          .filter(([key]) => key.startsWith(`${devId}-`))
                          .map(([, ip]) => ip);

                        return (
                          <button
                            key={devId}
                            className="w-full p-1.5 rounded bg-white/5 flex items-center justify-between group hover:bg-white/10 transition-colors text-left"
                            onClick={() => highlightDevices([devId])}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-slate-400 shrink-0">
                                {node.type === DeviceType.PC ? <Monitor size={10} /> :
                                  node.type === DeviceType.SWITCH ? <Layers size={10} /> :
                                    node.type === DeviceType.ROUTER ? <Network size={10} /> :
                                      node.type === DeviceType.SERVER ? <HardDrive size={10} /> :
                                        <Shield size={10} className="text-red-500" />}
                              </span>
                              <div className="flex flex-col min-w-0">
                                <span className="truncate">{node.name}</span>
                                {ifaceIps.length > 0 && (
                                  <span className="text-[10px] font-mono text-blue-400 truncate">
                                    {ifaceIps.join(', ')}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] font-mono text-slate-500 ml-1 shrink-0">{node.interfaces[0].mac.slice(-4)}</span>
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
            <Card className="absolute top-4 right-4 w-64 max-h-[calc(100%-2rem)] flex flex-col p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-right-4 duration-200 overflow-hidden">
              <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <h3 className="font-bold text-sm uppercase tracking-widest text-blue-500">
                  {selectedNode ? 'Device Settings' : 'Link Settings'}
                </h3>
                <div className="flex space-x-1">
                  {selectedNode && (nodes.find(n => n.id === selectedNode)?.type === DeviceType.PC || nodes.find(n => n.id === selectedNode)?.type === DeviceType.SERVER || nodes.find(n => n.id === selectedNode)?.type === DeviceType.ROUTER || nodes.find(n => n.id === selectedNode)?.type === DeviceType.FIREWALL) && (
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
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setSelectedNode(null); setSelectedLink(null); }}>
                    <X className="w-4 h-4 text-slate-400" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">

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
                        <p className="text-sm font-mono">{nodes.find(n => n.id === selectedNode)?.name}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-xs text-muted-foreground uppercase font-bold">Ports</p>
                        <p className="text-xs font-mono">
                          {links.filter(l => l.fromDeviceId === selectedNode || l.toDeviceId === selectedNode).length} / {nodes.find(n => n.id === selectedNode)?.portLimit}
                        </p>
                      </div>
                    </div>

                    {/* Network Context */}
                    <div className="p-2 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30 space-y-2">
                      <p className="text-xs text-muted-foreground uppercase font-bold mb-1 opacity-70">Current Networks</p>
                      {(() => {
                        const activeSegments = detectedNetworks.foundNetworks.filter(net => net.devices.includes(selectedNode!));
                        if (activeSegments.length === 0) return (
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Isolated</span>
                            <span className="text-[10px] font-mono opacity-80">No active link</span>
                          </div>
                        );
                        return activeSegments.map(net => (
                          <div key={net.id} className="flex items-center justify-between border-b border-blue-200/20 last:border-0 pb-1 last:pb-0">
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 truncate pr-2">
                              {net.name}
                            </span>
                            <span className="text-[10px] font-mono opacity-80 shrink-0">
                              {net.subnet}
                            </span>
                          </div>
                        ));
                      })()}
                    </div>

                    {/* Routing Knowledge Toggle */}
                    {(nodes.find(n => n.id === selectedNode)?.type === DeviceType.ROUTER || nodes.find(n => n.id === selectedNode)?.type === DeviceType.FIREWALL) && (
                      <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30 space-y-2">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold opacity-70">Routing Knowledge</p>
                        <div className="space-y-1 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                          {detectedNetworks.foundNetworks.map(net => {
                            const node = nodes.find(n => n.id === selectedNode);
                            const isLocal = net.devices.includes(selectedNode!);
                            const isEnabled = node?.enabledRoutes?.includes(net.sig);
                            
                            return (
                              <div key={net.id} className="flex items-center justify-between p-1.5 rounded bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[10px] font-bold truncate">{net.name}</span>
                                  <span className="text-[9px] font-mono opacity-60">{net.subnet}</span>
                                </div>
                                <Button
                                  variant={isEnabled || isLocal ? "default" : "outline"}
                                  size="sm"
                                  className={cn(
                                    "h-5 text-[9px] px-1.5 ml-2",
                                    (isEnabled || isLocal) && "bg-blue-600 hover:bg-blue-700"
                                  )}
                                  disabled={isLocal}
                                  onClick={() => {
                                    const node = nodes.find(n => n.id === selectedNode);
                                    if (node) {
                                      const newEnabled = isEnabled
                                        ? (node.enabledRoutes || []).filter(s => s !== net.sig)
                                        : [...(node.enabledRoutes || []), net.sig];
                                      setNodes(nodes.map(n => n.id === selectedNode ? { ...n, enabledRoutes: newEnabled } : n));
                                      logEvent(`${node.name} ${isEnabled ? 'Ignored' : 'Learned'} ${net.name}`, 'info');
                                    }
                                  }}
                                >
                                  {isLocal ? 'LOCAL' : (isEnabled ? 'KNOWS' : 'IGNORE')}
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Router/Firewall Section */}
                    {(nodes.find(n => n.id === selectedNode)?.type === DeviceType.ROUTER || nodes.find(n => n.id === selectedNode)?.type === DeviceType.FIREWALL) && (
                      <div className="p-3 bg-red-50/50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30 space-y-3">
                        <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                          <Shield className="w-3 h-3" />
                          <span className="text-xs font-bold uppercase tracking-wider">
                            Routing & Security
                          </span>
                        </div>

                        {nodes.find(n => n.id === selectedNode)?.type === DeviceType.FIREWALL && (
                          <div className="flex items-center justify-between p-1 bg-white dark:bg-slate-900 rounded border border-red-100 dark:border-red-900/20">
                            <Label className="text-xs uppercase font-bold">Routing Enabled</Label>
                            <Button
                              variant={nodes.find(n => n.id === selectedNode)?.routingEnabled ? "default" : "outline"}
                              size="sm"
                              className="h-5 text-[10px] px-1.5"
                              onClick={() => {
                                const node = nodes.find(n => n.id === selectedNode);
                                if (node) {
                                  setNodes(nodes.map(n => n.id === selectedNode ? { ...n, routingEnabled: !n.routingEnabled } : n));
                                  logEvent(`Firewall routing ${!node.routingEnabled ? 'ENABLED' : 'DISABLED'}`, 'info');
                                }
                              }}
                            >
                              {nodes.find(n => n.id === selectedNode)?.routingEnabled ? 'ON' : 'OFF'}
                            </Button>
                          </div>
                        )}

                        <div className="space-y-1.5 border-t pt-2">
                          <Label className="text-xs uppercase text-muted-foreground flex justify-between items-center">
                            Routing Knowledge (Auto-Learned)
                            <Network size={12} />
                          </Label>
                          
                          <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                            {detectedNetworks.foundNetworks.map(net => {
                              const node = nodes.find(n => n.id === selectedNode);
                              const isIgnored = node?.disabledRoutes?.includes(net.sig);
                              const isDirectlyConnected = net.devices.includes(selectedNode!);

                              return (
                                <div key={net.id} className={cn(
                                  "flex items-center justify-between p-1 rounded border",
                                  isDirectlyConnected 
                                    ? "bg-blue-100/30 border-blue-200/50 dark:bg-blue-900/10 dark:border-blue-800" 
                                    : "hover:bg-white dark:hover:bg-slate-900 border-transparent"
                                )}>
                                  <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs font-bold truncate">{net.name}</span>
                                      {isDirectlyConnected && <span className="text-[8px] bg-blue-500 text-white px-0.5 rounded">DIRECT</span>}
                                    </div>
                                    <span className="text-[10px] font-mono opacity-60 truncate">{net.subnet}</span>
                                  </div>
                                  <Button
                                    variant={isIgnored ? "outline" : "default"}
                                    size="sm"
                                    className={cn("h-5 text-[10px] px-1.5", !isIgnored ? "bg-green-600 hover:bg-green-700" : "text-red-500 border-red-500/50")}
                                    onClick={() => {
                                      if (node) {
                                        const newDisabled = isIgnored
                                          ? (node.disabledRoutes || []).filter(sig => sig !== net.sig)
                                          : [...(node.disabledRoutes || []), net.sig];
                                        setNodes(nodes.map(n => n.id === selectedNode ? { ...n, disabledRoutes: newDisabled } : n));
                                        logEvent(`${node.name}: ${isIgnored ? 'Learned' : 'Ignoring'} ${net.subnet}`, 'info');
                                      }
                                    }}
                                  >
                                    {!isIgnored ? 'KNOWS' : 'IGNORE'}
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-[10px] text-muted-foreground italic leading-tight pt-1">
                            Routers automatically learn all connected and remote segments. You can manually tell them to IGNORE specific paths.
                          </p>
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
                                    className={cn("h-5 text-[10px] px-1.5", isBlocked ? "bg-red-600 hover:bg-red-700" : "")}
                                    onClick={() => {
                                      if (node) {
                                        const newBlocked = isBlocked
                                          ? (node.blockedNetworks || []).filter(sig => sig !== net.sig)
                                          : [...(node.blockedNetworks || []), net.sig];
                                        setNodes(nodes.map(n => n.id === selectedNode ? { ...n, blockedNetworks: newBlocked } : n));
                                        logEvent(`${node.name} ACL: ${net.name} ${isBlocked ? 'ALLOWED' : 'BLOCKED'}`, isBlocked ? 'info' : 'error');
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

                        <div className="space-y-1.5 border-t pt-2">
                          <Label className="text-xs uppercase text-muted-foreground">ACL: Block Individual Device</Label>
                          <div className="max-h-24 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                            {nodes
                              .filter(n => n.id !== selectedNode && (n.type === DeviceType.PC || n.type === DeviceType.SERVER))
                              .map(target => {
                                const isBlocked = nodes.find(n => n.id === selectedNode)?.blockedNetworks?.includes(target.id);
                                return (
                                  <div key={target.id} className="flex items-center justify-between p-1 hover:bg-white dark:hover:bg-slate-900 rounded">
                                    <span className="text-xs font-mono">{target.name}</span>
                                    <Button
                                      variant={isBlocked ? "destructive" : "outline"}
                                      size="sm"
                                      className="h-5 text-[10px] px-1.5"
                                      onClick={() => {
                                        const node = nodes.find(n => n.id === selectedNode);
                                        if (node) {
                                          const newBlocked = isBlocked
                                            ? node.blockedNetworks!.filter(id => id !== target.id)
                                            : [...node.blockedNetworks!, target.id];
                                          setNodes(nodes.map(n => n.id === selectedNode ? { ...n, blockedNetworks: newBlocked } : n));
                                          logEvent(`${node.name} ACL: ${target.name} ${isBlocked ? 'ALLOWED' : 'BLOCKED'}`, isBlocked ? 'info' : 'error');
                                        }
                                      }}
                                    >
                                      {isBlocked ? 'Blocked' : 'Allowed'}
                                    </Button>
                                  </div>
                                );
                              })
                            }
                          </div>
                        </div>
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
                          <div className="space-y-1.5 pt-2 border-t border-orange-100 dark:border-orange-900/20">
                            <Label className="text-xs uppercase text-muted-foreground">Block Traffic From (Source)</Label>
                            <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                              {nodes
                                .filter(n => n.id !== selectedNode && (n.type === DeviceType.PC || n.type === DeviceType.SERVER))
                                .map(target => {
                                  const isBlocked = nodes.find(n => n.id === selectedNode)?.blockedNetworks?.includes(target.id);
                                  return (
                                    <div key={target.id} className="flex items-center justify-between p-1 hover:bg-white dark:hover:bg-slate-900 rounded">
                                      <span className="text-xs font-mono">{target.name}</span>
                                      <Button
                                        variant={isBlocked ? "destructive" : "outline"}
                                        size="sm"
                                        className="h-5 text-[10px] px-1.5"
                                        onClick={() => {
                                          const node = nodes.find(n => n.id === selectedNode);
                                          if (node) {
                                            const newBlocked = isBlocked
                                              ? node.blockedNetworks!.filter(id => id !== target.id)
                                              : [...node.blockedNetworks!, target.id];
                                            setNodes(nodes.map(n => n.id === selectedNode ? { ...n, blockedNetworks: newBlocked } : n));
                                          }
                                        }}
                                      >
                                        {isBlocked ? 'Blocked' : 'Allowed'}
                                      </Button>
                                    </div>
                                  );
                                })
                              }
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
                        <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400">
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
                                <span className="text-[10px] font-mono opacity-50">{iface.mac}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground italic truncate mr-2">
                                  {peerInfo ? (
                                    <>Connected to <span className="text-blue-500 font-bold not-italic">{peerInfo.name}</span> <span className="opacity-70">({peerInfo.interface})</span></>
                                  ) : 'Disconnected'}
                                </span>
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
