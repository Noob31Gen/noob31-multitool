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

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  x: number;
  y: number;
  interfaces: NetworkInterface[];
  // Logic state
  macTable?: Record<string, string>; // For Switches: MAC -> InterfaceID
  routingTable?: Record<string, string>; // For Routers: Destination -> NextHop
  arpCache: Record<string, string>; // IP -> MAC
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
}

export const PacketType = {
  ICMP: 'ICMP', // Ping
  ARP: 'ARP',
  TCP: 'TCP',
  UDP: 'UDP',
} as const;

export type PacketType = typeof PacketType[keyof typeof PacketType];

export interface Packet {
  id: string;
  type: PacketType;
  sourceIp: string;
  destIp: string;
  sourceMac: string;
  destMac: string;
  payload: Record<string, unknown> | string | number | boolean | null;
  ttl: number;
  history: string[]; // List of device IDs this packet has visited
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
