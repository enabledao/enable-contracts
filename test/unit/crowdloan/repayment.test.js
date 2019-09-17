// Loan should be in correct status after first lender funds
// Lender should not be able to send less than minimum contribution
// Lender should not be able to send more than maximum contribution
// Loan should be in correct status after being fully funded
// Lender should be able to refund() while loan is in funding state
// Lender should not be able to refund() while loan is in fully funded state
// Lender should not be able to contribute after loan is fully funded
// Lender should not be able to contribute after loan is withdrawn by borrower

const {expect} = require('chai');

import {BN, expectEvent, expectRevert, time} from 'openzeppelin-test-helpers';

const Crowdloan = artifacts.require('Crowdloan');
const PaymentToken = artifacts.require('StandaloneERC20');

const {DECIMAL_SHIFT, loanParams, paymentTokenParams} = require('../../testConstants');
const {revertEvm, snapShotEvm} = require('../../testHelpers');

contract('Repayment', accounts => {
  let crowdloan;
  let paymentToken;

  const borrower = accounts[0];

  const expectedWithdrawal = (shares, previousRelease, payment, totalShares) =>
    shares
      .mul(payment)
      .div(totalShares)
      .sub(previousRelease);

  beforeEach(async () => {
    paymentToken = await PaymentToken.new();
    await paymentToken.initialize(
      paymentTokenParams.name,
      paymentTokenParams.symbol,
      paymentTokenParams.decimals,
      [accounts[0]], // minters
      [] // pausers
    );

    crowdloan = await Crowdloan.new();

    await crowdloan.initialize(
      borrower,
      paymentToken.address,
      loanParams.principalRequested,
      loanParams.crowdfundLength,
      loanParams.loanMetadataURL
    );
  });

  context('Repayment Functionality', async () => {
    const nonBorrower = accounts[2];
    let contributor;

    beforeEach(async () => {
      contributor = {
        address: accounts[1],
        value: new BN(150).mul(DECIMAL_SHIFT)
      };
      await paymentToken.mint(contributor.address, contributor.value);
      await paymentToken.approve(crowdloan.address, contributor.value, {from: contributor.address});
    });

    context('Before crowdfund starts', async () => {
      const bit = () => contributor.value.div(new BN(5));

      describe('Repayment Access', async () => {
        it('borrower should not be able to repay before crowdfund starts', async () => {
          await expectRevert.unspecified(
            crowdloan.repay(bit(), {from: borrower}),
            "Only after crowdfund end.");
        });

        it('non-borrower should not be able to repay before crowdfund starts', async () => {
          await expectRevert.unspecified(
            crowdloan.repay(bit(), {from: nonBorrower}),
            "Only after crowdfund end.");

          await expectRevert.unspecified(
              crowdloan.repay(bit(), {from: contributor.address}),
              "Only after crowdfund end.");
        });
      });

      describe('Withdraw Repayment Access', async () => {

        beforeEach(async () => {
          await paymentToken.mint(borrower, bit());
          await paymentToken.transfer(crowdloan.address, bit(), {
            from: borrower
          });

          expect(
            await crowdloan.crowdfundStart.call()
          ).to.be.bignumber.equal(new BN(0));
        });

        it('borrower should not be able to withdraw repayment before crowdfund starts', async () => {
          await expectRevert.unspecified(
              crowdloan.withdrawRepayment({from: borrower}),
              "Only after crowdfund end.");
        });

        it('lender should not be able to withdraw repayment before crowdfund starts', async () => {
          await expectRevert.unspecified(
              crowdloan.withdrawRepayment({from: contributor.address}),
              "Only after crowdfund end.");
        });

        it('non-lender should not be able to withdraw repayment before crowdfund starts', async () => {
          await expectRevert.unspecified(
              crowdloan.withdrawRepayment({from: nonBorrower}),
              "Only after crowdfund end.");
        });
      });
    });

    context('During crowdfund', async () => {
      const bit = () => contributor.value.div(new BN(5));

      beforeEach(async () => {
        await crowdloan.startCrowdfund({from: borrower});
        await crowdloan.fund(bit(), {from: contributor.address});

        expect(
          await crowdloan.crowdfundStart.call()
        ).to.be.bignumber.gt(new BN(0));
      });

      describe('Repayment Access', async () => {

        it('borrower should not be able to repay before crowdfund starts', async () => {
          await expectRevert.unspecified(
            crowdloan.repay(bit(), {from: borrower}),
            "Only after crowdfund end.");
        });

        it('non-borrower should not be able to repay during crowdfund', async () => {
          await expectRevert.unspecified(
            crowdloan.repay(bit(), {from: nonBorrower}),
            "Only after crowdfund end.");

          await expectRevert.unspecified(
              crowdloan.repay(bit(), {from: contributor.address}),
              "Only after crowdfund end.");
        });
      });

      describe('Withdraw Repayment Access', async () => {
        it('borrower should not be able to withdraw repayment during crowdfund', async () => {
          await expectRevert.unspecified(
              crowdloan.withdrawRepayment({from: borrower}),
              "Only after crowdfund end.");
        });

        it('lender should not be able to withdraw repayment during crowdfund', async () => {
          await expectRevert.unspecified(
              crowdloan.withdrawRepayment({from: contributor.address}),
              "Only after crowdfund end.");
        });

        it('non-lender should not be able to withdraw repayment during crowdfund', async () => {
          await expectRevert.unspecified(
              crowdloan.withdrawRepayment({from: nonBorrower}),
              "Only after crowdfund end.");
        });
      });
    });

    context('After crowdfund ends', async () => {
      const bit = () => contributor.value.div(new BN(5));

      beforeEach(async () => {
        await crowdloan.startCrowdfund({from: borrower});
        await crowdloan.fund(contributor.value, {from: contributor.address});
        await crowdloan.withdrawPrincipal(contributor.value, {from: borrower});

        await time.increase(loanParams.crowdfundLength + 1);

        await paymentToken.approve(crowdloan.address, contributor.value, {
          from: borrower
        });
      });

      context('repay function', async () => {

        beforeEach(async () => {
          expect(
            await paymentToken.allowance.call(borrower, crowdloan.address)
          ).to.be.bignumber.gt(new BN(0));
        });

        context('Case: borrower repays', async () => {
          beforeEach(async () => {});
          it('borrower should be able to repay after crowdfund ends', async () => {
            const tx = await crowdloan.repay(bit(), {from: borrower});

            expectEvent.inLogs(tx.logs, 'Repay', {
              amount: bit()
            });
            await expectEvent.inTransaction(tx.tx, PaymentToken, 'Transfer', {
              from: borrower,
              to: crowdloan.address,
              value: bit()
            });
          });

          it('borrower should not be able to repay Zero value after crowdfund', async () => {
            await expectRevert.unspecified(
                crowdloan.repay(0, {from: borrower}),
                "Repayment amount cannot be zero");
          });

          describe('Repay Logic', async () => {
            beforeEach(async () => {
              await crowdloan.repay(bit(), {from: borrower});
            });

            it('repayment should be recorded successfully', async () => {
              expect(
                await crowdloan.amountRepaid.call()
              ).to.be.bignumber.equal(bit());
            });

            it('lender should be able to withdraw proportional share', async () => {
              const totalContributed = await crowdloan.totalContributed.call();
              const amountContributed = await crowdloan.amountContributed.call(contributor.address);
              const previousWithdrawal = await crowdloan.repaymentWithdrawn.call(contributor.address);
              const dueWithdrawal = expectedWithdrawal(amountContributed, previousWithdrawal, bit(), totalContributed);

              const tx = await crowdloan.withdrawRepayment({from: contributor.address});

              expectEvent.inLogs(tx.logs, 'WithdrawRepayment', {
                lender: contributor.address,
                amount: dueWithdrawal
              });
            });

            it('non-lender should be not able to withdraw proportional share', async () => {
              await expectRevert(
                  crowdloan.withdrawRepayment({from: nonBorrower}),
                  "Withdrawal amount cannot be zero");
            });
          });
        });

        context('Case: non-borrower repays', async () => {
          let tx;
          beforeEach(async () => {
            await paymentToken.mint(nonBorrower, contributor.value);
            await paymentToken.approve(crowdloan.address, contributor.value, {from: nonBorrower});
            tx = await crowdloan.repay(bit(), {from: nonBorrower});
          });

          it('non-borrower should be able to repay after crowdfund ends', async () => {
            expectEvent.inLogs(tx.logs, 'Repay', {
              amount: bit()
            });
            await expectEvent.inTransaction(tx.tx, PaymentToken, 'Transfer', {
              from: nonBorrower,
              to: crowdloan.address,
              value: bit()
            });
          });
          it('should update state variables', async () => {
            expect(
              await crowdloan.amountRepaid.call()
            ).to.be.bignumber.equal(bit());
          });
        });
      });

      context('withdrawRepayment function', async () => {
        let partialAmount;

        beforeEach(async () => {});

        context('Case: Borrower withdraws repayment', async () => {
          beforeEach(async () => {
            await crowdloan.repay(bit(), {from: borrower})
          });

          it('borrower should not be able to withdraw repayment after crowdfund', async () => {
            await expectRevert.unspecified(
                crowdloan.withdrawRepayment({from: borrower}),
                "Withdrawal amount cannot be zero");
          });

          it('borrower should not be able to withdraw principal from amountRepaid after crowdfund', async () => {
            await expectRevert.unspecified(
                crowdloan.withdrawPrincipal(new BN(1), {from: borrower}),
                "Withdrawal will lead to repayment inbalance");
          });
        });

        context('Case: Lender withdraws repayment', async () => {
          beforeEach(async () => {});
          it('lender should not be able to withdraw repayment after crowdfund ends but before valid repayment is made', async () => {
            await expectRevert.unspecified(
                crowdloan.withdrawRepayment({from: contributor.address}),
                "Withdrawal amount cannot be zero");
          });
          it('lender should be able to withdraw repayment after crowdfund ends and valid repayment is made', async () => {
            await crowdloan.repay(bit(), {from: borrower})
            const tx = await crowdloan.withdrawRepayment({from: contributor.address});

            expectEvent.inLogs(tx.logs, 'WithdrawRepayment', {
              lender: contributor.address,
            });
            await expectEvent.inTransaction(tx.tx, PaymentToken, 'Transfer', {
              from: crowdloan.address,
              to: contributor.address,
              value: bit()
            });
          });

          it('should update state variables', async () => {
            await crowdloan.repay(bit(), {from: borrower})
            const tx = await crowdloan.withdrawRepayment({from: contributor.address});
            expect(
              await crowdloan.repaymentWithdrawn.call(contributor.address)
            ).to.be.bignumber.gt(new BN(0));
          });
        });

        context('Case: non-lender withdraws repayment', async () => {
          beforeEach(async () => {});
          it('non-lender should not be able to withdraw repayment after crowdfund ends but before valid repayment is made', async () => {
            await expectRevert.unspecified(
                crowdloan.withdrawRepayment({from: nonBorrower}),
                "Withdrawal amount cannot be zero");
          });

          it('non-lender should not be able to withdraw repayment after crowdfund ends and valid repayment is made', async () => {
            await crowdloan.repay(bit(), {from: borrower})
            await expectRevert.unspecified(
              crowdloan.withdrawRepayment({from: nonBorrower}),
              "Withdrawal amount cannot be zero");
          });
        });
      });
    });
  });
});
