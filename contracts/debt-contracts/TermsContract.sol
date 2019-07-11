pragma solidity ^0.5.2;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "../interface/ITermsContract.sol";
import "../utils/BokkyPooBahsDateTimeLibrary.sol";

contract TermsContract is ITermsContract {
    using SafeMath for uint256;

    enum TimeUnitType {HOURS, DAYS, WEEKS, MONTHS, YEARS}

    enum LoanStatus {
        NOT_STARTED,
        FUNDING_STARTED,
        FUNDING_COMPLETE,
        FUNDING_FAILED,
        REPAYMENT_CYCLE,
        REPAYMENT_COMPLETE
    }

    struct LoanParams {
        IERC20 principalToken;
        uint256 principal;
        LoanStatus loanStatus;
        TimeUnitType timeUnitType; // NOTE(Dan): To evaluate whether we should get rid of this param
        uint256 loanPeriod;
        uint256 interestRate; // NOTE(Dan): This needs to be aligned with the timeUnitType
        uint256 interestPayment;
        uint256 loanStartTimestamp;
        uint256 loanEndTimestamp;
    }

    struct ScheduledPayment {
        uint256 due;
        uint256 principal;
        uint256 interest;
        uint256 total;
    }

    address public borrower; //TODO(Dan): Refactor once we combine with Crowdloan
    LoanParams public loanParams;
    ScheduledPayment[] public paymentTable;

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
        borrower = msg.sender; //TODO(Dan): Refactor once we combine with Crowdloan
        loanParams = LoanParams({
            principalToken: IERC20(_principalTokenAddr),
            principal: _principal,
            loanStatus: LoanStatus.NOT_STARTED,
            timeUnitType: TimeUnitType(_timeUnitType),
            loanPeriod: _loanPeriod,
            interestRate: _interestRate, // TODO: reassign constant values below
            interestPayment: calcInterestPayment(_principal, _interestRate),
            loanStartTimestamp: 0,
            loanEndTimestamp: 0
        });
        initializePaymentTable();
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
            uint256 interestPayment,
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
            loanParams.interestPayment,
            loanParams.loanStartTimestamp,
            loanParams.loanEndTimestamp
        );
    }

    /** @dev this is currently a workaround for initializing a simple loan payment table
     */
    function initializePaymentTable() private {
        for (uint256 i = 0; i < loanParams.loanPeriod.sub(1); i++) {
            ScheduledPayment memory current = ScheduledPayment({
                due: 0,
                principal: 0,
                interest: loanParams.interestPayment,
                total: 0 + loanParams.interestPayment
            });
            paymentTable.push(current);
        }
        ScheduledPayment memory last = ScheduledPayment({
            due: 0,
            principal: loanParams.principal,
            interest: loanParams.interestPayment,
            total: loanParams.principal + loanParams.interestPayment
        });
        paymentTable.push(last);
    }

    /** @dev Begins loan and writes timestamps to the payment table
     */
    // TODO(CRITICAL): Must put permissions on this
    function startLoan() public returns (uint256 startTimestamp) {
        startTimestamp = now;
        //TODO(Dan): Is there a way to alias the library name?
        (uint256 year, uint256 month, uint256 day) = BokkyPooBahsDateTimeLibrary.timestampToDate(
            startTimestamp
        );
        loanParams.loanStartTimestamp = startTimestamp;
        for (uint256 i = 0; i < loanParams.loanPeriod; i++) {
            ScheduledPayment storage current = paymentTable[i];
            //TODO(Dan): Conditional addDays, Months, Years (or remove the timeAmortizationUnit altogether)
            uint256 shifted = BokkyPooBahsDateTimeLibrary.addMonths(startTimestamp, i + 1);
            current.due = shifted;
            if (i == loanParams.loanPeriod - 1) {
                loanParams.loanEndTimestamp = shifted;
            }
        }
        loanParams.loanStatus = LoanStatus.REPAYMENT_CYCLE;
    }

    /** PMT function to calculate periodic interest rate
     */
    function calcInterestPayment(uint256 principal, uint256 interestRate)
        public
        pure
        returns (uint256)
    {
        //TODO(Dan): Refactor into _percentage method
        uint256 result = principal.mul(interestRate).div(10000);
        return result;
    }

    /// Returns the cumulative units-of-value expected to be repaid by a given block timestamp.
    ///  Note this is not a constant function -- this value can vary on basis of any number of
    ///  conditions (e.g. interest rates can be renegotiated if repayments are delinquent).
    /// @param  timestamp uint. The timestamp of the block for which repayment expectation is being queried.
    /// @return uint256 The cumulative units-of-value expected to be repaid by the time the given timestamp lapses.
    function getExpectedRepaymentValue(uint256 timestamp) public view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < loanParams.loanPeriod; i++) {
            ScheduledPayment memory cur = paymentTable[i];
            if (cur.due < timestamp) {
                total += cur.total;
            }
        }
        return total;
    }

    /// Returns the cumulative units-of-value repaid by the point at which this method is called.
    /// @return uint256 The cumulative units-of-value repaid up until now.
    function getValueRepaidToDate() external view returns (uint256) {
        return 1; // TODO(Dan): Should be moved to the repaymentRouter
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
