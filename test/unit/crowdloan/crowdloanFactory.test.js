import {BN, constants, expectEvent, expectRevert} from 'openzeppelin-test-helpers';

const CrowdloanFactory = artifacts.require('CrowdloanFactory');
const App = artifacts.require('App');

const loanParams = {
  principalTokenAddr: '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359',
  principal: web3.utils.toWei('60000', 'ether'), // TODO(Dan): Replace with actual number 60000 * 10 ** 18
  amortizationUnitType: 3,
  termLength: 6,
  termPayment: 600,
  gracePeriodLength: 0,
  gracePeriodPayment: 0,
  interestRate: 50,
  crowdfundLength: 10,
  crowdfundStart: 10
};

contract('CrowdloanFactory', accounts => {
  let crowdloanFactoryInstance;
  let crowdloanInstance;
  let crowdloanInstanceAddress;
  const borrowAmount = web3.utils.toWei('60000', 'ether');
  const borrower = accounts[0];

  beforeEach(async () => {
    crowdloanFactoryInstance = await CrowdloanFactory.new();
  });

  it('Factory should deploy successfully', async () => {
    assert.exists(
      crowdloanFactoryInstance.address,
      'crowdloanFactoryInstance was not successfully deployed'
    );
  });

  it('should emit a LoanCreated event on successful deploy', async () => {
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

  it('should deploy all contracts on successful deploy', async () => {
    // Deploys Crowdloan instance
    const params = Object.values(loanParams);
    const {logs} = await crowdloanFactoryInstance.createCrowdloan(...params, {
      from: borrower
    });

    // debtToken = await DebtToken.at(tokenAddress);
    // const name = await debtToken.name();
    // assert.equal(name, tokenDetails.name);
  });

  it('should revert if invalid arguments', async () => {});
});
