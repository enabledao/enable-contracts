// Shares are increased for new user (i.e. user with no shares) correctly
// Shares can't be decreased for new user (that has no shares)
// Shares are increased for existing user correctly
// Shares are decreased for existing user correctly

// Valid user can't withdraw before loan start
// Valid user can't withdraw during funding
// Valid user can withdraw during repayment
// Valid user can withdraw after loan end

// Invalid user can't withdraw before loan start
// Invalid user can't withdraw during funding
// Invalid user can't withdraw during repayment
// Invalid user can't withdraw after loan end

import {BN, constants, expectEvent, expectRevert} from 'openzeppelin-test-helpers';

const {expect} = require('chai');

const {appCreate, getAppAddress, encodeCall} = require('../../testHelpers');
const {loanParams, paymentTokenParams} = require('../../testConstants');

const RepaymentManager = artifacts.require('RepaymentManager');
const TermsContract = artifacts.require('TermsContract');
const PaymentToken = artifacts.require('StandaloneERC20');

contract('RepaymentManager', accounts => {

  let tx;
  let result;
  let paymentToken;
  let termsContract;
  let repaymentManager;
  // const appAddress = getAppAddress();
  const borrower = accounts[0];
  const controllers = [accounts[1]];

  beforeEach(async () => {
    // Create a factory via App
    // const data = encodeCall('initialize', ['address'], [appAddress]);
    // const proxyAddress = await appCreate('enable-credit', 'RepaymentManager', accounts[1], '');
    paymentToken = await PaymentToken.new();
    await paymentToken.initialize(
      paymentTokenParams.name,
      paymentTokenParams.symbol,
      paymentTokenParams.decimals
    );

    termsContract = await TermsContract.new();
    await termsContract.initialize(
      borrower,
      paymentToken.address,
      ...Object.values(loanParams),
      controllers
    );

    repaymentManager = await RepaymentManager.new();
    await repaymentManager.initialize(
      paymentToken.address,
      termsContract.address,
      controllers
    );
  });

  it('Factory should deploy successfully', async () => {
    assert.exists(repaymentManager.address, 'repaymentManager was not successfully deployed');
  });

  xit('Factory should have App address initialized', async () => {
    result = await repaymentManager.app();
    expect(result).to.be.equal(appAddress);
  });

  xit('should emit a LoanCreated event on successful deploy', async () => {
    tx = await repaymentManager.deploy(
      repaymentManager.address,
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

  xit('should deploy all contracts on successful deploy', async () => {
    tx = await repaymentManager.deploy(
      repaymentManager.address,
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

  xit('should revert if invalid arguments', async () => {});
});
