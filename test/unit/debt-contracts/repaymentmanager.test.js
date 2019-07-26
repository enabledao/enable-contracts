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

const {loanStatuses, paymentTokenParams, MAX_CROWDFUND} = require('../../testConstants');
const {
  generateLoanScenario,
  generateRandomPaddedBN,
  generateRandomBN,
  getRandomPercentageOfBN
} = require('../../testHelpers');

const RepaymentManager = artifacts.require('RepaymentManager');
const TermsContract = artifacts.require('TermsContract');
const PaymentToken = artifacts.require('StandaloneERC20');

const verbose = false;
const tolerance = new BN(10); // in wei

contract('RepaymentManager', accounts => {
  let paymentToken;
  let termsContract;
  let repaymentManager;

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

    termsContract = await TermsContract.new();
    repaymentManager = await RepaymentManager.new();

    await termsContract.initialize(borrower, paymentToken.address, ...Object.values(loanParams), [
      controller,
      repaymentManager.address
    ]);
    await repaymentManager.initialize(termsContract.address, [controller]);
  });

  context('should deploy correctly', async () => {
    it('RepaymentManager should deploy successfully', async () => {
      assert.exists(repaymentManager.address, 'repaymentManager was not successfully deployed');
    });

    it('RepaymentManager should have TermsContract address initialized', async () => {
      const result = await repaymentManager.termsContract.call();
      expect(result).to.be.equal(termsContract.address);
    });
  });

  describe('increaseShares', async () => {
    let tx;
    let original;
    let lender;
    let increment;

    beforeEach(async () => {
      [lender] = lenders;
      increment = generateRandomPaddedBN(MAX_CROWDFUND);
    });

    context('validations', async () => {
      it('should not allow non-controllers to add lender', async () => {
        await expectRevert(
          repaymentManager.increaseShares(lender.address, increment, {from: nonControllers[0]}),
          'Permission denied'
        );
      });
      it('should not allow shares to be increased if crowdfund is over', async () => {
        await termsContract.setLoanStatus(loanStatuses.FUNDING_FAILED, {from: controller}); // FUNDING_FAILED
        await expectRevert(
          repaymentManager.increaseShares(lender.address, increment, {from: controller}),
          'Action only allowed before loan funding failed'
        );
      });
      xit('should not allow lender with zero address', async () => {});
      xit('should not allow zero shares increment', async () => {});
    });

    context('functionality', async () => {
      beforeEach(async () => {
        original = await repaymentManager.shares(lender.address);
        tx = await repaymentManager.increaseShares(lender.address, increment, {
          from: controller
        });
      });
      it('should increase the shares that lender has', async () => {
        const increased = await repaymentManager.shares(lender.address);
        expect(increased.sub(original)).to.be.bignumber.equal(increment);
      });
      it('should emit a PayeeAdded event and ShareIncreased event for new shareholders', async () => {
        expectEvent.inLogs(tx.logs, 'PayeeAdded', {
          account: lender.address
        });
        expectEvent.inLogs(tx.logs, 'ShareIncreased', {
          account: lender.address,
          sharesAdded: increment
        });
      });
      it('should emit a ShareIncreased event but not PayeeAdded event for existing shareholders', async () => {
        const newIncrement = generateRandomPaddedBN(10, 1);
        const newTx = await repaymentManager.increaseShares(lender.address, newIncrement, {
          from: controller
        });
        expectEvent.inLogs(newTx.logs, 'ShareIncreased', {
          account: lender.address,
          sharesAdded: newIncrement
        });
        try {
          expectEvent.inLogs(newTx.logs, 'PayeeAdded', {
            account: lender.address
          });
        } catch (err) {
          expect(err.message).to.contain("There is no 'PayeeAdded'");
        }
      });
    });
  });
  describe('decreaseShares', async () => {
    let tx;
    let original;
    let payee;
    let decrement;

    beforeEach(async () => {
      [payee] = lenders;
      original = generateRandomPaddedBN(MAX_CROWDFUND);
      decrement = new BN(100);
    });

    context('validations', async () => {
      xit('should not allow payee with zero shares to decrease shares', async () => {});
      xit('should not allow payee with zero address', async () => {});
      it('should not allow zero shares decrement', async () => {
        await expectRevert(
          repaymentManager.decreaseShares(payee.address, decrement, {from: controller}),
          'Account has zero shares'
        );
      });
      it('should not allow shares to be decreased if crowdfund is over', async () => {
        await repaymentManager.increaseShares(payee.address, original, {from: controller});
        await termsContract.setLoanStatus(loanStatuses.FUNDING_COMPLETE, {from: controller});
        await expectRevert(
          repaymentManager.decreaseShares(payee.address, decrement, {from: controller}),
          'Action only allowed before loan funding is completed'
        );
      });
    });

    context('functionality', async () => {
      beforeEach(async () => {
        await repaymentManager.increaseShares(payee.address, original, {from: controller});
        tx = await repaymentManager.decreaseShares(payee.address, decrement, {from: controller});
      });
      it('should decrease the shares that a payee has', async () => {
        const decreased = await repaymentManager.shares(payee.address);
        expect(original.sub(decreased)).to.be.bignumber.equal(decrement);
      });
      it('should emit a ShareDecreased event', async () => {
        expectEvent.inLogs(tx.logs, 'ShareDecreased', {
          account: payee.address,
          sharesRemoved: decrement
        });
      });
    });
  });
  describe('totalShares', async () => {
    let original;
    let lender;
    beforeEach(async () => {
      [lender] = lenders;
      original = generateRandomPaddedBN(MAX_CROWDFUND);
      await repaymentManager.increaseShares(lender.address, original, {from: controller});
    });
    it('increaseShares should increase the total number of shares', async () => {
      const increment = generateRandomPaddedBN(MAX_CROWDFUND);
      await repaymentManager.increaseShares(lender.address, increment, {from: controller});
      const increased = await repaymentManager.totalShares();
      expect(increased.sub(original)).to.be.bignumber.equal(increment);
    });
    it('decreaseShares should decrease the total number of shares', async () => {
      const decrement = new BN(10);
      await repaymentManager.decreaseShares(lender.address, decrement, {from: controller});
      const decreased = await repaymentManager.totalShares();
      expect(decreased.add(decrement)).to.be.bignumber.equal(original);
    });
  });
  describe('shares', async () => {
    xit('implicitly tested in increaseShares and decreaseShares tests');
  });
  describe('pay', async () => {
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
          paymentToken.approve(repaymentManager.address, value, {from: address});
        })
      );
    });
    context('validations', async () => {
      it('should not allow zero pay amount ', async () => {
        await termsContract.setLoanStatus(loanStatuses.REPAYMENT_CYCLE, {from: controller});
        await expectRevert(
          repaymentManager.pay(new BN(0), {from: borrower}),
          'No amount set to pay'
        );
      });
      it('should only allow repayment after crowdfund has started', async () => {
        const {address, value} = repayments[0];
        await expectRevert(
          repaymentManager.pay(value, {from: address}),
          'Action only allowed while loan is Active'
        );
      });
      xit('should only allow pay if payer has at least amount in balance', async () => {});
    });
    context('functionality', async () => {
      beforeEach(async () => {
        await termsContract.setLoanStatus(loanStatuses.REPAYMENT_CYCLE, {from: controller});
      });
      it('should let any address pay into contract multiple times', async () => {
        for (let i = 0; i < repayments.length; i += 1) {
          const original = await repaymentManager.totalPaid(); // eslint-disable-line no-await-in-loop
          const {address, value} = repayments[i];
          const status = await termsContract.getLoanStatus(); // eslint-disable-line no-await-in-loop
          const principal = await termsContract.getPrincipalDisbursed(); // eslint-disable-line no-await-in-loop
          if (verbose)
            console.log(
              `Repayment: ${i}  |  original: ${original}  |  paid: ${value}  |  currentLoanStatus: ${status}  |  principalDisbursed: ${principal}`
            );

          await repaymentManager.pay(value, {from: address}); // eslint-disable-line no-await-in-loop
          const after = await repaymentManager.totalPaid(); // eslint-disable-line no-await-in-loop
          expect(after.sub(value)).to.be.bignumber.equals(original);
        }
        const final = await paymentToken.balanceOf(repaymentManager.address); // Removes dependency on totalPaid();
        const expectedBalance = repayments.reduce(
          (total, payment) => total.add(payment.value),
          new BN(0)
        );
        expect(final).to.be.bignumber.equal(expectedBalance);
      });
      it('should emit a PaymentReceived event', async () => {
        const {address, value} = repayments[0];
        const tx = await repaymentManager.pay(value, {from: address});
        expectEvent.inLogs(tx.logs, 'PaymentReceived', {
          from: address,
          amount: value
        });
      });
    });
  });

  /** TODO(Dan): This is more of an e2e test */
  describe('releaseAllowance', async () => {
    let totalShares;
    let totalRepayments;
    beforeEach(async () => {
      /** Create random share allocation among lenders */
      await Promise.all(
        lenders.map(({address, shares}) => {
          return repaymentManager.increaseShares(address, shares, {from: controller});
        })
      );
      totalShares = lenders.reduce((total, lender) => total.add(lender.shares), new BN(0));

      /** Create simulated repaymentby borrower to repaymentManager */
      await termsContract.setLoanStatus(loanStatuses.REPAYMENT_CYCLE, {from: controller});
      totalRepayments = repayments.reduce((total, repayment) => total.add(repayment), new BN(0));
      if (verbose) {
        console.log(`Shares: ${await repaymentManager.shares(lender1)}`);
        console.log(`Total Shares: ${totalShares}`);
        console.log('totalRepayments: ', totalRepayments);
      }
      await paymentToken.mint(borrower, totalRepayments, {from: minter});
      await paymentToken.approve(repaymentManager.address, totalRepayments, {from: borrower});
    });
    it('should calculate correct releaseAllowance for lender after 1 repayment', async () => {
      await repaymentManager.pay(repayments[0], {from: borrower});
      const allowance = await repaymentManager.releaseAllowance.call(lenders[0].address);
      const releaseAllowances = await Promise.all(
        lenders.map(lender => repaymentManager.releaseAllowance(lender.address))
      );
      releaseAllowances.map((releaseAllowance, i) => {
        const expected = repayments[0]
          .mul(lenders[i].shares)
          .div(totalShares)
          .sub(new BN(0)); // No other withdrawals
        if (verbose) {
          console.log(`releaseAllowance: ${releaseAllowance}  |  expected: ${expected}`);
        }
        expect(releaseAllowance).to.be.bignumber.equals(expected);
      });
    });
    it('should calculate correct releaseAllowance for lender after multiple repayments', async () => {
      await Promise.all(
        repayments.map(repayment => {
          repaymentManager.pay(repayment, {from: borrower});
        })
      );
      const releaseAllowances = await Promise.all(
        lenders.map(lender => repaymentManager.releaseAllowance(lender.address))
      );
      releaseAllowances.map((releaseAllowance, i) => {
        const expected = totalRepayments
          .mul(lenders[i].shares)
          .div(totalShares)
          .sub(new BN(0)); // No other withdrawals
        if (verbose) {
          console.log(`releaseAllowance: ${releaseAllowance}  |  expected: ${expected}`);
        }
        expect(releaseAllowance).to.be.bignumber.equals(expected);
      });
    });
    /** Important edge case if borrower makes repayment and doesn't use `repay` */
    it('should calculate correct releaseAllowance for lender after multiple repayments including external (i.e. native ERC20) transfers', async () => {
      await Promise.all(
        repayments.map(repayment => {
          repaymentManager.pay(repayment, {from: borrower});
        })
      );
      // Send external (native ERC20) transfer
      const externalPayment = generateRandomPaddedBN(100);
      await paymentToken.mint(borrower, externalPayment, {from: minter});
      await paymentToken.transfer(repaymentManager.address, externalPayment, {from: borrower});
      const total = totalRepayments.add(externalPayment);

      // Calculate release allowances
      const releaseAllowances = await Promise.all(
        lenders.map(lender => repaymentManager.releaseAllowance(lender.address))
      );
      releaseAllowances.map((releaseAllowance, i) => {
        const expected = total
          .mul(lenders[i].shares)
          .div(totalShares)
          .sub(new BN(0)); // No other withdrawals
        if (verbose) {
          console.log(`releaseAllowance: ${releaseAllowance}  |  expected: ${expected}`);
        }
        expect(releaseAllowance).to.be.bignumber.equals(expected);
      });
    });

    it('should calculate correct releaseAllowance for lender after another lender has made withdrawal (i.e. no change)', async () => {});
    it('should calculate correct releaseAllowance for lender after multiple other lenders have made withdrawals (i.e. no change)', async () => {});
    it('should calculate correct releaseAllowance for lender after multiple withdrawals by lender', async () => {
      /* eslint-disable */ // TODO(Dan): Clean up the no-await-in-loop and no-func-in-loop problems below
      for (let i = 0; i < repayments.length; i += 1) {
        if (verbose) console.log(`repayment cycle: ${i}`);
        await repaymentManager.pay(repayments[i], {from: borrower});

        // Check releaseAllowances
        const releaseAllowances = await Promise.all(
          lenders.map(lender => repaymentManager.releaseAllowance(lender.address))
        );
        releaseAllowances.map(async (releaseAllowance, j) => {
          await repaymentManager.totalReleased();
          const expected = repayments[i]
            .mul(lenders[j].shares)
            .div(totalShares)
            .sub(new BN(0)); // No other withdrawals
          if (verbose) {
            console.log(
              `lender: ${j}  |  releaseAllowance: ${releaseAllowance}  |  expected: ${expected}`
            );
          }
          expect(releaseAllowance).to.be.bignumber.greaterThan(expected.sub(tolerance));
          expect(releaseAllowance).to.be.bignumber.lessThan(expected.add(tolerance));
        });

        await Promise.all(lenders.map(lender => repaymentManager.release(lender.address)));
        const balance = await paymentToken.balanceOf(repaymentManager.address);
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
          return repaymentManager.increaseShares(address, shares, {from: controller});
        })
      );
      const totalShares = lenders.reduce((total, lender) => total.add(lender.shares), new BN(0));

      /** Create simulated repaymentby borrower to repaymentManager */
      await termsContract.setLoanStatus(loanStatuses.REPAYMENT_CYCLE, {from: controller});
      await paymentToken.mint(borrower, totalShares, {from: minter});
      await paymentToken.approve(repaymentManager.address, totalShares, {from: borrower});
      await repaymentManager.pay(totalShares, {from: borrower});
    });
    context('validations', async () => {
      it('should not allow release if notActiveLoan', async () => {
        await termsContract.setLoanStatus(loanStatuses.FUNDING_STARTED, {from: controller});
        expect(await termsContract.getLoanStatus.call()).to.be.bignumber.equal(loanStatuses.FUNDING_STARTED);
        await expectRevert(
          repaymentManager.release(lenders[0].address, {from: lenders[0].address}),
          'Action only allowed while loan is Active' // TODO(Dan): Should be changed to onlyActiveLoan
        );
      });
      it('should not allow lender with 0 shares to withdraw', async () => {
        await expectRevert(
          repaymentManager.release(nonLender, {from: nonLender}),
          'Account has zero shares'
        );
      });
      it('should not allow lender with zero allowance to withdraw', async () => {
        const {address} = lenders[0];
        await repaymentManager.release(address, {from: address});
        await expectRevert(
          repaymentManager.release(address, {from: address}),
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
        releasedBefore = await repaymentManager.released(address);
        totalReleasedBefore = await repaymentManager.totalReleased();
        releaseAllowance = await repaymentManager.releaseAllowance(address);
        tx = await repaymentManager.release(address, {from: address});
      });
      it('should transfer releaseAllowance to account', async () => {
        const lenderBalanceAfter = await paymentToken.balanceOf(address);
        expect(lenderBalanceAfter.sub(lenderBalanceBefore)).to.be.bignumber.equals(
          releaseAllowance
        );
      });
      it('should have a 0 releaseAllowance after', async () => {
        const releaseAllowanceAfter = await repaymentManager.releaseAllowance(address);
        expect(releaseAllowanceAfter).to.be.a.bignumber.equals(new BN(0));
      });
      it('should increase releasedAfter to account', async () => {
        const releasedAfter = await repaymentManager.released(address);
        expect(releasedAfter.sub(releasedBefore)).to.be.a.bignumber.equals(releaseAllowance);
      });
      it('should increase totalReleased by repaymentManager', async () => {
        const totalReleasedAfter = await repaymentManager.totalReleased();
        expect(totalReleasedAfter.sub(totalReleasedBefore)).to.be.a.bignumber.equals(
          releaseAllowance
        );
      });
      it('should generate a PaymentReleased event', async () => {
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
          return repaymentManager.increaseShares(address, shares, {from: controller});
        })
      );
      await termsContract.setLoanStatus(loanStatuses.REPAYMENT_CYCLE, {from: controller});
      totalPaidBefore = await repaymentManager.totalPaid();
      randomPayment = generateRandomPaddedBN(MAX_CROWDFUND);
      await paymentToken.mint(borrower, randomPayment, {from: minter});
      await paymentToken.approve(repaymentManager.address, randomPayment, {from: borrower});
    });
    it('should increase totalPaid by correct amount', async () => {
      await repaymentManager.pay(randomPayment, {from: borrower});
      const totalPaidAfter = await repaymentManager.totalPaid();
      expect(totalPaidAfter.sub(totalPaidBefore)).to.be.a.bignumber.equals(randomPayment);
    });
    it('should account for native ERC20 transfers', async () => {
      await paymentToken.transfer(repaymentManager.address, randomPayment, {from: borrower});
      const totalPaidAfter = await repaymentManager.totalPaid();
      expect(totalPaidAfter.sub(totalPaidBefore)).to.be.a.bignumber.equals(randomPayment);
    });
    it('should not change with withdrawals', async () => {
      await repaymentManager.pay(randomPayment, {from: borrower});
      const [{address}] = lenders;
      const before = await repaymentManager.totalPaid();
      await repaymentManager.release(address, {from: address});
      const after = await repaymentManager.totalPaid();
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
        expected = await termsContract.getExpectedRepaymentValue(oneMonth);
        if (verbose) {
          console.log(`Expected: ${expected}`);
          const result = await termsContract.getScheduledPayment(1);
          console.log(
            `Results  |  Timestamp : ${result.dueTimestamp}  |  Principal : ${result.principalPayment}  |  Interest: ${result.interestPayment}  |  totalPayment: ${result.totalPayment}`
          );
        }

        // Create money for borrower
        await paymentToken.mint(borrower, expected, {from: minter});
        await paymentToken.approve(repaymentManager.address, expected, {from: borrower});
      });
      // Don't make enough payment
      it('should return DEFAULT if insufficient payment', async () => {
        const insufficient = expected.sub(new BN(100));
        await repaymentManager.pay(insufficient, {from: borrower});
        const status = await repaymentManager.getRepaymentStatus();
        if (verbose) console.log(`Repayment Status: ${status}`);
        expect(status).to.be.bignumber.equals(repaymentStatuses.DEFAULT);
      });
      it('should return ON_TIME if sufficient payment', async () => {
        await repaymentManager.pay(expected, {from: borrower});
        const status = await repaymentManager.getRepaymentStatus();
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

        expected = await termsContract.getExpectedRepaymentValue(afterLoanPeriod);
        if (verbose) console.log(`Expected: ${expected}`);

        await paymentToken.mint(borrower, expected, {from: minter});
        await paymentToken.approve(repaymentManager.address, expected, {from: borrower});
      });
      it('should return ON_TIME if loan is fully paid off', async () => {
        const insufficient = expected.sub(new BN(100));
        await repaymentManager.pay(insufficient, {from: borrower});
        const status = await repaymentManager.getRepaymentStatus();
        if (verbose) console.log(`Repayment Status: ${status}`);
        expect(status).to.be.bignumber.equals(repaymentStatuses.DEFAULT);
      });
      it('should return DEFAULT if loan is not fully paid off', async () => {
        await repaymentManager.pay(expected, {from: borrower});
        const status = await repaymentManager.getRepaymentStatus();
        if (verbose) console.log(`Repayment Status: ${status}`);
        expect(status).to.be.bignumber.equals(repaymentStatuses.ON_TIME);
      });
    });
  });
});
