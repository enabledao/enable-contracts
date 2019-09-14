require('dotenv').config();
require('@babel/register');
require('@babel/polyfill');

var Web3 = require('web3');
const HDWalletProvider = require('truffle-hdwallet-provider');

const mnemonic = process.env.MNEMONIC;
const infuraProjectId = process.env.INFURA_PROJECT_ID;

var provider = new HDWalletProvider(
  mnemonic,
  `https://kovan.infura.io/v3/${infuraProjectId}`,
  0,
  10
);
var web3 = new Web3(provider);

const abis = {
  crowdloanFactory: require('../build/contracts/CrowdloanFactory.json'),
  crowdloan: require('../build/contracts/Crowdloan.json'),
  standaloneERC20: require('../build/contracts/StandaloneERC20.json'),
  adminProxy: require('../build/contracts/AdminUpgradeabilityProxy.json')
};

const addresses = {
  logic: {
    crowdloanFactory: '0x354711463CD68065c6c866Fe80bD07C4e0f2aDf8',
    termsContract: '0x6d9E1AAd0d086659b2e8e948268EdbE0d5752978',
    crowdloan: '0x9C8826dD617740fEEDEE66521569aaADa9CE9035',
    repaymentManager: '0xd20BEba18ECa8CC89a1506875bD2d09d021a4696'
  },
  instances: {
    crowdloanFactory: '0xa415EF179c079E9c045C277Bf6531D812743F9f1',
    crowdloan: '0xdd3723ea2f2734fba71d022dbced06892756b366'
  }
};

const upgradeProxy = async (proxy, newImplementation) => {
  let result;

  const accounts = await web3.eth.getAccounts();
  const contractAdmin = accounts[0];

  const proxyInstance = new web3.eth.Contract(abis.adminProxy.abi, proxy);

  result = await proxyInstance.methods.implementation().call({from: contractAdmin});
  console.log('oldImplementation', result);

  result = await proxyInstance.methods.admin().call({from: contractAdmin});
  console.log('admin', result);

  await proxyInstance.methods.upgradeTo(newImplementation).send({from: contractAdmin});

  result = await proxyInstance.methods.implementation().call({from: contractAdmin});
  console.log('newImplementation', result);
};

const main = async () => {
  console.log(await web3.eth.getAccounts());
  await upgradeProxy(addresses.instances.crowdloan, addresses.logic.crowdloanFactory);
};

main();
