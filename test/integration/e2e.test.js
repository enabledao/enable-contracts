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
const {DECIMAL_SHIFT, TENTHOUSAND, crowdfundParams, loanParams, loanStatuses, paymentTokenParams} = require('../testConstants');

const CrowdloanFactory = artifacts.require('CrowdloanFactory');
const Crowdloan = artifacts.require('Crowdloan');
const PaymentToken = artifacts.require('StandaloneERC20');

const MONTH = 86400 * 30; // seconds in a month: 30 days

contract('Enable Suite', accounts => {
  let crowdloanFactory;
  let paymentToken;
  let crowdloan;

  const borrower = accounts[2];
  const contractAdmin = accounts[6];
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
      shares: new BN(loanParams.principalRequested).mul(new BN(800)).div(TENTHOUSAND)
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

  const randomAmount = () => new BN(
    (Number(loanParams.principalRequested)*Math.random).toFixed()
  );
  const totalShares = () => lenders.reduce((a, b) => a.add(b.shares), new BN(0));
  const expectedWithdrawal = (shares, payment, previousRelease) =>
    shares
      .mul(payment)
      .div(totalShares())
      .sub(previousRelease);

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
    const result = await crowdloanFactory.app();
    expect(result).to.be.equal(appAddress);
  });

  it('Borrower should successfully deploy crowdloan', async () => {
    const tx = await crowdloanFactory.deploy(
      paymentToken.address,
      loanParams.principalRequested.toString(),
      loanParams.crowdfundLength.toString(),
      loanParams.loanMetadataURL,
      contractAdmin,
      {from: borrower}
    );

    const loanCreated = expectEvent.inLogs(tx.logs, 'LoanCreated', {
      borrower,
      principalRequested: new BN(loanParams.principalRequested)
    });

    crowdloan = await Crowdloan.at(loanCreated.args.crowdloan);
  });

  it('should successfully startCrowdfund', async () => {
    expect(await crowdloan.crowdfundStart.call()).to.be.bignumber.be.equal(new BN(0));
    const tx = await crowdloan.startCrowdfund({from: borrower});

    await expectEvent.inTransaction(tx.tx, Crowdloan, 'StartCrowdfund');
    expect(await crowdloan.crowdfundStart.call()).to.be.bignumber.gt(new BN(0));
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
  });

  it('should successfully withdrawPrincipal', async () => {
    const test = new BN(1);
    const balance = await paymentToken.balanceOf(borrower);
    const tx = await crowdloan.withdrawPrincipal(test, {from: borrower});

    expectEvent.inLogs(tx.logs, 'WithdrawPrincipal', {
      borrower,
      amount: test
    });

    expect(await paymentToken.balanceOf(borrower)).to.be.bignumber.equal(test.add(balance));

    const leftover = await paymentToken.balanceOf.call(crowdloan.address);
    await crowdloan.withdrawPrincipal(leftover, {from: borrower});

    expect(await paymentToken.balanceOf(borrower)).to.be.bignumber.gte(
      new BN(loanParams.principalRequested).add(balance)
    );
  });

  it('should successfully pay RepaymentManager from borrower', async () => {

    const monthPayment = new BN(100).mul(DECIMAL_SHIFT);

    await time.increase(loanParams.crowdfundLength); //Accelerate to end of loan term

    await paymentToken.mint(borrower, monthPayment);
    await paymentToken.approve(crowdloan.address, monthPayment, {from: borrower});

    const tx = await crowdloan.repay(monthPayment, {from: borrower});
    expectEvent.inLogs(tx.logs, 'Repay', {
      amount: monthPayment
    });

    expect(await crowdloan.amountRepaid()).to.be.bignumber.equal(monthPayment);
  });

  it('should successfully withdrawRepayment from RepaymentManager', async () => {
    const amountRepaid = await crowdloan.amountRepaid.call();

    await Promise.all(
      lenders.map(async lender => {
        const balance = await paymentToken.repaymentWithdrawn.call(lender.address);
        const repaymentWithdrawn = await crowdloan.released.call(lender.address);
        const dueWithdrawal = expectedWithdrawal(lender.shares, amountRepaid, repaymentWithdrawn);

        if (dueWithdrawal.gt(new BN(0))) {
          const tx = await crowdloan.withdrawRepayment(lender.address, {from: lender.address});
          expectEvent.inLogs(tx.logs, 'WithdrawRepayment', {
            lender: lender.address,
            amount: dueWithdrawal
          });
        } else {
          await expectRevert.unspecified(
            crowdloan.withdrawRepayment(lender.address, {from: lender.address}),
            'Withdrawal amount cannot be zero'
          );
        }
        expect(await paymentToken.balanceOf(lender.address)).to.be.bignumber.gte(
          expectedWithdrawal.add(balance)
        );
      })
    );
  });
  xit('should successfully complete loan repayment', async () => {
    const BULKPERIOD = 2;

    const serializePromise = promiseArray =>
      promiseArray.reduce((previousPromise, nextPromiseFn) => {
        return previousPromise.then(() => {
          return nextPromiseFn();
        });
      }, Promise.resolve());dd(b.shares), new BN(0));
    const expectedWithdrawal = (shares, payment, repaymentWithdrawn) =>
      shares
        .mul(payment)
        .div(totalShares())
        .sub(repaymentWithdrawn);



    const bulkTranchRepayment = async tranch => {
      const total = new BN(0);
      await Promise.all(
        new Array(tranch)
          .fill('')
          .map(async (empty, ind) => total.iadd(randomAmount()))
      );
      return total;
    };

    // Take evm snapshot, to be reverted, so as not to distort other tests (time manipulation)
    const snapShotId = await snapShotEvm();

    // Make bulk payment for BULKPERIOD
    const bulkpayment = (await bulkTranchRepayment(BULKPERIOD + 1)).sub(
      randomAmount()
    ); // +1 previously paid month
    await paymentToken.mint(borrower, bulkpayment);
    await paymentToken.approve(crowdloan.address, bulkpayment, {from: borrower});

    await crowdloan.pay(bulkpayment, {from: borrower});
    await time.increase(MONTH * 2);

    const remainderMonths = loanParams.loanPeriod - (BULKPERIOD + 1);
    const monthCycles = new Array(remainderMonths).fill('').map((empty, ind) => () =>
      new Promise(async resolve => {
        await time.increase(MONTH);
        const tranch = loanParams.loanPeriod - (remainderMonths - ind);
        const expectedTranch = randomAmount();
        await paymentToken.mint(borrower, expectedTranch);
        await paymentToken.approve(crowdloan.address, expectedTranch, {from: borrower});

        await crowdloan.pay(expectedTranch, {from: borrower});
        resolve();
      })
    );

    await serializePromise(monthCycles);
    expect(await crowdloan.getLoanStatus.call()).to.be.bignumber.equal(
      new BN(loanStatuses.REPAYMENT_COMPLETE)
    ); // REPAYMENT_COMPLETE

    const totalPaid = await crowdloan.totalPaid.call();
    expect(totalPaid).to.be.bignumber.equals(await bulkTranchRepayment(loanParams.loanPeriod));

    await Promise.all(
      lenders.map(async lender => {
        const balance = await paymentToken.balanceOf(lender.address);
        const previousRelease = await crowdloan.released.call(lender.address);
        const expectedRelease = expectedRepayment(lender.shares, totalPaid, previousRelease);

        expect(await crowdloan.releaseAllowance.call(lender.address)).to.be.bignumber.equal(
          expectedRelease
        );

        if (expectedRelease.gt(new BN(0))) {
          const tx = await crowdloan.release(lender.address, {from: lender.address});
          expectEvent.inLogs(tx.logs, 'PaymentReleased', {
            to: lender.address,
            amount: expectedRelease
          });
        } else {
          await expectRevert.unspecified(
            crowdloan.release(lender.address, {from: lender.address}),
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
