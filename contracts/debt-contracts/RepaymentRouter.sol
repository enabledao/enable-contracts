pragma solidity ^0.5.2;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "../interface/IRepaymentRouter.sol";
import "../debt-token/DebtToken.sol";
import "./TermsContract.sol";

contract RepaymentRouter is IRepaymentRouter {
    using SafeMath for uint256;

    uint256 private _totalRepaid;
    uint256 private _totalWithdrawal;
    mapping(uint256 => uint256) private _withdrawnByTokenId;

    DebtToken debtToken;
    TermsContract termsContract;

    /**
    * @dev This event emits when repayment is made to the loan
    */
    event PaymentReceived(address indexed from, uint256 amount);
    event PaymentReleased(address indexed to, uint256 amount);

    constructor(address _termsContract, address _debtToken) public {
        debtToken = DebtToken(_debtToken);
        termsContract = TermsContract(_termsContract);
    }

    function _loanParams() internal returns (TermsContract.LoanParams memory) {
        (address principalToken, uint256 principal, uint256 loanStatus, uint256 amortizationUnitType, uint256 termLength, uint256 interestRate, uint256 termStartUnixTimestamp, uint256 termEndUnixTimestamp) = termsContract
            .getLoanParams();
        return
            TermsContract.LoanParams(
                IERC20(principalToken),
                principal,
                TermsContract.LoanStatus(loanStatus),
                TermsContract.TimeUnitType(amortizationUnitType),
                termLength,
                interestRate,
                termStartUnixTimestamp,
                termEndUnixTimestamp
            );
    }

    function _transferERC20(IERC20 token, address _from, address _to, uint256 _amount)
        internal
        returns (bool)
    {
        //Separate function to ensure the amount is sent, a sort of safeTransferFrom
        uint256 previousBalance = token.balanceOf(_to);
        token.transferFrom(_from, _to, _amount);
        require(
            token.balanceOf(_to) >= previousBalance.add(_amount),
            "Token value not successfully transferred"
        );
        return true;
    }

    /// @notice Repay a given portion of loan
    /// @param token Repayment Token
    /// @param _from Sender of repayment Tokens
    /// @param _to Address to send repayment Tokens to
    /// @param _unitsOfRepayment Tokens to repay
    function _repay(IERC20 token, address _from, address _to, uint256 _unitsOfRepayment) internal {
        _totalRepaid.add(_unitsOfRepayment);
        _transferERC20(token, _from, _to, _unitsOfRepayment);
        emit PaymentReceived(_from, _unitsOfRepayment);
    }

    /// @notice Withdraw current allowance for a debt token
    function _withdraw(IERC20 token, address to, uint256 debtTokenId) internal {
        //TODO needs re-thinking
        uint256 previousWithdrawal = _withdrawnByTokenId[debtTokenId];
        uint256 _amount = getWithdrawalAllowance(debtTokenId);
        _withdrawnByTokenId[debtTokenId] = previousWithdrawal.add(_amount);
        _totalWithdrawal = _totalWithdrawal.add(_amount);
        _transferERC20(token, address(this), to, _amount);
    }

    /// @notice Get current withdrawal allowance for a debt token
    /// @param debtTokenId Debt token ID
    function getWithdrawalAllowance(uint256 debtTokenId) public view returns (uint256) {
        // TODO(Dan): Implement
        // return
        //     termsContract.calculateWithdrawalAllowance(
        //         _totalRepaid,
        //         _withdrawnByTokenId[debtTokenId]
        //     );
        // return uint256(1); // TODO(Dan): Remove placeholder
    }

    /// @notice Total amount of the Loan repaid by the borrower
    function totalRepaid() public view returns (uint256) {
        return _totalRepaid;
    }

    /// @notice Total amount of the Loan repayment withdrawn by each tokenId
    function totalWithdrawn(uint256 debtTokenId) public view returns (uint256) {
        return _withdrawnByTokenId[debtTokenId];
    }

    /// @notice Total amount of the Loan repayment withdrawn by each tokenId
    function totalWithdrawn() public view returns (uint256) {
        return _totalWithdrawal;
    }

    /// @notice Repay a given portion of loan
    /// @param unitsOfRepayment Tokens to repay
    function repay(uint256 unitsOfRepayment) public {
        _repay(_loanParams().principalToken, msg.sender, address(this), unitsOfRepayment);
    }

    /// @notice Withdraw current allowance for a debt token
    /// @param debtTokenId Debt token ID
    function withdraw(uint256 debtTokenId) public {
        //TODO needs re-thinking
        require(debtToken.ownerOf(debtTokenId) == msg.sender, "You are not the owner of token");
        uint256 _amount = getWithdrawalAllowance(debtTokenId);
        _withdraw(_loanParams().principalToken, msg.sender, debtTokenId);
        emit PaymentReleased(msg.sender, _amount);
    }

    function() external payable {
        revert("please, call specific function");
    }
}
