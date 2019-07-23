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
const {generateRandomPaddedBN, generateRandomBN} = require('../../testHelpers');

const RepaymentManager = artifacts.require('RepaymentManager');
const TermsContract = artifacts.require('TermsContract');
const PaymentToken = artifacts.require('StandaloneERC20');

contract('RepaymentManager', accounts => {
  let paymentToken;
  let termsContract;
  let repaymentManager;
  const deployer = accounts[1];
  const borrower = accounts[4];
  const controller = accounts[5];
  const nonControllers = [accounts[9]];
  const lenders = [
    {
      address: accounts[6],
      shares: new BN(100)
    },
    {
      address: accounts[7],
      shares: new BN(200)
    },
    {
      address: accounts[8],
      shares: new BN(50)
    }
  ];
  const nonLender = accounts[9];

  beforeEach(async () => {
    paymentToken = await PaymentToken.new();
    await paymentToken.initialize(
      paymentTokenParams.name,
      paymentTokenParams.symbol,
      paymentTokenParams.decimals,
      [deployer], // minters
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

  context.only('crowdloan phase', async () => {
    context('increase shares function', async () => {
      // write test for where there is more than one lender. Lender 1 has no shares, lender 2
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
        xit('should increase the totalShares', async () => {});
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

    context('decrease shares function', async () => {
      let payee;
      let original;
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
          // await repaymentManager.decreaseShares(payee.address, decrement, {from: controller});
          await expectRevert(
            repaymentManager.decreaseShares(payee.address, decrement, {from: controller}),
            'Account has zero shares'
          );
        });
        it('should not allow shares to be decreased if crowdfund is over', async () => {
          await termsContract.setLoanStatus(loanStatuses.FUNDING_FAILED, {from: controller}); // FUNDING_FAILED
          await expectRevert(
            repaymentManager.increaseShares(payee.address, decrement, {from: controller}),
            'Action only allowed before loan funding failed'
          );

          await repaymentManager.increaseShares(payee.address, original, {from: controller});
          await expectRevert(
            repaymentManager.decreaseShares(payee.address, decrement, {from: controller}),
            'Action only allowed before loan funding is completed'
          );
        });
      });

      context('functionality', async () => {
        let tx;

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
  });

  context('repayment cycle phase', async () => {
    it('should successfully pay into the contract', async () => {
      const paymentAmount = new BN(150);
      const payers = [
        {
          address: accounts[0],
          value: new BN(150)
        },
        {
          address: accounts[1],
          value: new BN(150)
        }
      ];

      await Promise.all(payers.map(payer => paymentToken.mint(payer.address, payer.value)));

      await expectRevert.unspecified(
        repaymentManager.pay(new BN(0), {
          from: payers[0].address
        }),
        'No amount set to pay'
      );

      await paymentToken.mint(accounts[3], new BN(100));
      await paymentToken.approve(repaymentManager.address, new BN(100), {from: accounts[3]});
      await expectRevert.unspecified(
        repaymentManager.pay(new BN(100), {
          from: accounts[3]
        }),
        'Action only allowed while loan is Active'
      );

      await termsContract.setLoanStatus(3); // FUNDING_COMPLETE

      for (let p = 0; p < payers.length; p++) {
        const payer = payers[p];

        await paymentToken.approve(repaymentManager.address, payer.value, {from: payer.address});

        const tx = await repaymentManager.pay(payer.value, {from: payer.address});

        expectEvent.inLogs(tx.logs, 'PaymentReceived', {
          from: payer.address,
          amount: payer.value
        });
      }

      const repaymentManagerBalance = await paymentToken.balanceOf.call(repaymentManager.address);
      const expectedBalance = payers.reduce((a, b) => a.add(b.value), new BN(0));
      expect(repaymentManagerBalance).to.be.bignumber.equal(expectedBalance);
    });

    it('should successfully release to lender', async () => {
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
