// Loan should be in correct status after first lender funds
// Lender should not be able to send less than minimum contribution
// Lender should not be able to send more than maximum contribution
// Loan should be in correct status after being fully funded
// Lender should be able to refund() while loan is in funding state
// Lender should not be able to refund() while loan is in fully funded state
// Lender should not be able to contribute after loan is fully funded
// Lender should not be able to contribute after loan is withdrawn by borrower

import {BN, expectEvent, expectRevert} from 'openzeppelin-test-helpers';

const {expect} = require('chai');

const Crowdloan = artifacts.require('Crowdloan');
const TermsContract = artifacts.require('TermsContract');
const RepaymentManager = artifacts.require('RepaymentManager');
const PaymentToken = artifacts.require('StandaloneERC20');

const {
  loanStatuses,
  crowdfundParams,
  loanParams,
  paymentTokenParams
} = require('../../testConstants');

contract('Crowdloan', accounts => {
  let crowdloan;
  let paymentToken;
  let termsContract;
  let repaymentManager;
  const borrower = accounts[0];
  const controllers = [accounts[0]];

  beforeEach(async () => {
    paymentToken = await PaymentToken.new();
    await paymentToken.initialize(
      paymentTokenParams.name,
      paymentTokenParams.symbol,
      paymentTokenParams.decimals,
      [accounts[0]], // minters
      [] // pausers
    );
    termsContract = await TermsContract.new();
    repaymentManager = await RepaymentManager.new();
    crowdloan = await Crowdloan.new();

    await crowdloan.initialize(
      termsContract.address,
      repaymentManager.address,
      ...Object.values(crowdfundParams)
    );

    await termsContract.initialize(
      borrower,
      paymentToken.address,
      ...Object.values(loanParams),
      controllers.concat([crowdloan.address, repaymentManager.address])
    );

    await repaymentManager.initialize(
      termsContract.address,
      controllers.concat([crowdloan.address])
    );
  });

  it('Crowdloan should deploy successfully', async () => {
    expect(await crowdloan.getBorrower.call()).to.equal(borrower);
    assert.exists(crowdloan.address, 'Crowdloan was not successfully deployed');
  });

  it('TermsContract should deploy successfully', async () => {
    assert.exists(termsContract.address, 'TermsContract was not successfully deployed');
  });

  it('RepaymentManager should deploy successfully', async () => {
    assert.exists(repaymentManager.address, 'RepaymentManager was not successfully deployed');
  });

  it('PaymentToken should deploy successfully', async () => {
    assert.exists(paymentToken.address, 'PaymentToken was not successfully deployed');
  });

  it('should successfully startCrowdfund', async () => {
    await expectRevert.unspecified(
      crowdloan.startCrowdfund({from: accounts[4]}),
      'Only borrower can start crowdfund'
    );

    const tx = await crowdloan.startCrowdfund({from: borrower});

    await expectEvent.inTransaction(tx.receipt.transactionHash, TermsContract, 'LoanStatusUpdated', {
      status: loanStatuses.FUNDING_STARTED // FUNDING_STARTED
    });

    expect(await termsContract.getLoanStatus()).to.be.bignumber.equal(loanStatuses.FUNDING_STARTED); // FUNDING_STARTED

    await expectRevert.unspecified(
      crowdloan.startCrowdfund({from: borrower}),
      'KickOff already passed'
    );
  });

  /** TODO(Dan) */
  context('fund crowdloan', async () => {
    beforeEach(async () => {});
  });

  it('should successfully fund', async () => {
    const contributor = {
      address: accounts[1],
      value: new BN(150)
    };
    await paymentToken.mint(contributor.address, contributor.value);

    await expectRevert.unspecified(
      crowdloan.fund(contributor.value, {from: contributor.address}),
      'Crowdfund not yet started'
    );

    const time = Math.floor(new Date().getTime / 1000);
    await crowdloan.startCrowdfund({from: borrower});

    expect(
      (await crowdloan.getCrowdfundParams.call())[1] // crowdfundStart
    ).to.be.bignumber.gt(new BN(time));

    await expectRevert.unspecified(
      crowdloan.fund(contributor.value, {from: contributor.address}),
      'Crowdloan not approved to Transfer from'
    );

    await paymentToken.approve(crowdloan.address, contributor.value, {from: contributor.address});

    await expectRevert.unspecified(
      crowdloan.fund(new BN(0), {from: contributor.address}),
      'Can not increase by zero shares'
    );

    await expectRevert.unspecified(
      crowdloan.fund(contributor.value, {from: accounts[2]}),
      'Were the tokens successfully sent?'
    );

    const tx = await crowdloan.fund(contributor.value, {from: contributor.address});

    expectEvent.inLogs(tx.logs, 'Fund', {
      sender: contributor.address,
      amount: contributor.value
    });

    const balance = await paymentToken.balanceOf.call(crowdloan.address);
    expect(balance).to.be.bignumber.equal(contributor.value);

    await paymentToken.mint(contributor.address, new BN(loanParams.principalRequested));

    await paymentToken.approve(crowdloan.address, new BN(loanParams.principalRequested), {
      from: contributor.address
    });

    await expectRevert.unspecified(
      crowdloan.fund(new BN(loanParams.principalRequested), {from: contributor.address}),
      'Amount exceeds capital'
    );

    await termsContract.setLoanStatus(loanStatuses.FUNDING_FAILED); // FUNDING_FAILED
    await expectRevert.unspecified(
      crowdloan.fund(contributor.value, {from: contributor.address}),
      'Crowdfund completed or failed'
    );

    await termsContract.setLoanStatus(loanStatuses.FUNDING_STARTED); // FUNDING_STARTED

    await crowdloan.fund(new BN(loanParams.principalRequested).sub(contributor.value), {
      from: contributor.address
    });

    expect(await termsContract.getLoanStatus()).to.be.bignumber.equal(
      loanStatuses.FUNDING_COMPLETE
    ); // FUNDING_COMPLETE)

    await expectRevert.unspecified(
      crowdloan.fund(contributor.value, {from: contributor.address}),
      'Crowdfund completed or failed'
    );
  });

  context('refund function', async () => {
    let partialAmount;
    let contributor;

    beforeEach(async () => {
      /** Fund lender account */
      contributor = {
        address: accounts[2],
        value: new BN(loanParams.principalRequested)
      };
      await paymentToken.mint(contributor.address, contributor.value); // Give lender sufficient tokens
      partialAmount = new BN(150); // TODO(Dan): Make this a random fraction of total borrow amount
      /** Start crowdloan */
      await crowdloan.startCrowdfund({from: borrower});
      await paymentToken.approve(crowdloan.address, contributor.value, {from: contributor.address});
    });

    context('invalid refund parameters', async () => {
      beforeEach(async () => {
        await crowdloan.fund(partialAmount, {from: contributor.address});
      });

      it('should revert if refunded amount exceeds owned shares', async () => {
        await expectRevert.unspecified(
          crowdloan.refund(contributor.value, {from: contributor.address})
        );
        const current = await repaymentManager.totalShares();
        expect(current).to.be.a.bignumber.that.equals(partialAmount);
      });

      it('should revert if refunded amount is 0', async () => {
        await expectRevert.unspecified(
          crowdloan.refund(new BN(0), {from: contributor.address}),
          'Can not decrease by zero shares'
        );
        const current = await repaymentManager.totalShares();
        expect(current).to.be.a.bignumber.that.equals(partialAmount);
      });
    });

    /** TODO(Dan): Should decide whether we want this functionality, since we don't have UI for it */
    context('during crowdfunding phase', async () => {
      let tx;
      let remainder;
      let refundedAmount;

      beforeEach(async () => {
        await crowdloan.fund(partialAmount, {from: contributor.address});
        remainder = new BN(10); // TODO(Dan): make random number smaller than partialAmount
        refundedAmount = partialAmount.sub(remainder);
        tx = await crowdloan.refund(refundedAmount, {from: contributor.address});
      });

      it('should trigger a refund event in logs', async () => {
        expectEvent.inLogs(tx.logs, 'Refund', {
          sender: contributor.address,
          amount: refundedAmount
        });
      });

      it('should transfer correct units of currencyToken back to lender', async () => {
        const balance = await paymentToken.balanceOf.call(contributor.address);
        expect(balance).to.be.bignumber.equal(contributor.value.sub(remainder));
      });

      it('should decrease totalCrowdfunded', async () => {
        const totalRemainder = await repaymentManager.totalShares();
        expect(totalRemainder).to.be.bignumber.equal(remainder);
      });
    });

    context('if crowdfunding failed', async () => {
      let tx;

      beforeEach(async () => {
        await crowdloan.fund(partialAmount, {from: contributor.address});
        termsContract.setLoanStatus(loanStatuses.FUNDING_FAILED);
      });

      it('should allow refund if crowdfunding failed', async () => {
        tx = await crowdloan.refund(partialAmount, {from: contributor.address});
        expectEvent.inLogs(tx.logs, 'Refund', {
          sender: contributor.address,
          amount: partialAmount
        });
        const balance = await paymentToken.balanceOf.call(contributor.address);
        expect(balance).to.be.bignumber.equal(contributor.value);
      });
    });

    context('after crowdfunding phase', async () => {
      it('should not allow refund if funding is complete', async () => {
        termsContract.setLoanStatus(loanStatuses.FUNDING_STARTED); // FUNDING_STARTED
        crowdloan.fund(contributor.value, {from: contributor.address});

        // console.log(contributor)
        // const current = await repaymentManager.totalShares();
        // console.log(`Just funded: ${current.toNumber()}`);
        expect(await termsContract.getLoanStatus()).to.be.bignumber.equal(
          loanStatuses.FUNDING_COMPLETE
        );

        await expectRevert.unspecified(
          crowdloan.refund(contributor.value, {from: contributor.address}),
          'Funding already complete. Refund Impossible'
        );
      });
    });
  });

  context('withdraw function', async () => {
    let partialAmount;
    let contributor;

    beforeEach(async () => {
      partialAmount = new BN(150); // TODO(Dan): Make this a random fraction
      contributor = {
        address: accounts[1],
        value: new BN(loanParams.principalRequested)
      };
      await paymentToken.mint(contributor.address, contributor.value);
      await crowdloan.startCrowdfund({from: borrower});
      await paymentToken.approve(crowdloan.address, contributor.value, {
        from: contributor.address
      });
    });

    it('should not let borrower withdraw if crowdfund is not complete', async () => {
      await expectRevert.unspecified(
        crowdloan.methods['withdraw(uint256)'](contributor.value, {from: borrower}),
        'Crowdfund not yet completed'
      );
    });

    context('crowdfund complete', async () => {
      beforeEach(async () => {
        await crowdloan.fund(contributor.value, {from: contributor.address}); // will set FUNDING_COMPLETE as goal is hit
      });

      context('permissions', async () => {
        it('should not let anyone other than borrower withdraw', async () => {
          await expectRevert.unspecified(
            crowdloan.methods['withdraw(uint256)'](partialAmount, {from: accounts[2]}),
            'Withdrawal only allowed for Borrower'
          );
        });

        it('should not let lenders withdraw', async () => {
          await expectRevert.unspecified(
            crowdloan.methods['withdraw(uint256)'](partialAmount, {from: contributor.address}),
            'Withdrawal only allowed for Borrower'
          );
        });
      });

      it('should let borrower make a partial withdrawals', async () => {
        const partialWithdrawal = new BN(1000); // TODO(Dan): make random value
        const remainder = contributor.value.sub(partialWithdrawal);

        /** Partial withdrawal 1 */
        await crowdloan.methods['withdraw(uint256)'](partialWithdrawal, {from: borrower});
        const partialBalance = await paymentToken.balanceOf.call(borrower);
        expect(partialBalance).to.be.bignumber.equal(partialWithdrawal);
        const partialCrowdloanBalance = await paymentToken.balanceOf.call(crowdloan.address); // crowdloan's balance
        expect(partialCrowdloanBalance).to.be.bignumber.equal(remainder);

        /** Partial withdrawal 2 using withdraw() for remainder */
        await crowdloan.methods['withdraw()']({from: borrower});
        const fullBalance = await paymentToken.balanceOf.call(borrower);
        expect(fullBalance).to.be.bignumber.equal(contributor.value);
        const crowdloanBalance = await paymentToken.balanceOf.call(crowdloan.address); // crowdloan's balance
        expect(crowdloanBalance).to.be.bignumber.equal(new BN(0));
      });

      it('should let borrower make full withdrawal', async () => {
        await crowdloan.methods['withdraw(uint256)'](contributor.value, {from: borrower});
        const fullBalance = await paymentToken.balanceOf.call(borrower);
        expect(fullBalance).to.be.bignumber.equal(contributor.value);
        const crowdloanBalance = await paymentToken.balanceOf.call(crowdloan.address); // crowdloan's balance
        expect(crowdloanBalance).to.be.bignumber.equal(new BN(0));
      });

      it('should log a releaseFunds event', async () => {
        const tx = await crowdloan.methods['withdraw(uint256)'](contributor.value, {
          from: borrower
        });
        expectEvent.inLogs(tx.logs, 'ReleaseFunds', {
          borrower,
          amount: contributor.value
        });
      });
    });

    context('partial fundraise', async () => {
      let partialFundraise;

      beforeEach(async () => {
        partialFundraise = new BN(1000000000); // TODO(Dan): generate random number instead
        await crowdloan.fund(partialFundraise, {from: contributor.address});
        await termsContract.setLoanStatus(loanStatuses.FUNDING_COMPLETE);
      });

      it('should not let borrower withdraw more than totalCrowdfunded', async () => {
        const more = partialFundraise.add(new BN(1));
        await expectRevert(
          crowdloan.methods['withdraw(uint256)'](more, {from: borrower}),
          'Amount exceeds available balance'
        );
      });

      it('should let borrower start a loan with a partial fundraise', async () => {
        const totalCrowdfunded = await repaymentManager.totalShares();
        expect(totalCrowdfunded).to.be.bignumber.equal(partialFundraise);
        await crowdloan.methods['withdraw(uint256)'](totalCrowdfunded, {from: borrower});
        const params = await termsContract.getLoanParams();
        expect(params.principalDisbursed).to.be.bignumber.equal(totalCrowdfunded);
      });
    });
  });
});
