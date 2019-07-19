// TODO(Dan): Create end-to-end integration test

/*
    Setup
*/

// Deploy a factory instance & a dummy payment token

/*
    Execution
*/

/*
    1. Borrower creates Loan via Crowdloan factory deploy()
    2. Lenders send funds
        - Check that they get the right shares
        - Check that the loan is in the correct status before it's fully funded
    3. Borrower withdraws when enough funds are sent
        - Check that the loan is in the correct status after it's fully funded
    4. Borrower repays via RepaymentManager pay()
        - Make sure the right events are fired
    5. Some lenders try to withdraw single payment
        - On some we should wait and have them try to withdraw from multiple payments at once
    6. More repayments happen
    7. Some lenders try to withdraw after multiple payments


I'd also want to make sure the loan values are correct for each payment with a simple loan calcuation.
*/
import {BN, constants, expectEvent, expectRevert, time} from 'openzeppelin-test-helpers';

const {expect} = require('chai');

const {appCreate, getAppAddress, encodeCall} = require('../testHelpers');
const { crowdfundParams, loanParams, paymentTokenParams } = require('../testConstants');

const CrowdloanFactory = artifacts.require('CrowdloanFactory');
const TermsContract = artifacts.require('TermsContract');
const Crowdloan = artifacts.require('Crowdloan');
const RepaymentManager = artifacts.require('RepaymentManager');
const PaymentToken = artifacts.require('StandaloneERC20');

contract('Enable Suite', accounts => {

  let crowdloanFactory;
  let paymentToken;
  let crowdloan;
  let termsContract;
  let repaymentManager;

  const HUNDERED = new BN(100);
  const borrower = accounts[2];
  const appAddress = getAppAddress();
  const lenders = [
    {
      address: accounts[3],
      shares: (new BN(loanParams.principal)).mul(new BN(15)).div(HUNDERED)
    },
    {
      address: accounts[4],
      shares: (new BN(loanParams.principal)).mul(new BN(50)).div(HUNDERED)
    },
    {
      address: accounts[5],
      shares: (new BN(loanParams.principal)).mul(new BN(25)).div(HUNDERED)
    },
    {
      address: accounts[6],
      shares: (new BN(loanParams.principal)).mul(new BN(9.9)).div(HUNDERED)
    },
    {
      address: accounts[7],
      shares: (new BN(loanParams.principal)).mul(new BN(0.1)).div(HUNDERED)
    }
  ];

  before(async () => {
    // Create a factory via App
    const data = encodeCall('initialize', ['address'], [appAddress]);
    const proxyAddress = await appCreate('enable-credit', 'CrowdloanFactory', accounts[1], data);
    crowdloanFactory = await CrowdloanFactory.at(proxyAddress);

    paymentToken = await PaymentToken.new();
    paymentToken.initialize(
      paymentTokenParams.name,
      paymentTokenParams.symbol,
      paymentTokenParams.decimals,
      [accounts[0]], // minters
      [], // pausers
    );
  });

  it('Factory should deploy successfully', async () => {
    assert.exists(crowdloanFactory.address, 'crowdloanFactory was not successfully deployed');
  });

  it('Factory should have App address initialized', async () => {
    const result = await crowdloanFactory.app();
    expect(result).to.be.equal(appAddress);
  });

  it('Borrower should successfully deploy crowdloan', async () => {

      const tx = await crowdloanFactory.deploy (
        paymentToken.address,
        ...Object.values(loanParams),
        ...Object.values(crowdfundParams),
        { from: borrower }
      );

      const loanCreated = expectEvent.inLogs( tx.logs, 'LoanCreated', {
          borrower,
          // amount: new BN(loanParams.pricipal)
      });

      expect(loanCreated.args.amount).to.be.bignumber.equal(new BN(loanParams.principal))

      crowdloan = await Crowdloan.at(loanCreated.args.crowdloan);
      termsContract = await TermsContract.at(loanCreated.args.termsContract);
      repaymentManager = await RepaymentManager.at(loanCreated.args.repaymentManager);

      // verify crowdloan contracts
      expect (
        await crowdloan.termsContract.call()
      ).to.be.equal(termsContract.address);

      expect (
        await crowdloan.repaymentManager.call()
      ).to.be.equal(repaymentManager.address);

      expect (
        await termsContract.borrower.call()
      ).to.be.equal(borrower);

      expect (
        await repaymentManager.termsContract.call()
      ).to.be.equal(termsContract.address);
  });

  it('should successfully startCrowdfund', async () => {
      const tx = await crowdloan.startCrowdfund({ from: borrower });

      await expectEvent.inTransaction(tx.tx, TermsContract, 'LoanStatusSet',{
        status: new BN(1) //FUNDING_STARTED
      });
      expect(await termsContract.getLoanStatus()).to.be.bignumber.equal(new BN(1));//FUNDING_STARTED
  });

  it('should successfully fund crowdloan', async () => {
      await Promise.all(lenders.map( lender => paymentToken.mint(lender.address, lender.shares)));

      await Promise.all(lenders.map( async lender => {
        const tx = await crowdloan.fund(lender.shares,
          {from: lender.address}
        );
        expectEvent.inLogs(tx.logs, 'Fund', {
          sender: lender.address,
          amount: lender.shares
        });
      }));

      expect(await termsContract.getLoanStatus()).to.be.bignumber.equal(new BN(3));//FUNDING_STARTED
  });

  it('should successfully withdraw', async () => {
      const test = new BN(1);
      const balance = await paymentToken.balanceOf(borrower);

      const tx = await crowdloan.withdraw(test,
        { from: borrower}
      );

      expectEvent.inLogs (tx.logs, 'ReleaseFunds', {
        borrower,
        amount: test
      });

      expect(await paymentToken.balanceOf(borrower)).to.be.bignumber.equal(test);
      expect(await termsContract.getLoanStatus()).to.be.bignumber.equal(new BN(3));

      await crowdloan.withdraw(await paymentToken.balanceOf(crowdloan.address),
        { from: borrower}
      );

      expect(await paymentToken.balanceOf(borrower)).to.be.bignumber.equal(new BN(loanParams.principal));
  });

  xit('should successfully fund crowdloan', async () => {
      await Promise.all(lenders.map( lender => paymentToken.mint(lender.address, lender.shares)));

      await Promise.all(lenders.map( async lender => {
        const tx = await crowdloan.fund(lender.shares,
          {from: lender.address}
        );
        expectEvent.inLogs(tx.logs, 'Fund', {
          sender: lender.address,
          amount: lender.shares
        });
      }));
  });

});
