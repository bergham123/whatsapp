const os = require('os');
const https = require('https');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  
  for (const interfaceName in interfaces) {
    const interface = interfaces[interfaceName];
    
    for (const iface of interface) {
      // GitHub Actions runners typically use eth0
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  
  return '0.0.0.0';
}

function getPublicIP() {
  return new Promise((resolve, reject) => {
    https.get('https://api.ipify.org', (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => { resolve(data); });
    }).on('error', (err) => { reject(err); });
  });
}

async function main() {
  console.log('=== GitHub Actions Runner Network Info ===\n');
  
  // System info
  console.log(`Hostname: ${os.hostname()}`);
  console.log(`Platform: ${os.platform()} ${os.release()}`);
  console.log(`Architecture: ${os.arch()}\n`);
  
  // Local IP
  const localIP = getLocalIP();
  console.log(`Local IP Address: ${localIP}`);
  
  // All interfaces (for debugging)
  console.log('\nAll Network Interfaces:');
  const interfaces = os.networkInterfaces();
  for (const [name, nets] of Object.entries(interfaces)) {
    nets.forEach(net => {
      if (net.family === 'IPv4') {
        console.log(`  ${name}: ${net.address} ${net.internal ? '(internal)' : '(external)'}`);
      }
    });
  }
  
  // Public IP (optional - requires external request)
  try {
    const publicIP = await getPublicIP();
    console.log(`\nPublic IP Address: ${publicIP}`);
  } catch (err) {
    console.log(`\nCould not get public IP: ${err.message}`);
  }
}

main().catch(console.error);
