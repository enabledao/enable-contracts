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

const Crowdloan = artifacts.require('Crowdloan');
const TermsContract = artifacts.require('TermsContract');
const RepaymentManager = artifacts.require('RepaymentManager');
const PaymentToken = artifacts.require('StandaloneERC20');

const { crowdfundParams, loanParams, paymentTokenParams } = require('../../testConstants');

contract('Crowdloan', accounts => {

  let crowdloan;
  let paymentToken;
  let termsContract;
  let repaymentManager;
  const borrower = accounts[0];
  const controllers = [accounts[0]];

  beforeEach(async () => {

    paymentToken = await PaymentToken.new();
    await paymentToken.initialize(
      paymentTokenParams.name,
      paymentTokenParams.symbol,
      paymentTokenParams.decimals,
      [ accounts[0] ], //minters
      [] //pausers
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

    await crowdloan.initialize(
      termsContract.address,
      repaymentManager.address,
      ...Object.values(crowdfundParams)
    );
  });

  it('Crowdloan should deploy successfully', async () => {
    assert.exists(crowdloan.address, 'Crowdloan was not successfully deployed');
  });

  it('TermsContract should deploy successfully', async () => {
    assert.exists(termsContract.address, 'TermsContract was not successfully deployed');
  });

  it('RepaymentManager should deploy successfully', async () => {
    assert.exists(repaymentManager.address, 'RepaymentManager was not successfully deployed');
  });

  it('PaymentToken should deploy successfully', async () => {
    assert.exists(paymentToken.address, 'PaymentToken was not successfully deployed');
  });

  xit('should emit a LoanCreated event on successful deploy', async () => {
    tx = await crowdloan.deploy(
      crowdloan.address,
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
    tx = await crowdloan.deploy(
      crowdloan.address,
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
