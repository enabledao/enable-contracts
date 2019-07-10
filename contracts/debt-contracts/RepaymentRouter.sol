pragma solidity ^0.5.2;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "../interface/IRepaymentRouter.sol";
import "../crowdloan/Crowdloan.sol";
import "../debt-token/DebtToken.sol";

contract RepaymentRouter is IRepaymentRouter {
    using SafeMath for uint256;

    uint256 private _totalRepaid;
    mapping(uint256 => uint256) private _withdrawnByTokenId;

    Crowdloan crowdloan;
    DebtToken debtToken;

    /**
  	 * @dev This event emits when repayment is made to the loan
  	 */
    event Repayment(address indexed from, uint256 fundsRepaid);

    constructor(address payable _crowdloan, address _debtToken) public {
        crowdloan = Crowdloan(_crowdloan);
        debtToken = DebtToken(_debtToken);
    }

    function _transferERC20(IERC20 token, address _to, uint256 _amount) internal returns (bool) {
        //Separate function to ensure the amount is sent, a sort of safeTransferFrom
        uint256 previousBalance = token.balanceOf(_to);
        token.transferFrom(address(this), _to, _amount);
        require(
            token.balanceOf(_to) >= previousBalance.add(_amount),
            "Token value not successfully transferred"
        );
        return true;
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
        _transferERC20(token, _from, _to, _unitsOfRepayment);
        _totalRepaid.add(_unitsOfRepayment);
        emit Repayment(_from, _unitsOfRepayment);
    }

    /// @notice Withdraw current allowance for a debt token
    function _withdraw(IERC20 token, address to, uint256 debtTokenId) internal {
        //TODO needs re-thinking
        uint256 previousWithdrawal = _withdrawnByTokenId[debtTokenId];
        uint256 _amount = getWithdrawalAllowance(debtTokenId);
        _withdrawnByTokenId[debtTokenId] = previousWithdrawal.add(_amount);
        _transferERC20(token, to, _amount);
    }

    /// @notice Get current withdrawal allowance for a debt token
    /// @param debtTokenId Debt token ID
    function getWithdrawalAllowance(uint256 debtTokenId) public view returns (uint256) {
        // TODO(Dan): Implement
        return uint256(1); // TODO(Dan): Remove placeholder
    }

    /// @notice Total amount of the Loan repaid by the borrower
    function totalRepaid() public view returns (uint256) {
        return _totalRepaid;
    }

    /// @notice Total amount of the Loan repayment withdrawn by each tokenId
    function totalWithdrawn(uint256 debtTokenId) public view returns (uint256) {
        return _withdrawnByTokenId[debtTokenId];
    }

    /// @notice Repay a given portion of loan
    /// @param unitsOfRepayment Tokens to repay
    function repay(uint256 unitsOfRepayment) public {
        // _repay(loanParams.principalToken, msg.sender, address(this), unitsOfRepayment);
        // emit FundsReceived(msg.sender, unitsOfRepayment);    // TODO(Dan): Remove comments once IClaimsToken is implemented
    }

    /// @notice Withdraw current allowance for a debt token
    /// @param debtTokenId Debt token ID
    function withdraw(uint256 debtTokenId) public {
        //TODO needs re-thinking
        require(debtToken.ownerOf(debtTokenId) == msg.sender, "You are not the owner of token");
        uint256 _amount = getWithdrawalAllowance(debtTokenId);
        // _withdraw(loanParams.principalToken, msg.sender, debtTokenId);
        emit FundsWithdrawn(msg.sender, _amount);
    }
}
