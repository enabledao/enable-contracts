pragma solidity ^0.5.2;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../debt-token/DebtTokenFactory.sol";
import "./Crowdloan.sol";

contract CrowdloanFactory is Ownable {

    DebtTokenFactory debtTokenFactory;

    address[] public registry;

    event loanCreated(address indexed borrower, address indexed addr, uint indexed amount);

    constructor (address _debtTokenFactory) public {
        debtTokenFactory = DebtTokenFactory(_debtTokenFactory);
    }

    function createCrowdloan(
        address _debtToken,
        address _principalTokenAddr,
        uint _principal,
        uint _amortizationUnitType,
        uint _termLength,
        uint _termPayment,
        uint _gracePeriodLength,
        uint _gracePeriodPayment,
        uint _interestRate,
        uint _crowdfundLength,
        uint _crowdfundStart
    )
        public
        returns (address)
    {
        // TODO(Dan): Asserts and require statements
        Crowdloan crowdloan = new Crowdloan (
              _debtToken,
              _principalTokenAddr,
              _principal,
              _amortizationUnitType,
              _termLength,
              _termPayment,
              _gracePeriodLength,
              _gracePeriodPayment,
              _interestRate,
              _crowdfundLength,
              _crowdfundStart
        );
        registry.push(address(crowdloan));
        emit loanCreated(msg.sender, address(crowdloan), _principal);
        return address(crowdloan);
    }
}
