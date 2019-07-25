const fs = require('fs');
const {BN, expectEvent} = require('openzeppelin-test-helpers');
const {encodeCall} = require('zos-lib');

const {DECIMAL_SHIFT} = require('./testConstants');

const App = artifacts.require('App');

/**
 * Generates random BN that has 18 decimals
 */
const generateRandomPaddedBN = max => {
  const random = new BN(Math.floor(Math.random() * Math.floor(max)));
  const shifted = random.mul(DECIMAL_SHIFT);
  return shifted;
};

const generateRandomBN = max => {
  return new BN(Math.floor(Math.random() * Math.floor(max)));
};

/**
 * Generates random integer that is less than a BN. Used to create shares
 */
const getRandomPercentageOfBN = max => {
  assert(BN.isBN(max));
  const unshifted = max.div(DECIMAL_SHIFT);
  const random = generateRandomBN(unshifted.toNumber());
  return random.mul(DECIMAL_SHIFT);
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

async function snapShotEvm() {
  const send = web3.currentProvider.sendAsync || web3.currentProvider.send;
  return await new Promise((resolve, reject) => {
    send(
      {
        jsonrpc: '2.0',
        method: 'evm_snapshot',
        params: [],
        id: new Date().getTime()
      },
      (err, res) => {
        if (err) {
          reject(err);
        }
        resolve(res.result);
      }
    );
  });
}

async function revertEvm(snapshotId) {
  const send = web3.currentProvider.sendAsync || web3.currentProvider.send;
  await new Promise((resolve, reject) => {
    send(
      {
        jsonrpc: '2.0',
        method: 'evm_revert',
        params: [snapshotId],
        id: new Date().getTime()
      },
      (err, res) => {
        if (err) {
          reject(err);
        }
        resolve(res.result);
      }
    );
  });
}

module.exports = {
  appCreate,
  encodeCall,
  generateRandomBN,
  generateRandomPaddedBN,
  getAppAddress,
  getRandomPercentageOfBN,
  getZosConfig,
  getZosNetworkConfig,
  revertEvm,
  snapShotEvm
};
