pragma solidity ^0.5.2;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

contract RepaymentRouter {
    using SafeMath for uint256;

    uint private _totalRepaid;
    mapping(uint => uint) private _withdrawnByTokenId;

    /**
  	 * @dev This event emits when repayment is made to the loan
  	 */
  	event Repayment(address indexed from, uint256 fundsRepaid);

    function _transferERC20 (IERC20 token, address _to, uint256 _amount) internal returns (bool) {
        //Separate function to ensure the amount is sent, a sort of safeTransferFrom
        uint previousBalance = token.balanceOf(_to);
        token.transferFrom(address(this), _to, _amount);
        require(token.balanceOf(_to) >= previousBalance.add(_amount), 'Token value not successfully transferred');
        return true;
    }

    function _transferERC20 (IERC20 token, address _from, address _to, uint256 _amount) internal returns (bool) {
        //Separate function to ensure the amount is sent, a sort of safeTransferFrom
        uint previousBalance = token.balanceOf(_to);
        token.transferFrom(_from, _to, _amount);
        require(token.balanceOf(_to) >= previousBalance.add(_amount), 'Token value not successfully transferred');
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
    function _withdraw(IERC20 token, address to, uint debtTokenId) internal {
      //TODO needs re-thinking
        uint previousWithdrawal = _withdrawnByTokenId[debtTokenId];
        uint _amount = getWithdrawalAllowance(debtTokenId);
        _withdrawnByTokenId[debtTokenId] = previousWithdrawal.add(_amount);
        _transferERC20(token, to, _amount);
    }

    /// @notice Get current withdrawal allowance for a debt token
    /// @param debtTokenId Debt token ID
    function getWithdrawalAllowance(uint debtTokenId)
        public
        view
        returns (uint)
    {
        // TODO(Dan): Implement
        return uint(1); // TODO(Dan): Remove placeholder
    }

    /// @notice Total amount of the Loan repaid by the borrower
    function totalRepaid() public view returns (uint) {
        return _totalRepaid;
    }

    /// @notice Total amount of the Loan repayment withdrawn by each tokenId
    function totalWithdrawn(uint debtTokenId) public view returns (uint) {
        return _withdrawnByTokenId[debtTokenId];
    }
}
