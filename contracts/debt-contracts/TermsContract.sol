pragma solidity ^0.5.2;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "../interface/ITermsContract.sol";

contract TermsContract is ITermsContract {
    enum TimeUnitType {HOURS, DAYS, WEEKS, MONTHS, YEARS}

    enum LoanStatus {
        NOT_STARTED,
        FUNDING_STARTED,
        FUNDING_COMPLETE,
        FUNDING_FAILED,
        LOAN_DISBURSED,
        REPAYMENT_CYCLE,
        LATE, // TODO(Dan): think through whether we want to differentiate late (90) and default (180)
        DEFAULT,
        REPAYMENT_COMPLETE
    }

    struct LoanParams {
        IERC20 principalToken;
        uint256 principal;
        LoanStatus loanStatus;
        TimeUnitType timeUnitType;
        uint256 loanPeriod;
        uint256 interestRate;
        // TODO(Dan): Evaluate whether we should get rid of start and end unix timestamps
        uint256 termStartUnixTimestamp;
        uint256 termEndUnixTimestamp;
    }

    address public borrower;
    LoanParams public loanParams;

    modifier onlyDebtor() {
        require(msg.sender == borrower, "Only debtor can call");
        _;
    }

    // TODO(Dan): To implement
    // modifier onlyAtStatus(LoanStatus status) {}

    // modifier onlyBeforeStatus(LoanStatus status) {}

    // modifier onlyAfterStatus(LoanStatus status) {}

    constructor(
        address _principalTokenAddr,
        uint256 _principal,
        uint256 _timeUnitType,
        uint256 _loanPeriod,
        uint256 _interestRate
    ) public {
        require(_principalTokenAddr != address(0), "Loaned token must be an ERC20 token"); //TODO(Dan): More rigorous way of testing ERC20?
        require(_timeUnitType < 5, "Invalid amortization unit type");
        loanParams = LoanParams({
            principalToken: IERC20(_principalTokenAddr),
            principal: _principal,
            loanStatus: LoanStatus.NOT_STARTED,
            timeUnitType: TimeUnitType(_timeUnitType),
            loanPeriod: _loanPeriod,
            interestRate: _interestRate, // TODO: reassign constant values below
            termStartUnixTimestamp: 0,
            termEndUnixTimestamp: 0
        });
    }

    function getLoanStatus() external view returns (uint256 loanStatus) {
        return uint256(loanParams.loanStatus);
    }

    function getDebtor() external view returns (address debtor) {
        return debtor;
    }

    function getLoanParams()
        external
        view
        returns (
            address principalToken,
            uint256 principal,
            uint256 loanStatus,
            uint256 timeUnitType,
            uint256 loanPeriod,
            uint256 interestRate,
            uint256 termStartUnixTimestamp,
            uint256 termEndUnixTimestamp
        )
    {
        return (
            address(loanParams.principalToken),
            loanParams.principal,
            uint256(loanParams.loanStatus),
            uint256(loanParams.timeUnitType),
            loanParams.loanPeriod,
            loanParams.interestRate,
            loanParams.termStartUnixTimestamp,
            loanParams.termEndUnixTimestamp
        );
    }

    /** @dev Writes due date unix timestamps to
     *
     */

    /** @dev Returns the
     */
    function getPaymentTable() public view {}

    /// Returns the cumulative units-of-value expected to be repaid by a given block timestamp.
    ///  Note this is not a constant function -- this value can vary on basis of any number of
    ///  conditions (e.g. interest rates can be renegotiated if repayments are delinquent).
    /// @param  timestamp uint. The timestamp of the block for which repayment expectation is being queried.
    /// @return uint256 The cumulative units-of-value expected to be repaid by the time the given timestamp lapses.
    function getExpectedRepaymentValue(uint256 timestamp) public view returns (uint256) {
        return 1; // TODO(Dan): Placeholder
    }

    /// Returns the cumulative units-of-value repaid by the point at which this method is called.
    /// @return uint256 The cumulative units-of-value repaid up until now.
    function getValueRepaidToDate() external view returns (uint256) {
        return 1; // TODO(Dan): Placeholder
    }

    /**
     * A method that returns a Unix timestamp representing the end of the debt agreement's term.
     * contract.
     */
    function getTermStartTimestamp() external view returns (uint256) {
        return 1; // TODO(Dan): Placeholder
    }
    function getTermEndTimestamp() external view returns (uint256) {
        return 1; // TODO(Dan): Placeholder
    }

    // @notice set the present state of the Loan;
    function _setLoanStatus(LoanStatus _loanStatus) internal {
        if (loanParams.loanStatus != _loanStatus) {
            loanParams.loanStatus = _loanStatus;
        }
    }
}
