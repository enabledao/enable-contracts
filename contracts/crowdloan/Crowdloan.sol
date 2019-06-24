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

    struct CrowdfundParams {
        uint crowdFundLength;
        uint crowdFundStart;
        uint crowdFundEnd;
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

    LoanParams loanParams;
    CrowdfundParams crowdfundParams;
    DebtToken debtToken;

    event Refund(address indexed tokenHolder, uint amount);

    function contructor(
                address _principalTokenAddr,
                uint _principal,
                uint _amortizationUnitType,
                uint _termLength,
                uint _termPayment,
                uint _gracePeriodLength,
                uint _gracePeriodPayment,
                uint _interestRate
            )
            public
        {
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
        }

    /// @notice Fund the loan in exchange for a debt token
    /// @return debtTokenId Issued debt token ID
    function fund(uint amount) public returns (uint debtTokenId) {
        _getDebtTokenValueForAmount(amount);
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

    function _getDebtTokenValueForAmount(uint amount) internal returns (uint debtTokenValue) {
        return amount;
    }

    /**
     * @dev fallback function ***DO NOT OVERRIDE***
     * Revert all native Ether payments
     */
    function () external payable {
        revert("Ether not accepted");
    }
}
