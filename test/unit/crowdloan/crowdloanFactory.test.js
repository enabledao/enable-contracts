import {Contracts} from 'zos-lib';
import {BN, constants, expectEvent, expectRevert} from 'openzeppelin-test-helpers';

const zos = require('zos');
const {init, add, push, create, publish} = zos.scripts;
const network = 'dev-1562620988369';

const {expect} = require('chai');
const should = require('chai').should();

require('../../setup');
const {deployed} = require('../../../deployed');

// Until I can get this automatically set, must set manually for each network / deployment

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

const CrowdloanFactory = Contracts.getFromLocal('CrowdloanFactory');
const App = Contracts.getFromLocal('App').at(deployed.development.App);

contract('CrowdloanFactory', async accounts => {
  let crowdloanFactory;
  const borrowAmount = web3.utils.toWei('60000', 'ether');
  const borrower = accounts[0];

  beforeEach(async () => {
    crowdloanFactory = await create({
      packageName: 'enable-credit',
      contractAlias: 'CrowdloanFactory',
      methodName: 'initialize',
      methodArgs: [App.address],
      network
    });
  });

  it('Factory should deploy successfully', async () => {
    assert.exists(crowdloanFactory.address, 'crowdloanFactory was not successfully deployed');
  });

  it('Factory should have App address initialized', async () => {
    const tx = await crowdloanFactory.methods.app().call();
    expect(tx).to.be.equal(App.address);
  });

  it('should emit TestProxy on successful Proxy deploy', async () => {
    // Deploys Crowdloan instance
    const tx = await crowdloanFactory.methods
      .createProxy(deployed.development.TermsContract, constants.ZERO_ADDRESS)
      .send({
        from: borrower
      });

    console.log(tx.events.TestProxy.returnValues);
    // expectEvent.inLogs(tx, 'TestProxy');
  });

  it('should emit a LoanCreated event on successful deploy', async () => {
    const tx = await crowdloanFactory.methods
      .deploy(
        loanParams.principalTokenAddr,
        loanParams.principal,
        loanParams.amortizationUnitType,
        loanParams.termLength,
        loanParams.termPayment,
        loanParams.gracePeriodLength,
        loanParams.gracePeriodPayment,
        loanParams.interestRate,
        loanParams.crowdfundLength,
        loanParams.crowdfundStart
      )
      .send({
        from: borrower
      });

    const eventValues = tx.events.LoanCreated.returnValues;
    console.log(eventValues);

    // expectEvent.inLogs(tx, 'TestProxy');
  });

  it('should deploy all contracts on successful deploy', async () => {
    let tx = await crowdloanFactory.methods
      .deploy(
        loanParams.principalTokenAddr,
        loanParams.principal,
        loanParams.amortizationUnitType,
        loanParams.termLength,
        loanParams.termPayment,
        loanParams.gracePeriodLength,
        loanParams.gracePeriodPayment,
        loanParams.interestRate,
        loanParams.crowdfundLength,
        loanParams.crowdfundStart
      )
      .send({
        from: borrower
      });

    // Get ProxyCreated event values to compare vs LoanCreated- need to convert from bytes -> address
    // TODO: Why are these not being parsed correctly?
    // const proxy0 = tx.events['0'].raw.data;
    // const proxy1 = tx.events['1'].raw.data;
    // const proxy2 = tx.events['2'].raw.data;
    // const proxy3 = tx.events['3'].raw.data;

    const eventValues = tx.events.LoanCreated.returnValues;
    const termsContractAddress = eventValues[2];
    const crowdloanAddress = eventValues[3];
    const debtTokenAddress = eventValues[4];
    const repaymentRouterAddress = eventValues[5];

    // Call methods on all contracts to verify deployment
    const termsContract = Contracts.getFromLocal('TermsContract').at(termsContractAddress);
    const crowdloan = Contracts.getFromLocal('Crowdloan').at(termsContractAddress);
    const debtToken = Contracts.getFromLocal('DebtToken').at(termsContractAddress);
    const repaymentRouter = Contracts.getFromLocal('RepaymentRouter').at(termsContractAddress);

    tx = await termsContract.methods.getValueRepaidToDate().call();
    console.log('1', tx);
    // tx = await crowdloan.methods.getDebtToken().call();
    // console.log('2', tx);
    // tx = await debtToken.methods.totalDebt().call();
    // console.log('3', tx);
    // tx = await repaymentRouter.methods.totalRepaid().call();
    // console.log('4', tx);
  });

  it('should revert if invalid arguments', async () => {});
});
