// Loan should be in correct status after first lender funds
// Lender should not be able to send less than minimum contribution
// Lender should not be able to send more than maximum contribution
// Loan should be in correct status after being fully funded
// Lender should be able to refund() while loan is in funding state
// Lender should not be able to refund() while loan is in fully funded state
// Lender should not be able to contribute after loan is fully funded
// Lender should not be able to contribute after loan is withdrawn by borrower

import {BN, expectEvent, expectRevert, time} from 'openzeppelin-test-helpers';

const {expect} = require('chai');

const Crowdloan = artifacts.require('Crowdloan');
const PaymentToken = artifacts.require('StandaloneERC20');

const {loanParams, paymentTokenParams} = require('../../testConstants');

const {revertEvm, snapShotEvm} = require('../../testHelpers');

contract('Repayment', accounts => {
  let crowdloan;
  let paymentToken;

  const borrower = accounts[0];

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

  /** TODO(Dan) */
  context('Repayment Functionality', async () => {
    let contributor;
    beforeEach(async () => {
      contributor = {
        address: accounts[1],
        value: new BN(150)
      };
      await paymentToken.mint(contributor.address, contributor.value);
      await paymentToken.approve(crowdloan.address, contributor.value, {from: contributor.address});
    });

    context('Before crowdfund starts', async () => {
      describe('Repayment Access', async () => {
        xit('borrower should not be able to repay before crowdfund starts', async () => {});
        xit('non-borrower should not be able to repay before crowdfund starts', async () => {});
      });
      describe('Withdraw Repayment Access', async () => {
        xit('lender should not be able to withdraw repayment before crowdfund starts', async () => {});
        xit('non-lender should not be able to repayment before crowdfund starts', async () => {});
      });
    });

    context('During crowdfund', async () => {});

    context('After crowdfund ends', async () => {});

    context('repay function', async () => {
      beforeEach(async () => {});

      context('Case: borrower repays', async () => {
        beforeEach(async () => {});
        xit('borrower should be able to repay after crowdfund ends', async () => {});

        describe('Repay Logic', async () => {
          xit('repayment should be recorded successfully', async () => {});
          xit('should register event', async () => {});
          xit('lender should be able to withdraw proportional share', async () => {});
          xit('non-lender should be not able to withdraw proportional share', async () => {});
        });
      });

      context('Case: non-borrower repays', async () => {
        beforeEach(async () => {});
        xit('non-borrower should be able to repay before crowdfund starts', async () => {});
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
