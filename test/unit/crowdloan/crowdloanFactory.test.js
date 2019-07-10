import {BN, constants, expectEvent, expectRevert} from 'openzeppelin-test-helpers';

const DebtTokenFactory = artifacts.require('DebtTokenFactory');
const CrowdloanFactory = artifacts.require('CrowdloanFactory');

const loanParams = {
  debtToken: '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359',
  principalTokenAddr: '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359',
  principal: web3.utils.toWei('60000', 'ether'), // TODO(Dan): Replace with actual number 60000 * 10 ** 18
  timeUnitType: 3,
  termLength: 6,
  termPayment: 600,
  gracePeriodLength: 0,
  gracePeriodPayment: 0,
  interestRate: 50,
  crowdfundLength: 10,
  crowdfundStart: 10
};

contract('CrowdloanFactory', accounts => {
  let debtTokenFactoryInstance;
  let crowdloanFactoryInstance;
  let crowdloanInstance;
  let crowdloanInstanceAddress;
  const borrowAmount = web3.utils.toWei('60000', 'ether');
  const borrower = accounts[0];

  beforeEach(async () => {
    debtTokenFactoryInstance = await DebtTokenFactory.new();
    crowdloanFactoryInstance = await CrowdloanFactory.new(debtTokenFactoryInstance.address);
  });

  it('should deploy successfully', async () => {
    assert.exists(
      crowdloanFactoryInstance.address,
      'crowdloanFactoryInstance was not successfully deployed'
    );
  });

  it('should emit a loanCreated event on successful createCrowdloan', async () => {
    // Deploys Crowdloan instance
    const params = Object.values(loanParams);
    const {logs} = await crowdloanFactoryInstance.createCrowdloan(...params, {
      from: borrower
    });
    expectEvent.inLogs(logs, 'LoanCreated', {
      borrower,
      amount: borrowAmount
    });
  });

  xit('should revert if invalid arguments', async () => {});
});
