const fs = require('fs');
const {BN, constants, expectEvent, expectRevert} = require('openzeppelin-test-helpers');

const App = artifacts.require('App');
const {encodeCall} = require('zos-lib');

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
  getAppAddress,
  getZosConfig,
  getZosNetworkConfig,
  revertEvm,
  snapShotEvm
};
