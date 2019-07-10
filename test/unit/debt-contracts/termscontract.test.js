import {BN, constants, expectEvent, expectRevert} from 'openzeppelin-test-helpers';
import {isContext} from 'vm';

const {expect} = require('chai');

const TermsContract = artifacts.require('TermsContract');

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
      const amt = principal.mul(new BN(interestRate)).div(new BN(10000));
      const monthlyRepayment = await instance.monthlyPayment();
      expect(monthlyRepayment).to.be.a.bignumber.equals(amt);
    });

    xit('should generate an payments table without timestamps if loan has not been started', async () => {});
    xit('should generate an payments table with timestamps if loan has not been started', async () => {});
    xit('should get the expectedRepaymentTotal for a given timestamp', async () => {});

    xit('should get the startTimestamp of the loan', async () => {});
    xit('should get the endTimestamp of the loan', async () => {});
  });
});
