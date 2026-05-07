# NetViz - User & Feature Guide

Welcome to the **Network Visualizer (NetViz)**! This document details all the devices and functionalities available in the tool. Use this as a reference for what you can build and how the simulation works.

## 🛠️ Available Devices

| Device | Icon | Role |
| :--- | :--- | :--- |
| **PC / Host** | 💻 | The source and destination of network traffic. Can initiate and respond to Pings. |
| **Switch** | 🎛️ | Layer 2 device that connects multiple devices within a local network. Forwards packets logically. |
| **Router** | 🌐 | Layer 3 device for connecting different networks. Acts as a gateway for traffic. |
| **Server** | 💾 | High-capacity host for data (Logic identical to PC in the current version). |

---

## ⚡ Core Functionalities

### 1. Interactive Topology Builder
- **Drag & Drop**: Move any device freely.
- **Grid Snapping**: Toggle the `#` icon to align devices to a clean 40px grid.
- **Link Tool**: Select the Link icon (chain) and click two devices to connect them. Links update their paths automatically when you move devices.

### 2. Network Traffic Simulation (Ping)
- **Select a PC**: Click on any PC to open its settings.
- **Send Ping**: Click the "Paper Plane" icon to send a data packet to another device.
- **Visual Path**: Watch the yellow packet travel through every intermediate Switch and Router.
- **Auto-Response**: If the packet reaches its target, a green "Response" packet will automatically travel back to the source.

### 3. Real-time Monitoring
- **Network Log**: A terminal window in the bottom-right that prints every event (e.g., `Packet forwarding: Switch-1 -> Router-1`).
- **Device Status**: Click a device to see its auto-generated MAC Address and port status.

### 4. Lab Management
- **Export to JSON**: Download your entire network design as a `.json` file to save your work.
- **Import from JSON**: Upload a saved `.json` file to restore a previous lab session.
- **Reset Canvas**: Clear all devices and links to start fresh.
- **Broadcast Test**: A "Panic Button" that forces every PC on the canvas to send pings simultaneously—great for stress-testing your design!

---

## 💡 Quick Tips
- Use the **Select Mode** (mouse pointer) to move devices or change settings.
- Use the **Link Mode** (chain) to build your network structure.
- If a device flashes **Red**, it means there is no logical path to the destination!

---
*Last Updated: 2026-05-07*
