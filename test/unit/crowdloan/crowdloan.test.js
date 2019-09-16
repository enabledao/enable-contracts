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

const {DECIMAL_SHIFT, loanParams, paymentTokenParams} = require('../../testConstants');

const getLastBlockTime = async () => {
    await time.advanceBlock();
    return await time.latest();
}

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
    assert.exists(crowdloan.address, 'Crowdloan was not successfully deployed');
    expect(await crowdloan.borrower.call()).to.equal(borrower);
    assert.exists(crowdloan.address, 'Crowdloan was not successfully deployed');
  });

  it('PaymentToken should deploy successfully', async () => {
    assert.exists(paymentToken.address, 'PaymentToken was not successfully deployed');
  });

  it('should not allow non-borrower to start crowdfund', async () => {
    await expectRevert.unspecified(
      crowdloan.startCrowdfund({from: accounts[4]}),
      'Only the borrower can call function.'
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
      'Only before crowdfund start'
    );
  });

  it('should register correct start time', async () => {
    await crowdloan.startCrowdfund({from: borrower});
    const now = await getLastBlockTime();
    expect(
      await crowdloan.crowdfundStart.call() // crowdfundStart
    ).to.be.bignumber.gte(new BN(now));
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
          'Only after crowdfund start'
        );
      });
    });

    describe('after crowdfund starts', async () => {
      beforeEach(async () => {
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

      it('expect proper balance change', async () => {
        await crowdloan.fund(contributor.value, {from: contributor.address});
        const balance = await paymentToken.balanceOf.call(crowdloan.address);
        expect(balance).to.be.bignumber.equal(contributor.value);
      });

      it('should successfully fund valid value equal to principal requested', async () => {
        const amount = new BN(loanParams.principalRequested);
        const tx = await crowdloan.fund(amount, {from: contributor.address});

        expectEvent.inLogs(tx.logs, 'Fund', {
          sender: contributor.address,
          amount: amount
        });
      });

      it('should not allow to fund with amount exceeding capital', async () => {
        const amount = new BN(loanParams.principalRequested).mul(new BN(2));
        await paymentToken.mint(contributor.address, new BN(loanParams.principalRequested));
        await paymentToken.approve(crowdloan.address, amount, {
          from: contributor.address
        });

        await expectRevert.unspecified(
          crowdloan.fund(new BN(amount), {from: contributor.address}),
          'Your contribution would exceed the total amount requested.'
        );
      });

      it('should not allow to fund after crowdfund is complete', async () => {
        await time.increase(loanParams.crowdfundLength + 1);

        await expectRevert.unspecified(
          crowdloan.fund(new BN(loanParams.principalRequested), {from: contributor.address}),
          'Only before crowdfund end'
        );
      });
    });
  });

  context('withdrawPrincipal function', async () => {
    let partialAmount;
    let contributor;

    const nonBorrower = accounts[2];
    const lender = accounts[3];

    context('Before crowdfund', async () => {
      const amount = new BN(100).mul(DECIMAL_SHIFT);

      beforeEach(async () => {
        await paymentToken.mint(lender, amount);
        await paymentToken.transfer(crowdloan.address, amount, {
          from: lender
        });

        expect(
          await paymentToken.balanceOf.call(crowdloan.address)
        ).to.be.bignumber.gt(new BN(0));
        expect(
          await crowdloan.crowdfundStart.call()
        ).to.be.bignumber.equal(new BN(0));
      });
      it('borrower should be able to withdraw before crowdfund starts', async () => {
          const tx = await crowdloan.withdrawPrincipal(amount, {from: borrower});

          expectEvent.inLogs(tx.logs, 'WithdrawPrincipal', {
            borrower,
            amount: amount
          });
      });

      it('non-borrower should not be able to withdraw before crowdfund starts', async () => {
        await expectRevert.unspecified(
          crowdloan.withdrawPrincipal(amount, {from: nonBorrower}),
          "Only the borrower can call function.");
      });

      it('lender should not be able to withdraw before crowdfund starts', async () => {
        await expectRevert.unspecified(
          crowdloan.withdrawPrincipal(amount, {from: lender}),
          "Only the borrower can call function.");
      });
    });

    context('During crowdfund', async () => {
      const value = new BN(loanParams.principalRequested);

      beforeEach(async () => {
        await crowdloan.startCrowdfund({from: borrower});
        await paymentToken.mint(lender, value);
        await paymentToken.approve(crowdloan.address, value, {
          from: lender
        });
        await crowdloan.fund(value, {from: lender});
      });

      it('non-borrower should not be able to withdraw before crowdfund ends', async () => {
        await expectRevert.unspecified(
          crowdloan.withdrawPrincipal(value, {from: nonBorrower}),
          "Only the borrower can call function.");
      });

      it('lender should not be able to withdraw before crowdfund ends', async () => {
        await expectRevert.unspecified(
          crowdloan.withdrawPrincipal(value, {from: lender}),
          "Only the borrower can call function.");
      });

      it('borrower should be able to withdraw before crowdfund ends', async () => {
        const tx = await crowdloan.withdrawPrincipal(value, {from: borrower});

        expectEvent.inLogs(tx.logs, 'WithdrawPrincipal', {
          borrower,
          amount: value
        });
      });
    });

    context('After crowdfund', async () => {
      const value = new BN(loanParams.principalRequested);

      beforeEach(async () => {
        await crowdloan.startCrowdfund({from: borrower});
        await paymentToken.mint(lender, new BN(loanParams.principalRequested));
        await paymentToken.approve(crowdloan.address, new BN(loanParams.principalRequested), {
          from: lender
        });
        await crowdloan.fund(value, {from: lender});
        await time.increase(loanParams.crowdfundLength + 1);
      });

      it('non-borrower should not be able to withdraw after crowdfund ends', async () => {
        await expectRevert.unspecified(
          crowdloan.withdrawPrincipal(value, {from: nonBorrower}),
          "Only the borrower can call function.");
      });

      it('lender should not be able to withdraw after crowdfund ends', async () => {
        await expectRevert.unspecified(
          crowdloan.withdrawPrincipal(value, {from: lender}),
          "Only the borrower can call function.");
      });

      it('borrower should be able to withdraw after crowdfund ends', async () => {
        const tx = await crowdloan.withdrawPrincipal(value, {from: borrower});

        expectEvent.inLogs(tx.logs, 'WithdrawPrincipal', {
          borrower,
          amount: value
        });
      });
    });
  });
});
