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

import {BN, expectEvent, expectRevert, time} from 'openzeppelin-test-helpers';
import {repaymentStatuses} from '../../testConstants';

const {expect} = require('chai');
const moment = require('moment');

const {
  loanStatuses,
  paymentTokenParams,
  loanParams,
  MAX_CROWDFUND
} = require('../../testConstants');
const {
  generateLoanScenario,
  generateRandomPaddedBN,
  generateRandomBN,
  getRandomPercentageOfBN
} = require('../../testHelpers');

const Crowdloan = artifacts.require('Crowdloan');
const PaymentToken = artifacts.require('StandaloneERC20');

const verbose = false;
const tolerance = new BN(10); // in wei

contract('RepaymentManager', accounts => {
  let paymentToken;
  let crowdloan;

  let lenders;
  let lender1;
  let lender2;
  let lender3;
  let loanParams;
  let repayments;

  // TODO(Dan): Refactor roles into testHelper
  const minter = accounts[1];
  const borrower = accounts[4];
  const controller = accounts[5];
  const nonLender = accounts[9];
  const nonBorrower = accounts[9];
  const nonControllers = [accounts[9]];

  beforeEach(async () => {
    paymentToken = await PaymentToken.new();
    await paymentToken.initialize(
      paymentTokenParams.name,
      paymentTokenParams.symbol,
      paymentTokenParams.decimals,
      [minter], // minters
      [] // pausers
    );

    // TODO(Dan): Make better generateLoanScenario
    ({lenders, loanParams, repayments} = generateLoanScenario(accounts));
    lender1 = lenders[0].address;
    lender2 = lenders[1].address;
    lender3 = lenders[2].address;

    crowdloan = await Crowdloan.new();
    crowdloan.initialize(
      borrower,
      paymentToken.address,
      loanParams.principalRequested,
      loanParams.crowdfundLength,
      loanParams.loanMetadataURL
    );
  });

  describe('increaseShares', async () => {
    let tx;
    let original;
    let lender;
    let increment;

    beforeEach(async () => {
      [lender] = lenders;
      increment = generateRandomPaddedBN(MAX_CROWDFUND);

      await crowdloan.startCrowdfund({from: borrower});
    });

    context('validations', async () => {
      xit('should not allow shares to be increased if crowdfund is over', async () => {});
    });

    context('functionality', async () => {
      beforeEach(async () => {
        original = await crowdloan.amountContributed(lender.address);
        tx = await crowdloan.fund(increment, {
          from: lender.address
        });
      });

      it('should increase the shares that lender has', async () => {
        const increased = await crowdloan.amountContributed(lender.address);
        expect(increased.sub(original)).to.be.bignumber.equal(increment);
      });
      it('should emit a Fund event', async () => {
        const increased = await crowdloan.amountContributed(lender.address);

        expectEvent.inLogs(tx.logs, 'Fund', {
          account: lender.address
        });
        expectEvent.inLogs(tx.logs, 'Fund', {
          sender: lender.address,
          amount: increased
        });
      });

      it('should emit a ShareIncreased event but not PayeeAdded event for existing shareholders', async () => {
        const newIncrement = generateRandomPaddedBN(10, 1);
        const newTx = await crowdloan.fund(newIncrement, {
          from: lender.address
        });
        expectEvent.inLogs(newTx.logs, 'ShareIncreased', {
          sender: lender.address
        });
      });
    });
  });

  describe('totalContributed', async () => {
    let original;
    let lender;

    beforeEach(async () => {
      [lender] = lenders;
      original = generateRandomPaddedBN(MAX_CROWDFUND);
      await crowdloan.fund(original, {from: lender.address});
    });

    it('increaseShares should increase the total number of shares', async () => {
      const increment = generateRandomPaddedBN(MAX_CROWDFUND);
      await crowdloan.fund(increment, {from: lender.address});

      const increased = await crowdloan.totalContributed();
      expect(increased.sub(original)).to.be.bignumber.equal(increment);
    });
  });
  describe('repay', async () => {
    beforeEach(async () => {
      repayments = [
        {address: borrower, value: repayments[0]},
        {address: lender1, value: repayments[1]}, // Test for strange edge case
        {address: nonLender, value: repayments[2]}
      ];

      await Promise.all(
        repayments.map(({address, value}) => {
          paymentToken.mint(address, value, {from: minter});
        })
      );
      await Promise.all(
        repayments.map(({address, value}) => {
          paymentToken.approve(crowdloan.address, value, {from: address});
        })
      );

      // Get the loan into a repaying state
      // Create crowdfund with 100 duration
      // Start crowdfund
      // Add all the funding
      // Ensure that it's over
    });
    context('validations', async () => {
      xit('should not allow zero pay amount ', async () => {
        await expectRevert(crowdloan.repay(new BN(0), {from: borrower}), 'No amount set to pay');
      });
      xit('should only allow repayment after crowdfund has started', async () => {
        const {address, value} = repayments[0];
        await expectRevert(
          crowdloan.pay(value, {from: address}),
          'Action only allowed while loan is Active'
        );
      });
      xit('should only allow pay if payer has at least amount in balance', async () => {});
    });
    context('functionality', async () => {
      xit('should let any address pay into contract multiple times', async () => {
        for (let i = 0; i < repayments.length; i += 1) {
          const original = await crowdloan.totalPaid(); // eslint-disable-line no-await-in-loop
          const {address, value} = repayments[i];
          const status = await termsContract.getLoanStatus(); // eslint-disable-line no-await-in-loop
          const principal = await termsContract.getPrincipalDisbursed(); // eslint-disable-line no-await-in-loop
          if (verbose)
            console.log(
              `Repayment: ${i}  |  original: ${original}  |  paid: ${value}  |  currentLoanStatus: ${status}  |  principalDisbursed: ${principal}`
            );

          await crowdloan.pay(value, {from: address}); // eslint-disable-line no-await-in-loop
          const after = await crowdloan.totalPaid(); // eslint-disable-line no-await-in-loop
          expect(after.sub(value)).to.be.bignumber.equals(original);
        }
        const final = await paymentToken.balanceOf(crowdloan.address); // Removes dependency on totalPaid();
        const expectedBalance = repayments.reduce(
          (total, payment) => total.add(payment.value),
          new BN(0)
        );
        expect(final).to.be.bignumber.equal(expectedBalance);
      });
      xit('should emit a PaymentReceived event', async () => {
        const {address, value} = repayments[0];
        const tx = await crowdloan.pay(value, {from: address});
        expectEvent.inLogs(tx.logs, 'PaymentReceived', {
          from: address,
          amount: value
        });
      });
    });
  });

  /** TODO(Dan): This is more of an e2e test */
  describe('releaseAllowance', async () => {
    let totalContributed;
    let totalRepayments;
    beforeEach(async () => {
      /** Create random share allocation among lenders */
      await Promise.all(
        lenders.map(({address, shares}) => {
          return crowdloan.increaseShares(address, shares, {from: controller});
        })
      );
      totalContributed = lenders.reduce((total, lender) => total.add(lender.shares), new BN(0));

      /** Create simulated repaymentby borrower to crowdloan */
      await termsContract.setLoanStatus(loanStatuses.REPAYMENT_CYCLE, {from: controller});
      totalRepayments = repayments.reduce((total, repayment) => total.add(repayment), new BN(0));
      if (verbose) {
        console.log(`Shares: ${await crowdloan.shares(lender1)}`);
        console.log(`Total Shares: ${totalContributed}`);
        console.log('totalRepayments: ', totalRepayments);
      }
      await paymentToken.mint(borrower, totalRepayments, {from: minter});
      await paymentToken.approve(crowdloan.address, totalRepayments, {from: borrower});
    });
    xit('should calculate correct releaseAllowance for lender after 1 repayment', async () => {
      await crowdloan.pay(repayments[0], {from: borrower});
      const allowance = await crowdloan.releaseAllowance.call(lenders[0].address);
      const releaseAllowances = await Promise.all(
        lenders.map(lender => crowdloan.releaseAllowance(lender.address))
      );
      releaseAllowances.map((releaseAllowance, i) => {
        const expected = repayments[0]
          .mul(lenders[i].shares)
          .div(totalContributed)
          .sub(new BN(0)); // No other withdrawals
        if (verbose) {
          console.log(`releaseAllowance: ${releaseAllowance}  |  expected: ${expected}`);
        }
        expect(releaseAllowance).to.be.bignumber.equals(expected);
      });
    });
    xit('should calculate correct releaseAllowance for lender after multiple repayments', async () => {
      await Promise.all(
        repayments.map(repayment => {
          crowdloan.pay(repayment, {from: borrower});
        })
      );
      const releaseAllowances = await Promise.all(
        lenders.map(lender => crowdloan.releaseAllowance(lender.address))
      );
      releaseAllowances.map((releaseAllowance, i) => {
        const expected = totalRepayments
          .mul(lenders[i].shares)
          .div(totalContributed)
          .sub(new BN(0)); // No other withdrawals
        if (verbose) {
          console.log(`releaseAllowance: ${releaseAllowance}  |  expected: ${expected}`);
        }
        expect(releaseAllowance).to.be.bignumber.equals(expected);
      });
    });
    /** Important edge case if borrower makes repayment and doesn't use `repay` */
    xit('should calculate correct releaseAllowance for lender after multiple repayments including external (i.e. native ERC20) transfers', async () => {
      await Promise.all(
        repayments.map(repayment => {
          crowdloan.pay(repayment, {from: borrower});
        })
      );
      // Send external (native ERC20) transfer
      const externalPayment = generateRandomPaddedBN(100);
      await paymentToken.mint(borrower, externalPayment, {from: minter});
      await paymentToken.transfer(crowdloan.address, externalPayment, {from: borrower});
      const total = totalRepayments.add(externalPayment);

      // Calculate release allowances
      const releaseAllowances = await Promise.all(
        lenders.map(lender => crowdloan.releaseAllowance(lender.address))
      );
      releaseAllowances.map((releaseAllowance, i) => {
        const expected = total
          .mul(lenders[i].shares)
          .div(totalContributed)
          .sub(new BN(0)); // No other withdrawals
        if (verbose) {
          console.log(`releaseAllowance: ${releaseAllowance}  |  expected: ${expected}`);
        }
        expect(releaseAllowance).to.be.bignumber.equals(expected);
      });
    });

    xit('should calculate correct releaseAllowance for lender after another lender has made withdrawal (i.e. no change)', async () => {});
    xit('should calculate correct releaseAllowance for lender after multiple other lenders have made withdrawals (i.e. no change)', async () => {});
    xit('should calculate correct releaseAllowance for lender after multiple withdrawals by lender', async () => {
      /* eslint-disable */ // TODO(Dan): Clean up the no-await-in-loop and no-func-in-loop problems below
      for (let i = 0; i < repayments.length; i += 1) {
        if (verbose) console.log(`repayment cycle: ${i}`);
        await crowdloan.pay(repayments[i], {from: borrower});

        // Check releaseAllowances
        const releaseAllowances = await Promise.all(
          lenders.map(lender => crowdloan.releaseAllowance(lender.address))
        );
        releaseAllowances.map(async (releaseAllowance, j) => {
          await crowdloan.totalReleased();
          const expected = repayments[i]
            .mul(lenders[j].shares)
            .div(totalContributed)
            .sub(new BN(0)); // No other withdrawals
          if (verbose) {
            console.log(
              `lender: ${j}  |  releaseAllowance: ${releaseAllowance}  |  expected: ${expected}`
            );
          }
          expect(releaseAllowance).to.be.bignumber.greaterThan(expected.sub(tolerance));
          expect(releaseAllowance).to.be.bignumber.lessThan(expected.add(tolerance));
        });

        await Promise.all(lenders.map(lender => crowdloan.release(lender.address)));
        const balance = await paymentToken.balanceOf(crowdloan.address);
        if (verbose) console.log('Balance after repayment cycle: ' + balance);
        expect(balance).to.be.bignumber.lessThan(tolerance);
      }
      /* eslint-enable */
    });
  });
  describe('release', async () => {
    beforeEach(async () => {
      /** Create random share allocation among lenders */
      await Promise.all(
        lenders.map(({address, shares}) => {
          return crowdloan.increaseShares(address, shares, {from: controller});
        })
      );
      const totalContributed = lenders.reduce(
        (total, lender) => total.add(lender.shares),
        new BN(0)
      );

      /** Create simulated repaymentby borrower to crowdloan */
      await termsContract.setLoanStatus(loanStatuses.REPAYMENT_CYCLE, {from: controller});
      await paymentToken.mint(borrower, totalContributed, {from: minter});
      await paymentToken.approve(crowdloan.address, totalContributed, {from: borrower});
      await crowdloan.pay(totalContributed, {from: borrower});
    });
    context('validations', async () => {
      xit('should not allow release if notActiveLoan', async () => {
        await termsContract.setLoanStatus(loanStatuses.FUNDING_STARTED, {from: controller});
        expect(await termsContract.getLoanStatus.call()).to.be.bignumber.equal(
          loanStatuses.FUNDING_STARTED
        );
        await expectRevert(
          crowdloan.release(lenders[0].address, {from: lenders[0].address}),
          'Action only allowed while loan is Active' // TODO(Dan): Should be changed to onlyActiveLoan
        );
      });
      xit('should not allow lender with 0 shares to withdraw', async () => {
        await expectRevert(
          crowdloan.release(nonLender, {from: nonLender}),
          'Account has zero shares'
        );
      });
      xit('should not allow lender with zero allowance to withdraw', async () => {
        const {address} = lenders[0];
        await crowdloan.release(address, {from: address});
        await expectRevert(
          crowdloan.release(address, {from: address}),
          'Account has zero release allowance'
        );
      });
    });
    context('functionality', async () => {
      let tx;
      let address;
      let releaseAllowance;
      let lenderBalanceBefore;
      let releasedBefore;
      let totalReleasedBefore;

      beforeEach(async () => {
        [{address}] = lenders;
        lenderBalanceBefore = await paymentToken.balanceOf(address);
        releasedBefore = await crowdloan.released(address);
        totalReleasedBefore = await crowdloan.totalReleased();
        releaseAllowance = await crowdloan.releaseAllowance(address);
        tx = await crowdloan.release(address, {from: address});
      });
      xit('should transfer releaseAllowance to account', async () => {
        const lenderBalanceAfter = await paymentToken.balanceOf(address);
        expect(lenderBalanceAfter.sub(lenderBalanceBefore)).to.be.bignumber.equals(
          releaseAllowance
        );
      });
      xit('should have a 0 releaseAllowance after', async () => {
        const releaseAllowanceAfter = await crowdloan.releaseAllowance(address);
        expect(releaseAllowanceAfter).to.be.a.bignumber.equals(new BN(0));
      });
      xit('should increase releasedAfter to account', async () => {
        const releasedAfter = await crowdloan.released(address);
        expect(releasedAfter.sub(releasedBefore)).to.be.a.bignumber.equals(releaseAllowance);
      });
      xit('should increase totalReleased by crowdloan', async () => {
        const totalReleasedAfter = await crowdloan.totalReleased();
        expect(totalReleasedAfter.sub(totalReleasedBefore)).to.be.a.bignumber.equals(
          releaseAllowance
        );
      });
      xit('should generate a PaymentReleased event', async () => {
        expectEvent.inLogs(tx.logs, 'PaymentReleased', {
          to: address,
          amount: releaseAllowance
        });
      });
    });
  });
  describe('totalReleased', async () => {
    it('already implicitly tested in `release` function');
  });
  describe('released', async () => {
    it('already implicitly tested in `release` function');
  });
  describe('totalPaid', async () => {
    // Mission critical function because `releaseAllowance` depends on totalPaid()
    let totalPaidBefore;
    let randomPayment;
    beforeEach(async () => {
      await Promise.all(
        lenders.map(({address, shares}) => {
          return crowdloan.increaseShares(address, shares, {from: controller});
        })
      );
      await termsContract.setLoanStatus(loanStatuses.REPAYMENT_CYCLE, {from: controller});
      totalPaidBefore = await crowdloan.totalPaid();
      randomPayment = generateRandomPaddedBN(MAX_CROWDFUND);
      await paymentToken.mint(borrower, randomPayment, {from: minter});
      await paymentToken.approve(crowdloan.address, randomPayment, {from: borrower});
    });
    xit('should increase totalPaid by correct amount', async () => {
      await crowdloan.pay(randomPayment, {from: borrower});
      const totalPaidAfter = await crowdloan.totalPaid();
      expect(totalPaidAfter.sub(totalPaidBefore)).to.be.a.bignumber.equals(randomPayment);
    });
    xit('should account for native ERC20 transfers', async () => {
      await paymentToken.transfer(crowdloan.address, randomPayment, {from: borrower});
      const totalPaidAfter = await crowdloan.totalPaid();
      expect(totalPaidAfter.sub(totalPaidBefore)).to.be.a.bignumber.equals(randomPayment);
    });
    xit('should not change with withdrawals', async () => {
      await crowdloan.pay(randomPayment, {from: borrower});
      const [{address}] = lenders;
      const before = await crowdloan.totalPaid();
      await crowdloan.release(address, {from: address});
      const after = await crowdloan.totalPaid();
      expect(before).to.be.a.bignumber.equals(after);
    });
  });
  describe('getRepaymentStatus', async () => {
    let loanStartTimestamp;
    let start;
    let oneMonth;
    let afterLoanPeriod;

    beforeEach(async () => {
      await termsContract.startRepaymentCycle(loanParams.principalRequested, {from: controller});
      const params = await termsContract.getLoanParams();
      ({loanStartTimestamp} = params);
      start = moment.unix(loanStartTimestamp);
    });
    context('after 1 month', async () => {
      let expected;

      beforeEach(async () => {
        // Set time
        oneMonth = start
          .clone()
          .add(1, 'months')
          .unix();
        await time.increaseTo(oneMonth);

        // Get expected repayment values
        expected = await termsContract.methods['getExpectedRepaymentValue(uint256)'].call(oneMonth);
        if (verbose) {
          console.log(`Expected: ${expected}`);
          const result = await termsContract.getScheduledPayment.call(1);
          console.log(
            `Results  |  Timestamp : ${result.dueTimestamp}  |  Principal : ${result.principalPayment}  |  Interest: ${result.interestPayment}  |  totalPayment: ${result.totalPayment}`
          );
        }

        // Create money for borrower
        await paymentToken.mint(borrower, expected, {from: minter});
        await paymentToken.approve(crowdloan.address, expected, {from: borrower});
      });
      // Don't make enough payment
      xit('should return DEFAULT if insufficient payment', async () => {
        const insufficient = expected.sub(new BN(100));
        await crowdloan.pay(insufficient, {from: borrower});
        const status = await crowdloan.getRepaymentStatus.call();
        if (verbose) console.log(`Repayment Status: ${status}`);
        expect(status).to.be.bignumber.equals(repaymentStatuses.DEFAULT);
      });
      xit('should return ON_TIME if sufficient payment', async () => {
        await crowdloan.pay(expected, {from: borrower});
        const status = await crowdloan.getRepaymentStatus.call();
        if (verbose) console.log(`Repayment Status: ${status}`);
        expect(status).to.be.bignumber.equals(repaymentStatuses.ON_TIME);
      });
    });
    context('one month after loan period', async () => {
      let expected;
      beforeEach(async () => {
        afterLoanPeriod = start
          .clone()
          .add(loanParams.loanPeriod + 1, 'months')
          .unix();
        await time.increaseTo(afterLoanPeriod);

        expected = await termsContract.methods['getExpectedRepaymentValue(uint256)'].call(
          afterLoanPeriod
        );
        if (verbose) console.log(`Expected: ${expected}`);

        await paymentToken.mint(borrower, expected, {from: minter});
        await paymentToken.approve(crowdloan.address, expected, {from: borrower});
      });
      xit('should return ON_TIME if loan is fully paid off', async () => {
        const insufficient = expected.sub(new BN(100));
        await crowdloan.pay(insufficient, {from: borrower});
        const status = await crowdloan.getRepaymentStatus();
        if (verbose) console.log(`Repayment Status: ${status}`);
        expect(status).to.be.bignumber.equals(repaymentStatuses.DEFAULT);
      });
      xit('should return DEFAULT if loan is not fully paid off', async () => {
        await crowdloan.pay(expected, {from: borrower});
        const status = await crowdloan.getRepaymentStatus();
        if (verbose) console.log(`Repayment Status: ${status}`);
        expect(status).to.be.bignumber.equals(repaymentStatuses.ON_TIME);
      });
    });
  });
});
