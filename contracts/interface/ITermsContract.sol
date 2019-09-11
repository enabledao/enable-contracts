pragma solidity >=0.4.22 <0.6.0;

import "../debt-contracts/TermsContractLib.sol";

contract ITermsContract {
    using TermsContractLib for TermsContractLib.LoanStatus;

    event LoanStatusUpdated(TermsContractLib.LoanStatus status);

    function getBorrower() external view returns (address);
    function getInterestRate() external view returns (uint256);
    function getLoanStatus() external view returns (TermsContractLib.LoanStatus);
    function getLoanStartTimestamp() external view returns (uint256);
    function getNumScheduledPayments() external view returns (uint256);
    function getPrincipalRequested() external view returns (uint256);
    function getPrincipalDisbursed() external view returns (uint256);
    function getPrincipalToken() external view returns (address);

    function getRequestedScheduledPayment(uint256 period)
        external
        view
        returns (uint256, uint256, uint256);
    function getScheduledPayment(uint256)
        external
        view
        returns (uint256, uint256, uint256, uint256);
    function getExpectedRepaymentValue() external view returns (uint256);
    function getExpectedRepaymentValue(uint256 timestamp) external view returns (uint256);

    function getLoanParams()
        public
        view
        returns (
            address borrower,
            address principalToken,
            uint256 principalRequested,
            uint256 loanStatus,
            uint256 loanPeriod,
            uint256 interestRate,
            uint256 minimumRepayment,
            uint256 maximumRepayment,
            uint256 principalDisbursed,
            uint256 loanStartTimestamp
        );

    function setLoanStatus(TermsContractLib.LoanStatus _status) external;
    function startRepaymentCycle(uint256) external returns (uint256);
}
