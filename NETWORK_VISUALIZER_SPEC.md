# NetViz - Technical Specification & Architectural Overview

This document serves as a "brain dump" for future AI agents and developers to understand, maintain, and expand the Network Visualizer (NetViz) tool.

## 📌 Project Overview
NetViz is a client-side network simulation and visualization tool built for the **Noob31's MultiTools** suite. It allows users to design network topologies, simulate data traffic (pings), and visualize complex networking logic.

---

## 📂 Core Files
- **`src/lib/networkSimulator.ts`**: Foundational types (`Device`, `Link`, `Packet`) supporting PC, Server, Switch, Router, Firewall, and Cloud types.
- **`src/components/tools/NetworkVisualizer.tsx`**: The main UI component. It manages the SVG canvas, user interactions (drag/drop, linking), and the Anime.js-powered animation engine.

---

## ⚙️ Key Systems & Logic

### 1. Topology State
The network is represented as a graph:
- **Nodes**: Array of `Device` objects with coordinates, types, and interfaces.
- **Links**: Array of `Link` objects connecting two Node IDs.
- **Coordinate Mapping**: Uses SVG CTM (Current Transformation Matrix) to map screen coordinates to canvas coordinates, ensuring accurate drag-and-drop and link positioning.

### 2. Pathfinding Engine
- **Algorithm**: Breadth-First Search (BFS).
- **Function**: `findPath(startId, endId)`
- **Logic**: Calculates the shortest topological path (minimum hops) between any two devices. It returns an ordered array of Node IDs or `null` if the destination is unreachable.

### 3. Animation Engine (Anime.js v4)
- **Signature**: Uses the v4 `animate(target, params)` signature.
- **Recursive Forwarding**: The `animatePacket(path, color, callback)` function handles multi-hop travel.
- **Multi-Ping Logic**: `handlePing` uses a loop with staggered `setTimeout` calls (1.5s interval) to queue multiple animations based on user configuration.
- **Visual Feedback**: Nodes pulse when they receive/forward packets. Failed pings trigger a red "unreachable" flash.

### 4. React Purity & Performance
- **Impure Logic**: To satisfy strict React Compiler/Lint rules (e.g., `react-hooks/purity`), all impure logic like `Math.random()` and `Date.now()` (for ID generation and random coordinates) is placed in helper functions **outside** the component body.
- **ID Generation**: Uses a global `idCounter` and `nextId` helper to ensure unique, stable identifiers.

---

## 🚀 How It Works (Simulation Flow)
1. **User Interaction**: User clicks "Send Ping" on a PC.
2. **Path Resolution**: `findPath` is called to find a route to the target.
3. **Log Entry**: The event is recorded in the "Network Log" terminal.
4. **Animation Phase 1 (Request)**: A yellow packet travels hop-by-hop to the destination.
5. **Processing**: A 500ms delay simulates target processing.
6. **Animation Phase 2 (Response)**: A green packet travels the reverse path back to the source.
7. **Completion**: A "Success" log is printed, or an error is shown if the path is broken mid-way.

---

## 🛠️ Future Expansion Ideas
- **Subnetting Logic**: Currently, all devices are topologically connected. Real IP-based subnetting can be added by enhancing the `findPath` logic to respect IP/Mask rules in `networkSimulator.ts`.
- **Protocol Simulation**: Implement ARP (Address Resolution Protocol) visually, showing a packet flooding all ports of a switch to find a MAC address.
- **Visual Improvements**: Add custom SVG textures or icons for different vendor-specific devices.

---
*Created by Antigravity for Noob31.*
