pragma solidity >= 0.4.22 <0.6.0;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";
import "../interface/ICrowdloan.sol";
import "../interface/ITermsContract.sol";
import "../debt-token/DebtToken.sol";

contract Crowdloan is ICrowdloan, ITermsContract, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    enum AmortizationUnitType { HOURS, DAYS, WEEKS, MONTHS, YEARS }

    enum LoanStatus {
        NOT_STARTED,
        FUNDING_STARTED,
        FUNDING_COMPLETE,
        FUNDING_FAILED,
        LOAN_STARTED,
        REPAYMENT_STARTED,
        REPAYMENT_COMPLETE
    }

    struct LoanParams {
        IERC20 principalToken;
        IERC20 principalToken;
        uint principal;
        LoanStatus loanStatus;
        AmortizationUnitType amortizationUnitType;
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
    DebtToken debtToken;

    event Fund();
    event Refund();
    event Withdraw();

    function contructor(
        address _principalTokenAddr,
        uint _principal,
        uint _amortizationUnitType,
        uint _termLength,
        uint _termPayment,
        uint _gracePeriodLength,
        uint _gracePeriodPayment,
        uint _interestRate,
    ) public {
        loanParams = new LoanParams(
            IERC20(_principalTokenAddr),
            _principal,
            _amortizationUnitType,
            _termLength,
            _termPayment,
            _gracePeriodLength,
            _gracePeriodPayment,
            _interestRate,
            0,
            0,
            0
        );
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

    _getDebtTokenValueForAmount(uint amount) internal returns (uint debtTokenValue) {
        return amount;
    }
}