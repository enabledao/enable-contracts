const fs = require('fs');
const {BN, expectEvent} = require('openzeppelin-test-helpers');
const {encodeCall} = require('zos-lib');

const {DECIMAL_SHIFT, MAX_CROWDFUND} = require('./testConstants');

const App = artifacts.require('App');

const generateRandomBN = (max, min) => {
  max = max.toNumber ? max.toNumber() : max;
  min = min && min.toNumber ? min.toNumber() : min;
  return new BN(Math.floor(Math.random() * Math.floor(max))).add(new BN(min ? min : 0));
};

/**
 * Generates random BN that has 18 decimals
 */
const generateRandomPaddedBN = (max, min) => {
  const random = generateRandomBN(max, min);
  const shifted = random.mul(DECIMAL_SHIFT);
  return shifted;
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

/**
 * Generates random test scenario
 */
const generateLoanScenario = accounts => {
  // Generate sample lenders allocation
  // TODO(Dan): Use Dirichlet distribution? https://stackoverflow.com/questions/18659858/generating-a-list-of-random-numbers-summing-to-1

  const split_MAX_CROWDFUND = MAX_CROWDFUND.div(new BN(3));
  const loanPeriod = 6; // TODO(Dan): Randomize
  const lenders = [
    // TODO(Dan): Randomize number of lenders, find way to generate randomShares
    {
      address: accounts[6],
      shares: generateRandomPaddedBN(split_MAX_CROWDFUND)
    },
    {
      address: accounts[7],
      shares: generateRandomPaddedBN(split_MAX_CROWDFUND)
    },
    {
      address: accounts[8],
      shares: generateRandomPaddedBN(split_MAX_CROWDFUND)
    }
  ];

  const principal = lenders.reduce((total, lender) => total.add(lender.shares), new BN(0));

  const loanParams = {
    principalRequested: principal,
    loanPeriod, // TODO(Dan): Randomize
    interestRate: 50, // TODO(Dan): Randomize
    minimumRepayment: principal,
    maximumRepayment: principal
  };
  const repayments = [];
  for (let i = 0; i < loanPeriod; i += 1) {
    repayments.push(loanParams.principalRequested.div(new BN(loanPeriod))); // TODO(Dan): Needs better one that factors interest payments etc
  }
  return {
    lenders,
    loanParams,
    repayments
  };
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
function getOZNetworkConfig(networkId) {
  const networkName = resolveNetworkFilename(networkId);
  const ozNetworkFile = fs.readFileSync(`./.openzeppelin/${networkName}.json`);

  return JSON.parse(ozNetworkFile);
}

function getOZProjectConfig() {
  return JSON.parse(fs.readFileSync('./openzeppelin/project.json'));
}

function getAppAddress() {
  const currentNetworkId = App.network_id;
  const ozNetworkConfig = getOZNetworkConfig(currentNetworkId);
  return ozNetworkConfig.app.address;
}

// Helper function for creating instances via current App contract
async function appCreate(packageName, contractName, admin, data) {
  const appAddress = getAppAddress();

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
  generateLoanScenario,
  generateRandomBN,
  generateRandomPaddedBN,
  getAppAddress,
  getRandomPercentageOfBN,
  getOZProjectConfig,
  getOZNetworkConfig,
  revertEvm,
  snapShotEvm
};
