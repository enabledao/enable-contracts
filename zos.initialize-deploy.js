require('dotenv').config();

const fs = require('fs');

const App = artifacts.require('App');
const CrowdloanFactory = artifacts.require('CrowdloanFactory');

const truffleConfig = require('./truffle-config.js');

const ENABLE_CREDIT_PACKAGE = 'enable-credit';


function activeNetwork () {
  const networkIndex = process.argv.lastIndexOf('--network');
  if (networkIndex < 2) {
    return 'development';
  }
    return process.argv[networkIndex + 1];
}

function activeNetworkName () {
  return (activeNetwork() === 'development') ?
    `dev-${App.network_id}` :
    activeNetwork();
}

/*
 *  Get zos config info for specified networkId.
 */
function getZosNetworkConfig(networkName) {
  const zosNetworkFile = fs.readFileSync(`./zos.${networkName}.json`);
  return JSON.parse(zosNetworkFile);
}

function getAppAddress() {
  const zosNetworkConfig = getZosNetworkConfig(activeNetworkName());
  return zosNetworkConfig.app.address;
}

function getCrowdloanFactory() {
  const zosNetworkConfig = getZosNetworkConfig(activeNetworkName());
  const factories = zosNetworkConfig.proxies[`${ENABLE_CREDIT_PACKAGE}/CrowdloanFactory`];
  return factories[factories.length-1];
}

function helpers() {
  return {
    constants : {
      ZERO_ADDRESS: '0x0000000000000000000000000000000000000000'
    }
  }
}

async function initializeCrowdloanFactory (factoryAddress) {
  const factory = await CrowdloanFactory.at(factoryAddress);
  return factory.initialize(getAppAddress());
}

module.exports = async () => {
  const {constants} = helpers();
  try {
    const factoryAddress = getCrowdloanFactory().address;
    console.log('Factory to initialize:', factoryAddress);
    const initializeTx = await initializeCrowdloanFactory(factoryAddress);
    console.log('initializeTx:', initializeTx.tx);

    console.log(
      'done!!!!'
    );
  } catch (e) {console.error(e)}

  console.log('Exporting Crowdloan version');
  process.exit();
}
