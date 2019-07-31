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
import {BN, expectEvent, expectRevert, time} from 'openzeppelin-test-helpers';

const {expect} = require('chai');

const {appCreate, getAppAddress, encodeCall, revertEvm, snapShotEvm} = require('../testHelpers');
const {crowdfundParams, loanParams, loanStatuses, paymentTokenParams} = require('../testConstants');

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

  const TENTHOUSAND = new BN(10000);
  const borrower = accounts[2];
  const appAddress = getAppAddress();
  const lenders = [
    {
      address: accounts[1],
      shares: new BN(loanParams.principalRequested).mul(new BN(5000)).div(TENTHOUSAND)
    },
    {
      address: accounts[3],
      shares: new BN(loanParams.principalRequested).mul(new BN(2500)).div(TENTHOUSAND)
    },
    {
      address: accounts[4],
      shares: new BN(loanParams.principalRequested).mul(new BN(1500)).div(TENTHOUSAND)
    },
    {
      address: accounts[5],
      shares: new BN(loanParams.principalRequested).mul(new BN(500)).div(TENTHOUSAND)
    },
    {
      address: accounts[6],
      shares: new BN(loanParams.principalRequested).mul(new BN(300)).div(TENTHOUSAND)
    },
    {
      address: accounts[7],
      shares: new BN(loanParams.principalRequested).mul(new BN(100)).div(TENTHOUSAND)
    },
    {
      address: accounts[8],
      shares: new BN(loanParams.principalRequested).mul(new BN(99)).div(TENTHOUSAND)
    },
    {
      address: accounts[9],
      shares: new BN(loanParams.principalRequested).mul(new BN(1)).div(TENTHOUSAND)
    }
  ];

  const expectedTranchRepayment = async tranch =>
    (await termsContract.getScheduledPayment.call(new BN(tranch + 1)))[3];

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
      [] // pausers
    );
  });

  it('Factory should deploy successfully', async () => {
    assert.exists(crowdloanFactory.address, 'crowdloanFactory was not successfully deployed');
  });

  it('Factory should have App address initialized', async () => {
    const result = await crowdloanFactory.getApp();
    expect(result).to.be.equal(appAddress);
  });

  it('Borrower should successfully deploy crowdloan', async () => {
    const tx = await crowdloanFactory.deploy(
      paymentToken.address,
      ...Object.values(loanParams),
      ...Object.values(crowdfundParams),
      {from: borrower}
    );

    const loanCreated = expectEvent.inLogs(tx.logs, 'LoanCreated', {
      borrower,
      amount: new BN(loanParams.principalRequested)
    });

    expect(loanCreated.args.amount).to.be.bignumber.equal(new BN(loanParams.principalRequested));

    crowdloan = await Crowdloan.at(loanCreated.args.crowdloan);
    termsContract = await TermsContract.at(loanCreated.args.termsContract);
    repaymentManager = await RepaymentManager.at(loanCreated.args.repaymentManager);

    // verify crowdloan contracts
    expect(await crowdloan.termsContract.call()).to.be.equal(termsContract.address);

    expect(await crowdloan.repaymentManager.call()).to.be.equal(repaymentManager.address);

    expect(await termsContract.borrower.call()).to.be.equal(borrower);

    expect(await repaymentManager.termsContract.call()).to.be.equal(termsContract.address);
  });

  it('should successfully startCrowdfund', async () => {
    const tx = await crowdloan.startCrowdfund({from: borrower});

    await expectEvent.inTransaction(tx.tx, TermsContract, 'LoanStatusUpdated', {
      status: new BN(loanStatuses.FUNDING_STARTED) // FUNDING_STARTED
    });
    expect(await termsContract.getLoanStatus()).to.be.bignumber.equal(
      new BN(loanStatuses.FUNDING_STARTED)
    ); // FUNDING_STARTED
  });

  it('should successfully fund crowdloan', async () => {
    await Promise.all(lenders.map(lender => paymentToken.mint(lender.address, lender.shares)));

    await Promise.all(
      lenders.map(async lender => {
        await paymentToken.approve(crowdloan.address, lender.shares, {from: lender.address});
        const tx = await crowdloan.fund(lender.shares, {from: lender.address});
        expectEvent.inLogs(tx.logs, 'Fund', {
          sender: lender.address,
          amount: lender.shares
        });
      })
    );

    expect(await paymentToken.balanceOf.call(crowdloan.address)).to.be.bignumber.equal(
      new BN(loanParams.principalRequested)
    );
    expect(await termsContract.getLoanStatus()).to.be.bignumber.equal(
      new BN(loanStatuses.FUNDING_COMPLETE)
    ); // FUNDING_COMPLETE
  });

  it('should successfully withdraw', async () => {
    const test = new BN(1);
    const balance = await paymentToken.balanceOf(borrower);
    const tx = await crowdloan.methods['withdraw(uint256)'](test, {from: borrower});

    expectEvent.inLogs(tx.logs, 'ReleaseFunds', {
      borrower,
      amount: test
    });

    expect(await paymentToken.balanceOf(borrower)).to.be.bignumber.equal(test.add(balance));
    expect(await termsContract.getLoanStatus()).to.be.bignumber.equal(
      new BN(loanStatuses.REPAYMENT_CYCLE)
    ); // REPAYMENT_CYCLE

    const leftover = await paymentToken.balanceOf(crowdloan.address);
    await crowdloan.methods['withdraw(uint256)'](leftover, {from: borrower});

    expect(await paymentToken.balanceOf(borrower)).to.be.bignumber.gte(
      new BN(loanParams.principalRequested).add(balance)
    );
  });

  it('should successfully pay RepaymentManager from borrower', async () => {
    const monthPayment = await expectedTranchRepayment(0);

    await paymentToken.mint(borrower, monthPayment);
    await paymentToken.approve(repaymentManager.address, monthPayment, {from: borrower});

    const tx = await repaymentManager.pay(monthPayment, {from: borrower});
    expectEvent.inLogs(tx.logs, 'PaymentReceived', {
      from: borrower,
      amount: monthPayment
    });

    expect(await repaymentManager.totalPaid()).to.be.bignumber.equal(monthPayment);
  });

  it('should successfully release from RepaymentManager', async () => {
    const monthPayment = await expectedTranchRepayment(0);
    const totalShares = () => lenders.reduce((a, b) => a.add(b.shares), new BN(0));
    const expectedRepayment = (shares, payment, previousRelease) =>
      shares
        .mul(payment)
        .div(totalShares())
        .sub(previousRelease);

    expect(await repaymentManager.totalPaid()).to.be.bignumber.equal(monthPayment);

    await Promise.all(
      lenders.map(async lender => {
        const balance = await paymentToken.balanceOf(lender.address);
        const previousRelease = await repaymentManager.released.call(lender.address);
        const expectedRelease = expectedRepayment(lender.shares, monthPayment, previousRelease);

        expect(await repaymentManager.releaseAllowance.call(lender.address)).to.be.bignumber.equal(
          expectedRelease
        );

        if (expectedRelease.gt(new BN(0))) {
          const tx = await repaymentManager.release(lender.address, {from: lender.address});
          expectEvent.inLogs(tx.logs, 'PaymentReleased', {
            to: lender.address,
            amount: expectedRelease
          });
        } else {
          await expectRevert.unspecified(
            repaymentManager.release(lender.address, {from: lender.address}),
            'Account has zero release allowance'
          );
        }
        expect(await paymentToken.balanceOf(lender.address)).to.be.bignumber.gte(
          expectedRelease.add(balance)
        );
      })
    );
  });
  it('should successfully complete loan repayment', async () => {
    const MONTH = 86400 * 30; // seconds in a month: 30 days
    const BULKPERIOD = 2;

    const totalShares = () => lenders.reduce((a, b) => a.add(b.shares), new BN(0));
    const expectedRepayment = (shares, payment, previousRelease) =>
      shares
        .mul(payment)
        .div(totalShares())
        .sub(previousRelease);
    const serializePromise = promiseArray =>
      promiseArray.reduce((previousPromise, nextPromiseFn) => {
        return previousPromise.then(() => {
          return nextPromiseFn();
        });
      }, Promise.resolve());

    const bulkTranchRepayment = async tranch => {
      const total = new BN(0);
      await Promise.all(
        new Array(tranch)
          .fill('')
          .map(async (empty, ind) => total.iadd(await expectedTranchRepayment(ind)))
      );
      return total;
    };

    // Take evm snapshot, to be reverted, so as not to distort other tests (time manipulation)
    const snapShotId = await snapShotEvm();

    // Make bulk payment for BULKPERIOD
    const bulkpayment = (await bulkTranchRepayment(BULKPERIOD + 1)).sub(
      await expectedTranchRepayment(0)
    ); // +1 previously paid month
    await paymentToken.mint(borrower, bulkpayment);
    await paymentToken.approve(repaymentManager.address, bulkpayment, {from: borrower});

    await repaymentManager.pay(bulkpayment, {from: borrower});
    await time.increase(MONTH * 2);

    const remainderMonths = loanParams.loanPeriod - (BULKPERIOD + 1);
    const monthCycles = new Array(remainderMonths).fill('').map((empty, ind) => () =>
      new Promise(async resolve => {
        await time.increase(MONTH);
        const tranch = loanParams.loanPeriod - (remainderMonths - ind);
        const expectedTranch = await expectedTranchRepayment(tranch);
        await paymentToken.mint(borrower, expectedTranch);
        await paymentToken.approve(repaymentManager.address, expectedTranch, {from: borrower});

        await repaymentManager.pay(expectedTranch, {from: borrower});
        resolve();
      })
    );

    await serializePromise(monthCycles);
    expect(await termsContract.getLoanStatus.call()).to.be.bignumber.equal(
      new BN(loanStatuses.REPAYMENT_COMPLETE)
    ); // REPAYMENT_COMPLETE

    const totalPaid = await repaymentManager.totalPaid.call();
    expect(totalPaid).to.be.bignumber.equals(await bulkTranchRepayment(loanParams.loanPeriod));

    await Promise.all(
      lenders.map(async lender => {
        const balance = await paymentToken.balanceOf(lender.address);
        const previousRelease = await repaymentManager.released.call(lender.address);
        const expectedRelease = expectedRepayment(lender.shares, totalPaid, previousRelease);

        expect(await repaymentManager.releaseAllowance.call(lender.address)).to.be.bignumber.equal(
          expectedRelease
        );

        if (expectedRelease.gt(new BN(0))) {
          const tx = await repaymentManager.release(lender.address, {from: lender.address});
          expectEvent.inLogs(tx.logs, 'PaymentReleased', {
            to: lender.address,
            amount: expectedRelease
          });
        } else {
          await expectRevert.unspecified(
            repaymentManager.release(lender.address, {from: lender.address}),
            'Account has zero release allowance'
          );
        }
        expect(await paymentToken.balanceOf(lender.address)).to.be.bignumber.gte(
          expectedRelease.add(balance)
        );
      })
    );

    // Revert EVm to snapshot
    await revertEvm(snapShotId);
  });
});
