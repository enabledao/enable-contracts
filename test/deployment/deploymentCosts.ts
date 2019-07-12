const {expect} = require('chai');

const {appCreate, getAppAddress, encodeCall} = require('../testHelpers');

const CrowdloanFactory = artifacts.require('CrowdloanFactory');
const TermsContract = artifacts.require('TermsContract');
const Crowdloan = artifacts.require('Crowdloan');
const RepaymentManager = artifacts.require('RepaymentManager');
const PaymentToken = artifacts.require('StandaloneERC20');

// This test is intended to be used with eth-gas-reporter to evaluate deployment costs
contract('Development', accounts => {
  const appAddress = getAppAddress();

  it('deploys factory instance', async () => {
    // Create a factory via App
    const data = encodeCall('initialize', ['address'], [appAddress]);
    const proxyAddress = await appCreate('enable-credit', 'CrowdloanFactory', accounts[1], data);
    await CrowdloanFactory.at(proxyAddress);
  });
});
