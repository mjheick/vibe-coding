#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <sys/ioctl.h>
#include <net/if.h>
#include <netinet/ether.h>
#include <linux/if_packet.h>
#include <arpa/inet.h>

#define MAC_ADDR_LEN 6
#define MAGIC_PACKET_LEN 102
#define ETH_HEADER_LEN 14
#define FRAME_LEN (ETH_HEADER_LEN + MAGIC_PACKET_LEN)
#define WOL_ETHERTYPE 0x0842

// Parse MAC address from string format (XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX)
int parse_mac_address(const char *mac_str, unsigned char *mac_addr) {
    int values[MAC_ADDR_LEN];
    int i;
    
    // Try colon-separated format
    if (sscanf(mac_str, "%x:%x:%x:%x:%x:%x",
               &values[0], &values[1], &values[2],
               &values[3], &values[4], &values[5]) == MAC_ADDR_LEN) {
        for (i = 0; i < MAC_ADDR_LEN; i++) {
            mac_addr[i] = (unsigned char)values[i];
        }
        return 0;
    }
    
    // Try dash-separated format
    if (sscanf(mac_str, "%x-%x-%x-%x-%x-%x",
               &values[0], &values[1], &values[2],
               &values[3], &values[4], &values[5]) == MAC_ADDR_LEN) {
        for (i = 0; i < MAC_ADDR_LEN; i++) {
            mac_addr[i] = (unsigned char)values[i];
        }
        return 0;
    }
    
    return -1;
}

// Create Magic Packet: 6 bytes of 0xFF followed by 16 repetitions of target MAC
void create_magic_packet(unsigned char *packet, const unsigned char *mac_addr) {
    int i;
    
    // Fill first 6 bytes with 0xFF
    memset(packet, 0xFF, 6);
    
    // Repeat MAC address 16 times
    for (i = 0; i < 16; i++) {
        memcpy(packet + 6 + (i * MAC_ADDR_LEN), mac_addr, MAC_ADDR_LEN);
    }
}

int send_magic_packet(const char *mac_str, const char *interface) {
    int sockfd;
    struct ifreq ifr;
    struct sockaddr_ll addr;
    unsigned char mac_addr[MAC_ADDR_LEN];
    unsigned char frame[FRAME_LEN];
    unsigned char broadcast_mac[MAC_ADDR_LEN] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
    
    // Parse target MAC address
    if (parse_mac_address(mac_str, mac_addr) != 0) {
        fprintf(stderr, "Error: Invalid MAC address format\n");
        fprintf(stderr, "Use format: XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX\n");
        return -1;
    }
    
    // Create raw socket
    sockfd = socket(AF_PACKET, SOCK_RAW, htons(ETH_P_ALL));
    if (sockfd < 0) {
        perror("Error creating socket (requires root/CAP_NET_RAW)");
        return -1;
    }
    
    // Get interface index
    memset(&ifr, 0, sizeof(ifr));
    strncpy(ifr.ifr_name, interface, IFNAMSIZ - 1);
    if (ioctl(sockfd, SIOCGIFINDEX, &ifr) < 0) {
        perror("Error getting interface index");
        close(sockfd);
        return -1;
    }
    
    // Build Ethernet frame
    memset(frame, 0, FRAME_LEN);
    
    // Destination MAC (broadcast)
    memcpy(frame, broadcast_mac, MAC_ADDR_LEN);
    
    // Source MAC (get from interface)
    if (ioctl(sockfd, SIOCGIFHWADDR, &ifr) < 0) {
        perror("Error getting interface MAC address");
        close(sockfd);
        return -1;
    }
    memcpy(frame + MAC_ADDR_LEN, ifr.ifr_hwaddr.sa_data, MAC_ADDR_LEN);
    
    // EtherType 0x0842 (Wake-on-LAN)
    frame[12] = (WOL_ETHERTYPE >> 8) & 0xFF;
    frame[13] = WOL_ETHERTYPE & 0xFF;
    
    // Magic packet payload
    create_magic_packet(frame + ETH_HEADER_LEN, mac_addr);
    
    // Setup destination address
    memset(&addr, 0, sizeof(addr));
    addr.sll_family = AF_PACKET;
    addr.sll_ifindex = ifr.ifr_ifindex;
    addr.sll_halen = MAC_ADDR_LEN;
    memcpy(addr.sll_addr, broadcast_mac, MAC_ADDR_LEN);
    
    // Send frame
    if (sendto(sockfd, frame, FRAME_LEN, 0,
               (struct sockaddr *)&addr, sizeof(addr)) < 0) {
        perror("Error sending frame");
        close(sockfd);
        return -1;
    }
    
    printf("Magic Packet sent successfully to %s via %s (EtherType 0x0842)\n", 
           mac_str, interface);
    
    close(sockfd);
    return 0;
}

int main(int argc, char *argv[]) {
    const char *mac_address;
    const char *interface;
    
    if (argc != 3) {
        fprintf(stderr, "Usage: %s <MAC_ADDRESS> <INTERFACE>\n", argv[0]);
        fprintf(stderr, "Example: %s 00:11:22:33:44:55 eth0\n", argv[0]);
        fprintf(stderr, "Example: %s 00-11-22-33-44-55 wlan0\n", argv[0]);
        fprintf(stderr, "\nNote: Requires root privileges or CAP_NET_RAW capability\n");
        return 1;
    }
    
    mac_address = argv[1];
    interface = argv[2];
    
    return send_magic_packet(mac_address, interface) == 0 ? 0 : 1;
}
