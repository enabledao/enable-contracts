pragma solidity >=0.4.22 <0.6.0;

import "../debt-contracts/TermsContractLib.sol";

contract ITermsContract {
    using TermsContractLib for TermsContractLib.LoanStatus;

    /// Returns the cumulative units-of-value expected to be repaid by a given block timestamp.
    ///  Note this is not a constant function -- this value can vary on basis of any number of
    ///  conditions (e.g. interest rates can be renegotiated if repayments are delinquent).
    /// @param  timestamp uint. The timestamp of the block for which repayment expectation is being queried.
    /// @return uint256 The cumulative units-of-value expected to be repaid by the time the given timestamp lapses.
    function getExpectedRepaymentValue(uint256 timestamp) public view returns (uint256);

    /// Returns the cumulative units-of-value repaid by the point at which this method is called.
    /// @return uint256 The cumulative units-of-value repaid up until now.
    function getValueRepaidToDate() public view returns (uint256);

    function getLoanParams()
        public
        view
        returns (
            address borrower,
            address lender,
            address principalToken,
            uint256 principal,
            uint256 loanStatus,
            uint256 timeUnitType,
            uint256 loanPeriod,
            uint256 interestRate,
            uint256 interestPayment,
            uint256 loanStartTimestamp,
            uint256 loanEndTimestamp
        );

    function setLoanStatus(TermsContractLib.LoanStatus _status) public;
    function getLoanStatus() public view returns (uint256 loanStatus);

    function getPrincipal() public view returns (uint256);
    function getPrincipalToken() public view returns (address);

}
