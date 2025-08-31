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

(async () => {
  const test1 = await checkIfVPN("147.185.243.160");
  console.log(test1);

  const test2 = await checkIfVPN("41.190.xxx.xxx");
  console.log(test2);
})();

module.exports = checkIfVPN;