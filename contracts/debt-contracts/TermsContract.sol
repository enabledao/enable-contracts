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
    using TermsContractLib for TermsContractLib.LoanStatus;

    TermsContractLib.LoanParams public loanParams;
    uint256 private constant MONTHSINYEAR = 12;
    uint256 private constant TENTHOUSAND = 10000;

    modifier onlyBeforeRepaymentCycle() {
        require(
            loanParams.loanStatus < TermsContractLib.LoanStatus.REPAYMENT_CYCLE,
            "Requires loanStatus to be before RepaymentCycle"
        );
        _;
    }

    function initialize(
        address borrower,
        address principalToken,
        uint256 principalRequested,
        uint256 loanPeriod,
        uint256 interestRate,
        uint256 minimumRepayment,
        uint256 maximumRepayment,
        address[] memory _controllers
    ) public initializer {
        require(principalToken != address(0), "Loaned token must be an ERC20 token"); //TODO(Dan): More rigorous way of testing ERC20?
        require(principalRequested != 0, "PrincipalRequested must be greater than 0");
        require(loanPeriod > 0, "Loan period must be higher than 0");
        require(
            interestRate > 9,
            "Interest rate should be in basis points and have minimum of 10 (0.1%)"
        );
        require(
            interestRate < 10000,
            "Interest rate be in basis points and less than 10,000 (100%)"
        );

        ControllerRole.initialize(_controllers);
        loanParams = TermsContractLib.LoanParams({
            borrower: borrower,
            principalToken: principalToken,
            principalRequested: principalRequested,
            loanStatus: TermsContractLib.LoanStatus.NOT_STARTED,
            loanPeriod: loanPeriod,
            interestRate: interestRate,
            minimumRepayment: minimumRepayment,
            maximumRepayment: maximumRepayment,
            principalDisbursed: 0,
            loanStartTimestamp: 0
        });
    }

    function setLoanStatus(TermsContractLib.LoanStatus _status) public onlyController {
        _setLoanStatus(_status);
    }

    /** Public view functions
     */
    function getBorrower() public view returns (address) {
        return loanParams.borrower;
    }

    function getInterestRate() public view returns (uint256) {
        return loanParams.interestRate;
    }

    function getLoanStatus() public view returns (TermsContractLib.LoanStatus loanStatus) {
        return loanParams.loanStatus;
    }

    function getLoanStartTimestamp() public view returns (uint256) {
        return loanParams.loanStartTimestamp;
    }

    function getNumScheduledPayments() public view returns (uint256) {
        return loanParams.loanPeriod;
    }

    function getPrincipalRequested() public view returns (uint256) {
        return loanParams.principalRequested;
    }

    function getPrincipalDisbursed() public view returns (uint256) {
        return loanParams.principalDisbursed;
    }

    function getPrincipalToken() public view returns (address) {
        return loanParams.principalToken;
    }

    function getMinimumRepayment() public view returns (uint256) {
        return loanParams.minimumRepayment;
    }

    function getMaximumRepayment() public view returns (uint256) {
        return loanParams.maximumRepayment;
    }

    function getLoanEndTimestamp() public view returns (uint256 end) {
        require(loanParams.loanStartTimestamp != 0, "Loan hasn't been started yet");
        end = BokkyPooBahsDateTimeLibrary.addMonths(
            loanParams.loanStartTimestamp,
            loanParams.loanPeriod
        );
    }

    /**
     * @dev gets loanParams as a tuple
     */
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
        )
    {
        return (
            loanParams.borrower,
            loanParams.principalToken,
            loanParams.principalRequested,
            uint256(loanParams.loanStatus),
            loanParams.loanPeriod,
            loanParams.interestRate,
            loanParams.minimumRepayment,
            loanParams.maximumRepayment,
            loanParams.principalDisbursed,
            loanParams.loanStartTimestamp
        );
    }

    /**
     * @dev Gets proposed payment schedule based on principalRequested
     * NOTE This should only be used during crowdfund period
     */
    function getRequestedScheduledPayment(uint256 period)
        public
        view
        returns (uint256 principalPayment, uint256 interestPayment, uint256 totalPayment)
    {}

    /**
     * @dev Gets finalized payment schedule based on principalDisbursed
     * NOTE This should only be used when repaymentSchedule has started
     */
    function getScheduledPayment(uint256 period)
        public
        view
        returns (
            uint256 dueTimestamp,
            uint256 principalPayment,
            uint256 interestPayment,
            uint256 totalPayment
        )
    {}

    /**
     * @dev Begins loan and writes timestamps to the payment table
     */
    function startRepaymentCycle(uint256 totalCrowdfunded)
        public
        onlyController
        onlyBeforeRepaymentCycle
        returns (uint256 startTimestamp)
    {
        uint256 principalDisbursed;
        /** NOTE: prevents over-debt through unauthorized transfers (e.g. native token transfers) into crowdloan */
        if (totalCrowdfunded > loanParams.principalRequested) {
            principalDisbursed = loanParams.principalRequested;
        } else {
            principalDisbursed = totalCrowdfunded;
        }
        startTimestamp = now;
        loanParams.principalDisbursed = principalDisbursed;
        loanParams.loanStartTimestamp = startTimestamp;
        _setLoanStatus(TermsContractLib.LoanStatus.REPAYMENT_CYCLE);
    }

    /**
     * @dev Overloaded function. `now` will be the block's timestamp as reported by the miner
     */
    function getExpectedRepaymentValue() public view returns (uint256 total) {}

    /**
     * @dev returns the expected repayment value for a given timestamp for the loan's scheduled payments
     * @dev future developments will allow this to be more dynamic (e.g. delinquent fees, penalties)
     * @param timestamp uint256
     * @return uint256 total number of currencyTokens expected to be repaid
     */
    function getExpectedRepaymentValue(uint256 timestamp) public view returns (uint256 total) {}

    /**
     * @dev Calculates the scheduled payment for a given period
     * Note Uses simple principal calculation for a balloon loan. Will change for future loan types
     */
    function _calcScheduledPayment(uint256 period, uint256 principal)
        internal
        view
        returns (uint256 principalPayment, uint256 interestPayment, uint256 totalPayment)
    {}

    /**
     * @dev calculates monthly interest payment
     * @dev Note 10000 divisor is because of basis points (100) * percentage (100)
     */
    function _calcMonthlyInterest(uint256 principal, uint256 interestRate)
        public
        pure
        returns (uint256 result)
    {}

    /**
     * @dev internal method to set the loanStatus of the loan
     */
    function _setLoanStatus(TermsContractLib.LoanStatus _loanStatus) private {
        if (loanParams.loanStatus != _loanStatus) {
            loanParams.loanStatus = _loanStatus;
            emit LoanStatusUpdated(_loanStatus);
        }
    }
}
