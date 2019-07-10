pragma solidity ^0.5.2;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "../interface/ITermsContract.sol";

contract TermsContract is ITermsContract {
    using SafeMath for uint256;

    enum TimeUnitType {HOURS, DAYS, WEEKS, MONTHS, YEARS}

    enum LoanStatus {
        NOT_STARTED,
        FUNDING_STARTED,
        FUNDING_COMPLETE,
        FUNDING_FAILED,
        LOAN_DISBURSED,
        REPAYMENT_CYCLE,
        REPAYMENT_COMPLETE
    }

    struct LoanParams {
        IERC20 principalToken;
        uint256 principal;
        LoanStatus loanStatus;
        TimeUnitType timeUnitType;
        uint256 loanPeriod;
        uint256 interestRate;   // NOTE(Dan): This needs to be aligned with the timeUnitType
        // TODO(Dan): Evaluate whether we should get rid of start and end unix timestamps
        uint256 loanStartTimestamp;
        uint256 loanEndTimestamp;
    }

    struct ScheduledPayment {
        uint256 due;
        uint256 principal;
        uint256 interest;
        uint256 total;
    }

    address public borrower;  //TODO(Dan): Refactor once we combine with Crowdloan
    LoanParams public loanParams;

    modifier onlyBorrower() {
        require(msg.sender == borrower, "Only borrower can call");
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
        require(_timeUnitType < 5, "Invalid time unit type");
        require(_loanPeriod > 0, "Loan period must be higher than 0");
        require(
            _interestRate > 9,
            "Interest rate should be in basis points and have minimum of 10 (0.1%)"
        );
        require(
            _interestRate < 10000,
            "Interest rate be in basis points and less than 10,000 (100%)"
        );
        borrower = msg.sender;  //TODO(Dan): Refactor once we combine with Crowdloan
        loanParams = LoanParams({
            principalToken: IERC20(_principalTokenAddr),
            principal: _principal,
            loanStatus: LoanStatus.NOT_STARTED,
            timeUnitType: TimeUnitType(_timeUnitType),
            loanPeriod: _loanPeriod,
            interestRate: _interestRate, // TODO: reassign constant values below
            loanStartTimestamp: 0,
            loanEndTimestamp: 0
        });
    }

    /** Public Functions
     */
    function getLoanStatus() public view returns (uint256 loanStatus) {
        return uint256(loanParams.loanStatus);
    }

    function getBorrower() public view returns (address) {
        return borrower;
    }

    function getLoanParams()
        public
        view
        returns (
            address principalToken,
            uint256 principal,
            uint256 loanStatus,
            uint256 timeUnitType,
            uint256 loanPeriod,
            uint256 interestRate,
            uint256 loanStartTimestamp,
            uint256 loanEndTimestamp
        )
    {
        return (
            address(loanParams.principalToken),
            loanParams.principal,
            uint256(loanParams.loanStatus),
            uint256(loanParams.timeUnitType),
            loanParams.loanPeriod,
            loanParams.interestRate,
            loanParams.loanStartTimestamp,
            loanParams.loanEndTimestamp
        );
    }

    /** @dev Returns the
     */
    function getPaymentTable() public view {

    }

    /** @dev Begins loan and writes timestamps to the payment table
     */
     // TODO(CRITICAL): Must put permissions on this
    function startLoan() public {
        // use onlyAtStatus modifiers
        // get Block.now()
        // Write timestamp for every subsequent date (i.e. 27th of each month)
    }

    /** PMT function to calculate periodic interest rate
     */
    function monthlyPayment() public view returns (uint256) {
        uint256 result = (loanParams.principal).mul(loanParams.interestRate).div(10000);
        return result;
        //TODO(Dan): Refactor into _percentage method
    }

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
    // increase present state of the loan
    // needs to be protected!!!
    function _setLoanStatus(LoanStatus _loanStatus) internal {
        if (loanParams.loanStatus != _loanStatus) {
            loanParams.loanStatus = _loanStatus;
        }
    }
}
