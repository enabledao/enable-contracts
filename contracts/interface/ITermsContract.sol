pragma solidity >=0.4.22 <0.6.0;

import "../debt-contracts/TermsContractLib.sol";

contract ITermsContract {
    using TermsContractLib for TermsContractLib.LoanStatus;

    event LoanStatusUpdated(TermsContractLib.LoanStatus status);

    function borrower() external view returns (address);

    function getExpectedRepaymentValue() public view returns (uint256);
    function getExpectedRepaymentValue(uint256 timestamp) public view returns (uint256);

    function getLoanParams()
        external
        view
        returns (
            address,
            address principalToken,
            uint256 principalRequested,
            uint256 loanStatus,
            uint256 loanPeriod,
            uint256 interestRate,
            uint256 principalDisbursed,
            uint256 loanStartTimestamp
        );

    function setLoanStatus(TermsContractLib.LoanStatus _status) external;
    function startRepaymentCycle(uint256 totalCrowdfunded)
        external
        returns (uint256 startTimestamp);

    function getLoanStatus() external view returns (TermsContractLib.LoanStatus loanStatus);
    function getPrincipalRequested() external view returns (uint256);
    function getPrincipalToken() external view returns (address);

    function getScheduledPayment(uint256) external view returns (uint256, uint256, uint256, uint256);
}
