pragma solidity ^0.5.2;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./DebtTokenFactory.sol";
import "../crowdloan/Crowdloan.sol";

contract CrowdloanFactory is Ownable {
    DebtTokenFactory debtTokenFactory;

    address[] public registry;

    event LoanCreated(address indexed borrower, address indexed addr, uint256 indexed amount);

    constructor(address _debtTokenFactory) public {
        debtTokenFactory = DebtTokenFactory(_debtTokenFactory);
    }

    function createCrowdloan(
        address _debtToken,
        address _principalTokenAddr,
        uint256 _principal,
        uint256 _amortizationUnitType,
        uint256 _termLength,
        uint256 _termPayment,
        uint256 _gracePeriodLength,
        uint256 _gracePeriodPayment,
        uint256 _interestRate,
        uint256 _crowdfundLength,
        uint256 _crowdfundStart
    ) public returns (address) {
        // TODO(Dan): Asserts and require statements
        Crowdloan crowdloan = new Crowdloan(
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
        emit LoanCreated(msg.sender, address(crowdloan), _principal);
        return address(crowdloan);
    }
}
