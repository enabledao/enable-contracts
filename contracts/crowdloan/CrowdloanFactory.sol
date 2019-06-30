pragma solidity ^0.5.2;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../debt-token/DebtTokenFactory.sol";
import "./Crowdloan.sol";

contract CrowdloanFactory is Ownable {

    DebtTokenFactory debtTokenFactory;

    event loanCreated(address indexed borrower, address indexed debtToken, uint indexed amount);

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
    ) public returns (address) {
        // Crowdloan crowdloan = new Crowdloan (
        //       _debtToken,
        //       _principalTokenAddr,
        //       _principal,
        //       _amortizationUnitType,
        //       _termLength,
        //       _termPayment,
        //       _gracePeriodLength,
        //       _gracePeriodPayment,
        //       _interestRate,
        //       _crowdfundLength,
        //       _crowdfundStart
        // );
        // emit loanCreated(msg.sender, address(crowdloan.debtToken), _principal);
        // return address(crowdloan);
    }
}
