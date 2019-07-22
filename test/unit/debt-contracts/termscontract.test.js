import {BN, constants, expectEvent, expectRevert} from 'openzeppelin-test-helpers';

const {expect} = require('chai');
const moment = require('moment');

const {appCreate, encodeCall} = require('../../testHelpers');
const {loanStatuses} = require('../../testConstants');

const TermsContract = artifacts.require('TermsContract');

const verbose = false;

contract('Terms Contract', accounts => {
  let instance;
  let instanceParams;
  const threshold = 100; // Testing offset for timestamps in seconds
  const admin = accounts[1]; // TODO(Dan): Clarify with tspoff on what `admin` is
  const borrower = accounts[5];
  const controller = accounts[6];
  const nonController = accounts[7];
  // TODO(Dan): Should refactor params into testHelpers
  const params = {
    borrower,
    principalToken: '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359',
    principalRequested: new BN(60000), // TODO(Dan): Replace with actual number 60000 * 10 ** 18
    loanPeriod: new BN(12),
    interestRate: new BN(50)
  };

  const reassign = (original, param, value) => {
    return Object.assign({}, original, {[param]: value});
  };

  const initializeInstance = async (
    borrowerAddr,
    principalTokenAddr,
    principalRequested,
    loanPeriod,
    interestRate
  ) => {
    const data = encodeCall(
      'initialize',
      ['address', 'address', 'uint256', 'uint256', 'uint256', 'address[]'],
      [
        borrowerAddr,
        principalTokenAddr,
        principalRequested.toNumber(),
        loanPeriod.toNumber(),
        interestRate.toNumber(),
        [controller]
      ]
    );
    const proxyAddress = await appCreate('enable-credit', 'TermsContract', admin, data);
    return TermsContract.at(proxyAddress);
  };

  const invalidInputCheckRevert = async (original, param, value, error) => {
    const mutated = reassign(original, param, value);
    await expectRevert.unspecified(initializeInstance(...Object.values(mutated)), error);
  };

  const interestPayment = (principal, interest) => {
    return new BN(principal).mul(new BN(interest)).div(new BN(10000));
  };

  context('invalid loan term params', async () => {
    it('should not create if principalToken is not an ERC20', async () => {
      // TODO(Dan): Do an actual check for ERC20 token
      await invalidInputCheckRevert(
        params,
        'principalToken',
        constants.ZERO_ADDRESS
        // 'Loaned tsoken must be an ERC20 token'
      );
    });
    it('should have a principalRequested greater than 0', async () => {
      await invalidInputCheckRevert(params, 'principalRequested', new BN(0));
    });
    it('should revert if loan period is 0', async () => {
      await invalidInputCheckRevert(
        params,
        'loanPeriod',
        new BN(0)
        // 'Loan period must be higher than 0'
      );
    });
    it('should revert if interest rate is not in basis points', async () => {
      await invalidInputCheckRevert(
        params,
        'interestRate',
        new BN(6)
        // 'Interest rate should be in basis points and have minimum of 10 (0.1%)'
      );
    });
    it('should revert if interest rate is too high', async () => {
      await invalidInputCheckRevert(
        params,
        'interestRate',
        new BN(1000000)
        // 'Interest rate be in basis points and less than 10,000 (100%)'
      );
    });
  });

  context('valid loan params', async () => {
    beforeEach(async () => {
      instance = await initializeInstance(...Object.values(params));
      instanceParams = await instance.getLoanParams();
    });

    context('should store correct requested loanParams', async () => {
      it('should deploy successfully', async () => {
        assert.exists(instance.address, 'instance was not successfully deployed');
      });

      it('should record loan params in storage', async () => {
        Object.keys(params).forEach(key => {
          const value = instanceParams[key];
          if (key === 'borrower') {
            expect(instanceParams[0]).to.equal(params[key]);
          } else if (value instanceof BN) {
            expect(value).to.be.a.bignumber.that.equals(new BN(params[key]));
          } else {
            expect(value).to.equal(params[key]);
          }
        });
      });

      it('should store loanStatus, loanStartTimestamp, and principalDisbursed as 0', async () => {
        expect(instanceParams.loanStatus).to.be.a.bignumber.that.equals(new BN(0));
        expect(instanceParams.principalDisbursed).to.be.a.bignumber.that.equals(new BN(0));
        expect(instanceParams.loanStartTimestamp).to.be.a.bignumber.that.equals(new BN(0));
      });

      it('should generate the correct monthly payment', async () => {
        const {principalRequested, interestRate} = params;
        const amt = interestPayment(principalRequested, interestRate);
        const calc = await instance._calcMonthlyInterest(principalRequested, interestRate);
        expect(calc).to.be.a.bignumber.equals(amt);
      });

      it('should get the correct loanPeriod', async () => {
        expect(await instance.getNumScheduledPayments()).to.be.a.bignumber.that.equals(
          params.loanPeriod
        );
      });

      it('should generate an payments table without timestamps if loan has not been started', async () => {
        const expected = [];
        const queries = [];
        const {principalRequested, interestRate, loanPeriod} = params;
        const amt = interestPayment(principalRequested, interestRate);
        for (let i = 0; i < loanPeriod; i += 1) {
          const p = i < loanPeriod.toNumber() - 1 ? new BN(0) : new BN(principalRequested);
          const int = new BN(amt);
          const t = p.add(int);
          expected.push({principalPayment: p, interestPayment: int, totalPayment: t});
          queries.push(instance.getRequestedScheduledPayment(i + 1));
        }
        const results = await Promise.all(queries);
        for (let cur = 0; cur < loanPeriod; cur += 1) {
          if (verbose)
            console.log(
              `Results  |  principalPayment : ${results[cur].principalPayment}  |  Interest: ${results[cur].interestPayment}  |  totalPayment: ${results[cur].totalPayment}`
            );
          expect(results[cur].principalPayment).to.be.a.bignumber.that.equals(
            expected[cur].principalPayment,
            `Incorrect principalPayment amount in payments table in month ${cur}`
          );
          expect(results[cur].interestPayment).to.be.a.bignumber.that.equals(
            expected[cur].interestPayment,
            `Incorrect interest amount in payments table in month ${cur}`
          );
          expect(results[cur].totalPayment).to.be.a.bignumber.that.equals(
            expected[cur].totalPayment,
            `Incorrect principalPayment amount in payments table in month ${cur}`
          );
        }
      });
    });

    context('setLoanStatus method', async () => {
      it('should allow onlyControllers to set loan status', async () => {
        await instance.setLoanStatus(loanStatuses.FUNDING_COMPLETE, {from: controller});
        const status = await instance.getLoanStatus();
        expect(status).to.be.bignumber.equal(loanStatuses.FUNDING_COMPLETE);
      });
      it('should not allow non-onlyControllers to set loan status', async () => {
        await expectRevert(
          instance.setLoanStatus(loanStatuses.FUNDING_FAILED, {from: nonController}),
          'Permission denied'
        );
      });
    });

    context('start repayment cycle with invalid params or access', async () => {
      it('non-controller should not be able to startRepaymentCycle', async () => {
        await expectRevert(
          instance.startRepaymentCycle(params.principalRequested, {from: nonController}),
          'Permission denied'
        );
      });

      it('should require that loan has not already been started', async () => {
        await instance.startRepaymentCycle(params.principalRequested, {from: controller});
        await expectRevert(
          instance.startRepaymentCycle(params.principalRequested, {from: controller}),
          'Requires loanStatus to be before RepaymentCycle'
        );
      });
    });

    context('start repayment cycle with partial fundraise', async () => {
      const partialFundraise = params.principalRequested.sub(new BN(200)); // TODO(Dan): Should be a random value
      let tx;
      let loanStartTimestamp;
      let loanStatus;
      let loanPeriod;
      let loanEndTimestamp;
      let principalRequested;
      let interestRate;
      let principalDisbursed;

      context('functionality', async () => {
        beforeEach(async () => {
          tx = await instance.startRepaymentCycle(partialFundraise, {from: controller});
          ({
            loanStatus,
            loanStartTimestamp,
            loanPeriod,
            principalRequested,
            principalDisbursed,
            interestRate
          } = await instance.getLoanParams());
          loanEndTimestamp = await instance.getLoanEndTimestamp();
        });

        it('should emit an event for loanStart', async () => {
          expectEvent.inLogs(tx.logs, 'RepaymentCycleStarted', {
            loanStartTimestamp,
            principalDisbursed
          });
        });

        it('should write the loanStartTimestamp', async () => {
          const now = Math.floor(new Date().getTime() / 1000);
          expect(loanStartTimestamp.toNumber()).to.be.within(
            now - threshold,
            now + threshold,
            'loanStartTimestamp is more than 1000 seconds from now'
          );
        });

        it('should change loanStatus to started', async () => {
          expect(loanStatus).to.be.a.bignumber.that.equals(
            new BN(4),
            'loan status should be updated to loan started / repayment cycle'
          );
        });

        it('should create a correct loanEndTimestamp', async () => {
          const cur = moment(new Date().getTime());
          const end = cur.add(loanPeriod.toNumber(), 'months').unix();
          expect(loanEndTimestamp.toNumber()).to.be.within(
            end - threshold,
            end + threshold,
            'loanEndTimestamp is more than 1000 seconds from correct end date'
          );
        });

        it('should return the correct principalDisbursed', async () => {
          expect(principalDisbursed).to.be.bignumber.equal(partialFundraise);
          expect(principalDisbursed).to.be.bignumber.that.is.lessThan(principalRequested);
        });

        it('should generate correct dueTimestamp, principalPayment, interestPayment and totalPayment on getScheduledPayments', async () => {
          const queries = [];
          const expected = [];
          const amt = interestPayment(principalDisbursed, interestRate);
          const start = moment.unix(loanStartTimestamp);
          /** Generate simulated  */
          for (let i = 0; i < loanPeriod.toNumber(); i += 1) {
            const p = i < loanPeriod.toNumber() - 1 ? new BN(0) : new BN(principalDisbursed);
            const int = new BN(amt);
            const t = p.add(int);
            const d = start.add(i + 1, 'months').unix();
            expected.push({dueTimestamp: d, principalPayment: p, interest: int, totalPayment: t});
            queries.push(instance.getScheduledPayment(i + 1));
          }
          const results = await Promise.all(queries);
          results.map((result, i) => {
            if (verbose)
              console.log(
                `Results  |  Timestamp : ${result.dueTimestamp}  |  Principal : ${result.principalPayment}  |  Interest: ${result.interestPayment}  |  totalPayment: ${result.totalPayment}`
              );
            expect(result.principalPayment).to.be.a.bignumber.that.equals(
              expected[i].principalPayment,
              `Incorrect principalPayment amount in payments table in month ${i}`
            );
          });
        });

        it('should get the correct expectedRepaymentTotal for a given timestamp', async () => {
          const tranche = interestPayment(principalDisbursed, interestRate);

          for (let i = 0; i < loanPeriod.toNumber(); i += 1) {
            const estimated =
              i < loanPeriod.toNumber() - 1
                ? new BN(i + 1).mul(tranche)
                : new BN(i + 1).mul(tranche).add(principalDisbursed);

            const cur = moment(new Date().getTime());
            const future = cur.add(i + 1, 'months').unix();
            const amount = await instance.getExpectedRepaymentValue(future + threshold);
            expect(amount).to.be.bignumber.that.equals(estimated);
          }
        });
      });
    });

    context('start repayment cycle with overfunded fundraise', async () => {
      it('should cap debt at principalRequested', async () => {
        const overfunded = params.principalRequested.add(new BN(200));
        await instance.startRepaymentCycle(overfunded, {from: controller});
        const {principalDisbursed} = await instance.getLoanParams();
        expect(principalDisbursed).to.be.bignumber.equal(params.principalRequested);
        expect(principalDisbursed).to.be.bignumber.that.is.lessThan(overfunded);
      });
    });
  });
});
