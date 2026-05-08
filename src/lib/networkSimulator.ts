/**
 * NetViz Core Skeleton Framework
 * Defines the logical structures for devices, packets, and network state.
 */

export const DeviceType = {
  PC: 'PC',
  SWITCH: 'SWITCH',
  ROUTER: 'ROUTER',
  SERVER: 'SERVER',
  FIREWALL: 'FIREWALL',
  CLOUD: 'CLOUD',
  IPS_IDS: 'IPS_IDS',
} as const;

export type DeviceType = typeof DeviceType[keyof typeof DeviceType];

export interface NetworkInterface {
  id: string;
  ip?: string;
  mac: string;
  subnetMask?: string;
  gateway?: string;
  isConnected: boolean;
}

export interface Route {
  network: string; // CIDR format: "192.168.1.0/24"
  interfaceId?: string;
  nextHop?: string;
  metric: number;
}

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  x: number;
  y: number;
  interfaces: NetworkInterface[];
  // Logic state
  macTable?: Record<string, string>; // For Switches: MAC -> InterfaceID
  routingTable?: Route[]; // For Routers: Destination -> NextHop
  arpCache: Record<string, string>; // IP -> MAC
  // New configuration properties
  vlan?: string; // Current VLAN ID (for PC/Server)
  vlans?: string[]; // Defined VLANs (for Switches, max 3)
  vlanMap?: Record<string, string>; // Port/DeviceId -> VLAN ID
  blockedNetworks?: string[]; // For Firewalls/Routers
  routingEnabled?: boolean; // For Firewalls: Toggle routing capabilities
  ipsMode?: 'IPS' | 'IDS'; // For IPS/IDS devices
  portLimit: number; // Max connections
  disabledRoutes?: string[]; // For Routers/Firewalls: list of network signatures to block
  enabledRoutes?: string[]; // For Routers/Firewalls: list of remote network signatures explicitly enabled
  stpPriority?: number; // DEPRECATED
  isManualRoot?: boolean; // For Switches: User-defined root bridge
  isRootBridge?: boolean; // For Switches: Calculated state
  isCloud?: boolean; // Easter Egg: Combined server cluster
  dhcpEnabled?: boolean; // For Servers: Can act as DHCP server
}

/**
 * IP utility functions for routing logic
 */
export const ipToNum = (ip: string): number => {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
};

export const isIpInSubnet = (ip: string, subnetCidr: string): boolean => {
  const [subnet, mask] = subnetCidr.split('/');
  const maskBits = parseInt(mask, 10);
  const ipNum = ipToNum(ip);
  const subnetNum = ipToNum(subnet);
  const maskNum = (0xffffffff << (32 - maskBits)) >>> 0;
  return (ipNum & maskNum) === (subnetNum & maskNum);
};

export interface NetworkSegment {
  id: string;
  name: string;
  devices: string[];
  subnet: string;
  sig: string;
}

export interface Link {
  id: string;
  fromDeviceId: string;
  fromInterfaceId: string;
  toDeviceId: string;
  toInterfaceId: string;
  bandwidth: number; // in Mbps
  latency: number; // in ms
  status: 'up' | 'down';
  stpState?: 'forwarding' | 'blocking';
}

export const PacketType = {
  ICMP: 'icmp',
  TCP: 'tcp',
  UDP: 'udp',
  ARP: 'arp',
  DHCP: 'dhcp'
};

export interface Packet {
  id: string;
  type: string;
  sourceMac: string;
  destMac: string;
  sourceIp: string;
  destIp: string;
  ttl: number;
  history: string[];
  payload?: Record<string, unknown>;
}

/**
 * Base Logic for a Network Node
 */
export class NetworkNode {
  device: Device;
  
  constructor(device: Device) {
    this.device = device;
  }

  /**
   * Handle an incoming packet.
   * Returns the next action (e.g., forward, drop, respond).
   */
  onReceive(packet: Packet): { action: 'forward' | 'drop' | 'respond' | 'broadcast', target?: string } {
    // Check if packet is for us
    const isTarget = this.device.interfaces.some(i => i.mac === packet.destMac || packet.destMac === 'FF:FF:FF:FF:FF:FF');

    if (!isTarget) {
      return { action: 'drop' };
    }

    // Basic logic based on device type
    switch (this.device.type) {
      case DeviceType.SWITCH:
        return this.handleSwitchLogic(packet);
      case DeviceType.ROUTER:
        return this.handleRouterLogic(packet);
      default:
        return { action: 'respond' };
    }
  }

