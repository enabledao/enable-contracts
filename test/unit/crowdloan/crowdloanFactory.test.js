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
      result = await crowdloanFactory.app();
      expect(result).to.be.equal(appAddress);
    });
  });

  describe('Crowdfund deployment', async () => {
    let deployTx;

    beforeEach(async () => {
      deployTx = await crowdloanFactory.deploy(
        paymentToken.address,
        loanParams.principalRequested,
        loanParams.loanPeriod,
        loanParams.interestRate,
        loanParams.minimumRepayment,
        loanParams.maximumRepayment,
        crowdfundParams.crowdfundLength,
        crowdfundParams.crowdfundStart,
        {from: borrower}
      );
    });

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

    it('should revert if invalid arguments', async () => {});

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

      it('should initialize borrower parameter correctly on successful deploy', async () => {
        expect(await termsContract.getBorrower()).to.be.equal(borrower);
      });

      it('should initialize terms interest rate parameter on successful deploy', async () => {
        expect(await termsContract.getInterestRate()).to.be.bignumber.equal(
          new BN(loanParams.interestRate)
        );
      });

      it('should initialize loan status parameter correctly on successful deploy', async () => {
        expect(await termsContract.getLoanStatus()).to.be.bignumber.equal(new BN(0));
      });

      it('should initialize loan start timestamp parameter correctly on successful deploy', async () => {
        expect(await termsContract.getLoanStartTimestamp()).to.be.bignumber.equal(new BN(0));
      });

      it('should initialize principal requested parameter correctly on successful deploy', async () => {
        expect(await termsContract.getPrincipalRequested()).to.be.bignumber.equal(
          new BN(loanParams.principalRequested)
        );
      });

      it('should initialize principal disbursed parameter correctly on successful deploy', async () => {
        expect(await termsContract.getPrincipalDisbursed()).to.be.bignumber.equal(new BN(0));
      });

      it('should initialize principal token parameter correctly on successful deploy', async () => {
        expect(await termsContract.getPrincipalToken()).to.be.equal(paymentToken.address);
      });

      it('should initialize minimum repayment parameter correctly on successful deploy', async () => {
        expect(await termsContract.getMinimumRepayment()).to.be.bignumber.equal(
          new BN(loanParams.minimumRepayment)
        );
      });

      it('should initialize maximum repayment parameter correctly on successful deploy', async () => {
        expect(await termsContract.getMaximumRepayment()).to.be.bignumber.equal(
          new BN(loanParams.maximumRepayment)
        );
      });

      it('should initialize crowdloan correctly on successful deploy', async () => {
        const result = await crowdloan.getCrowdfundParams();

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
