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

import {BN, expectEvent, expectRevert} from 'openzeppelin-test-helpers';

const {expect} = require('chai');

const {
  loanParams,
  loanStatuses,
  paymentTokenParams,
  MAX_CROWDFUND
} = require('../../testConstants');
const {
  generateRandomPaddedBN,
  generateRandomBN,
  getRandomPercentageOfBN
} = require('../../testHelpers');

const RepaymentManager = artifacts.require('RepaymentManager');
const TermsContract = artifacts.require('TermsContract');
const PaymentToken = artifacts.require('StandaloneERC20');

const verbose = true;
const tolerance = new BN(10); // in wei

contract('RepaymentManager', accounts => {
  let paymentToken;
  let termsContract;
  let repaymentManager;

  // TODO(Dan): Refactor roles into testHelper
  const minter = accounts[1];
  const borrower = accounts[4];
  const controller = accounts[5];
  const nonLender = accounts[9];
  const nonBorrower = accounts[9];
  const nonControllers = [accounts[9]];
  const lenders = [
    {
      address: accounts[6],
      shares: generateRandomPaddedBN(MAX_CROWDFUND)
    },
    {
      address: accounts[7],
      shares: generateRandomPaddedBN(MAX_CROWDFUND)
    },
    {
      address: accounts[8],
      shares: generateRandomPaddedBN(MAX_CROWDFUND)
    }
  ];
  const lender1 = lenders[0].address;
  const lender2 = lenders[1].address;
  const lender3 = lenders[2].address;

  beforeEach(async () => {
    paymentToken = await PaymentToken.new();
    await paymentToken.initialize(
      paymentTokenParams.name,
      paymentTokenParams.symbol,
      paymentTokenParams.decimals,
      [minter], // minters
      [] // pausers
    );

    termsContract = await TermsContract.new();
    await termsContract.initialize(borrower, paymentToken.address, ...Object.values(loanParams), [
      controller
    ]);

    repaymentManager = await RepaymentManager.new();
    await repaymentManager.initialize(paymentToken.address, termsContract.address, [controller]);
  });

  context('should deploy correctly', async () => {
    it('RepaymentManager should deploy successfully', async () => {
      assert.exists(repaymentManager.address, 'repaymentManager was not successfully deployed');
    });

    it('RepaymentManager should have PaymentToken address initialized', async () => {
      const result = await repaymentManager.paymentToken.call();
      expect(result).to.be.equal(paymentToken.address);
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
        const newIncrement = generateRandomPaddedBN(10);
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
    let payments;
    beforeEach(async () => {
      payments = [
        {address: borrower, value: generateRandomPaddedBN(MAX_CROWDFUND)},
        {address: lender1, value: generateRandomPaddedBN(MAX_CROWDFUND)}, // Test for strange edge case
        {address: nonLender, value: generateRandomPaddedBN(MAX_CROWDFUND)}
      ];
      await Promise.all(
        payments.map(({address, value}) => {
          paymentToken.mint(address, value, {from: minter});
        })
      );
      await Promise.all(
        payments.map(({address, value}) => {
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
        const {address, value} = payments[0];
        await expectRevert(
          repaymentManager.pay(value, {from: address}),
          'Action only allowed while loan is Active'
        );
      });
      xit('should only allow pay if payer has more than amount in balance', async () => {});
    });
    context('functionality', async () => {
      beforeEach(async () => {
        await termsContract.setLoanStatus(loanStatuses.REPAYMENT_CYCLE, {from: controller});
      });
      xit('should approve the ');
      it('should let any address pay into contract multiple times', async () => {
        for (let i = 0; i < payments.length; i += 1) {
          const original = await repaymentManager.totalPaid(); // eslint-disable-line no-await-in-loop
          const {address, value} = payments[i];
          await repaymentManager.pay(value, {from: address}); // eslint-disable-line no-await-in-loop
          const after = await repaymentManager.totalPaid(); // eslint-disable-line no-await-in-loop
          expect(after.sub(value)).to.be.bignumber.equals(original);
        }
        const final = await paymentToken.balanceOf.call(repaymentManager.address); // Removes dependency on totalPaid();
        const expectedBalance = payments.reduce(
          (total, payment) => total.add(payment.value),
          new BN(0)
        );
        expect(final).to.be.bignumber.equal(expectedBalance);
      });
      it('should emit a PaymentReceived event', async () => {
        const {address, value} = payments[0];
        const tx = await repaymentManager.pay(value, {from: address});
        expectEvent.inLogs(tx.logs, 'PaymentReceived', {
          from: address,
          amount: value
        });
      });
    });
  });

  describe('released', async () => {});
  describe('totalReleased', async () => {});
  /** TODO(Dan): This is more of an e2e test */
  describe('releaseAllowance', async () => {
    let repayments;
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
      repayments = [
        getRandomPercentageOfBN(totalShares),
        getRandomPercentageOfBN(totalShares),
        getRandomPercentageOfBN(totalShares),
        getRandomPercentageOfBN(totalShares),
        getRandomPercentageOfBN(totalShares),
        getRandomPercentageOfBN(totalShares)
      ];
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
      // await paymentToken.approve(repaymentManager.address, externalPayment, {from: borrower});
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
      xit('should not allow lender with 0 shares to withdraw', async () => {});
      xit('should not allow lender with zero allowance to withdraw', async () => {});
    });
    context('functionality', async () => {});
  });

  describe('totalPaid', async () => {}); // Needs both release and pay
  describe('payee', async () => {});

  context('repayment cycle phase', async () => {
    xit('should successfully release to lender', async () => {
      const paymentAmount = new BN(350);
      const totalShares = () => lenders.reduce((a, b) => a.add(b.shares), new BN(0));
      const expectedRepayment = (shares, payment) => shares.mul(payment).divRound(totalShares());

      await paymentToken.mint(borrower, paymentAmount);

      await Promise.all(
        lenders.map(lender =>
          repaymentManager.increaseShares(lender.address, lender.shares, {from: controller})
        )
      );

      await expectRevert.unspecified(
        repaymentManager.release(lenders[0].address, {
          from: lenders[0].address
        }),
        'Action only allowed while loan is Active'
      );

      await paymentToken.approve(repaymentManager.address, paymentAmount, {from: borrower});

      await termsContract.setLoanStatus(3); // FUNDING_COMPLETE

      await repaymentManager.pay(paymentAmount, {from: borrower});

      await expectRevert.unspecified(
        repaymentManager.release(accounts[4], {
          from: lenders[0].address
        }),
        'Account has zero shares'
      );

      await Promise.all(
        lenders.map(async (lender, idx) => {
          const expectedRelease = expectedRepayment(lender.shares, paymentAmount);

          expect(
            await repaymentManager.releaseAllowance.call(lender.address)
          ).to.be.bignumber.equal(expectedRelease);

          const tx = await repaymentManager.release(
            lender.address,
            {from: idx % 2 === 0 ? lender.address : accounts[idx + 4]} // Alternate between lender address and alternate address as tx sender
          );

          expectEvent.inLogs(tx.logs, 'PaymentReleased', {
            to: lender.address
          });

          expect(await repaymentManager.released.call(lender.address)).to.be.bignumber.equal(
            expectedRelease
          );

          expect(await paymentToken.balanceOf.call(lender.address)).to.be.bignumber.equal(
            expectedRelease
          );
        })
      );

      const totalReleased = await repaymentManager.totalReleased.call();
      const expectedReleased = lenders.reduce(
        (a, b) => a.add(expectedRepayment(b.shares, paymentAmount)),
        new BN(0)
      );
      expect(totalReleased).to.be.bignumber.equal(expectedReleased);
    });
  });
});
