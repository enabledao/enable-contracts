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

    context('After crowdfund ends', async () => {
      const bit = () => contributor.value.div(new BN(5));

      beforeEach(async () => {
        await crowdloan.startCrowdfund({from: borrower});
        await crowdloan.fund(bit(), {from: contributor.address});
        await crowdloan.withdrawPrincipal(bit(), {from: borrower});

        await time.increase(loanParams.crowdfundLength + 1);

        await paymentToken.approve(crowdloan.address, bit(), {
          from: borrower
        });
        await crowdloan.repay(bit(), {from: borrower})
      });

      it('borrower should not be able to withdraw repayment after crowdfund', async () => {
        await expectRevert(
            crowdloan.withdrawPrincipal(new BN(1), {from: borrower}),
            "Withdrawal will lead to repayment inbalance");
      });

      it('borrower should not be able to withdraw principal from amountRepaid after crowdfund', async () => {
        await expectRevert.unspecified(
            crowdloan.withdrawRepayment({from: borrower}),
            "Withdrawal amount cannot be zero");
      });

      it('non-lender should not be able to withdraw repayment after crowdfund', async () => {
        await expectRevert.unspecified(
            crowdloan.withdrawRepayment({from: nonBorrower}),
            "Only after crowdfund end.");
      });

      it('lender should be able to withdraw repayment after crowdfund', async () => {
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
    });

    context('repay function', async () => {
      const bit = () => contributor.value.div(new BN(4));

      beforeEach(async () => {
          await crowdloan.startCrowdfund({from: borrower});
          await crowdloan.fund(contributor.value, {from: contributor.address});
          await crowdloan.withdrawPrincipal(contributor.value, {from: borrower});

          await time.increase(loanParams.crowdfundLength + 1);
          await paymentToken.approve(crowdloan.address, contributor.value, {
            from: borrower
          });
      });

      context('Case: borrower repays', async () => {
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
            await expectRevert.unspecified(
                crowdloan.withdrawRepayment({from: nonBorrower}),
                "Only after crowdfund end.");
          });
        });
      });

      context('Case: non-borrower repays', async () => {
        beforeEach(async () => {});
        xit('non-borrower should not be able to repay before crowdfund starts', async () => {

        });
        xit('non-borrower should not be able to repay before crowdfund ends', async () => {});
        xit('non-borrower should not be able to repay after crowdfund ends', async () => {});
        xit('should register event', async () => {});
        xit('should update state variables', async () => {});
      });
    });
  });

  context('withdrawRepayment function', async () => {
    let partialAmount;
    let contributor;

    beforeEach(async () => {});

    context('Case: Lender withdraws repayment', async () => {
      beforeEach(async () => {});
      xit('lender should not be able to withdraw repayment before crowdfund starts', async () => {});
      xit('lender should not be able to withdraw repayment before crowdfund ends', async () => {});
      xit('lender should not be able to withdraw repayment after crowdfund ends but before valid repayment is made', async () => {});
      xit('lender should be able to withdraw repayment after crowdfund ends and valid repayment is made', async () => {});
      xit('should register event', async () => {});
      xit('should update state variables', async () => {});
    });

    context('Case: non-lender withdraws repayment', async () => {
      beforeEach(async () => {});
      xit('non-lender should not be able to withdraw repayment before crowdfund starts', async () => {});
      xit('non-lender should not be able to withdraw repayment before crowdfund ends', async () => {});
      xit('non-lender should not be able to withdraw repayment after crowdfund ends but before valid repayment is made', async () => {});
      xit('non-lender should not be able to withdraw repayment after crowdfund ends and valid repayment is made', async () => {});
    });
  });

  // context('withdraw function', async () => {
  //   let partialAmount;
  //   let contributor;

  //   beforeEach(async () => {
  //     partialAmount = new BN(150); // TODO(Dan): Make this a random fraction
  //     contributor = {
  //       address: accounts[1],
  //       value: new BN(loanParams.principalRequested)
  //     };
  //     await paymentToken.mint(contributor.address, contributor.value);
  //     await crowdloan.startCrowdfund({from: borrower});
  //     await paymentToken.approve(crowdloan.address, contributor.value, {
  //       from: contributor.address
  //     });
  //   });

  //   it('should not let borrower withdraw if crowdfund is not complete', async () => {
  //     await expectRevert.unspecified(
  //       crowdloan.methods['withdraw(uint256)'](contributor.value, {from: borrower}),
  //       'Crowdfund not yet completed'
  //     );
  //   });

  //   context('crowdfund complete', async () => {
  //     beforeEach(async () => {
  //       await crowdloan.fund(contributor.value, {from: contributor.address}); // will set FUNDING_COMPLETE as goal is hit
  //     });

  //     context('permissions', async () => {
  //       it('should not let anyone other than borrower withdraw', async () => {
  //         await expectRevert.unspecified(
  //           crowdloan.methods['withdraw(uint256)'](partialAmount, {from: accounts[2]}),
  //           'Withdrawal only allowed for Borrower'
  //         );
  //       });

  //       it('should not let lenders withdraw', async () => {
  //         await expectRevert.unspecified(
  //           crowdloan.methods['withdraw(uint256)'](partialAmount, {from: contributor.address}),
  //           'Withdrawal only allowed for Borrower'
  //         );
  //       });
  //     });

  //     it('should let borrower make a partial withdrawals', async () => {
  //       const partialWithdrawal = new BN(1000); // TODO(Dan): make random value
  //       const remainder = contributor.value.sub(partialWithdrawal);

  //       /** Partial withdrawal 1 */
  //       await crowdloan.methods['withdraw(uint256)'](partialWithdrawal, {from: borrower});
  //       const partialBalance = await paymentToken.balanceOf.call(borrower);
  //       expect(partialBalance).to.be.bignumber.equal(partialWithdrawal);
  //       const partialCrowdloanBalance = await paymentToken.balanceOf.call(crowdloan.address); // crowdloan's balance
  //       expect(partialCrowdloanBalance).to.be.bignumber.equal(remainder);

  //       /** Partial withdrawal 2 using withdraw() for remainder */
  //       await crowdloan.methods['withdraw()']({from: borrower});
  //       const fullBalance = await paymentToken.balanceOf.call(borrower);
  //       expect(fullBalance).to.be.bignumber.equal(contributor.value);
  //       const crowdloanBalance = await paymentToken.balanceOf.call(crowdloan.address); // crowdloan's balance
  //       expect(crowdloanBalance).to.be.bignumber.equal(new BN(0));
  //     });

  //     it('should let borrower make full withdrawal', async () => {
  //       await crowdloan.methods['withdraw(uint256)'](contributor.value, {from: borrower});
  //       const fullBalance = await paymentToken.balanceOf.call(borrower);
  //       expect(fullBalance).to.be.bignumber.equal(contributor.value);
  //       const crowdloanBalance = await paymentToken.balanceOf.call(crowdloan.address); // crowdloan's balance
  //       expect(crowdloanBalance).to.be.bignumber.equal(new BN(0));
  //     });

  //     it('should log a releaseFunds event', async () => {
  //       const tx = await crowdloan.methods['withdraw(uint256)'](contributor.value, {
  //         from: borrower
  //       });
  //       expectEvent.inLogs(tx.logs, 'ReleaseFunds', {
  //         borrower,
  //         amount: contributor.value
  //       });
  //     });
  //   });

  //   context('partial fundraise', async () => {
  //     let partialFundraise;

  //     beforeEach(async () => {
  //       partialFundraise = new BN(1000000000); // TODO(Dan): generate random number instead
  //       await crowdloan.fund(partialFundraise, {from: contributor.address});
  //       await termsContract.setLoanStatus(loanStatuses.FUNDING_COMPLETE);
  //     });

  //     it('should not let borrower withdraw more than totalCrowdfunded', async () => {
  //       const more = partialFundraise.add(new BN(1));
  //       await expectRevert(
  //         crowdloan.methods['withdraw(uint256)'](more, {from: borrower}),
  //         'Amount exceeds available balance'
  //       );
  //     });

  //     it('should let borrower start a loan with a partial fundraise', async () => {
  //       const totalCrowdfunded = await repaymentManager.totalShares();
  //       expect(totalCrowdfunded).to.be.bignumber.equal(partialFundraise);
  //       await crowdloan.methods['withdraw(uint256)'](totalCrowdfunded, {from: borrower});
  //       const params = await termsContract.getLoanParams();
  //       expect(params.principalDisbursed).to.be.bignumber.equal(totalCrowdfunded);
  //     });
  //   });
  // });
});
