pragma solidity >= 0.4.22 <0.6.0;

import "openzeppelin-solidity/contracts/token/ERC721/IERC721.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";
import "../interface/ICrowdloan.sol";
import "../interface/IClaimsToken.sol";
import "../interface/ITermsContract.sol";
import "../interface/IRepaymentRouter.sol";
import "../debt-token/DebtToken.sol";

contract Crowdloan is ICrowdloan, ITermsContract, IClaimsToken, IRepaymentRouter, ReentrancyGuard {
    using SafeMath for uint256;

    enum TimeUnitType { HOURS, DAYS, WEEKS, MONTHS, YEARS }

    enum LoanStatus {
        NOT_STARTED,
        FUNDING_STARTED,
        FUNDING_COMPLETE,
        FUNDING_FAILED,
        LOAN_STARTED,
        REPAYMENT_STARTED,
        REPAYMENT_COMPLETE
    }

    struct Borrower {
      address debtor;
    }

    struct CrowdfundParams {
        uint crowdfundLength;
        uint crowdfundStart;
        uint crowdfundEnd;
    }

    struct LoanParams {
        IERC20 principalToken;
        uint principal;
        LoanStatus loanStatus;
        TimeUnitType amortizationUnitType;
        uint termLength;
        uint termPayment;
        uint gracePeriodLength;
        uint gracePeriodPayment;
        uint interestRate;
        uint termStartUnixTimestamp;
        uint gracePeriodEndUnixTimestamp;
        uint termEndUnixTimestamp;
    }

    Borrower debtor;
    LoanParams loanParams;
    CrowdfundParams crowdfundParams;
    DebtToken debtToken;

    event Refund(address indexed tokenHolder, uint amount);

     modifier trackCrowdfundStatus () {
        _updateCrowdfundStatus();
        _;
        _updateCrowdfundStatus();
     }

    function contructor(
                address _principalTokenAddr,
                uint _principal,
                uint _amortizationUnitType,
                uint _termLength,
                uint _termPayment,
                uint _gracePeriodLength,
                uint _gracePeriodPayment,
                uint _interestRate,
                uint _crowdfundLength,
                uint _crowdfundStart
            )
            public
        {
            debtor = Borrower(msg.sender); //Needs to be update, once factory is setup
            loanParams = LoanParams({
                principalToken: IERC20(_principalTokenAddr),
                principal: _principal,
                loanStatus: LoanStatus.NOT_STARTED,
                amortizationUnitType: TimeUnitType(_amortizationUnitType),
                termLength: _termLength,
                termPayment: _termPayment,
                gracePeriodLength: _gracePeriodLength,
                gracePeriodPayment: _gracePeriodPayment,
                interestRate: _interestRate,
                // TODO: reassign constant values below
                termStartUnixTimestamp: 0,
                gracePeriodEndUnixTimestamp: 0,
                termEndUnixTimestamp: 0
            });
            crowdfundParams = CrowdfundParams(_crowdfundLength, _crowdfundStart, 0);
        }

    function _getDebtTokenValueForAmount(uint amount) internal view returns (uint debtTokenValue) {
        return amount;
    }

    // @notice additional payment does not exceed the pricipal Amount
     function _isBelowMaxSupply (uint amount) internal returns (bool) {
       return debtToken.totalDebt().add(amount) <= loanParams.principal;
     }

     // @notice reconcile the loans funding status
    function _updateCrowdfundStatus () internal {
        if (debtToken.totalDebt() > 0 && debtToken.totalDebt() <  loanParams.principal) {
          _setLoanStatus(LoanStatus.FUNDING_STARTED);
        } else if (debtToken.totalDebt() >=  loanParams.principal && totalRepaid() == 0) {
          _setLoanStatus(LoanStatus.FUNDING_COMPLETE);
        }
    }

    // @notice set the present state of the Loan;
    function _setLoanStatus(LoanStatus _loanStatus) internal {
        if (loanParams.loanStatus != _loanStatus) {
            loanParams.loanStatus = _loanStatus;
        }
    }

    function kickOffCrowdfund () public {
        require (crowdfundParams.crowdfundStart == 0 || crowdfundParams.crowdfundStart > now, 'KickOff already passed');
        crowdfundParams.crowdfundStart = now;
        _setLoanStatus(LoanStatus.FUNDING_STARTED);
    }

    /// @notice Fund the loan in exchange for a debt token
    /// @return debtTokenId Issued debt token ID
    function fund(uint amount) public trackCrowdfundStatus returns (uint) {
        uint effectiveAmount = _getDebtTokenValueForAmount(amount);
        require(_isBelowMaxSupply(effectiveAmount), 'Amount exceeds capital');
        //Mint new debt token and transfer to sender
    }

    /// @notice Get a refund for a debt token owned by the sender
    /// @param debtTokenId Debt token ID
    function refund(uint debtTokenId) public;

    /// @notice Withdraw current allowance for a debt token
    /// @param debtTokenId Debt token ID
    function withdraw(uint debtTokenId) public;

    /// @notice Get current withdrawal allowance for a debt token
    /// @param debtTokenId Debt token ID
    function getWithdrawalAllowance(uint debtTokenId) public view returns (uint);

    /// @notice Total amount of the Loan repaid by the borrower
    function totalRepaid() public view returns (uint);

    function getLoanStatus() external view returns (uint loanStatus) {
        return uint(loanParams.loanStatus);
    }


    function getLoanParams() external view returns(
        address principalToken,
        uint principal,
        uint loanStatus,
        uint amortizationUnitType,
        uint termLength,
        uint termPayment,
        uint gracePeriodLength,
        uint gracePeriodPayment,
        uint interestRate,
        uint termStartUnixTimestamp,
        uint gracePeriodEndUnixTimestamp,
        uint termEndUnixTimestamp
    ) {
        return (
          address(loanParams.principalToken),
          loanParams.principal,
          uint(loanParams.loanStatus),
          uint(loanParams.amortizationUnitType),
          loanParams.termLength,
          loanParams.termPayment,
          loanParams.gracePeriodLength,
          loanParams.gracePeriodPayment,
          loanParams.interestRate,
          loanParams.termStartUnixTimestamp,
          loanParams.gracePeriodEndUnixTimestamp,
          loanParams.termEndUnixTimestamp
        );
    }

    /**
     * @dev fallback function ***DO NOT OVERRIDE***
     * Revert all native Ether payments
     */
    function () external payable {
        revert("Ether not accepted");
    }
}
