const axios = require("axios");


const checkIfVPN = async (ip) => {
  try {
    const { data } = await axios.get("https://proxycheck.io/v3/" + ip);
    const { detections, location } = data[ip];
    const { risk, hosting, ...otherFlags } = detections;

    let vpn = false;
    if (Object.values(otherFlags).some((val) => val === true)) {
      vpn = true;
    } else if (hosting === true && Number(risk) > 25) {
      vpn = true;
    }
    return {
      ip,
      city: location.city_name,
      region: location.region_name,
      country: location.country_name,
      vpn,
      risk
    };
  } catch (e) {
    console.error("Error getting user info:", e.message);
    return { ip, vpn: false };
  }
};

module.exports = checkIfVPN;