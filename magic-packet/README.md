# Wake-on-LAN Magic Packet Sender (Raw Ethernet)

A C program that sends Wake-on-LAN Magic Packets using raw Ethernet frames with EtherType 0x0842.

## Compilation

```bash
make
```

Or compile manually:
```bash
gcc -Wall -Wextra -O2 -o wol wol.c
```

## Usage

```bash
sudo ./wol <MAC_ADDRESS> <INTERFACE>
```

- `MAC_ADDRESS`: Target device MAC address (format: XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX)
- `INTERFACE`: Network interface to send from (e.g., eth0, wlan0, enp0s3)

**Note:** Requires root privileges or CAP_NET_RAW capability to create raw sockets.

## Examples

```bash
# Wake device via eth0
sudo ./wol 00:11:22:33:44:55 eth0

# Wake device via wireless interface
sudo ./wol 00-11-22-33-44-55 wlan0
```

## How It Works

The program creates a raw Ethernet frame with:
- Destination: Broadcast MAC (FF:FF:FF:FF:FF:FF)
- Source: Interface MAC address
- EtherType: 0x0842 (Wake-on-LAN)
- Payload: Magic Packet (6 bytes of 0xFF + target MAC repeated 16 times)

This operates at Layer 2 without any IP addressing.
