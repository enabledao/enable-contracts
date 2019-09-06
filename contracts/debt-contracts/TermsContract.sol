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

    address private _borrower;

    modifier onlyBeforeRepaymentCycle() {
        require(
            loanParams.loanStatus < TermsContractLib.LoanStatus.REPAYMENT_CYCLE,
            "Requires loanStatus to be before RepaymentCycle"
        );
        _;
    }

    function initialize(
        address borrower_,
        address _principalTokenAddr,
        uint256 _principalRequested,
        uint256 _loanPeriod,
        uint256 _interestRate,
        address[] memory _controllers
    ) public initializer {
        require(_principalTokenAddr != address(0), "Loaned token must be an ERC20 token"); //TODO(Dan): More rigorous way of testing ERC20?
        require(_principalRequested != 0, "PrincipalRequested must be greater than 0");
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
            principalRequested: _principalRequested,
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
            address,
            address principalToken,
            uint256 principalRequested,
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
            loanParams.principalRequested,
            uint256(loanParams.loanStatus),
            loanParams.loanPeriod,
            loanParams.interestRate,
            loanParams.principalDisbursed,
            loanParams.loanStartTimestamp
        );
    }

    /**
     * @dev Begins loan and writes timestamps to the payment table
     */
    function startLoan(uint256 totalCrowdfunded)
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
     * @dev internal method to set the loanStatus of the loan
     */
    function _setLoanStatus(TermsContractLib.LoanStatus _loanStatus) internal {
        loanParams.loanStatus = _loanStatus;
        emit LoanStatusUpdated(_loanStatus);
    }
}
