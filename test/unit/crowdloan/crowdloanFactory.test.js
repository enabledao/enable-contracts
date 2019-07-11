import {BN, constants, expectEvent, expectRevert} from 'openzeppelin-test-helpers';

const {expect} = require('chai');

const {appCreate, getAppAddress, encodeCall} = require('../testHelpers');

const CrowdloanFactory = artifacts.require('CrowdloanFactory');
const TermsContract = artifacts.require('TermsContract');
const Crowdloan = artifacts.require('Crowdloan');
const DebtToken = artifacts.require('DebtToken');
const RepaymentRouter = artifacts.require('RepaymentRouter');

contract('CrowdloanFactory', accounts => {
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

  let tx;
  let result;
  let crowdloanFactory;
  const appAddress = getAppAddress();
  const borrower = accounts[0];

  beforeEach(async () => {
    // Create a factory via App

    const data = encodeCall('initialize', ['address'], [appAddress]);
    const proxyAddress = await appCreate('enable-credit', 'CrowdloanFactory', accounts[1], data);
    crowdloanFactory = await CrowdloanFactory.at(proxyAddress);
  });

  it('Factory should deploy successfully', async () => {
    assert.exists(crowdloanFactory.address, 'crowdloanFactory was not successfully deployed');
  });

  it('Factory should have App address initialized', async () => {
    result = await crowdloanFactory.app();
    expect(result).to.be.equal(appAddress);
  });

  it('should emit a LoanCreated event on successful deploy', async () => {
    tx = await crowdloanFactory.deploy(
      loanParams.principalTokenAddr,
      loanParams.principal,
      loanParams.amortizationUnitType,
      loanParams.termLength,
      loanParams.termPayment,
      loanParams.gracePeriodLength,
      loanParams.gracePeriodPayment,
      loanParams.interestRate,
      loanParams.crowdfundLength,
      loanParams.crowdfundStart,
      {from: borrower}
    );
    expectEvent.inLogs(tx.logs, 'LoanCreated');
  });

  it('should deploy all contracts on successful deploy', async () => {
    tx = await crowdloanFactory.deploy(
      loanParams.principalTokenAddr,
      loanParams.principal,
      loanParams.amortizationUnitType,
      loanParams.termLength,
      loanParams.termPayment,
      loanParams.gracePeriodLength,
      loanParams.gracePeriodPayment,
      loanParams.interestRate,
      loanParams.crowdfundLength,
      loanParams.crowdfundStart,
      {from: borrower}
    );

    const loanCreatedEvent = expectEvent.inLogs(tx.logs, 'LoanCreated');

    const termsContract = await TermsContract.at(loanCreatedEvent.args.termsContract);
    const crowdloan = await Crowdloan.at(loanCreatedEvent.args.crowdloan);
    const debtToken = await DebtToken.at(loanCreatedEvent.args.debtToken);
    const repaymentRouter = await RepaymentRouter.at(loanCreatedEvent.args.repaymentRouter);

    // Call methods on all contracts to verify deployment
    expect(await termsContract.getValueRepaidToDate()).to.be.bignumber.equal(new BN(1));
    // expect(await crowdloan.getBorrower()).to.be.equal(accounts[0]);
    expect(await repaymentRouter.totalRepaid()).to.be.bignumber.equal(new BN(0));
  });

  it('should revert if invalid arguments', async () => {});
});
