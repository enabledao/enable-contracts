// Loan should be in correct status after first lender funds
// Lender should not be able to send less than minimum contribution
// Lender should not be able to send more than maximum contribution
// Loan should be in correct status after being fully funded
// Lender should be able to refund() while loan is in funding state
// Lender should not be able to refund() while loan is in fully funded state
// Lender should not be able to contribute after loan is fully funded
// Lender should not be able to contribute after loan is withdrawn by borrower

import {BN, constants, expectEvent, expectRevert} from 'openzeppelin-test-helpers';

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
      controllers.concat([crowdloan.address])
    );

    await repaymentManager.initialize(
      paymentToken.address,
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

    // await expectEvent.inTransaction(tx.receipt.transactionHash, 'LoanStatusSet',{
    //   status: new BN(1) //FUNDING_STARTED
    // });

    expect(await termsContract.getLoanStatus()).to.be.bignumber.equal(new BN(1)); // FUNDING_STARTED

    await expectRevert.unspecified(
      crowdloan.startCrowdfund({from: borrower}),
      'KickOff already passed'
    );
  });

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

  context('crowdloan should be able to refund lender', async () => {
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
        const current = await crowdloan.getTotalCrowdfunded();
        expect(current).to.be.a.bignumber.that.equals(partialAmount);
      });

      it('should revert if refunded amount is 0', async () => {
        await expectRevert.unspecified(
          crowdloan.refund(new BN(0), {from: contributor.address}),
          'Can not decrease by zero shares'
        );
        const current = await crowdloan.getTotalCrowdfunded();
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
        const totalRemainder = await crowdloan.getTotalCrowdfunded();
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
        // const current = await crowdloan.getTotalCrowdfunded();
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

  /** TODO(Dan): Deprecate this */
  it('should successfully refund', async () => {
    const bit = new BN(150);

    const contributor = {
      address: accounts[2],
      value: new BN(loanParams.principalRequested)
    };
    await paymentToken.mint(contributor.address, contributor.value);

    await expectRevert.unspecified(
      crowdloan.refund(contributor.value, {from: contributor.address})
      // 'Amount exceeds owned shares'
    );

    await crowdloan.startCrowdfund({from: borrower});

    await paymentToken.approve(crowdloan.address, contributor.value, {from: contributor.address});

    await crowdloan.fund(bit, {from: contributor.address});

    await expectRevert.unspecified(
      crowdloan.refund(new BN(0), {from: contributor.address}),
      'Can not decrease by zero shares'
    );

    await expectRevert.unspecified(
      crowdloan.refund(bit.add(new BN(10)), {from: contributor.address}),
      'Amount exceeds owned shares'
    );

    const tx = await crowdloan.refund(bit, {from: contributor.address});

    expectEvent.inLogs(tx.logs, 'Refund', {
      sender: contributor.address,
      amount: bit
    });

    const balance = await paymentToken.balanceOf.call(contributor.address);
    expect(balance).to.be.bignumber.equal(contributor.value);

    await crowdloan.fund(bit, {from: contributor.address});
    termsContract.setLoanStatus(loanStatuses.FUNDING_FAILED); // FUNDING_FAILED

    await crowdloan.refund(bit, {from: contributor.address});

    termsContract.setLoanStatus(loanStatuses.FUNDING_STARTED); // FUNDING_STARTED

    await paymentToken.approve(crowdloan.address, contributor.value, {from: contributor.address});

    crowdloan.fund(contributor.value, {from: contributor.address});

    expect(await termsContract.getLoanStatus()).to.be.bignumber.equal(
      loanStatuses.FUNDING_COMPLETE
    ); // FUNDING_COMPLETE)

    await expectRevert.unspecified(
      crowdloan.refund(contributor.value, {from: contributor.address}),
      'Funding already complete. Refund Impossible'
    );
  });

  context('crowdloan should allow borrower to withdraw after successful crowdfund', async () => {
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

    context('successful full fundraise', async () => {
      beforeEach(async () => {
        await crowdloan.fund(contributor.value, {from: contributor.address}); // should also set FUNDING_COMPLETE
      });

      it('should not let anyone other than borrower withdraw', async () => {
        await expectRevert.unspecified(
          crowdloan.methods['withdraw(uint256)'](partialAmount, {from: accounts[2]}),
          'Withdrawal only allowed for Borrower'
        );
      });

      it('should let borrower make a partial withdrawals', async () => {
        // partial withdrawal
        // remaining withdrawal
      });
      it('should let borrower make full withdrawal', async () => {});
    });

    context('partial fundraise', async () => {
      beforeEach(async () => {
        await crowdloan.fund(partialAmount, {from: contributor.address});
        await termsContract.setLoanStatus(loanStatuses.FUNDING_COMPLETE);
      });

      it('should let borrower start a loan with a partial fundraise', async () => {
        // make withdrawal
      });
    });
  });

  it('should successfully withdraw', async () => {
    const bit = new BN(150);
    const contributor = {
      address: accounts[1],
      value: new BN(loanParams.principalRequested)
    };
    await paymentToken.mint(contributor.address, contributor.value);

    await expectRevert.unspecified(
      crowdloan.methods['withdraw(uint256)'](contributor.value, {from: borrower}),
      'Crowdfund not yet completed'
    );

    await crowdloan.startCrowdfund({from: borrower});

    await paymentToken.approve(crowdloan.address, contributor.value, {from: contributor.address});

    await crowdloan.fund(bit, {from: contributor.address});

    await expectRevert.unspecified(
      crowdloan.methods['withdraw(uint256)'](contributor.value, {from: borrower}),
      'Crowdfund not yet completed'
    );

    await crowdloan.fund(contributor.value.sub(bit), {from: contributor.address});

    await expectRevert.unspecified(
      crowdloan.methods['withdraw(uint256)'](bit, {from: accounts[2]}),
      'Withdrawal only allowed for Borrower'
    );

    const tx = await crowdloan.methods['withdraw(uint256)'](bit, {from: borrower});

    expectEvent.inLogs(tx.logs, 'ReleaseFunds', {
      borrower,
      amount: bit
    });

    const balance = await paymentToken.balanceOf.call(borrower);
    expect(balance).to.be.bignumber.equal(bit);

    expect(await termsContract.getLoanStatus()).to.be.bignumber.equal(new BN(4)); // REPAYMENT_CYCLE

    await expectRevert.unspecified(
      crowdloan.methods['withdraw(uint256)'](contributor.value, {from: borrower}),
      'Amount exceeds available balance'
    );

    await expectRevert.unspecified(
      crowdloan.methods['withdraw(uint256)'](contributor.value, {from: borrower}),
      'Amount exceeds available balance'
    );

    await crowdloan.methods['withdraw()']({from: borrower});

    expect(await paymentToken.balanceOf.call(borrower)).to.be.bignumber.equal(contributor.value);
  });
});
