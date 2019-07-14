// Loan should be in correct status after first lender funds
// Lender should not be able to send less than minimum contribution
// Lender should not be able to send more than maximum contribution
// Loan should be in correct status after being fully funded
// Lender should be able to refund() while loan is in funding state
// Lender should not be able to refund() while loan is in fully funded state
// Lender should not be able to contribute after loan is fully funded
// Lender should not be able to contribute after loan is withdrawn by borrower

import {BN, constants, expectEvent, expectRevert} from 'openzeppelin-test-helpers';

const {expect} = require('chai');

const TermsContract = artifacts.require('TermsContract');
const Crowdloan = artifacts.require('Crowdloan');
const RepaymentManager = artifacts.require('RepaymentManager');
const PaymentToken = artifacts.require('StandaloneERC20');

const {loanParams, paymentTokenParams} = require('../../testConstants');

contract('Crowdloan', accounts => {

  let crowdloanFactory;
  let paymentToken;
  const appAddress = getAppAddress();
  const borrower = accounts[0];

  beforeEach(async () => {
    // Create a factory via App
    const data = encodeCall('initialize', ['address'], [appAddress]);
    const proxyAddress = await appCreate('enable-credit', 'Crowdloan', accounts[1], data);
    crowdloanFactory = await Crowdloan.at(proxyAddress);

    paymentToken = await PaymentToken.new();
    paymentToken.initialize(
      paymentTokenParams.name,
      paymentTokenParams.symbol,
      paymentTokenParams.decimals
    );
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
      crowdloanFactory.address,
      loanParams.principal,
      loanParams.timeUnitType,
      loanParams.loanPeriod,
      loanParams.interestRate,
      loanParams.crowdfundLength,
      loanParams.crowdfundStart,
      {from: borrower}
    );
    expectEvent.inLogs(tx.logs, 'LoanCreated');
  });

  it('should deploy all contracts on successful deploy', async () => {
    tx = await crowdloanFactory.deploy(
      crowdloanFactory.address,
      loanParams.principal,
      loanParams.timeUnitType,
      loanParams.loanPeriod,
      loanParams.interestRate,
      loanParams.crowdfundLength,
      loanParams.crowdfundStart,
      {from: borrower}
    );

    const loanCreatedEvent = expectEvent.inLogs(tx.logs, 'LoanCreated');

    const termsContract = await TermsContract.at(loanCreatedEvent.args.termsContract);
    const crowdloan = await Crowdloan.at(loanCreatedEvent.args.crowdloan);
    const repaymentManager = await RepaymentManager.at(loanCreatedEvent.args.repaymentManager);

    // Call methods on all contracts to verify deployment
    expect(await termsContract.getPrincipal()).to.be.bignumber.equal(new BN(loanParams.principal));
    expect(await crowdloan.getDebtToken()).to.be.equal(repaymentManager.address);
    expect(await repaymentManager.totalShares()).to.be.bignumber.equal(new BN(0));
  });

  it('should revert if invalid arguments', async () => {});
});
