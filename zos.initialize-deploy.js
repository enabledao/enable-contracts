const fs = require('fs');
const HDWalletProvider = require('truffle-hdwallet-provider');

const App = artifacts.require('App');

const ENABLE_CREDIT_PACKAGE = 'enable-credit';

/*
 *  Get zos config info for specified networkId.
 */
function getZosNetworkConfig(networkName) {
  const zosNetworkFile = fs.readFileSync(`./zos.${networkName}.json`);
  return JSON.parse(zosNetworkFile);
}

function getAppAddress() {
  const zosNetworkConfig = getZosNetworkConfig(activeNetwork());
  return zosNetworkConfig.app.address;
}

function getNetworkNode() {
  switch (activeNetwork()) {
    case 'ropsten':
      return `https://ropsten.infura.io/v3/`;
      break;
    case 'kovan':
      return `https://kovan.infura.io/v3/`;
      break;
    case 'rinkeby':
      return `https://rinkeby.infura.io/v3/`;
      break;
    case 'mainnet':
      return `https://mainnet.infura.io/v3/`;
      break;
  }
}

function provider() {
  return new HDWalletProvider(
    process.env.MNEMONIC,
    `${getNetworkNode()}${process.env.INFURA_API_KEY}`
  );
}

function activeNetwork () {
  const networkIndex = process.argv.lastIndexOf('--network');
  console.log(networkIndex)
  if (networkIndex < 2) {
    return 'mainnet';
  } 
    return process.argv[networkIndex + 1];
  
}

async function appCreate(packageName, contractName, admin, data) {
  const appAddress = getAppAddress;
  console.log(appAddress);

  App.setProvider(provider());
  const app = await App.at(appAddress);

  console.log(app);
  // const tx = await app.create(packageName, contractName, admin, data);
  // const createdEvent = expectEvent.inLogs(tx.logs, 'ProxyCreated');
  // return createdEvent.args.proxy;
}

(async () => {
  console.log(activeNetwork());
  console.log(await appCreate(ENABLE_CREDIT_PACKAGE));
})();
