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

contract('Crowdloan', accounts => {
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

  it('Crowdloan should deploy successfully', async () => {
    expect(await crowdloan.borrower.call()).to.equal(borrower);
    assert.exists(crowdloan.address, 'Crowdloan was not successfully deployed');
  });

  it('PaymentToken should deploy successfully', async () => {
    assert.exists(paymentToken.address, 'PaymentToken was not successfully deployed');
  });

  it('should not allow non-borrower to start crowdfund', async () => {
    await expectRevert.unspecified(
      crowdloan.startCrowdfund({from: accounts[4]}),
      'Only borrower can start crowdfund'
    );
  });

  it('should allow borrower to start crowdfund', async () => {
    const tx = await crowdloan.startCrowdfund({from: borrower});
    await expectEvent.inTransaction(tx.receipt.transactionHash, Crowdloan, 'StartCrowdfund');
  });

  it('should not allow borrower to start crowdfund if already started', async () => {
    await crowdloan.startCrowdfund({from: borrower});

    await expectRevert.unspecified(
      crowdloan.startCrowdfund({from: borrower}),
      'KickOff already passed'
    );
  });

  xit('should register correct start time', async () => {
    expect(
      (await crowdloan.getCrowdfundParams.call())[1] // crowdfundStart
    ).to.be.bignumber.gt(new BN(time));
  });

  /** TODO(Dan) */
  context('fund crowdloan', async () => {
    let contributor;
    beforeEach(async () => {
      contributor = {
        address: accounts[1],
        value: new BN(150)
      };
      await paymentToken.mint(contributor.address, contributor.value);
      await paymentToken.approve(crowdloan.address, contributor.value, {from: contributor.address});
    });

    describe('before crowdfund starts', async () => {
      it('should fail to fund before crowdfund starts', async () => {
        await expectRevert.unspecified(
          crowdloan.fund(contributor.value, {from: contributor.address}),
          'Crowdfund not yet started'
        );
      });
    });

    describe('after crowdfund starts', async () => {
      let time;
      beforeEach(async () => {
        time = Math.floor(new Date().getTime / 1000);
        await crowdloan.startCrowdfund({from: borrower});
        await paymentToken.mint(contributor.address, new BN(loanParams.principalRequested));
        await paymentToken.approve(crowdloan.address, new BN(loanParams.principalRequested), {
          from: contributor.address
        });
      });

      it('should fail to fund with zero amount', async () => {
        await expectRevert.unspecified(crowdloan.fund(0, {from: contributor.address}));
      });

      it('should successfully fund valid value less than principal requested', async () => {
        const tx = await crowdloan.fund(contributor.value, {from: contributor.address});

        expectEvent.inLogs(tx.logs, 'Fund', {
          sender: contributor.address,
          amount: contributor.value
        });
      });

      xit('expect proper balance change', async () => {
        await crowdloan.fund(contributor.value, {from: contributor.address});
        const balance = await paymentToken.balanceOf.call(crowdloan.address);
        expect(balance).to.be.bignumber.equal(contributor.value);
      });

      xit('should not allow to fund with amount exceeding capital', async () => {
        await expectRevert.unspecified(
          crowdloan.fund(new BN(loanParams.principalRequested), {from: contributor.address}),
          'Amount exceeds capital'
        );
      });

      xit('should not allow to fund after crowdfund is complete', async () => {});
    });
  });

  context('withdrawPrincipal function', async () => {
    let partialAmount;
    let contributor;

    const nonBorrower = accounts[2];
    const lender = accounts[3];

    beforeEach(async () => {
      await crowdloan.startCrowdfund({from: borrower});
      await paymentToken.mint(contributor.address, new BN(loanParams.principalRequested));
      await paymentToken.approve(crowdloan.address, new BN(loanParams.principalRequested), {
        from: contributor.address
      });
    });

    context('Before crowdfund', async () => {
      beforeEach(async () => {});
      xit('borrower should not be able to withdraw before crowdfund starts', async () => {
        await expectRevert.unspecified(crowdloan.withdrawPrincipal({from: borrower}));
      });

      xit('non-borrower should not be able to withdraw before crowdfund starts', async () => {
        await expectRevert.unspecified(crowdloan.withdrawPrincipal({from: borrower}));
      });
      xit('lender should not be able to withdraw before crowdfund starts', async () => {});
    });

    context('During crowdfund', async () => {
      xit('non-borrower should not be able to withdraw before crowdfund ends', async () => {
        await expectRevert.unspecified(crowdloan.withdrawPrincipal({from: borrower}));
      });
      xit('lender should not be able to withdraw before crowdfund ends', async () => {});
      xit('borrower should not be able to withdraw before crowdfund ends', async () => {
        await expectRevert.unspecified(crowdloan.withdrawPrincipal({from: borrower}));
      });
    });

    context('After crowdfund', async () => {
      xit('non-borrower should not be able to withdraw after crowdfund ends', async () => {
        await expectRevert.unspecified(crowdloan.withdrawPrincipal({from: nonBorrower}));
      });
      xit('lender should not be able to withdraw after crowdfund ends', async () => {});
      xit('borrower should be able to withdraw after crowdfund ends', async () => {
        await crowdloan.withdrawPrincipal({from: borrower});
      });
      xit('should register event', async () => {
        await crowdloan.withdrawPrincipal({from: borrower});
      });
      xit('should update state variables', async () => {
        await crowdloan.withdrawPrincipal({from: borrower});
      });
    });
  });

  context('repay function', async () => {
    let partialAmount;
    let contributor;

    beforeEach(async () => {});

    context('Case: borrower repays', async () => {
      beforeEach(async () => {});
      xit('borrower should not be able to repay before crowdfund starts', async () => {});
      xit('borrower should not be able to repay before crowdfund ends', async () => {});
      xit('borrower should be able to repay after crowdfund ends', async () => {});
      xit('should register event', async () => {});
      xit('should update state variables', async () => {});
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
