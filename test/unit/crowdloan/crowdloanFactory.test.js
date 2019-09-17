import {BN, expectEvent} from 'openzeppelin-test-helpers';

const {expect} = require('chai');

const {appCreate, getAppAddress, encodeCall} = require('../../testHelpers');
const {loanParams, paymentTokenParams} = require('../../testConstants');

const CrowdloanFactory = artifacts.require('CrowdloanFactory');
const Crowdloan = artifacts.require('Crowdloan');
const PaymentToken = artifacts.require('StandaloneERC20');

async function crowdloanFactoryUnitTests(accounts, loanParams, paymentTokenParams) {
  let tx;
  let result;
  let crowdloanFactory;
  let paymentToken;
  const appAddress = getAppAddress();
  const borrower = accounts[0];
  const contractAdmin = accounts[9];

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
        borrower,
        paymentToken.address,
        loanParams.principalRequested.toString(),
        loanParams.repaymentCap.toString(),
        loanParams.crowdfundLength.toString(),
        loanParams.loanMetadataURL,
        contractAdmin,
      );
    });

    it('should emit a LoanCreated event on successful deploy', async () => {
      expectEvent.inLogs(deployTx.logs, 'LoanCreated');
    });

    it('should deploy all contracts on successful deploy', async () => {
      const loanCreatedEvent = expectEvent.inLogs(deployTx.logs, 'LoanCreated');

      const crowdloan = await Crowdloan.at(loanCreatedEvent.args.crowdloan);

      assert.exists(crowdloan.address, 'crowdloan was not successfully deployed');
    });

    it('should emit admin address on successful deploy', async () => {
      const loanCreatedEvent = expectEvent.inLogs(deployTx.logs, 'LoanCreated');
      const adminAddress = loanCreatedEvent.args.contractAdmin;

      expect(adminAddress).to.be.equal(contractAdmin);
    });

    it('should revert if invalid arguments', async () => {});

    describe('Crowdfund post-deployment', async () => {
      let crowdloan;

      beforeEach(async () => {
        const loanCreatedEvent = expectEvent.inLogs(deployTx.logs, 'LoanCreated');

        crowdloan = await Crowdloan.at(loanCreatedEvent.args.crowdloan);
      });

      it('should initialize borrower parameter correctly on successful deploy', async () => {
        expect(await crowdloan.borrower()).to.be.equal(borrower);
      });

      it('should not have crowdfund time initialized', async () => {
        expect(await crowdloan.crowdfundStart()).to.be.bignumber.equal(new BN(0));
        expect(await crowdloan.crowdfundEnd()).to.be.bignumber.equal(new BN(0));
      });

      it('should initialize principal requested parameter correctly on successful deploy', async () => {
        expect(await crowdloan.principalRequested()).to.be.bignumber.equal(
          new BN(loanParams.principalRequested)
        );
      });

      it('should initialize principal token parameter correctly on successful deploy', async () => {
        expect(await crowdloan.token()).to.be.equal(paymentToken.address);
      });

      it('should initialize crowdfund length parameter correctly on successful deploy', async () => {
        expect(await crowdloan.crowdfundDuration()).to.be.bignumber.equal(
          loanParams.crowdfundLength
        );
      });
    });
  });
}

contract('CrowdloanFactory', async accounts => {
  await crowdloanFactoryUnitTests(accounts, loanParams, paymentTokenParams);
});
