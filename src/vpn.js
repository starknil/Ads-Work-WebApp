const axios = require("axios");

const checkIfVPN = async (ip) => {
  try {
    const { data } = await axios.get(`https://ipinfo.io/${ip}`);
    
    const org = data.org || "";

    const vpnProviders = [
      "Amazon", "Google", "Microsoft", "Azure", "DigitalOcean", "Hetzner",
      "OVH", "Linode", "Vultr", "Leaseweb", "Alibaba", "Cloudflare", "Choopa",
      "Kamatera", "Scaleway", "Contabo", "Hostwinds", "G-Core", "Tencent",
      "UpCloud", "Netcup", "Packet", "OVHcloud", "Eonix", "Shinjiru"
    ];

    const isVpn = vpnProviders.some(name =>
      org.toLowerCase().includes(name.toLowerCase())
    );

    return {
      ip: data.ip,
      city: data.city,
      region: data.region,
      country: data.country,
      org,
      vpn: isVpn,
      reason: isVpn ? "Datacenter/Cloud provider detected" : "Likely residential ISP"
    };

  } catch (e) {
    console.error("Error getting user info:", e.message);
    return {};
  }
}

module.exports = checkIfVPN;