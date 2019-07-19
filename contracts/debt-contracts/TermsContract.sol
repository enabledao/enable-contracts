pragma solidity ^0.5.2;

import "openzeppelin-eth/contracts/math/SafeMath.sol";
import "openzeppelin-eth/contracts/token/ERC20/IERC20.sol";
import "zos-lib/contracts/Initializable.sol";
import "../interface/ITermsContract.sol";
import "../access/ControllerRole.sol";
import "../utils/BokkyPooBahsDateTimeLibrary.sol";
import "./TermsContractLib.sol";

contract TermsContract is Initializable, ITermsContract, ControllerRole {
    using SafeMath for uint256;

    using TermsContractLib for TermsContractLib.LoanParams;
    using TermsContractLib for TermsContractLib.ScheduledPayment;
    using TermsContractLib for TermsContractLib.LoanStatus;

    TermsContractLib.LoanParams public loanParams;
    TermsContractLib.ScheduledPayment[] public paymentTable;

    address private _borrower;
    // TODO(Dan): To implement
    // modifier onlyAtStatus(LoanStatus status) {}

    // modifier onlyBeforeStatus(LoanStatus status) {}

    // modifier onlyAfterStatus(LoanStatus status) {}

    function initialize(
        address borrower_,
        address _principalTokenAddr,
        uint256 _principal,
        uint256 _loanPeriod,
        uint256 _interestRate,
        address[] memory _controllers
    ) public initializer {
        require(_principalTokenAddr != address(0), "Loaned token must be an ERC20 token"); //TODO(Dan): More rigorous way of testing ERC20?
        require(_loanPeriod > 0, "Loan period must be higher than 0");
        require(
            _interestRate > 9,
            "Interest rate should be in basis points and have minimum of 10 (0.1%)"
        );
        require(
            _interestRate < 10000,
            "Interest rate be in basis points and less than 10,000 (100%)"
        );
        _borrower = borrower_;
        ControllerRole.initialize(_controllers);
        loanParams = TermsContractLib.LoanParams({
            principalToken: _principalTokenAddr,
            principal: _principal,
            loanStatus: TermsContractLib.LoanStatus.NOT_STARTED,
            loanPeriod: _loanPeriod,
            interestRate: _interestRate,
            principalDisbursed: 0,
            loanStartTimestamp: 0
        });
    }

    function setLoanStatus(TermsContractLib.LoanStatus _status) public onlyController {
        _setLoanStatus(_status);
    }

    /** Public view functions
     */
    function borrower() public view returns (address) {
        return _borrower;
    }
    function getLoanStatus() public view returns (TermsContractLib.LoanStatus loanStatus) {
        return loanParams.loanStatus;
    }

    function getPrincipal() public view returns (uint256) {
        return loanParams.principal;
    }

    function getPrincipalToken() public view returns (address) {
        return loanParams.principalToken;
    }

    function getLoanEndTimestamp() public view returns (uint256 end) {
        require(loanParams.loanStartTimestamp != 0, "Loan hasn't been started yet");
        end = BokkyPooBahsDateTimeLibrary.addMonths(
            loanParams.loanStartTimestamp,
            loanParams.loanPeriod
        );
    }

    function getLoanParams()
        public
        view
        returns (
            address,
            address principalToken,
            uint256 principal,
            uint256 loanStatus,
            uint256 loanPeriod,
            uint256 interestRate,
            uint256 principalDisbursed,
            uint256 loanStartTimestamp
        )
    {
        return (
            _borrower,
            address(loanParams.principalToken),
            loanParams.principal,
            uint256(loanParams.loanStatus),
            loanParams.loanPeriod,
            loanParams.interestRate,
            loanParams.principalDisbursed,
            loanParams.loanStartTimestamp
        );
    }

    function getScheduledPayment(uint256 tranche)
        public
        view
        returns (uint256 due, uint256 principal, uint256 interest, uint256 total)
    {
        require(
            tranche <= loanParams.loanPeriod,
            "The loan period is shorter than requested tranche"
        );
        interest = _calcMonthlyInterest(loanParams.principal, loanParams.interestRate);
        if (tranche == loanParams.loanPeriod) {
            principal = loanParams.principal;
        } else {
            principal = 0;
        }
        if (loanParams.loanStartTimestamp == 0) {
            due = 0;
        } else {
            due = BokkyPooBahsDateTimeLibrary.addMonths(loanParams.loanStartTimestamp, tranche);
        }
        total = interest + principal;
    }

    /** @dev Begins loan and writes timestamps to the payment table
     */
    function startLoan() 
        public 
        onlyController 
        returns (uint256 startTimestamp) 
    {
        require(
            loanParams.loanStatus < TermsContractLib.LoanStatus.REPAYMENT_CYCLE,
            "Cannot start loan that has already been started"
        );
        startTimestamp = now;
        (uint256 year, uint256 month, uint256 day) = BokkyPooBahsDateTimeLibrary.timestampToDate(
            startTimestamp
        );
        loanParams.loanStartTimestamp = startTimestamp;
        loanParams.loanStatus = TermsContractLib.LoanStatus.REPAYMENT_CYCLE;
    }

    /// Returns the cumulative units-of-value expected to be repaid by a given block timestamp.
    ///  Note this is not a constant function -- this value can vary on basis of any number of
    ///  conditions (e.g. interest rates can be renegotiated if repayments are delinquent).
    /// @param  timestamp uint. The timestamp of the block for which repayment expectation is being queried.
    /// @return uint256 The cumulative units-of-value expected to be repaid by the time the given timestamp lapses.
    function getExpectedRepaymentValue(uint256 timestamp) public view returns (uint256 total) {
        total = 0;
        for (uint256 i = 0; i < loanParams.loanPeriod; i++) {
            (uint256 due, , , uint256 amount) = getScheduledPayment(i + 1);
            if (due < timestamp) {
                total += amount;
            }
        }
    }

    /** PMT function to calculate periodic interest rate
      * Note: divide by 10000 is because of basis points conversion
     */
    function _calcMonthlyInterest(uint256 principal, uint256 interestRate)
        public
        pure
        returns (uint256 result)
    {
        result = principal.mul(interestRate).div(10000);
    }

    // @notice set the present state of the Loan;
    // increase present state of the loan
    // TODO(Dan): should this be private instead of internal?
    function _setLoanStatus(TermsContractLib.LoanStatus _loanStatus) internal {
        if (loanParams.loanStatus != _loanStatus) {
            loanParams.loanStatus = _loanStatus;
            emit LoanStatusSet(_loanStatus);
        }
    }

}
