const fs = require('fs');
const {BN, expectEvent} = require('openzeppelin-test-helpers');
const {encodeCall} = require('zos-lib');

const {TOKEN_DECIMALS} = require('./testConstants');

const App = artifacts.require('App');

/**
 * Generates random BN that has 18 decimals
 */
const generateRandomPaddedBN = max => {
  const random = new BN(Math.floor(Math.random() * Math.floor(max)));
  const decimals = new BN(10).pow(TOKEN_DECIMALS);
  const shifted = random.mul(decimals);
  return shifted;
};

const generateRandom = max => {
  return Math.floor(Math.random() * Math.floor(max));
};

/**
 * Generates random integer that is less than a BN. Used to create shares
 */
const getPercentageOfBN = max => {
  assert(BN.isBN(max));
  const divisor = new BN(Math.floor(Math.random() * 100));
  return max.div(divisor);
};

/*
 *  Find zos config file name for specified network
 *  Hacky: Assume public networks for known network IDs
 */
function resolveNetworkFilename(networkId) {
  switch (networkId) {
    case 1:
      return 'mainnet';
    case 3:
      return 'ropsten';
    case 4:
      return 'rinkeby';
    case 42:
      return 'kovan';
    default:
      return `dev-${networkId}`;
  }
}

/*
 *  Get zos config info for specified networkId.
 */
function getZosNetworkConfig(networkId) {
  const networkName = resolveNetworkFilename(networkId);
  const zosNetworkFile = fs.readFileSync(`./zos.${networkName}.json`);

  return JSON.parse(zosNetworkFile);
}

function getZosConfig() {
  return JSON.parse(fs.readFileSync('./zos.json'));
}

function getAppAddress() {
  const currentNetworkId = App.network_id;
  const zosNetworkConfig = getZosNetworkConfig(currentNetworkId);
  return zosNetworkConfig.app.address;
}

// Helper function for creating instances via current App contract
async function appCreate(packageName, contractName, admin, data) {
  const currentNetworkId = App.network_id;
  const zosNetworkConfig = getZosNetworkConfig(currentNetworkId);
  const appAddress = zosNetworkConfig.app.address;

  const app = await App.at(appAddress);
  const tx = await app.create(packageName, contractName, admin, data);
  const createdEvent = expectEvent.inLogs(tx.logs, 'ProxyCreated');
  return createdEvent.args.proxy;
}

export {
  getZosConfig,
  getZosNetworkConfig,
  appCreate,
  getAppAddress,
  encodeCall,
  generateRandom,
  generateRandomPaddedBN
};
