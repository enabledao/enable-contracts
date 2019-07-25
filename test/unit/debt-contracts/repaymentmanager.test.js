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

  /** TODO(Dan): This is more of an e2e test */
  describe('releaseAllowance', async () => {
    beforeEach(async () => {
      /** Create random share allocation among lenders */
      await Promise.all(
        lenders.map(({address, shares}) => {
          return repaymentManager.increaseShares(address, shares, {from: controller});
        })
      );
      const totalShares = lenders.reduce((total, lender) => total.add(lender.shares), new BN(0));
      console.log(`Shares: ${await repaymentManager.shares(lender1)}`);
      console.log(`Total Shares: ${totalShares}`);

      /** Create simulated repayment by borrower to repaymentManager */
      await termsContract.setLoanStatus(loanStatuses.REPAYMENT_CYCLE, {from: controller});
      const simulatedRepayment = getRandomPercentageOfBN(totalShares);
      console.log(`Simulated Repayment: ${simulatedRepayment}`);
      await paymentToken.mint(borrower, simulatedRepayment, {from: minter});
      console.log('tokens minted');
      paymentToken.approve(repaymentManager.address, simulatedRepayment, {from: borrower});
      await repaymentManager.pay(simulatedRepayment, {from: borrower});

      // fund the account from multiple payments
      // have lenders with different types of shares
    });
    it('should calculate correct releaseAllowance for lender after 1 repayment', async () => {
      return true;
    });
    it('should calculate correct releaseAllowance for lender after multiple repayments', async () => {});
    it('should calculate correct releaseAllowance for lender after multiple repayments including unauthorized transfers', async () => {});
    it('should calculate correct releaseAllowance for lender after another lender has made withdrawal', async () => {});


    xit('should withdraw correct percentage of multiple payments', async () => {});
    xit('should have a smaller releaseAllowance if previous withdrawal was made', async () => {});
  }); // difficult
  describe('release', async () => {
    beforeEach(async () => {
      // fund the repaymentManager
    });
    context('validations', async () => {
      xit('should not allow lender with 0 shares to withdraw', async () => {});
      xit('should not allow lender with zero allowance to withdraw', async () => {});
    });
    context('functionality', async () => {});
  });
  describe('totalReleased', async () => {});
  describe('released', async () => {});

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
