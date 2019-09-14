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

    beforeEach(async () => {
      await crowdloan.startCrowdfund({from: borrower});
      await paymentToken.mint(contributor.address, new BN(loanParams.principalRequested));
      await paymentToken.approve(crowdloan.address, new BN(loanParams.principalRequested), {
        from: contributor.address
      });
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
      beforeEach(async () => {
        await crowdloan.startCrowdfund({from: borrower});
        await paymentToken.mint(contributor.address, new BN(loanParams.principalRequested));
        await paymentToken.approve(crowdloan.address, new BN(loanParams.principalRequested), {
          from: contributor.address
        });
      });

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
});
