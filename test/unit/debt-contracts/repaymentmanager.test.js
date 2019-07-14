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
  const controllers = [accounts[0]];
  const lenders = [
    {
      address: accounts[1],
      shares: new BN(100)
    },
    {
      address: accounts[2],
      shares: new BN(200)
    },
    {
      address: accounts[3],
      shares: new BN(50)
    }
  ];

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

  it('RepaymentManager should deploy successfully', async () => {
    assert.exists(repaymentManager.address, 'repaymentManager was not successfully deployed');
  });

  it('RepaymentManager should have PaymentToken address initialized', async () => {
    result = await repaymentManager.paymentToken.call();
    expect(result).to.be.equal(paymentToken.address);
  });

  it('RepaymentManager should have TermsContract address initialized', async () => {
    result = await repaymentManager.termsContract.call();
    expect(result).to.be.equal(termsContract.address);
  });

  it('should successfully a add a new Payee', async () => {

    const payee = lenders[0];
    const tx = await repaymentManager.increaseShares(
      payee.address,
      payee.shares,
      {from: controllers[0]}
    );
    expectEvent.inLogs(tx.logs, 'PayeeAdded');

    const shares = await repaymentManager.shares.call(payee.address);
    expect(shares).to.be.bignumber.equal(payee.shares);

  });

  xit('should emit a PaymentReceived event on successful payment', async () => {
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
