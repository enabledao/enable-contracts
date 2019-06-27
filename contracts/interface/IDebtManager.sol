pragma solidity >= 0.4.22 <0.6.0;

interface IDebtManager {

		/// @notice Total actual debt value of DebtTokens
		function totalDebt() external view returns (uint);

		/// @notice Get debt value of particular DebtToken with tokenId `tokenId`
		function debtValue (uint tokenId) external view returns (uint);
}
