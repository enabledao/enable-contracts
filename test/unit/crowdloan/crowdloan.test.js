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

    await expectEvent.inTransaction(
      tx.receipt.transactionHash,
      TermsContract,
      'LoanStatusUpdated',
      {
        status: loanStatuses.FUNDING_STARTED // FUNDING_STARTED
      }
    );

    expect(await termsContract.getLoanStatus()).to.be.bignumber.equal(loanStatuses.FUNDING_STARTED); // FUNDING_STARTED

    await expectRevert.unspecified(
      crowdloan.startCrowdfund({from: borrower}),
      'KickOff already passed'
    );
  });

  context('Crowdloan Funding', async () => {
    const contributor = {
      address: accounts[1],
      value: new BN(150)
    }; 

    beforeEach(async () => {
        await paymentToken.mint(contributor.address, contributor.value);
    });

  it('should not allow funding before crowdfund begins', async () => {
    await expectRevert.unspecified(
      crowdloan.fund(contributor.value, {from: contributor.address}),
      'Crowdfund not yet started'
    );
  });

  describe('During Crowdfund', async () => {
    let time;

    beforeEach(async () => {
      time = Math.floor(new Date().getTime / 1000);
      await crowdloan.startCrowdfund({from: borrower});
    });

    describe('Initializiation', async () => {
      it('should display valid start time after start', async () => {
        expect(
          (await crowdloan.getCrowdfundParams.call())[1] // crowdfundStart
        ).to.be.bignumber.gt(new BN(time));
      });
    });

    describe('Invalid funding condition - no ERC20 Approval', async => {
      it ('should not allow funding without prior erc20 approval', async () => {
        await expectRevert.unspecified(
          crowdloan.fund(contributor.value, {from: contributor.address}),
          'Crowdloan not approved to Transfer from'
        );
      });
    });

    describe('Invalid funding condition - with ERC20 Approval', async => {
      beforeEach(async () => {
        await paymentToken.approve(crowdloan.address, contributor.value, {from: contributor.address});
      });

      it ('should not allow funding of zero tokens', async () => {
        await expectRevert.unspecified(
          crowdloan.fund(new BN(0), {from: contributor.address}),
          'Can not increase by zero shares'
        );
      });
    });

    describe('Valid funding conditions', async => {
      beforeEach(async () => {
        await paymentToken.approve(crowdloan.address, contributor.value, {from: contributor.address});
      });

      it('should emit funding event with valid contribution', async () => {
        const tx = await crowdloan.fund(contributor.value, {from: contributor.address});

        expectEvent.inLogs(tx.logs, 'Fund', {
          sender: contributor.address,
          amount: contributor.value
        });
      });

      it('should successfully fund with valid contribution', async () => {
        const tx = await crowdloan.fund(contributor.value, {from: contributor.address});
        const balance = await paymentToken.balanceOf.call(crowdloan.address);

        expect(balance).to.be.bignumber.equal(contributor.value);
      });

      it('should successfully fund with contribution of entire principal', async () => {
        await paymentToken.mint(contributor.address, new BN(loanParams.principalRequested));
        await paymentToken.approve(crowdloan.address, new BN(loanParams.principalRequested), {
          from: contributor.address
        });

        const tx = await crowdloan.fund(loanParams.principalRequested, {from: contributor.address});

        expect(await termsContract.getLoanStatus()).to.be.bignumber.equal(
          loanStatuses.FUNDING_COMPLETE
        ); // FUNDING_COMPLETE)


      });

      xit('should not allow crowdfund above principal requested, with a single fund', async () => {
        await paymentToken.mint(contributor.address, new BN(loanParams.principalRequested));
        await paymentToken.approve(crowdloan.address, new BN(loanParams.principalRequested), {
          from: contributor.address
        });

        //TODO: Attempt to fund with MORE than principal requested
        
        // await expectRevert.unspecified(
        //   crowdloan.fund(new BN(loanParams.principalRequested), {from: contributor.address}),
        //   'Amount exceeds capital'
        // );
      });

      xit('should not allow crowdfund above principal requested, with multiple funds', async () => {
      });
    });
  });

  it('should successfully fund with valid contribution', async () => {
    await expectRevert.unspecified(
      crowdloan.fund(contributor.value, {from: accounts[2]}),
      'Were the tokens successfully sent?'
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

    

    await expectRevert.unspecified(
      crowdloan.fund(contributor.value, {from: contributor.address}),
      'Crowdfund completed or failed'
    );
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
