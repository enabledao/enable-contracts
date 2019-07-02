pragma solidity >= 0.4.22 <0.6.0;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC721/IERC721.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";
import "../interface/ICrowdloan.sol";
import "../interface/IClaimsToken.sol";
import "../debt-contracts/RepaymentRouter.sol";
import "../debt-contracts/TermsContract.sol";
import "../debt-token/DebtToken.sol";

contract Crowdloan is ICrowdloan, IClaimsToken, TermsContract, RepaymentRouter, ReentrancyGuard {
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
    DebtToken private debtToken;

    event Refund(address indexed tokenHolder, uint amount);

     modifier trackCrowdfundStatus () {
        _updateCrowdfundStatus();
        _;
        _updateCrowdfundStatus();
     }

    constructor (
                address _debtToken,
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
            debtToken = DebtToken(_debtToken);
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
     function _isBelowMaxSupply (uint amount) internal view returns (bool) {
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
        debtToken.addDebt(msg.sender, amount);
        emit FundsReceived(msg.sender, amount);
    }

    /// @notice Get a refund for a debt token owned by the sender
    /// @param debtTokenId Debt token ID
    function refund(uint debtTokenId) public {
        require(uint(loanParams.loanStatus) < uint(LoanStatus.FUNDING_COMPLETE), 'Funding already complete. Refund Impossible');
        uint _refund = debtToken.debtValue(debtTokenId);
        debtToken.removeDebt(msg.sender, debtTokenId);
        _transferERC20(loanParams.principalToken, msg.sender, _refund);
        emit Refund(msg.sender, _refund);
        emit FundsWithdrawn(msg.sender, _refund);
    }

    /// @notice Repay a given portion of loan
    /// @param unitsOfRepayment Tokens to repay
    function repay(uint256 unitsOfRepayment) public {
        _repay(loanParams.principalToken, msg.sender, address(this), unitsOfRepayment);
        emit FundsReceived(msg.sender, unitsOfRepayment);
    }

    /// @notice Withdraw current allowance for a debt token
    /// @param debtTokenId Debt token ID
    function withdraw(uint debtTokenId) public {
      //TODO needs re-thinking
        require(debtToken.ownerOf(debtTokenId) == msg.sender, 'You are not the owner of token');
        uint _amount = getWithdrawalAllowance(debtTokenId);
        _withdraw(loanParams.principalToken, msg.sender, debtTokenId);
        emit FundsWithdrawn(msg.sender, _amount);
    }

    /**
     * @dev Withdraws available funds for user.
     */
    function withdrawFunds() public payable {
      //BLOAT???
        revert ('call: function withdraw(uint debtTokenId)');
    }

  	/**
  	 * @dev Returns the amount of funds a given address is able to withdraw currently.
  	 * @param _forAddress Address of ClaimsToken holder
  	 * @return A uint256 representing the available funds for a given account
  	 */
  	function availableFunds(address _forAddress) external view returns (uint256) {
      //BLOAT???
      //TODO Decide whether to handle only the first owned token or to iterate through all owned tokens If possible
        uint tokenId =  debtToken.tokenOfOwnerByIndex(msg.sender, 0);
        return getWithdrawalAllowance(tokenId);
    }

    /**
     * @dev Get cumulative funds received by ClaimsToken.
     * @return A uint256 representing the total funds received by ClaimsToken
     */
    function totalReceivedFunds() external view returns (uint256) {
      //BLOAT???
      //TODO what should this refer to in our context: Total funds received, or TOtal principal before loan starts, and total Repayment afterwards, or addition of both , or is it just bloat
        return loanParams.principal.add(totalRepaid());
    }

    function getDebtToken() external view returns(address) {
        return address(debtToken);
    }

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
