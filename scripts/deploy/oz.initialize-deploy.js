require('dotenv').config();

const fs = require('fs');

const App = artifacts.require('App');
const CrowdloanFactory = artifacts.require('CrowdloanFactory');

const ENABLE_CREDIT_PACKAGE = 'enable-credit';

function activeNetwork() {
  const networkIndex = process.argv.lastIndexOf('--network');
  if (networkIndex < 2) {
    return 'development';
  }
  return process.argv[networkIndex + 1];
}

function activeNetworkName() {
  return activeNetwork() === 'development' ? `dev-${App.network_id}` : activeNetwork();
}

/*
 *  Get zos config info for specified networkId.
 */
function getOZNetworkConfig(networkName) {
  const zosNetworkFile = fs.readFileSync(`./.openzeppelin/${networkName}.json`);
  return JSON.parse(zosNetworkFile);
}

function getAppAddress() {
  const ozNetworkConfig = getOZNetworkConfig(activeNetworkName());
  return ozNetworkConfig.app.address;
}

function getCrowdloanFactory() {
  const ozNetworkConfig = getOZNetworkConfig(activeNetworkName());
  const factories = ozNetworkConfig.proxies[`${ENABLE_CREDIT_PACKAGE}/CrowdloanFactory`];
  return factories[factories.length - 1];
}

async function initializeCrowdloanFactory(factoryAddress) {
  const factory = await CrowdloanFactory.at(factoryAddress);
  return factory.initialize(getAppAddress());
}

module.exports = async () => {
  try {
    const factoryAddress = getCrowdloanFactory().address;
    console.log('Factory to initialize:', factoryAddress);
    const initializeTx = await initializeCrowdloanFactory(factoryAddress);
    console.log('initializeTx:', initializeTx.tx);
  } catch (e) {
    console.error(e);
  }
  process.exit();
};
