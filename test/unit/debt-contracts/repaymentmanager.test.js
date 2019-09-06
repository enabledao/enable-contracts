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

import {BN, expectEvent, expectRevert, time} from 'openzeppelin-test-helpers';
import {repaymentStatuses} from '../../testConstants';

const {expect} = require('chai');
const moment = require('moment');

const {loanStatuses, paymentTokenParams, MAX_CROWDFUND} = require('../../testConstants');
const {
  generateLoanScenario,
  generateRandomPaddedBN,
  generateRandomBN,
  getRandomPercentageOfBN
} = require('../../testHelpers');

const RepaymentManager = artifacts.require('RepaymentManager');
const TermsContract = artifacts.require('TermsContract');
const PaymentToken = artifacts.require('StandaloneERC20');

const verbose = false;
const tolerance = new BN(10); // in wei

contract('RepaymentManager', accounts => {
  let paymentToken;
  let termsContract;
  let repaymentManager;

  let lenders;
  let lender1;
  let lender2;
  let lender3;
  let loanParams;
  let repayments;

  // TODO(Dan): Refactor roles into testHelper
  const minter = accounts[1];
  const borrower = accounts[4];
  const controller = accounts[5];
  const nonLender = accounts[9];
  const nonBorrower = accounts[9];
  const nonControllers = [accounts[9]];

  beforeEach(async () => {
    paymentToken = await PaymentToken.new();
    await paymentToken.initialize(
      paymentTokenParams.name,
      paymentTokenParams.symbol,
      paymentTokenParams.decimals,
      [minter], // minters
      [] // pausers
    );

    // TODO(Dan): Make better generateLoanScenario
    ({lenders, loanParams, repayments} = generateLoanScenario(accounts));
    lender1 = lenders[0].address;
    lender2 = lenders[1].address;
    lender3 = lenders[2].address;

    termsContract = await TermsContract.new();
    repaymentManager = await RepaymentManager.new();

    await termsContract.initialize(borrower, paymentToken.address, ...Object.values(loanParams), [
      controller,
      repaymentManager.address
    ]);
    await repaymentManager.initialize(termsContract.address, [controller]);
  });

  context('should deploy correctly', async () => {
    it('RepaymentManager should deploy successfully', async () => {
      assert.exists(repaymentManager.address, 'repaymentManager was not successfully deployed');
    });

    it('RepaymentManager should have TermsContract address initialized', async () => {
      const result = await repaymentManager.termsContract.call();
      expect(result).to.be.equal(termsContract.address);
    });
  });

  describe('increaseShares', async () => {
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
      it('should emit a ShareIncreased event for new shareholders', async () => {
        expectEvent.inLogs(tx.logs, 'ShareIncreased', {
          account: lender.address,
          sharesAdded: increment
        });
      });
    });
  });

  describe('totalShares', async () => {
    let original;
    let lender;
    beforeEach(async () => {
      [lender] = lenders;
      original = generateRandomPaddedBN(MAX_CROWDFUND);
      await repaymentManager.increaseShares(lender.address, original, {from: controller});
    });
    it('increaseShares should increase the total number of shares', async () => {
      const increment = generateRandomPaddedBN(MAX_CROWDFUND);
      await repaymentManager.increaseShares(lender.address, increment, {from: controller});
      const increased = await repaymentManager.totalShares();
      expect(increased.sub(original)).to.be.bignumber.equal(increment);
    });
  });
  describe('shares', async () => {
    xit('implicitly tested in increaseShares and decreaseShares tests');
  });
});
