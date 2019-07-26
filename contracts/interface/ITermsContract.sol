pragma solidity >=0.4.22 <0.6.0;

import "../debt-contracts/TermsContractLib.sol";

contract ITermsContract {
    using TermsContractLib for TermsContractLib.LoanStatus;

    event LoanStatusSet(TermsContractLib.LoanStatus status);

    function borrower() external view returns (address);
    /// Returns the cumulative units-of-value expected to be repaid by a given block timestamp.
    ///  Note this is not a constant function -- this value can vary on basis of any number of
    ///  conditions (e.g. interest rates can be renegotiated if repayments are delinquent).
    /// @param  timestamp uint. The timestamp of the block for which repayment expectation is being queried.
    /// @return uint256 The cumulative units-of-value expected to be repaid by the time the given timestamp lapses.
    function getExpectedRepaymentValue(uint256 timestamp) external view returns (uint256);

    /// Returns the cumulative units-of-value repaid by the point at which this method is called.
    /// @return uint256 The cumulative units-of-value repaid up until now.
    // function getValueRepaidToDate() external view returns (uint256);

    function getLoanParams()
        external
        view
        returns (
            address,
            address principalToken,
            uint256 principal,
            uint256 loanStatus,
            uint256 loanPeriod,
            uint256 interestRate,
            uint256 interestPayment,
            uint256 loanStartTimestamp
        );

    function setLoanStatus(TermsContractLib.LoanStatus _status) external;
    function startLoan() external returns (uint256 startTimestamp);

    function getLoanStatus() external view returns (TermsContractLib.LoanStatus loanStatus);
    function getPrincipal() external view returns (uint256);
    function getPrincipalToken() external view returns (address);

    function getScheduledPayment(uint256)
        external
        view
        returns (uint256, uint256, uint256, uint256);
}
