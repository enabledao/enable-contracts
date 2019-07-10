import {BN, constants, expectEvent, expectRevert} from 'openzeppelin-test-helpers';

const {expect} = require('chai');
const moment = require('moment');

const TermsContract = artifacts.require('TermsContract');

const threshold = 1000; // Testing offset for timestamps in seconds
const params = {
  principalToken: '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359',
  principal: new BN(60000), // TODO(Dan): Replace with actual number 60000 * 10 ** 18
  timeUnitType: 3,
  loanPeriod: 6,
  interestRate: 50
};

const reassign = (original, param, value) => {
  const mutated = Object.assign({}, original);
  mutated[param] = value;
  return mutated;
};

const invalidInputCheckRevert = async (original, param, value, error) => {
  const mutated = reassign(original, param, value);
  await expectRevert(TermsContract.new(...Object.values(mutated)), error);
};

const interestPayment = (principal, interest) => {
  return new BN(principal).mul(new BN(interest)).div(new BN(10000));
};

contract('Terms Contract', ([sender, receiver]) => {
  let instance;
  let instanceParams;
  const borrower = sender;

  context('invalid loan term params', async () => {
    it('should not create if principalToken is not an ERC20', async () => {
      // TODO(Dan): Do an actual check for ERC20 token
      await invalidInputCheckRevert(
        params,
        'principalToken',
        constants.ZERO_ADDRESS,
        'Loaned token must be an ERC20 token'
      );
    });
    it('should revert if time unit is invalid', async () => {
      await invalidInputCheckRevert(params, 'timeUnitType', 10, 'Invalid time unit type');
    });
    it('should revert if loan period is 0', async () => {
      await invalidInputCheckRevert(params, 'loanPeriod', 0, 'Loan period must be higher than 0');
    });
    it('should revert if interest rate is not in basis points', async () => {
      await invalidInputCheckRevert(
        params,
        'interestRate',
        6,
        'Interest rate should be in basis points and have minimum of 10 (0.1%)'
      );
    });
    it('should revert if interest rate is too high', async () => {
      await invalidInputCheckRevert(
        params,
        'interestRate',
        1000000,
        'Interest rate be in basis points and less than 10,000 (100%)'
      );
    });
  });

  context('valid loan params', async () => {
    beforeEach(async () => {
      instance = await TermsContract.new(...Object.values(params), {from: borrower});
      instanceParams = await instance.getLoanParams();
    });

    it('should deploy successfully', async () => {
      assert.exists(instance.address, 'instance was not successfully deployed');
    });

    it('should record loan params in storage', async () => {
      Object.keys(params).forEach(key => {
        const value = instanceParams[key];
        if (value instanceof BN) {
          expect(value).to.be.a.bignumber.that.equals(new BN(params[key]));
        } else {
          expect(value).to.equal(params[key]);
        }
      });
    });

    it('should store loanStatus as unstarted and start/end timestamps as 0', async () => {
      expect(instanceParams.loanStatus).to.be.a.bignumber.that.equals(new BN(0));
      expect(instanceParams.loanStartTimestamp).to.be.a.bignumber.that.equals(new BN(0));
      expect(instanceParams.loanEndTimestamp).to.be.a.bignumber.that.equals(new BN(0));
    });
    it('should get the correct borrower', async () => {
      const a = await instance.getBorrower();
      expect(a).to.equals(borrower);
    });

    it('should generate the correct monthly payment', async () => {
      const {principal, interestRate} = params;
      const amt = interestPayment(principal, interestRate);
      console.log(amt);
      expect(instanceParams.interestPayment).to.be.a.bignumber.equals(amt);
    });

    it('should generate an payments table without timestamps if loan has not been started', async () => {
      // calculate what should be correct
      const expected = [];
      const queries = [];
      const {principal, interestRate, loanPeriod} = params;
      const amt = interestPayment(principal, interestRate);
      for (let i = 0; i < loanPeriod; i += 1) {
        const p = i < loanPeriod - 1 ? new BN(0) : new BN(principal);
        const int = new BN(amt);
        const t = p.add(int);
        expected.push({principal: p, interest: int, total: t});
        queries.push(instance.paymentTable(i));
      }
      const results = await Promise.all(queries);
      for (let i = 0; i < loanPeriod; i += 1) {
        const {principal, interest, total} = results[i];
        expect(principal).to.be.a.bignumber.that.equals(
          expected[i].principal,
          `Incorrect principal amount in payments table in month ${i}`
        );
        expect(interest).to.be.a.bignumber.that.equals(
          expected[i].interest,
          `Incorrect interest amount in payments table in month ${i}`
        );
        expect(total).to.be.a.bignumber.that.equals(
          expected[i].total,
          `Incorrect principal amount in payments table in month ${i}`
        );
      }
    });

    xit('only borrower should be able to start the loan', async () => {});

    it('starting a loan should write due timestamps to the payments table and update loan status', async () => {
      const {loanPeriod} = params;
      const queries = [];
      const now = Math.floor(new Date().getTime() / 1000);

      const tx = await instance.startLoan();
      const {loanStartTimestamp, loanStatus} = await instance.getLoanParams();

      // console.log(loanStartTimestamp.toString());
      // console.log(loanStatus);
      // console.log(now);

      expect(loanStatus).to.be.a.bignumber.that.equals(
        new BN(4),
        'loan status should be updated to loan started / repayment cycle'
      );
      expect(loanStartTimestamp.toNumber()).to.be.within(
        now - threshold,
        now + threshold,
        'loanstartTimestamp is more than 1000 seconds from now'
      );

      for (let i = 0; i < loanPeriod; i += 1) {
        queries.push(instance.paymentTable(i));
      }
      const results = await Promise.all(queries);
      results.map((payment, i) => {
        const actual = payment.due.toNumber();
        const cur = moment(new Date().getTime());
        const simulated = cur.add(i + 1, 'months').unix();
        expect(actual).to.be.within(
          simulated - threshold,
          simulated + threshold,
          `incorrect due timestamp for month ${i}${1}`
        );
      });
    });

    xit('should get the startTimestamp of the loan', async () => {});
    xit('should get the endTimestamp of the loan', async () => {});

    xit('should get the expectedRepaymentTotal for a given timestamp', async () => {});
  });
});
