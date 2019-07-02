pragma solidity ^ 0.5.2;

contract TermsContract {
     /// Returns the cumulative units-of-value expected to be repaid by a given block timestamp.
     ///  Note this is not a constant function -- this value can vary on basis of any number of
     ///  conditions (e.g. interest rates can be renegotiated if repayments are delinquent).
     /// @param  timestamp uint. The timestamp of the block for which repayment expectation is being queried.
     /// @return uint256 The cumulative units-of-value expected to be repaid by the time the given timestamp lapses.
    function getExpectedRepaymentValue(uint256 timestamp) public view returns (uint256) {}

     /// Returns the cumulative units-of-value repaid by the point at which this method is called.
     /// @return uint256 The cumulative units-of-value repaid up until now.
    function getValueRepaidToDate() external view returns (uint256) {}

    /**
     * A method that returns a Unix timestamp representing the end of the debt agreement's term.
     * contract.
     */
    function getTermStartTimestamp() external view returns (uint) {}
    function getTermEndTimestamp() external view returns (uint) {}
}
