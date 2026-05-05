import os from 'os';

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  
  for (const interfaceName in interfaces) {
    const networkInterface = interfaces[interfaceName];  // Changed variable name
    
    for (const iface of networkInterface) {
      // Filter for IPv4, non-internal (not localhost)
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  
  return '0.0.0.0'; // Fallback if no IP found
}

const myIP = getLocalIP();
console.log(myIP);