  private handleSwitchLogic(packet: Packet): { action: 'forward' | 'broadcast' | 'drop', target?: string } {
    // Learn MAC
    if (this.device.macTable) {
      this.device.macTable[packet.sourceMac] = packet.history[packet.history.length - 1];
    }
    
    // Forward or Broadcast
    if (packet.destMac === 'FF:FF:FF:FF:FF:FF') {
      return { action: 'broadcast' };
    }
    
    const targetInterface = this.device.macTable?.[packet.destMac];
    return targetInterface ? { action: 'forward', target: targetInterface } : { action: 'broadcast' };
  }

  private handleRouterLogic(packet: Packet): { action: 'forward' | 'drop' } {
    // Decrement TTL
    if (packet.ttl <= 0) return { action: 'drop' };
    
    // Check routing table
    // ... logic for IP routing
    return { action: 'forward' };
  }
}

/**
 * Handles topology-wide simulation logic, pathfinding, and validation.
 */
export class SimulationEngine {
  nodes: Device[];
  links: Link[];

  constructor(nodes: Device[], links: Link[]) {
    this.nodes = nodes;
    this.links = links;
  }

  /**
   * Finds a path between two devices and validates it against logical constraints.
   */
  findPath(startId: string, endId: string, options: { 
    foundNetworks: NetworkSegment[], 
    destIp?: string,
    isReply?: boolean,
    onDropAnimation?: (nodeId: string, type?: 'firewall' | 'routing' | 'silent') => void 
  }): { path: string[], failureId?: string, failureType?: 'firewall' | 'routing' | 'silent' } | null {
    const queue: [string, string[]][] = [[startId, [startId]]];
    const visited = new Set([startId]);

    const startNet = options.foundNetworks.find(net => net.devices.includes(startId));
    const destNet = options.foundNetworks.find(net => net.devices.includes(endId));
    const destIp = options.destIp;

    while (queue.length > 0) {
      const [currentId, path] = queue.shift()!;
      if (currentId === endId) {
        // Physical path found, check for logic blocks
        for (let i = 0; i < path.length - 1; i++) {
          const node = this.nodes.find(n => n.id === path[i]);
          const nextNode = this.nodes.find(n => n.id === path[i + 1]);
          if (!node || !nextNode) continue;

          // VLAN isolation check
          if (node.type === DeviceType.SWITCH) {
            const prevId = i > 0 ? path[i - 1] : null;
            if (prevId) {
              const vlanIn = node.vlanMap?.[prevId] || 'VLAN 1';
              const vlanOut = node.vlanMap?.[nextNode.id] || 'VLAN 1';
              if (vlanIn !== vlanOut) {
                return { path: path.slice(0, i + 1), failureId: node.id, failureType: 'silent' };
              }
            }
          }

          // Firewall / Router / IPS blocking check
          if (nextNode.type === DeviceType.FIREWALL || nextNode.type === DeviceType.ROUTER || nextNode.type === DeviceType.IPS_IDS) {
            const isIntermediate = i + 1 < path.length - 1;

            if (isIntermediate) {
              // IPS/IDS specific logic
              if (nextNode.type === DeviceType.IPS_IDS) {
                if (nextNode.ipsMode === 'IDS') {
                  options.onDropAnimation?.(nextNode.id);
                } else if (nextNode.ipsMode === 'IPS') {
                  if (nextNode.blockedNetworks?.some(b => b === startId || b === endId || (startNet && b === startNet.sig) || (destNet && b === destNet.sig))) {
                    return { path: path.slice(0, i + 2), failureId: nextNode.id, failureType: 'firewall' };
                  }
                }
              }

              // Layer 3 (Routing) Logic & Security ACLs
              if (nextNode.type === DeviceType.FIREWALL || nextNode.type === DeviceType.ROUTER) {
                // Check ACL (Blocked Networks/Devices) - Independent of routing state
                // Stateful check: bypass ACLs for replies
                if (!options.isReply) {
                  if (nextNode.blockedNetworks?.some(b => b === startId || b === endId || (startNet && b === startNet.sig) || (destNet && b === destNet.sig))) {
                    return { path: path.slice(0, i + 2), failureId: nextNode.id, failureType: 'firewall' };
                  }
                }

                if (nextNode.type === DeviceType.FIREWALL && nextNode.routingEnabled === false) {
                   return { path: path.slice(0, i + 2), failureId: nextNode.id, failureType: 'firewall' };
                }

                // Routing Logic (Simplified: All segments reachable unless blocked by ACL)
                if (destIp || destNet) {
                  // In this simulation, routers automatically know all segments.
                  // We rely on the ACL check above to drop traffic if needed.
                  const hasRoute = true;

                  if (!hasRoute) {
                    return { path: path.slice(0, i + 2), failureId: nextNode.id, failureType: 'routing' };
                  }
                }
              }
            }
          }
        }
        return { path };
      }

      const neighbors = this.links
        .filter(l => (l.fromDeviceId === currentId || l.toDeviceId === currentId) && l.stpState !== 'blocking')
        .map(l => l.fromDeviceId === currentId ? l.toDeviceId : l.fromDeviceId);

      for (const neighborId of neighbors) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push([neighborId, [...path, neighborId]]);
        }
      }
    }
    return null;
  }

  /**
   * Simulates ARP discovery for a source device within its segment.
   */
  simulateArpDiscovery(sourceId: string, foundNetworks: NetworkSegment[]): { targetId: string, path: string[] }[] {
    const segment = foundNetworks.find(net => net.devices.includes(sourceId));
    if (!segment) return [];

    const results: { targetId: string, path: string[] }[] = [];
    const targets = segment.devices.filter(id => id !== sourceId);

    for (const targetId of targets) {
      const result = this.findPath(sourceId, targetId, { foundNetworks });
      if (result && !result.failureId) {
        results.push({ targetId: targetId, path: result.path });
      }
    }
    return results;
  }

  /**
   * Simulates DHCP discovery for a device.
   */
  simulateDhcpDiscovery(deviceId: string, foundNetworks: NetworkSegment[]): { serverId: string, path: string[] } | null {
    const segment = foundNetworks.find(net => net.devices.includes(deviceId));
    if (!segment) return null;

    // Find all potential DHCP servers in the segment
    const potentialServers = segment.devices
      .map(id => this.nodes.find(n => n.id === id)!)
      .filter(n => 
        (n.type === DeviceType.SERVER && n.dhcpEnabled) ||
        n.type === DeviceType.ROUTER ||
        n.type === DeviceType.FIREWALL
      );

    if (potentialServers.length === 0) return null;

    // Priority: Server > Router > Firewall
    // Tie-breaker: Lowest MAC address
    const sortedServers = potentialServers.sort((a, b) => {
      const getPriority = (n: Device) => {
        if (n.type === DeviceType.SERVER) return 1;
        if (n.type === DeviceType.ROUTER) return 2;
        if (n.type === DeviceType.FIREWALL) return 3;
        return 4;
      };

      const pA = getPriority(a);
      const pB = getPriority(b);
      
      if (pA !== pB) return pA - pB;
      return a.interfaces[0].mac.localeCompare(b.interfaces[0].mac);
    });

    for (const server of sortedServers) {
      const result = this.findPath(deviceId, server.id, { foundNetworks });
      if (result && !result.failureId) {
        return { serverId: server.id, path: result.path };
      }
    }
    
    return null;
  }

  private buildAdjacencyList(): Record<string, Link[]> {
    const adj: Record<string, Link[]> = {};
    for (const link of this.links) {
      if (!adj[link.fromDeviceId]) adj[link.fromDeviceId] = [];
      if (!adj[link.toDeviceId]) adj[link.toDeviceId] = [];
      adj[link.fromDeviceId].push(link);
      adj[link.toDeviceId].push(link);
    }
    return adj;
  }

  /**
   * Detects all network segments and assigns IPs deterministically.
   */
  detectNetworks(): { foundNetworks: NetworkSegment[], interfaceIps: Record<string, string> } {
    const visitedLinks = new Set<string>();
    const usedSubnets = new Set<string>();
    const interfaceIps: Record<string, string> = {};
    const foundNetworks: NetworkSegment[] = [];
    const adj = this.buildAdjacencyList();

    const generateSubnet = (hasSwitch: boolean, sig: string, hasDhcpServer: boolean) => {
      if (!hasDhcpServer) {
        let hash = 0;
        for (let i = 0; i < sig.length; i++) {
          hash = ((hash << 5) - hash) + sig.charCodeAt(i);
          hash |= 0;
        }
        return `169.254.${Math.abs(hash) % 256}.0/24`;
      }

      const prefix = hasSwitch ? '192.168' : '10.0';
      let hash = 0;
      for (let i = 0; i < sig.length; i++) {
        hash = ((hash << 5) - hash) + sig.charCodeAt(i);
        hash |= 0;
      }

      let x = Math.abs(hash) % 256;
      let subnet = `${prefix}.${x}.0/24`;
      let salt = 0;
      while (usedSubnets.has(subnet) && salt < 256) {
        salt++;
        x = (Math.abs(hash) + salt) % 256;
        subnet = `${prefix}.${x}.0/24`;
      }
      usedSubnets.add(subnet);
      return subnet;
    };

    const generateIpForMac = (mac: string, subnet: string) => {
      let hash = 0;
      const cleanMac = mac.replace(/[^A-F0-9]/g, '');
      for (let i = 0; i < cleanMac.length; i++) {
        hash = ((hash << 5) - hash) + cleanMac.charCodeAt(i);
        hash |= 0;
      }
      return `${subnet.split('.0/24')[0]}.${2 + (Math.abs(hash) % 250)}`;
    };

    const getVlan = (switchNode: Device, otherDeviceId: string) => {
      return switchNode.vlanMap?.[otherDeviceId] || 'VLAN 1';
    };

    for (const startLink of this.links) {
      if (visitedLinks.has(startLink.id) || startLink.stpState === 'blocking') continue;

      const networkDevices = new Set<string>();
      const queue: { linkId: string, fromId: string, currentId: string }[] = [
        { linkId: startLink.id, fromId: startLink.fromDeviceId, currentId: startLink.toDeviceId },
        { linkId: startLink.id, fromId: startLink.toDeviceId, currentId: startLink.fromDeviceId }
      ];

      networkDevices.add(startLink.fromDeviceId);
      networkDevices.add(startLink.toDeviceId);
      visitedLinks.add(startLink.id);

      while (queue.length > 0) {
        const { currentId, fromId } = queue.shift()!;
        const currentNode = this.nodes.find(n => n.id === currentId);
        if (!currentNode) continue;

        if (currentNode.type === DeviceType.ROUTER || currentNode.type === DeviceType.FIREWALL) {
          continue;
        }

        const neighbors = (adj[currentId] || []).filter(l => !visitedLinks.has(l.id) && l.stpState !== 'blocking');

        for (const nextLink of neighbors) {
          const targetId = nextLink.fromDeviceId === currentId ? nextLink.toDeviceId : nextLink.fromDeviceId;

          if (currentNode.type === DeviceType.SWITCH) {
            if (getVlan(currentNode, fromId) !== getVlan(currentNode, targetId)) continue;
          }

          visitedLinks.add(nextLink.id);
          networkDevices.add(targetId);
          queue.push({ linkId: nextLink.id, fromId: currentId, currentId: targetId });
        }
      }

      if (networkDevices.size > 0) {
        const devices = Array.from(networkDevices);
        const hasSwitch = devices.some(id => this.nodes.find(n => n.id === id)?.type === DeviceType.SWITCH);
        const hasDhcpServer = devices.some(id => {
          const node = this.nodes.find(n => n.id === id);
          return node?.type === DeviceType.ROUTER || node?.type === DeviceType.FIREWALL || (node?.type === DeviceType.SERVER && node.dhcpEnabled);
        });

        const sig = devices.sort().join('|');
        const subnet = generateSubnet(hasSwitch, sig, hasDhcpServer);

        devices.forEach(devId => {
          const node = this.nodes.find(n => n.id === devId);
          if (!node) return;

          const segmentLinks = (adj[devId] || []).filter(l => networkDevices.has(l.fromDeviceId === devId ? l.toDeviceId : l.fromDeviceId));

          segmentLinks.forEach(link => {
            const ifaceId = link.fromDeviceId === devId ? link.fromInterfaceId : link.toInterfaceId;
            const iface = node.interfaces.find(i => i.id === ifaceId);
            if (iface) {
              interfaceIps[`${devId}-${ifaceId}`] = generateIpForMac(iface.mac, subnet);
            }
          });
        });

        foundNetworks.push({
          id: `net-${foundNetworks.length + 1}`,
          name: `Network Segment ${foundNetworks.length + 1}`,
          devices,
          subnet,
          sig
        });
      }
    }

    // Isolated devices
    for (const node of this.nodes) {
      const isConnected = (adj[node.id] || []).some(l => l.stpState !== 'blocking');
      if (!isConnected) {
        const sig = node.id;
        const hasDhcpServer = node.type === DeviceType.ROUTER || node.type === DeviceType.FIREWALL || (node.type === DeviceType.SERVER && node.dhcpEnabled);
        const subnet = generateSubnet(false, sig, hasDhcpServer);
        const iface = node.interfaces[0];
        if (iface) {
          interfaceIps[`${node.id}-${iface.id}`] = generateIpForMac(iface.mac, subnet);
        }
        foundNetworks.push({
          id: `net-iso-${node.id}`,
          name: `Isolated: ${node.name}`,
          devices: [node.id],
          subnet,
          sig
        });
      }
    }

    return { foundNetworks, interfaceIps };
  }

  /**
   * Spanning Tree Protocol (STP) - Simplified implementation for loop prevention.
   * Now segment-aware to handle isolated switch clusters independently.
   */
  runSTP(): { links: Link[], nodes: Device[] } {
    const switches = this.nodes.filter(n => n.type === DeviceType.SWITCH);
    if (switches.length === 0) {
      return { 
        links: this.links.map(l => ({ ...l, stpState: 'forwarding' })), 
        nodes: this.nodes.map(n => ({ ...n, isRootBridge: false }))
      };
    }

    const getDistanceToGateway = (startNodeId: string) => {
      const gateways = this.nodes.filter(n => n.type === DeviceType.ROUTER || n.type === DeviceType.FIREWALL);
      if (gateways.length === 0) return Infinity;

      const queue: [string, number][] = gateways.map(g => [g.id, 0]);
      const visited = new Set(gateways.map(g => g.id));

      while (queue.length > 0) {
        const [currId, dist] = queue.shift()!;
        if (currId === startNodeId) return dist;

        const neighbors = this.links
          .filter(l => l.fromDeviceId === currId || l.toDeviceId === currId)
          .map(l => l.fromDeviceId === currId ? l.toDeviceId : l.fromDeviceId);

        for (const nId of neighbors) {
          if (!visited.has(nId)) {
            visited.add(nId);
            queue.push([nId, dist + 1]);
          }
        }
      }
      return Infinity;
    };

    // 1. Group switches into connected components (isolated Layer 2 clusters)
    const clusters: string[][] = [];
    const clusterVisited = new Set<string>();

    switches.forEach(sw => {
      if (!clusterVisited.has(sw.id)) {
        const cluster: string[] = [];
        const queue = [sw.id];
        clusterVisited.add(sw.id);
        while (queue.length > 0) {
          const currId = queue.shift()!;
          cluster.push(currId);
          this.links.filter(l => l.fromDeviceId === currId || l.toDeviceId === currId).forEach(l => {
            const neighborId = l.fromDeviceId === currId ? l.toDeviceId : l.fromDeviceId;
            const neighbor = this.nodes.find(n => n.id === neighborId);
            if ((neighbor?.type === DeviceType.SWITCH || neighbor?.type === DeviceType.IPS_IDS) && !clusterVisited.has(neighborId)) {
              clusterVisited.add(neighborId);
              queue.push(neighborId);
            }
          });
        }
        clusters.push(cluster);
      }
    });

    const forwardingLinkIds = new Set<string>();
    const rootBridgeIds = new Set<string>();

    // 2. Process each cluster independently
    clusters.forEach(clusterIds => {
      const clusterSwitches = switches.filter(s => clusterIds.includes(s.id));
      
      // Elect Root Bridge for this cluster
      const root = clusterSwitches.sort((a, b) => {
        if (a.isManualRoot && !b.isManualRoot) return -1;
        if (!a.isManualRoot && b.isManualRoot) return 1;
        const distA = getDistanceToGateway(a.id);
        const distB = getDistanceToGateway(b.id);
        if (distA !== distB) return distA - distB;
        return a.interfaces[0].mac.localeCompare(b.interfaces[0].mac);
      })[0];

      rootBridgeIds.add(root.id);

      // BFS to find the spanning tree links within this cluster
      const queue: [string, string[]][] = [[root.id, []]];
      const visited = new Set([root.id]);

      while (queue.length > 0) {
        const [currId, pathLinks] = queue.shift()!;
        pathLinks.forEach(id => forwardingLinkIds.add(id));

        const adjLinks = this.links.filter(l => l.fromDeviceId === currId || l.toDeviceId === currId);
        for (const link of adjLinks) {
          const neighborId = link.fromDeviceId === currId ? link.toDeviceId : link.fromDeviceId;
          if (clusterIds.includes(neighborId) && !visited.has(neighborId)) {
            visited.add(neighborId);
            queue.push([neighborId, [...pathLinks, link.id]]);
          }
        }
      }
    });

    // 3. Links to non-switch devices are always Forwarding
    this.links.forEach(l => {
      const from = this.nodes.find(n => n.id === l.fromDeviceId);
      const to = this.nodes.find(n => n.id === l.toDeviceId);
      if (from?.type !== DeviceType.SWITCH || to?.type !== DeviceType.SWITCH) {
        forwardingLinkIds.add(l.id);
      }
    });

    const updatedNodes = this.nodes.map(n => ({
      ...n,
      isRootBridge: rootBridgeIds.has(n.id)
    }));

    const updatedLinks = this.links.map(l => ({
      ...l,
      stpState: (forwardingLinkIds.has(l.id) ? 'forwarding' : 'blocking') as 'forwarding' | 'blocking'
    }));

    return { links: updatedLinks, nodes: updatedNodes };
  }
}
