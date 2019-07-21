import {BN, constants, expectEvent, expectRevert} from 'openzeppelin-test-helpers';

const {expect} = require('chai');

const {appCreate, getAppAddress, encodeCall} = require('../../testHelpers');

const CrowdloanFactory = artifacts.require('CrowdloanFactory');
const TermsContract = artifacts.require('TermsContract');
const Crowdloan = artifacts.require('Crowdloan');
const RepaymentManager = artifacts.require('RepaymentManager');
const PaymentToken = artifacts.require('StandaloneERC20');

contract('CrowdloanFactory', accounts => {
  const loanParams = {
    principalRequested: web3.utils.toWei('60000', 'ether'), // TODO(Dan): Replace with actual number 60000 * 10 ** 18
    loanPeriod: 6,
    interestRate: 50,
    crowdfundLength: 10,
    crowdfundStart: 10
  };

  const paymentTokenParams = {
    name: 'PaymentToken',
    symbol: 'PAY',
    decimals: new BN(18)
  };

  let tx;
  let result;
  let crowdloanFactory;
  let paymentToken;
  const appAddress = getAppAddress();
  const borrower = accounts[0];

  beforeEach(async () => {
    // Create a factory via App
    const data = encodeCall('initialize', ['address'], [appAddress]);
    const proxyAddress = await appCreate('enable-credit', 'CrowdloanFactory', accounts[1], data);
    crowdloanFactory = await CrowdloanFactory.at(proxyAddress);

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
      loanParams.principalRequested,
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
      loanParams.principalRequested,
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
    expect(await termsContract.getPrincipalRequested()).to.be.bignumber.equal(
      new BN(loanParams.principalRequested)
    );
    expect(await repaymentManager.totalShares()).to.be.bignumber.equal(new BN(0));
  });

  it('should revert if invalid arguments', async () => {});
});
