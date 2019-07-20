import {BN, constants, expectEvent, expectRevert} from 'openzeppelin-test-helpers';

const {expect} = require('chai');
const moment = require('moment');

const {appCreate, getAppAddress, encodeCall} = require('../../testHelpers');

const TermsContract = artifacts.require('TermsContract');

const verbose = true;

contract('Terms Contract', accounts => {
  let instance;
  let instanceParams;
  const threshold = 100; // Testing offset for timestamps in seconds
  const params = {
    borrower: accounts[0],
    principalToken: '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359',
    principalRequested: new BN(60000), // TODO(Dan): Replace with actual number 60000 * 10 ** 18
    loanPeriod: new BN(12),
    interestRate: new BN(50)
  };

  const reassign = (original, param, value) => {
    return Object.assign({}, original, {[param]: value});
  };

  const initializeInstance = async (
    borrower,
    principalTokenAddr,
    principalRequested,
    loanPeriod,
    interestRate
  ) => {
    const data = encodeCall(
      'initialize',
      ['address', 'address', 'uint256', 'uint256', 'uint256', 'address[]'],
      [
        borrower,
        principalTokenAddr,
        principalRequested.toNumber(),
        loanPeriod.toNumber(),
        interestRate.toNumber(),
        [accounts[0]]
      ]
    );
    const proxyAddress = await appCreate('enable-credit', 'TermsContract', accounts[1], data);
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
      expect(await instance.getNumScheduledPayments()).to.be.a.bignumber.that.equals(params.loanPeriod);
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
        expected.push({principalPayment: p, interest: int, totalPayment: t});
        queries.push(instance.getRequestedScheduledPayment(i + 1));
      }
      const results = await Promise.all(queries);
      for (let cur = 0; cur < loanPeriod; cur += 1) {
        if (verbose)
          console.log(
            `Results  |  principalPayment : ${results[cur].principalPayment}  |  Interest: ${results[cur].interest}  |  totalPayment: ${results[cur].totalPayment}`
          );
        expect(results[cur].principalPayment).to.be.a.bignumber.that.equals(
          expected[cur].principalPayment,
          `Incorrect principalPayment amount in payments table in month ${cur}`
        );
        expect(results[cur].interest).to.be.a.bignumber.that.equals(
          expected[cur].interest,
          `Incorrect interest amount in payments table in month ${cur}`
        );
        expect(results[cur].totalPayment).to.be.a.bignumber.that.equals(
          expected[cur].totalPayment,
          `Incorrect principalPayment amount in payments table in month ${cur}`
        );
      }
    });

    xit('controller should be able to call appropriate set methods', async () => {});
    xit('non-controller should not be able to call appropriate set methods', async () => {});

    context('start repayment cycle with invalid params', async () => {
      it('should require that loan has not already been started', async () => {
        await instance.startRepaymentCycle(params.principalRequested);
        await expectRevert(
          instance.startRepaymentCycle(params.principalRequested),
          'Requires loanStatus to be before RepaymentCycle'
        );
      });

      it('should require principalDisbursed to be below principalRequested', async () => {
        await expectRevert(
          instance.startRepaymentCycle(params.principalRequested.add(new BN(200))),
          'principalDisbursed cannot be more than requested'
        );
      });
    });

    context('start repayment cycle with partial fundraise', async () => {
      let tx;
      let loanStartTimestamp;
      let loanStatus;
      let loanPeriod;
      let loanEndTimestamp;
      let principalRequested;
      let interestRate;
      let principalDisbursed = params.principalRequested.sub(new BN(200));    
      // TODO(Dan): Should be a random value

      beforeEach(async () => {
        tx = await instance.startRepaymentCycle(principalDisbursed);
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

      xit('borrower should be able to start the loan', async () => {});
      xit('non-borrower should not be able to start the loan', async () => {});
      xit('should emit an event', async () => {});

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

      xit('should return the correct principalDisbursed', async () => {})
      
      it.only('should generate correct dueTimestamp, principalPayment, interestPayment and totalPayment on getScheduledPayments', async () => {
        const queries = [];
        const expected = [];
        const amt = interestPayment(principalDisbursed, interestRate);
        const start = moment.unix(loanStartTimestamp);
        /** Generate simulated  */
        for (let i = 0; i < loanPeriod.toNumber(); i += 1) {
          const p = i < loanPeriod.toNumber() - 1 ? new BN(0) : new BN(principalDisbursed);
          const int = new BN(amt);
          const t = p.add(int);
          const d = start.add(i+1, 'months').unix();
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
});
