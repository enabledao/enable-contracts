import {BN, expectEvent} from 'openzeppelin-test-helpers';

const {expect} = require('chai');

const {appCreate, getAppAddress, encodeCall} = require('../../testHelpers');
const {crowdfundParams, loanParams, paymentTokenParams} = require('../../testConstants');

const CrowdloanFactory = artifacts.require('CrowdloanFactory');
const TermsContract = artifacts.require('TermsContract');
const Crowdloan = artifacts.require('Crowdloan');
const RepaymentManager = artifacts.require('RepaymentManager');
const PaymentToken = artifacts.require('StandaloneERC20');

async function crowdloanFactoryUnitTests(
  accounts,
  crowdfundParams,
  loanParams,
  paymentTokenParams
) {
  let tx;
  let result;
  let crowdloanFactory;
  let paymentToken;
  const appAddress = getAppAddress();
  const borrower = accounts[0];

  beforeEach(async () => {
    // Create a factory via App
    const data = encodeCall('initialize', ['address'], [appAddress]);
    const proxyAddress = await appCreate('enable-credit', 'CrowdloanFactory', accounts[1], data);
    crowdloanFactory = await CrowdloanFactory.at(proxyAddress);

    paymentToken = await PaymentToken.new();
    paymentToken.initialize(
      paymentTokenParams.name,
      paymentTokenParams.symbol,
      paymentTokenParams.decimals
    );
  });

  describe('Factory deployment', async () => {
    it('Factory should deploy successfully', async () => {
      assert.exists(crowdloanFactory.address, 'crowdloanFactory was not successfully deployed');
    });

    it('Factory should have App address initialized', async () => {
      result = await crowdloanFactory.getApp();
      expect(result).to.be.equal(appAddress);
    });
  });

  describe('Crowdfund deployment', async () => {
    let deployTx;
    const expectedLoanId = new BN(0);

    beforeEach(async () => {
      deployTx = await crowdloanFactory.deploy(
        crowdloanFactory.address,
        loanParams.principalRequested,
        loanParams.loanPeriod,
        loanParams.interestRate,
        crowdfundParams.crowdfundLength,
        crowdfundParams.crowdfundStart,
        {from: borrower}
      );
    });

    describe('Crowdfund deployment', async () => {
      it('should emit a LoanCreated event on successful deploy', async () => {
        expectEvent.inLogs(deployTx.logs, 'LoanCreated');
      });

      it('should deploy all contracts on successful deploy', async () => {
        const loanCreatedEvent = expectEvent.inLogs(deployTx.logs, 'LoanCreated');

        const termsContract = await TermsContract.at(loanCreatedEvent.args.termsContract);
        const crowdloan = await Crowdloan.at(loanCreatedEvent.args.crowdloan);
        const repaymentManager = await RepaymentManager.at(loanCreatedEvent.args.repaymentManager);

        assert.exists(termsContract.address, 'terms contract was not successfully deployed');
        assert.exists(crowdloan.address, 'crowdloan was not successfully deployed');
        assert.exists(repaymentManager.address, 'repayment manager was not successfully deployed');
      });

      it('should register correct borrower', async () => {
        const loanCreatedEvent = expectEvent.inLogs(deployTx.logs, 'LoanCreated');
        expect(loanCreatedEvent.args.borrower).to.be.equal(borrower);
      });

      it('should register correct principal amount', async () => {
        const loanCreatedEvent = expectEvent.inLogs(deployTx.logs, 'LoanCreated');
        expect(loanCreatedEvent.args.amount).to.be.bignumber.equal(loanParams.principalRequested);
      });

      it('should register correct loan ID', async () => {
        const loanCreatedEvent = expectEvent.inLogs(deployTx.logs, 'LoanCreated');
        expect(loanCreatedEvent.args.loanId).to.be.bignumber.equal(expectedLoanId);
      });

      it('should revert if invalid arguments', async () => {});
    });

    describe('Crowdfund post-deployment', async () => {
      let crowdloan;
      let termsContract;
      let repaymentManager;

      beforeEach(async () => {
        const loanCreatedEvent = expectEvent.inLogs(deployTx.logs, 'LoanCreated');

        termsContract = await TermsContract.at(loanCreatedEvent.args.termsContract);
        crowdloan = await Crowdloan.at(loanCreatedEvent.args.crowdloan);
        repaymentManager = await RepaymentManager.at(loanCreatedEvent.args.repaymentManager);
      });

      it('should initialize terms contract correctly on successful deploy', async () => {
        expect(await termsContract.getPrincipalRequested()).to.be.bignumber.equal(
          new BN(loanParams.principalRequested)
        );
      });

      it('should initialize crowdloan correctly on successful deploy', async () => {
        result = await crowdloan.getCrowdfundParams();

        const params = {
          crowdfundLength: result[0],
          crowdfundStart: result[1]
        };

        expect(params.crowdfundStart).to.be.bignumber.equal(new BN(crowdfundParams.crowdfundStart));
        expect(params.crowdfundLength).to.be.bignumber.equal(
          new BN(crowdfundParams.crowdfundLength)
        );
      });

      it('should initialize repayment manager correctly on successful deploy', async () => {
        expect(await repaymentManager.totalShares()).to.be.bignumber.equal(new BN(0));
      });
    });
  });
}

contract('CrowdloanFactory', async accounts => {
  await crowdloanFactoryUnitTests(accounts, crowdfundParams, loanParams, paymentTokenParams);
});
